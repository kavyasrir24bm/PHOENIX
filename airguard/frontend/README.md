# AirGuard frontend

React + Vite dashboard for AirGuard. Talks to the backend at
http://localhost:5000.

## Run

    npm install
    npm run dev

Opens on http://localhost:5173. Make sure the backend (../backend) is
running first with `npm start`.

## src/ layout

- main.jsx    - entry point, mounts React to #root
- App.jsx      - top-level component, renders Dashboard
- Dashboard.jsx - the whole dashboard UI
- Settings.jsx  - settings drawer
- QrPanel.jsx   - QR code component
- script.js     - shared constants, icons, helper functions
- style.css     - all CSS
