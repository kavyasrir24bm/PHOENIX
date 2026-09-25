// Shared constants + small helpers used by the components.
// Kept out of the component files so icons/colors/math don't clutter the JSX.

export const API = "http://localhost:5000/api";

export const TIER_COLOR = {
  1: "var(--good)",
  2: "var(--moderate)",
  3: "var(--poor)",
  4: "var(--severe)"
};

export const TIER_LABEL = { 1: "Good", 2: "Moderate", 3: "Poor", 4: "Severe" };

export const ICONS = {
  hospital:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 8v6M9 11h6"/><path d="M9 21v-4h6v4"/></svg>',
  school:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.5 2.5 3 6 3s6-1.5 6-3v-5"/></svg>',
  home:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/></svg>',
  factory:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 21V9l6 4V9l6 4V6l7 5v10H2Z"/></svg>',
  car:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 17h14M5 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm14 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM3 17l1.5-6.5A2 2 0 0 1 6.4 9h11.2a2 2 0 0 1 1.9 1.5L21 17"/></svg>',
  wifi:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0M12 20h.01"/></svg>',
  wifiOff:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5.3-2.7M19 13a10 10 0 0 0-3-2.2M12 20h.01"/></svg>',
  trendUp:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--severe)" stroke-width="2"><path d="M3 17 9 11 13 15 21 7M21 7h-6M21 7v6"/></svg>',
  trendDown:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--good)" stroke-width="2"><path d="M3 7 9 13 13 9 21 17M21 17h-6M21 17v-6"/></svg>',
  minus:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2"><path d="M5 12h14"/></svg>'
};

export function tierColor(tier) {
  return TIER_COLOR[tier] || "var(--muted)";
}

export function trendIconKey(label) {
  if (label === "Deteriorating") return "trendUp";
  if (label === "Improving") return "trendDown";
  return "minus";
}

export function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function sparklinePoints(values, w = 260, h = 34) {
  if (!values || values.length < 2) return "";
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
}

export async function fetchZones() {
  const res = await fetch(`${API}/zones`);
  if (!res.ok) throw new Error("zones fetch failed");
  return res.json();
}

export async function fetchAlerts() {
  const res = await fetch(`${API}/alerts`);
  if (!res.ok) throw new Error("alerts fetch failed");
  return res.json();
}

export async function ackAlert(index) {
  await fetch(`${API}/alerts/ack`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ index })
  });
}

export async function triggerSpike(zone = "residential") {
  await fetch(`${API}/simulate/spike`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ zone })
  });
}

export function exposureMinutes(history, pollIntervalSeconds = 5) {
  const dangerousReadings = history.filter(r => r.tier >= 3).length;
  return Math.round(((dangerousReadings * pollIntervalSeconds) / 60) * 10) / 10;
}

export function tierForRiskWithThresholds(risk, thresholds) {
  for (const tier of [1, 2, 3, 4]) {
    const [lo, hi] = thresholds[tier];
    if (risk >= lo && risk < hi) return tier;
  }
  return 4;
}

export const DEFAULT_THRESHOLDS = {
  1: [0, 10],
  2: [10, 25],
  3: [25, 50],
  4: [50, Infinity]
};

export function isEscalated(alert, minutes = 5) {
  if (alert.acknowledged) return false;
  const age = (Date.now() - new Date(alert.timestamp).getTime()) / 60000;
  return age > minutes;
}

export function exportZonesCsv(zones) {
  const headers = ["zone", "timestamp", "co2", "pm25", "temp", "humidity", "risk", "tier", "trend", "priorityScore"];
  const rows = zones.map(z => [
    z.zoneId,
    z.latest.timestamp,
    z.latest.co2,
    z.latest.pm25,
    z.latest.temp,
    z.latest.humidity,
    z.latest.risk,
    z.latest.tier,
    z.trend.label,
    z.priorityScore
  ]);
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `airguard-snapshot-${new Date().toISOString().slice(0, 19)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
