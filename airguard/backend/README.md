# AirGuard backend

Node/Express API: zone simulation, risk/tier engine, ESP32 traffic proxy, auto-dial stub.

## Run

    npm install
    npm start

Serves on http://localhost:5000. Requires Node 18+ (uses the built-in `fetch`).

## Connecting the real ESP32

Set `ESP32_URL` at the top of `server.js` to your board's IP, e.g.
`http://192.168.1.50/api/traffic`. It should serve JSON like:

    { "mq135": 420, "pm": 30, "temp": 27.5, "humidity": 60 }

If the request fails or times out, the Traffic zone falls back to simulation
automatically and the card shows "SIMULATED FALLBACK".

## Making the auto-dial a real phone call

`dialZoneContact()` currently just logs to the console and pushes an alert.
To make it call the zone's management number for real:

1. `npm install twilio`
2. Get a Twilio account SID, auth token, and phone number.
3. Uncomment the Twilio block inside `dialZoneContact()` in `server.js` and
   set your credentials as environment variables.
4. Replace the placeholder numbers in `ZONE_CONTACTS` with real ones.

`DIAL_COOLDOWN_MINUTES` stops it calling the same zone repeatedly during one
sustained event.

## Tiers

| Tier | Label    | Risk range | Triggers a call |
|------|----------|-----------|------------------|
| 1    | Good     | 0-10      | no |
| 2    | Moderate | 10-25     | no |
| 3    | Poor     | 25-50     | yes |
| 4    | Severe   | 50+       | yes |

Risk = smoothed `CO2 * 0.02 + PM2.5 * 0.30`. Tune `TIER_THRESHOLDS` and the
`RISK_WEIGHT_*` constants to your real sensor ranges.
