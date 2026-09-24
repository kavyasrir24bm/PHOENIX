/* =========================================================
   AIRQUALITY ADVISOR
   FRONTEND CONTROLLER
========================================================= */


/* =========================================================
   ZONE CONFIGURATION
========================================================= */

const zones = [

  {
    name: "Hospital",
    score: 99,
    source: "SIMULATED"
  },

  {
    name: "School",
    score: 76,
    source: "SIMULATED"
  },

  {
    name: "Residential",
    score: 77,
    source: "SIMULATED"
  },

  {
    name: "Traffic",
    score: 21,
    source: "LIVE HW"
  },

  {
    name: "Industry",
    score: 30,
    source: "SIMULATED"
  }

];


let selectedZone = 3;


/* =========================================================
   SENSOR DATA
========================================================= */

let sensorData = {

  mq135: 213,

  dust: 4.1,

  temp: 29.2,

  humidity: 64

};


/* =========================================================
   HISTORY
========================================================= */

let history = {

  mq135: [],

  dust: [],

  temp: [],

  humidity: []

};


/* =========================================================
   START
========================================================= */

window.addEventListener(
  "DOMContentLoaded",
  () => {

    startClock();

    buildZoneStrip();

    selectZone(selectedZone);

    updateDashboard();

    setupFanControl();

    setupMuteButton();

    setupQRButton();

    startDataLoop();

  }
);


/* =========================================================
   CLOCK
========================================================= */

function startClock() {

  const clock =
    document.getElementById("clock");


  function updateClock() {

    const now = new Date();


    clock.textContent =
      now.toLocaleString(
        "en-IN",
        {
          dateStyle: "short",
          timeStyle: "medium"
        }
      );

  }


  updateClock();

  setInterval(
    updateClock,
    1000
  );

}


/* =========================================================
   BUILD ZONE STRIP
========================================================= */

function buildZoneStrip() {

  const container =
    document.getElementById(
      "zone-strip"
    );


  container.innerHTML = "";


  zones.forEach(
    (zone, index) => {

      const element =
        document.createElement("div");


      element.className =
        "zone";


      element.dataset.index =
        index;


      const category =
        getCategory(zone.score);


      element.innerHTML = `

        <div class="zone-name">
          ${zone.name}
        </div>

        <div class="zone-score">
          ${zone.score}
        </div>

        <div class="zone-status">
          ${category.label}
        </div>

        <div class="zone-source">
          ${zone.source === "LIVE HW"
            ? "🔴 LIVE HW"
            : "🔵 SIMULATED"}
        </div>

      `;


      element.addEventListener(
        "click",
        () => {

          selectZone(index);

        }
      );


      container.appendChild(
        element
      );

    }
  );

}


/* =========================================================
   SELECT ZONE
========================================================= */

function selectZone(index) {

  selectedZone = index;


  document
    .querySelectorAll(".zone")
    .forEach(
      (element, i) => {

        element.classList.toggle(
          "active",
          i === index
        );

      }
    );


  updateDashboard();

}


/* =========================================================
   CATEGORY
========================================================= */

function getCategory(score) {

  /*
    This is a PROJECT PRIORITY SCORE.

    It is not automatically equivalent
    to official CPCB AQI unless the
    backend performs the required
    pollutant-specific AQI calculation.
  */


  if (score <= 50) {

    return {

      label: "Good 🟢",

      level: "GOOD"

    };

  }


  if (score <= 100) {

    return {

      label: "Satisfactory 🟡",

      level: "SATISFACTORY"

    };

  }


  if (score <= 200) {

    return {

      label: "Moderate 🟠",

      level: "MODERATE"

    };

  }


  if (score <= 300) {

    return {

      label: "Poor 🔴",

      level: "POOR"

    };

  }


  if (score <= 400) {

    return {

      label: "Very Poor 🟣",

      level: "VERY POOR"

    };

  }


  return {

    label: "Severe 🟤",

    level: "SEVERE"

  };

}


/* =========================================================
   UPDATE DASHBOARD
========================================================= */

