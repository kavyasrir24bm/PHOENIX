#include "shared_types.h"
#include "sensors.h"
#include "simulation.h"
#include "trend_logic.h"

ZoneData allZones[5];

void setup() {
  Serial.begin(115200);
  randomSeed(analogRead(0));

  initSensors();
  initRelay();
  initSimZones(allZones, 1, 4);
  initTrendHistory();
}

void loop() {
  readRealSensor(allZones[0]);
  simulateZones(allZones, 1, 4);
  calculateTrendsAndTiers(allZones, 5);

  bool anyTier3 = false;
  for (int i = 0; i < 5; i++) {
    if (allZones[i].tier == 3) anyTier3 = true;
  }
  setRelay(anyTier3);

  for (int i = 0; i < 5; i++) {
    Serial.print(allZones[i].name);
    Serial.print(" | CO2: "); Serial.print(allZones[i].co2);
    Serial.print(" | PM2.5: "); Serial.print(allZones[i].pm25);
    Serial.print(" | Risk: "); Serial.print(allZones[i].riskScore);
    Serial.print(" | Tier: "); Serial.println(allZones[i].tier);
  }
  Serial.println("==============================");

  delay(2000);
}