import React from "react";

export default function Settings({ open, onClose, thresholds, setThresholds, onSpike, zoneIds }) {
  const [spikeZone, setSpikeZone] = React.useState(zoneIds[0] || "residential");

  function updateThreshold(tier, bound, value) {
    setThresholds(prev => ({
      ...prev,
      [tier]: bound === "lo" ? [Number(value), prev[tier][1]] : [prev[tier][0], Number(value)]
    }));
  }

  if (!open) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-head">
          <b>Settings</b>
          <button className="iconbtn" onClick={onClose}>Close</button>
        </div>

        <div className="drawer-section">
          <div className="drawer-label">Tier thresholds (risk score)</div>
          {[1, 2, 3, 4].map(tier => (
            <div key={tier} className="threshold-row">
              <span className="threshold-tier">Tier {tier}</span>
              <input
                type="number"
                value={thresholds[tier][0]}
                onChange={e => updateThreshold(tier, "lo", e.target.value)}
              />
              <span>to</span>
              <input
                type="number"
                value={thresholds[tier][1] === Infinity ? "" : thresholds[tier][1]}
                placeholder="infinity"
                onChange={e => updateThreshold(tier, "hi", e.target.value || Infinity)}
              />
            </div>
          ))}
          <div className="drawer-hint">Recomputes the colors/tiers shown here only - the backend's own thresholds decide when auto-dial fires.</div>
        </div>

        <div className="drawer-section">
          <div className="drawer-label">Demo: trigger a pollution spike</div>
          <div className="threshold-row">
            <select value={spikeZone} onChange={e => setSpikeZone(e.target.value)}>
              {zoneIds.map(id => (
                <option key={id} value={id}>{id[0].toUpperCase() + id.slice(1)}</option>
              ))}
            </select>
            <button className="iconbtn" onClick={() => onSpike(spikeZone)}>Trigger</button>
          </div>
        </div>

        <div className="drawer-section">
          <div className="drawer-label">Polling</div>
          <div className="drawer-hint">Backend polls every 5s (POLL_INTERVAL_MS in server.js). Change it server-side.</div>
        </div>
      </div>
    </div>
  );
}