function updateDashboard() {

  const zone =
    zones[selectedZone];


  const category =
    getCategory(zone.score);


  /* SCORE */

  document.getElementById(
    "zone-title"
  ).textContent =
    `${zone.name} · Priority Score`;


  document.getElementById(
    "aqi-value"
  ).textContent =
    zone.score;


  document.getElementById(
    "aqi-status"
  ).textContent =
    category.label;


  /* BAR */

  const bar =
    document.getElementById(
      "aqi-bar-fill"
    );


  const percentage =
    Math.min(
      zone.score,
      100
    );


  bar.style.width =
    percentage + "%";


  /* SENSOR VALUES */

  document.getElementById(
    "mq135"
  ).textContent =
    sensorData.mq135.toFixed(0);


  document.getElementById(
    "dust"
  ).textContent =
    sensorData.dust.toFixed(1);


  document.getElementById(
    "temp"
  ).textContent =
    sensorData.temp.toFixed(1);


  document.getElementById(
    "humidity"
  ).textContent =
    sensorData.humidity.toFixed(0);


  /* ZONE INFO */

  document.getElementById(
    "info-zone"
  ).textContent =
    zone.name;


  document.getElementById(
    "info-source"
  ).textContent =
    zone.source;


  document.getElementById(
    "info-mode"
  ).textContent =
    zone.source === "LIVE HW"
      ? "Live Sensor"
      : "Simulation";


  /* LOG */

  document.getElementById(
    "log-zone-name"
  ).textContent =
    zone.name;


  updateAction(category.level);


  updateAlert(zone, category);

}


/* =========================================================
   ACTION LOGIC
========================================================= */

function updateAction(level) {

  const title =
    document.getElementById(
      "action-title"
    );


  const description =
    document.getElementById(
      "action-description"
    );


  const badge =
    document.getElementById(
      "action-level"
    );


  if (level === "GOOD") {

    title.textContent =
      "Continue Monitoring";


    description.textContent =
      "Air-quality indicators are currently within the normal project threshold. No ventilation intervention is required.";


    badge.textContent =
      "NORMAL";


  }

  else if (
    level === "SATISFACTORY"
  ) {

    title.textContent =
      "Increase Monitoring";


    description.textContent =
      "Maintain monitoring and consider reducing prolonged exposure for sensitive individuals if the trend continues upward.";


    badge.textContent =
      "WATCH";


  }

  else if (
    level === "MODERATE"
  ) {

    title.textContent =
      "Increase Ventilation";


    description.textContent =
      "Increase ventilation and monitor the zone closely. Sensitive individuals should reduce prolonged exposure if conditions worsen.";


    badge.textContent =
      "MODERATE";


  }

  else if (
    level === "POOR"
  ) {

    title.textContent =
      "Ventilation Required";


    description.textContent =
      "Activate appropriate ventilation or filtration and reduce prolonged exposure until the readings improve.";


    badge.textContent =
      "HIGH";


  }

  else if (
    level === "VERY POOR"
  ) {

    title.textContent =
      "High-Priority Response";


    description.textContent =
      "Use the available ventilation and filtration controls and restrict unnecessary exposure while monitoring the zone.";


    badge.textContent =
      "VERY HIGH";


  }

  else {

    title.textContent =
      "Emergency Response";


    description.textContent =
      "Use available protective and ventilation measures and follow the site's emergency air-quality procedure.";


    badge.textContent =
      "SEVERE";

  }

}


/* =========================================================
   ALERT
========================================================= */

function updateAlert(
  zone,
  category
) {

  const banner =
    document.getElementById(
      "alert-banner"
    );


  const text =
    document.getElementById(
      "alert-text"
    );


  if (
    category.level === "POOR" ||
    category.level === "VERY POOR" ||
    category.level === "SEVERE"
  ) {

    banner.classList.remove(
      "hidden"
    );


    const simulationText =
      zone.source === "SIMULATED"
        ? " · SIMULATED DATA"
        : "";


    text.textContent =
      `⚠ ${zone.name} requires attention — priority score ${zone.score}${simulationText}.`;

  }

  else {

    banner.classList.add(
      "hidden"
    );

  }

}


/* =========================================================
   FAN CONTROL
========================================================= */

function setupFanControl() {

  const toggle =
    document.getElementById(
      "fan-toggle"
    );


  const state =
    document.getElementById(
      "fan-state"
    );


  const hint =
    document.getElementById(
      "source-hint"
    );


  toggle.addEventListener(
    "change",
    async () => {

      const isOn =
        toggle.checked;


      state.textContent =
        isOn
          ? "ON"
          : "OFF";


      hint.textContent =
        isOn
          ? "Relay channel 1 · manual override ON"
          : "Relay channel 1 · manual override OFF";


      /*
        BACKEND CONNECTION GOES HERE.

        Example:

        await fetch(
          "http://YOUR_SERVER_IP:5000/api/fan",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              state: isOn
                ? "ON"
                : "OFF"
            })
          }
        );
      */

    }
  );

}


