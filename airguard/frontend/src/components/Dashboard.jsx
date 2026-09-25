import React, { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import {
  ICONS,
  TIER_LABEL,
  tierColor,
  trendIconKey,
  capitalize,
  sparklinePoints,
  fetchZones,
  fetchAlerts,
  ackAlert,
  triggerSpike,
  exposureMinutes,
  tierForRiskWithThresholds,
  DEFAULT_THRESHOLDS,
  isEscalated,
  exportZonesCsv
} from "../utils/script.js";
import Settings from "./Settings.jsx";
import QrPanel from "./QrPanel.jsx";

const Icon = ({ name }) => (
  <span style={{ display: "inline-flex" }} dangerouslySetInnerHTML={{ __html: ICONS[name] }} />
);

export default function Dashboard() {
  const [zones, setZones] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [clock, setClock] = useState(new Date().toLocaleTimeString());
  const [backendOk, setBackendOk] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [, forceTick] = useState(0);

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => forceTick(n => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [z, a] = await Promise.all([fetchZones(), fetchAlerts()]);
        setZones(z);
        setAlerts(a);
        setBackendOk(true);
      } catch {
        setBackendOk(false);
      }
    }
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selectedZone) return;
    const z = zones.find(x => x.zoneId === selectedZone);
    if (!z || !chartRef.current) return;

    const labels = z.history.map(r => r.timestamp.split("T")[1]);
    const risk = z.history.map(r => r.risk);
    const color = tierColor(displayTier(z));

    if (chartInstance.current) chartInstance.current.destroy();
    chartInstance.current = new Chart(chartRef.current.getContext("2d"), {
      type: "line",
      data: { labels, datasets: [{ label: "Risk score", data: risk, borderColor: color, backgroundColor: color + "22", tension: 0.3, fill: true, pointRadius: 0 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: "#8aa0b3", maxTicksLimit: 6 }, grid: { color: "#22303e" } },
          y: { ticks: { color: "#8aa0b3" }, grid: { color: "#22303e" } }
        },
        plugins: { legend: { labels: { color: "#8aa0b3" } } }
      }
    });
  }, [selectedZone, zones, thresholds]);

  function displayTier(z) {
    return tierForRiskWithThresholds(z.latest.risk, thresholds);
  }

  const worstTier = zones.length ? Math.max(...zones.map(displayTier)) : 1;
  const traffic = zones.find(z => z.zoneId === "traffic");
  const worstZone = zones.length
    ? zones.reduce((a, b) => (displayTier(a) > displayTier(b) ? a : b), zones[0])
    : null;
  const selected = zones.find(z => z.zoneId === selectedZone);

  return (
    <div data-theme={theme}>
      <header>
        <Icon name="wifi" />
        <h1>AirGuard <span className="subtitle">Air Quality Advisor</span></h1>
        <span className="tag" style={{ color: tierColor(worstTier) }}>
          {backendOk ? `System: ${TIER_LABEL[worstTier]}` : "Backend unreachable"}
        </span>
        {traffic && (
          <span className="tag"><Icon name={traffic.liveStatus === "LIVE" ? "wifi" : "wifiOff"} /> {traffic.liveStatus}</span>
        )}
        <span className="tag">{clock}</span>
        <div className="spacer" />
        <button className="iconbtn" onClick={() => exportZonesCsv(zones)}>Export CSV</button>
        <button className="iconbtn" onClick={() => setSettingsOpen(true)}>Settings</button>
        <button className="iconbtn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>Theme</button>
      </header>

      <main>
        <div className="section-title">Priority ranking</div>
        <div className="priority-strip">
          {zones.map((z, i) => (
            <div key={z.zoneId} className={`priority-chip ${i === 0 ? "top" : ""}`}>
              <span className="dot" style={{ background: tierColor(displayTier(z)) }} />
              <Icon name={z.icon} />
              <span>{capitalize(z.zoneId)}</span>
              <b>{z.priorityScore}</b>
              {i === 0 && <span className="first-tag">Needs attention first</span>}
            </div>
          ))}
        </div>

        <div className="section-title">Zones</div>
        <div className="grid">
          {zones.map(z => {
            const tier = displayTier(z);
            const color = tierColor(tier);
            const expMin = exposureMinutes(z.history);
            return (
              <div key={z.zoneId} className="card" style={{ borderLeft: `3px solid ${color}` }} onClick={() => setSelectedZone(z.zoneId)}>
                <div className="card-top">
                  <Icon name={z.icon} />
                  <span className="name">{capitalize(z.zoneId)}</span>
                  <span className="status-pill" style={{ background: color + "22", color }}>{TIER_LABEL[tier]}</span>
                </div>
                <div className="card-sub">
                  <span className="livetag">{z.liveStatus}</span>
                  <span className="timestamp">{z.latest.timestamp.split("T")[1]}</span>
                </div>
                <div className="readings">
                  <div>CO2 <b>{z.latest.co2}</b></div>
                  <div>PM2.5 <b>{z.latest.pm25}</b></div>
                  <div>Temp <b>{z.latest.temp}C</b></div>
                  <div>Humidity <b>{z.latest.humidity}%</b></div>
                </div>
                <div className="trend-row">
                  <Icon name={trendIconKey(z.trend.label)} /> {z.trend.label} - {z.trend.ratePerMin}/min
                </div>
                {expMin > 0 && (
                  <div className="exposure-badge">Exposure: {expMin} min above Poor</div>
                )}
                <svg className="spark" viewBox="0 0 260 34" preserveAspectRatio="none">
                  <polyline points={sparklinePoints(z.sparkline)} fill="none" stroke={color} strokeWidth="2" />
                </svg>
                <div className="gauge-wrap">
                  <div className="gauge-track"><div className="gauge-fill" style={{ width: `${z.priorityScore}%`, background: color }} /></div>
                  <div className="gauge-label"><span>Priority score</span><span>{z.priorityScore}</span></div>
                </div>
              </div>
            );
          })}
        </div>

        {selected && (
          <div className="detail open">
            <div className="detail-head">
              <Icon name={selected.icon} />
              <div>
                <div className="detail-name">{capitalize(selected.zoneId)} - {TIER_LABEL[displayTier(selected)]}</div>
                <div className="livetag">{selected.liveStatus}</div>
              </div>
              <button className="iconbtn close-btn" onClick={() => setSelectedZone(null)}>Close</button>
            </div>
            <div className="detail-grid">
              <div>
                <div className="chartbox"><canvas ref={chartRef}></canvas></div>
                <div className="eta-box">
                  {selected.timeToNextTier
                    ? `Will reach Tier ${selected.timeToNextTier.nextTier} in about ${selected.timeToNextTier.minutes} min, around ${selected.timeToNextTier.etaClockTime}.`
                    : "No tier breach currently expected on the recent trend."}
                </div>
                <div className="eta-box">Exposure so far: {exposureMinutes(selected.history)} min at Poor/Severe.</div>
              </div>
              <div>
                <div className="rec-box">
                  <b>Recommendation</b><br />{selected.recommendation}<br /><br />
                  <span className="muted">Reason: Risk {selected.latest.risk} (Tier {displayTier(selected)}), trend {selected.trend.label} at {selected.trend.ratePerMin}/min.</span>
                </div>
                <div className="rec-box" style={{ marginTop: 10 }}>
                  <b>Zone contact</b><br />{selected.contact.name}<br />{selected.contact.phone}<br />
                  <span className="muted">Auto-dialed if this zone reaches Tier 3 or above.</span>
                </div>
                <div style={{ marginTop: 10 }}>
                  <QrPanel zoneId={selected.zoneId} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="section-title">Ventilation control</div>
        <div className="vent-panel">
          <Icon name="wifi" />
          <div className="vent-decision">
            {!worstZone ? "Assessing outside air..." : displayTier(worstZone) <= 2 ? (
              <>Outside air: clean - <span style={{ color: "var(--good)" }}>intake fresh air</span> (fan running in Auto mode)</>
            ) : (
              <>Outside air: polluted - <span style={{ color: "var(--severe)" }}>exhaust and filter, do not intake</span> (fan switched to filtration in Auto mode)</>
            )}
          </div>
        </div>

        <div className="section-title">Alerts feed</div>
        <div className="alert-list">
          {alerts.length === 0 && <div className="muted">No alerts yet.</div>}
          {alerts.map((a, i) => (
            <div key={i} className={`alert ${a.acknowledged ? "ack" : ""} ${isEscalated(a) ? "escalated" : ""}`}>
              <div>
                <b>{capitalize(a.zone)}</b> - {a.severity} {isEscalated(a) && <span className="escalated-tag">ESCALATED</span>}
                <div className="meta">{a.timestamp} - {a.reason}</div>
                <div className="meta">Action: {a.action}</div>
              </div>
              {!a.acknowledged && (
                <button className="ack-btn" onClick={async () => { await ackAlert(i); setAlerts(await fetchAlerts()); }}>Acknowledge</button>
              )}
            </div>
          ))}
        </div>
      </main>

      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        thresholds={thresholds}
        setThresholds={setThresholds}
        onSpike={triggerSpike}
        zoneIds={zones.map(z => z.zoneId)}
      />

      <footer>AirGuard polls the backend every 5s - Traffic zone uses live ESP32 data when reachable</footer>
    </div>
  );
}
