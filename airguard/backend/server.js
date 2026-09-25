/**
 * AirGuard backend (Node/Express)
 * ================================
 * Simulates Hospital / School / Residential / Industrial zones, polls a real
 * ESP32 for the Traffic zone (falling back to simulation if it's offline),
 * computes a Risk score + danger Tier for every zone, keeps a 200-reading
 * rolling buffer per zone, and auto-dials the zone's management contact when
 * a zone crosses into a high-danger tier.
 *
 * Run:
 *   npm install
 *   npm start
 * Serves the API on http://localhost:5000
 * Requires Node 18+ (uses the built-in global fetch).
 */

const express = require("express");
const cors = require("cors");

// --------------------------------------------------------------------------
// CONFIG - edit this block to match your setup
// --------------------------------------------------------------------------

const ESP32_URL = "http://192.168.1.50/api/traffic"; // your ESP32's IP/endpoint
const ESP32_TIMEOUT_MS = 2000;
const POLL_INTERVAL_MS = 5000;
const ROLLING_BUFFER_SIZE = 200;
const EWMA_ALPHA = 0.3;
const TREND_DEADBAND = 0.05;

const RISK_WEIGHT_CO2 = 0.02;
const RISK_WEIGHT_PM25 = 0.3;

const TIER_THRESHOLDS = {
  1: [0, 10],
  2: [10, 25],
  3: [25, 50],
  4: [50, Infinity]
};
const TIER_LABELS = { 1: "Good", 2: "Moderate", 3: "Poor", 4: "Severe" };

const DIAL_ON_TIERS = new Set([3, 4]);
const DIAL_COOLDOWN_MINUTES = 15;

const ZONE_CONTACTS = {
  hospital: { name: "Hospital Facilities Manager", phone: "+10000000001" },
  school: { name: "School Administration", phone: "+10000000002" },
  residential: { name: "Residential Society Office", phone: "+10000000003" },
  industrial: { name: "Industrial Safety Officer", phone: "+10000000004" },
  traffic: { name: "Traffic Control Room", phone: "+10000000005" }
};

const ZONE_VULNERABILITY = {
  hospital: 1.0,
  school: 0.9,
  residential: 0.7,
  traffic: 0.6,
  industrial: 0.5
};

const RECOMMENDATIONS = {
  hospital: "Prioritise indoor air protection and filtration. Isolate wards from outside air intake.",
  school: "Limit outdoor activities and increase ventilation monitoring in classrooms.",
  residential: "Keep windows closed during the spike and run air purifiers if available.",
  industrial: "Inspect the emission source, increase ventilation, and restrict worker exposure.",
  traffic: "Reduce time spent at the junction and avoid prolonged outdoor activity nearby."
};

const ZONE_ICONS = {
  hospital: "hospital",
  school: "school",
  residential: "home",
  industrial: "factory",
  traffic: "car"
};

function tierForRisk(risk) {
  for (const [tier, [lo, hi]] of Object.entries(TIER_THRESHOLDS)) {
    if (risk >= lo && risk < hi) return Number(tier);
  }
  return 4;
}

class Zone {
  constructor(zoneId, baseCo2, basePm25) {
    this.zoneId = zoneId;
    this.baseCo2 = baseCo2;
    this.basePm25 = basePm25;
    this.buffer = [];
    this.smoothedCo2 = baseCo2;
    this.smoothedPm25 = basePm25;
    this.lastDialTime = null;
    this.liveStatus = zoneId === "traffic" ? "LIVE" : "SIMULATED";
    this.spikeUntil = null;
  }

  pushReading(co2, pm25, temp, humidity, source) {
    this.smoothedCo2 = EWMA_ALPHA * co2 + (1 - EWMA_ALPHA) * this.smoothedCo2;
    this.smoothedPm25 = EWMA_ALPHA * pm25 + (1 - EWMA_ALPHA) * this.smoothedPm25;

    const risk = Math.round(
      (this.smoothedCo2 * RISK_WEIGHT_CO2 + this.smoothedPm25 * RISK_WEIGHT_PM25) * 100
    ) / 100;
    const tier = tierForRisk(risk);

    const reading = {
      timestamp: new Date().toISOString().split(".")[0],
      co2: Math.round(co2 * 100) / 100,
      pm25: Math.round(pm25 * 100) / 100,
      smoothedCo2: Math.round(this.smoothedCo2 * 100) / 100,
      smoothedPm25: Math.round(this.smoothedPm25 * 100) / 100,
      temp: Math.round(temp * 10) / 10,
      humidity: Math.round(humidity * 10) / 10,
      risk,
      tier,
      source
    };

    this.buffer.push(reading);
    if (this.buffer.length > ROLLING_BUFFER_SIZE) this.buffer.shift();
    return reading;
  }

