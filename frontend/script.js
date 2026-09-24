// ---------- DEMO AUTH (client-side only — swap for real backend later) ----------
const DEMO_USER = "admin";
const DEMO_PASS = "aqi2026";

const loginScreen = document.getElementById("login-screen");
const dashScreen = document.getElementById("dashboard-screen");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const userTag = document.getElementById("user-tag");
const logoutBtn = document.getElementById("logout-btn");

function showDashboard(username){
  loginScreen.classList.add("hidden");
  dashScreen.classList.remove("hidden");
  userTag.textContent = username;
  startClock();
  startDataLoop();
}

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value.trim();

  if (u === DEMO_USER && p === DEMO_PASS) {
    sessionStorage.setItem("aq_user", u);
    loginError.textContent = "";
    showDashboard(u);
  } else {
    loginError.textContent = "Invalid operator ID or access code.";
  }
});

logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem("aq_user");
  dashScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  loginForm.reset();
});

// auto-login if session already active
window.addEventListener("DOMContentLoaded", () => {
  const savedUser = sessionStorage.getItem("aq_user");
  if (savedUser) showDashboard(savedUser);
});

// ---------- CLOCK ----------
function startClock(){
  const clock = document.getElementById("clock");
  const tick = () => { clock.textContent = new Date().toLocaleString(); };
  tick();
  setInterval(tick, 1000);
}

// ---------- FAKE SENSOR DATA (replace with fetch() to backend later) ----------
const history = { mq135: [], dust: [], temp: [], humidity: [] };
const HISTORY_LEN = 20;

function randomWalk(prev, min, max, step){
  let next = prev + (Math.random() - 0.5) * step;
  return Math.max(min, Math.min(max, next));
}

let state = { mq135: 380, dust: 15, temp: 27.5, humidity: 60 };

function updateReadings(){
  state.mq135 = randomWalk(state.mq135, 150, 700, 40);
  state.dust = randomWalk(state.dust, 2, 60, 5);
  state.temp = randomWalk(state.temp, 20, 36, 0.6);
  state.humidity = randomWalk(state.humidity, 30, 90, 3);

  document.getElementById("mq135").textContent = Math.round(state.mq135);
  document.getElementById("dust").textContent = state.dust.toFixed(1);
  document.getElementById("temp").textContent = state.temp.toFixed(1);
  document.getElementById("humidity").textContent = Math.round(state.humidity);

  pushHistory("mq135", state.mq135);
  pushHistory("dust", state.dust);
  pushHistory("temp", state.temp);
  pushHistory("humidity", state.humidity);

  drawSpark("mq135-chart", history.mq135);
  drawSpark("dust-chart", history.dust);
  drawSpark("temp-chart", history.temp);
  drawSpark("humidity-chart", history.humidity);

  updateAQI(state.mq135, state.dust);
  logReading();
}

function pushHistory(key, val){
  history[key].push(val);
  if (history[key].length > HISTORY_LEN) history[key].shift();
}

function updateAQI(mq135, dust){
  const score = Math.round((mq135 / 700) * 60 + (dust / 60) * 40);
  const aqiEl = document.getElementById("aqi-value");
  const statusEl = document.getElementById("aqi-status");
  const barEl = document.getElementById("aqi-bar-fill");

  aqiEl.textContent = score;
  barEl.style.width = Math.min(100, score) + "%";

  let label, color;
  if (score < 35) { label = "Good 🟢"; color = "#4ee6a4"; }
  else if (score < 65) { label = "Moderate 🟡"; color = "#e6b34e"; }
  else { label = "Poor 🔴"; color = "#e65a4e"; }

  statusEl.textContent = label;
  statusEl.style.color = color;
  barEl.style.background = color;
}

function logReading(){
  const list = document.getElementById("log-list");
  const li = document.createElement("li");
  const time = new Date().toLocaleTimeString();
  li.innerHTML = `<span>${time}</span><span>MQ135 ${Math.round(state.mq135)}ppm · Dust ${state.dust.toFixed(1)}µg/m³ · ${state.temp.toFixed(1)}°C / ${Math.round(state.humidity)}%</span>`;
  list.prepend(li);
  while (list.children.length > 8) list.removeChild(list.lastChild);
}

function drawSpark(canvasId, data){
  const canvas = document.getElementById(canvasId);
  if (!canvas || data.length < 2) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w; canvas.height = h;
  ctx.clearRect(0, 0, w, h);

  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;

  ctx.beginPath();
  data.forEach((val, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((val - min) / range) * h;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#4ee6a4";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function startDataLoop(){
  updateReadings();
  setInterval(updateReadings, 2000);
}

// ---------- FAN TOGGLE ----------
document.getElementById("fan-toggle").addEventListener("change", (e) => {
  document.getElementById("fan-state").textContent = e.target.checked ? "ON" : "OFF";
});

// ---------- QR BUTTON (stub) ----------
document.getElementById("qr-btn").addEventListener("click", () => {
  alert("Plug in your QR scanner logic here (e.g. a library like html5-qrcode).");
});