/* =========================================================
   SOUND BUTTON
========================================================= */

function setupMuteButton() {

  const button =
    document.getElementById(
      "mute-btn"
    );


  let muted = false;


  button.addEventListener(
    "click",
    () => {

      muted =
        !muted;


      button.textContent =
        muted
          ? "🔇 Muted"
          : "🔊 Sound";

    }
  );

}


/* =========================================================
   QR BUTTON
========================================================= */

function setupQRButton() {

  const button =
    document.getElementById(
      "qr-btn"
    );


  button.addEventListener(
    "click",
    () => {

      /*
        Replace this with your
        actual QR scanner implementation.
      */


      alert(
        "QR Scanner ready. Scan the QR code displayed on the sensor unit."
      );

    }
  );

}


/* =========================================================
   DATA LOOP
========================================================= */

function startDataLoop() {

  /*
    CURRENT DEMO MODE

    This generates small changes so
    the dashboard looks live.

    Later replace this section with
    fetch() / WebSocket data from
    the backend.
  */


  setInterval(
    () => {

      simulateLiveData();

      updateDashboard();

      addReadingToLog();

    },
    3000
  );

}


/* =========================================================
   SIMULATED LIVE DATA
========================================================= */

function simulateLiveData() {

  /*
    Only Traffic represents
    the current live hardware node.

    The other zones remain simulated.
  */


  const noise =
    (Math.random() - 0.5);


  sensorData.mq135 =
    Math.max(
      0,
      sensorData.mq135 +
      noise * 15
    );


  sensorData.dust =
    Math.max(
      0,
      sensorData.dust +
      noise * 2
    );


  sensorData.temp =
    sensorData.temp +
    noise * 0.5;


  sensorData.humidity =
    Math.max(
      0,
      Math.min(
        100,
        sensorData.humidity +
        noise * 2
      )
    );


  /* STORE HISTORY */

  history.mq135.push(
    sensorData.mq135
  );


  history.dust.push(
    sensorData.dust
  );


  history.temp.push(
    sensorData.temp
  );


  history.humidity.push(
    sensorData.humidity
  );


  /* KEEP LAST 20 */

  Object.keys(history)
    .forEach(
      key => {

        if (
          history[key].length > 20
        ) {

          history[key].shift();

        }

      }
    );

}


/* =========================================================
   LOG
========================================================= */

function addReadingToLog() {

  const list =
    document.getElementById(
      "log-list"
    );


  const now =
    new Date();


  const time =
    now.toLocaleTimeString(
      "en-IN"
    );


  const item =
    document.createElement(
      "li"
    );


  item.textContent =

    `${time} · ` +
    `MQ135 ${sensorData.mq135.toFixed(0)} ppm · ` +
    `Dust ${sensorData.dust.toFixed(1)} µg/m³ · ` +
    `${sensorData.temp.toFixed(1)}°C / ` +
    `${sensorData.humidity.toFixed(0)}%`;


  list.prepend(item);


  while (
    list.children.length > 8
  ) {

    list.removeChild(
      list.lastChild
    );

  }

}


/* =========================================================
   BACKEND DATA FUNCTION
========================================================= */

/*

  WHEN YOUR BACKEND IS READY:

  Replace the simulation with something
  like this.

*/


async function getESP32Data() {

  try {

    const response =
      await fetch(
        "http://YOUR_BACKEND_IP:5000/api/sensor-data"
      );


    if (!response.ok) {

      throw new Error(
        "Backend unavailable"
      );

    }


    const data =
      await response.json();


    /*
      Expected example:

      {
        mq135: 213,
        dust: 4.1,
        temperature: 29.2,
        humidity: 64
      }
    */


    sensorData.mq135 =
      data.mq135;


    sensorData.dust =
      data.dust;


    sensorData.temp =
      data.temperature;


    sensorData.humidity =
      data.humidity;


    setConnectionStatus(
      true
    );


    updateDashboard();


  }

  catch (error) {

    console.error(
      "ESP32 connection error:",
      error
    );


    setConnectionStatus(
      false
    );

  }

}


/* =========================================================
   CONNECTION STATUS
========================================================= */

function setConnectionStatus(
  connected
) {

  const status =
    document.getElementById(
      "conn-status"
    );


  if (connected) {

    status.textContent =
      "● Live";


    status.className =
      "status-pill status-live";

  }

  else {

    status.textContent =
      "● Hardware Offline";


    status.className =
      "status-pill status-offline";

  }

}