  trend() {
    const n = this.buffer.length;
    if (n < 3) return { slope: 0, label: "Stable" };
    const recent = this.buffer.slice(-20);
    const xs = recent.map((_, i) => i);
    const ys = recent.map(r => r.risk);
    const n2 = xs.length;
    const meanX = xs.reduce((a, b) => a + b, 0) / n2;
    const meanY = ys.reduce((a, b) => a + b, 0) / n2;
    let num = 0, den = 0;
    for (let i = 0; i < n2; i++) {
      num += (xs[i] - meanX) * (ys[i] - meanY);
      den += (xs[i] - meanX) ** 2;
    }
    den = den || 1e-9;
    const slopePerReading = num / den;
    const slopePerMinute = slopePerReading * (60000 / POLL_INTERVAL_MS);

    let label = "Stable";
    if (slopePerMinute > TREND_DEADBAND) label = "Deteriorating";
    else if (slopePerMinute < -TREND_DEADBAND) label = "Improving";

    return { slope: Math.round(slopePerMinute * 1000) / 1000, label };
  }

  timeToNextTier() {
    const { slope, label } = this.trend();
    if (label !== "Deteriorating" || this.buffer.length === 0) return null;
    const latest = this.buffer[this.buffer.length - 1];
    if (latest.tier >= 4) return null;
    const nextThreshold = TIER_THRESHOLDS[latest.tier][1];
    if (slope <= 0) return null;
    const minutes = (nextThreshold - latest.risk) / slope;
    if (minutes < 0) return null;
    const eta = new Date(Date.now() + minutes * 60000);
    return {
      minutes: Math.round(minutes * 10) / 10,
      etaClockTime: eta.toTimeString().slice(0, 5),
      nextTier: latest.tier + 1
    };
  }

  priorityScore() {
    if (this.buffer.length === 0) return 0;
    const latest = this.buffer[this.buffer.length - 1];
    const { slope } = this.trend();
    const severity = Math.min(latest.risk, 100);
    const rateComponent = Math.max(slope, 0) * 5;
    const vulnerability = ZONE_VULNERABILITY[this.zoneId] * 20;
    const score = severity * 0.5 + rateComponent * 0.2 + vulnerability;
    return Math.round(Math.min(score, 100) * 10) / 10;
  }
}

const zones = {
  hospital: new Zone("hospital", 350, 8),
  school: new Zone("school", 420, 10),
  residential: new Zone("residential", 380, 12),
  industrial: new Zone("industrial", 500, 35),
  traffic: new Zone("traffic", 450, 28)
};

let alerts = [];

function dialZoneContact(zone) {
  const contact = ZONE_CONTACTS[zone.zoneId];
  const now = new Date();
  if (zone.lastDialTime && (now - zone.lastDialTime) < DIAL_COOLDOWN_MINUTES * 60000) {
    return;
  }
  zone.lastDialTime = now;

  // --- Twilio call goes here ---
  // const twilio = require("twilio")(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  // twilio.calls.create({
  //   to: contact.phone,
  //   from: TWILIO_FROM_NUMBER,
  //   twiml: `<Response><Say>Alert. ${zone.zoneId} zone air quality has reached ` +
  //          `a dangerous tier. Please check the AirGuard dashboard.</Say></Response>`
  // });

  const latest = zone.buffer[zone.buffer.length - 1];
  console.log(`[AUTO-DIAL] Calling ${contact.name} (${contact.phone}) about ${zone.zoneId} zone reaching Tier ${latest.tier}`);

  alerts.unshift({
    timestamp: now.toISOString().split(".")[0],
    zone: zone.zoneId,
    severity: TIER_LABELS[latest.tier],
    reason: `Risk score ${latest.risk} in Tier ${latest.tier}`,
    action: `Auto-dialed ${contact.name}`,
    acknowledged: false
  });
  if (alerts.length > 100) alerts = alerts.slice(0, 100);
}

