/* =========================================================
   ZONE CONFIGURATION
========================================================= */

const zones = [
  { name: "Hospital", score: 99, source: "SIMULATED" },
  { name: "School", score: 76, source: "SIMULATED" },
  { name: "Residential", score: 77, source: "SIMULATED" },
  { name: "Traffic", score: 21, source: "LIVE HW" },
  { name: "Industry", score: 30, source: "SIMULATED" }
];

let selectedZone = 3;

/* =========================================================
   SENSOR DATA & HISTORY
========================================================= */

let sensorData = {
  mq135: 213,
  dust: 4.1,
  temp: 29.2,
  humidity: 64
};

let history = {
  mq135: [],
  dust: [],
  temp: [],
  humidity: []
};

let html5QrcodeScanner = null;

/* =========================================================
   START
========================================================= */

window.addEventListener("DOMContentLoaded", () => {
  startClock();
  buildZoneStrip();
  selectZone(selectedZone);
  updateDashboard();
  setupFanControl();
  setupMuteButton();
  setupQRButton();
  startDataLoop();
});

/* =========================================================
   CLOCK
========================================================= */

function startClock() {
  const clock = document.getElementById("clock");
  function updateClock() {
    const now = new Date();
    clock.textContent = now.toLocaleString("en-IN", {
      dateStyle: "short",
      timeStyle: "medium"
    });
  }
  updateClock();
  setInterval(updateClock, 1000);
}

/* =========================================================
   BUILD ZONE STRIP & SELECT
========================================================= */

function buildZoneStrip() {
  const container = document.getElementById("zone-strip");
  container.innerHTML = "";

  zones.forEach((zone, index) => {
    const element = document.createElement("div");
    element.className = "zone";
    element.dataset.index = index;

    const category = getCategory(zone.score);

    element.innerHTML = `
      <div class="zone-name">${zone.name}</div>
      <div class="zone-score">${zone.score}</div>
      <div class="zone-status">${category.label}</div>
      <div class="zone-source">${
        zone.source === "LIVE HW" ? "🔴 LIVE HW" : "🔵 SIMULATED"
      }</div>
    `;

    element.addEventListener("click", () => selectZone(index));
    container.appendChild(element);
  });
}

function selectZone(index) {
  selectedZone = index;
  document.querySelectorAll(".zone").forEach((element, i) => {
    element.classList.toggle("active", i === index);
  });
  updateDashboard();
}

/* =========================================================
   CATEGORY
========================================================= */

function getCategory(score) {
  if (score <= 50) return { label: "Good 🟢", level: "GOOD" };
  if (score <= 100) return { label: "Satisfactory 🟡", level: "SATISFACTORY" };
  if (score <= 200) return { label: "Moderate 🟠", level: "MODERATE" };
  if (score <= 300) return { label: "Poor 🔴", level: "POOR" };
  if (score <= 400) return { label: "Very Poor 🟣", level: "VERY POOR" };
  return { label: "Severe 🟤", level: "SEVERE" };
}

/* =========================================================
   UPDATE DASHBOARD & CHARTS
========================================================= */

function updateDashboard() {
  const zone = zones[selectedZone];
  const category = getCategory(zone.score);

  document.getElementById("zone-title").textContent = `${zone.name} · Priority Score`;
  document.getElementById("aqi-value").textContent = zone.score;
  document.getElementById("aqi-status").textContent = category.label;

  const bar = document.getElementById("aqi-bar-fill");
  const percentage = Math.min(zone.score, 100);
  bar.style.width = percentage + "%";

  document.getElementById("mq135").textContent = sensorData.mq135.toFixed(0);
  document.getElementById("dust").textContent = sensorData.dust.toFixed(1);
  document.getElementById("temp").textContent = sensorData.temp.toFixed(1);
  document.getElementById("humidity").textContent = sensorData.humidity.toFixed(0);

  document.getElementById("info-zone").textContent = zone.name;
  document.getElementById("info-source").textContent = zone.source;
  document.getElementById("info-mode").textContent =
    zone.source === "LIVE HW" ? "Live Sensor" : "Simulation";

  document.getElementById("log-zone-name").textContent = zone.name;

  updateAction(category.level);
  updateAlert(zone, category);
  renderAllSparklines();
}

