#include "simulation.h"

void initSimZones(ZoneData zones[], int startIdx, int count) {
  String names[4]       = {"Industry Zone", "Hospital Zone", "Residential Zone", "Traffic Junction"};
  String sensitivity[4] = {"low", "high", "medium", "medium"};
  float baseAQ[4]        = {300, 90, 90, 140};
  float baseTemp[4]      = {35, 26, 30, 29};
  float baseHumidity[4]  = {55, 55, 60, 60};

  for (int i = 0; i < count; i++) {
    int z = startIdx + i;
    zones[z].name = names[i];
    zones[z].sensitivity = sensitivity[i];
    zones[z].co2 = baseAQ[i];
    zones[z].pm25 = baseTemp[i];
    zones[z].humidity = baseHumidity[i];
    zones[z].isReal = false;
  }
}

void simulateZones(ZoneData zones[], int startIdx, int count) {
  for (int i = 0; i < count; i++) {
    int z = startIdx + i;

    float aqNoise = random(-10, 11);
    float tempNoise = random(-1, 2);
    float humNoise = random(-3, 4);

    float aqSpike = (random(0, 100) < 5) ? random(30, 80) : 0;

    float drift = (zones[z].sensitivity == "low") ? 1.5 :
                  (zones[z].sensitivity == "medium") ? 0.7 : 0.2;

    zones[z].co2 = constrain(zones[z].co2 + aqNoise + aqSpike + drift, 40, 500);
    zones[z].pm25 = constrain(zones[z].pm25 + tempNoise, 20, 45);
    zones[z].humidity = constrain(zones[z].humidity + humNoise, 40, 75);
  }
}