function gaussianNoise(mean = 0, stdDev = 1) {
  const u1 = Math.random(), u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

function simulateReading(zone) {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;

  let dailyPattern = 0;
  if (zone.zoneId === "traffic") {
    dailyPattern =
      60 * Math.exp(-((hour - 9) ** 2) / 2) + 60 * Math.exp(-((hour - 18) ** 2) / 2);
  } else if (zone.zoneId === "school") {
    dailyPattern = hour >= 8 && hour <= 15 ? 30 : 0;
  } else if (zone.zoneId === "industrial") {
    dailyPattern = 20 * Math.sin((hour / 24) * 2 * Math.PI) + 20;
  }

  let spike = 0;
  if (zone.spikeUntil && now < zone.spikeUntil) spike = 60;

  const co2 = Math.max(300, zone.baseCo2 + dailyPattern + gaussianNoise(0, 8) + spike * 0.8);
  const pm25 = Math.max(0, zone.basePm25 + dailyPattern * 0.3 + gaussianNoise(0, 2) + spike);
  const temp = 24 + 4 * Math.sin((hour / 24) * 2 * Math.PI) + gaussianNoise(0, 0.5);
  const humidity = 55 + 10 * Math.sin((hour / 24) * 2 * Math.PI + 1) + gaussianNoise(0, 1);

  return zone.pushReading(co2, pm25, temp, humidity, "SIMULATED");
}

async function pollTrafficZone() {
  const zone = zones.traffic;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ESP32_TIMEOUT_MS);
    const res = await fetch(ESP32_URL, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`ESP32 responded ${res.status}`);
    const data = await res.json();
    zone.liveStatus = "LIVE";
    return zone.pushReading(
      Number(data.mq135),
      Number(data.pm),
      Number(data.temp ?? 25),
      Number(data.humidity ?? 55),
      "LIVE"
    );
  } catch {
    zone.liveStatus = "SIMULATED FALLBACK";
    return simulateReading(zone);
  }
}

async function backgroundTick() {
  for (const [zoneId, zone] of Object.entries(zones)) {
    if (zoneId === "traffic") {
      await pollTrafficZone();
    } else {
      simulateReading(zone);
    }

    const latest = zone.buffer[zone.buffer.length - 1];
    if (DIAL_ON_TIERS.has(latest.tier)) {
      dialZoneContact(zone);
    }

    const { slope, label } = zone.trend();
    if (label === "Deteriorating" && latest.tier === 1 && slope > 1.0) {
      alerts.unshift({
        timestamp: latest.timestamp,
        zone: zoneId,
        severity: "Rapid rise",
        reason: `Risk rising at ${slope}/min while still Good - early warning`,
        action: "Monitor closely; no call triggered yet",
        acknowledged: false
      });
      if (alerts.length > 100) alerts = alerts.slice(0, 100);
    }
  }
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/zones", (req, res) => {
  const out = Object.entries(zones)
    .filter(([, zone]) => zone.buffer.length > 0)
    .map(([zoneId, zone]) => {
      const latest = zone.buffer[zone.buffer.length - 1];
      const trend = zone.trend();
      return {
        zoneId,
        icon: ZONE_ICONS[zoneId],
        liveStatus: zone.liveStatus,
        latest,
        trend: { ratePerMin: trend.slope, label: trend.label },
        sparkline: zone.buffer.slice(-30).map(r => r.risk),
        history: zone.buffer.slice(-60),
        timeToNextTier: zone.timeToNextTier(),
        priorityScore: zone.priorityScore(),
        recommendation: RECOMMENDATIONS[zoneId],
        contact: ZONE_CONTACTS[zoneId]
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
  res.json(out);
});

app.get("/api/alerts", (req, res) => res.json(alerts));

app.post("/api/alerts/ack", (req, res) => {
  const idx = req.body.index;
  if (idx >= 0 && idx < alerts.length) alerts[idx].acknowledged = true;
  res.json({ ok: true });
});

app.post("/api/simulate/spike", (req, res) => {
  const zoneId = req.body.zone || "residential";
  if (zones[zoneId]) {
    zones[zoneId].spikeUntil = new Date(Date.now() + 5 * 60000);
  }
  res.json({ ok: true, zone: zoneId });
});

setInterval(backgroundTick, POLL_INTERVAL_MS);
backgroundTick();

app.listen(5000, () => console.log("AirGuard backend running on http://localhost:5000"));