/* Canvas Sparkline Renderer */
function drawSparkline(canvasId, dataPoints, color = "#4ee6a4") {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (dataPoints.length < 2) return;

  const max = Math.max(...dataPoints, 1);
  const min = Math.min(...dataPoints, 0);
  const range = max - min || 1;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  const step = canvas.width / (dataPoints.length - 1);

  dataPoints.forEach((val, i) => {
    const x = i * step;
    const y = canvas.height - ((val - min) / range) * (canvas.height - 8) - 4;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
}

function renderAllSparklines() {
  drawSparkline("mq135-chart", history.mq135, "#e6b34e");
  drawSparkline("dust-chart", history.dust, "#58a6ff");
  drawSparkline("temp-chart", history.temp, "#e65a4e");
  drawSparkline("humidity-chart", history.humidity, "#4ee6a4");
}

/* =========================================================
   ACTION & ALERT LOGIC
========================================================= */

function updateAction(level) {
  const title = document.getElementById("action-title");
  const description = document.getElementById("action-description");
  const badge = document.getElementById("action-level");

  if (level === "GOOD") {
    title.textContent = "Continue Monitoring";
    description.textContent = "Air-quality indicators are currently within threshold. No intervention required.";
    badge.textContent = "NORMAL";
  } else if (level === "SATISFACTORY") {
    title.textContent = "Increase Monitoring";
    description.textContent = "Maintain monitoring. Consider reducing prolonged exposure for sensitive individuals.";
    badge.textContent = "WATCH";
  } else if (level === "MODERATE") {
    title.textContent = "Increase Ventilation";
    description.textContent = "Increase ventilation and monitor closely. Reduce prolonged exposure if conditions worsen.";
    badge.textContent = "MODERATE";
  } else if (level === "POOR") {
    title.textContent = "Ventilation Required";
    description.textContent = "Activate ventilation/filtration and reduce exposure until readings improve.";
    badge.textContent = "HIGH";
  } else if (level === "VERY POOR") {
    title.textContent = "High-Priority Response";
    description.textContent = "Use full ventilation and restrict unnecessary exposure.";
    badge.textContent = "VERY HIGH";
  } else {
    title.textContent = "Emergency Response";
    description.textContent = "Use protective measures and follow site emergency procedures.";
    badge.textContent = "SEVERE";
  }
}

function updateAlert(zone, category) {
  const banner = document.getElementById("alert-banner");
  const text = document.getElementById("alert-text");

  if (["POOR", "VERY POOR", "SEVERE"].includes(category.level)) {
    banner.classList.remove("hidden");
    const simulationText = zone.source === "SIMULATED" ? " · SIMULATED DATA" : "";
    text.textContent = `⚠ ${zone.name} requires attention — priority score ${zone.score}${simulationText}.`;
  } else {
    banner.classList.add("hidden");
  }
}

/* =========================================================
   CONTROLS & QR SCANNER
========================================================= */

function setupFanControl() {
  const toggle = document.getElementById("fan-toggle");
  const state = document.getElementById("fan-state");
  const hint = document.getElementById("source-hint");

  toggle.addEventListener("change", () => {
    const isOn = toggle.checked;
    state.textContent = isOn ? "ON" : "OFF";
    hint.textContent = isOn
      ? "Relay channel 1 · manual override ON"
      : "Relay channel 1 · manual override OFF";
  });
}

function setupMuteButton() {
  const button = document.getElementById("mute-btn");
  let muted = false;
  button.addEventListener("click", () => {
    muted = !muted;
    button.textContent = muted ? "🔇 Muted" : "🔊 Sound";
  });
}

function setupQRButton() {
  const qrBtn = document.getElementById("qr-btn");
  const qrModal = document.getElementById("qr-modal");
  const closeBtn = document.getElementById("close-qr-btn");

  qrBtn.addEventListener("click", () => {
    qrModal.classList.remove("hidden");
    if (!html5QrcodeScanner) {
      html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 250 });
      html5QrcodeScanner.render((decodedText) => {
        alert(`QR Code Scanned: ${decodedText}`);
        qrModal.classList.add("hidden");
        html5QrcodeScanner.clear();
        html5QrcodeScanner = null;
      });
    }
  });

  closeBtn.addEventListener("click", () => {
    qrModal.classList.add("hidden");
    if (html5QrcodeScanner) {
      html5QrcodeScanner.clear();
      html5QrcodeScanner = null;
    }
  });
}

/* =========================================================
   DATA SIMULATION LOOP
========================================================= */

function startDataLoop() {
  setInterval(() => {
    simulateLiveData();
    updateDashboard();
    addReadingToLog();
  }, 3000);
}

function simulateLiveData() {
  const noise = Math.random() - 0.5;

  sensorData.mq135 = Math.max(0, sensorData.mq135 + noise * 15);
  sensorData.dust = Math.max(0, sensorData.dust + noise * 2);
  sensorData.temp = sensorData.temp + noise * 0.5;
  sensorData.humidity = Math.max(0, Math.min(100, sensorData.humidity + noise * 2));

  history.mq135.push(sensorData.mq135);
  history.dust.push(sensorData.dust);
  history.temp.push(sensorData.temp);
  history.humidity.push(sensorData.humidity);

  Object.keys(history).forEach((key) => {
    if (history[key].length > 20) history[key].shift();
  });
}

function addReadingToLog() {
  const list = document.getElementById("log-list");
  const time = new Date().toLocaleTimeString("en-IN");

  const item = document.createElement("li");
  item.textContent = `${time} · MQ135 ${sensorData.mq135.toFixed(0)} ppm · Dust ${sensorData.dust.toFixed(
    1
  )} µg/m³ · ${sensorData.temp.toFixed(1)}°C / ${sensorData.humidity.toFixed(0)}%`;

  list.prepend(item);
  while (list.children.length > 8) {
    list.removeChild(list.lastChild);
  }
}