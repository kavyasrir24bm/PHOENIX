#include "trend_logic.h"

#define WINDOW 5
#define NUM_ZONES 5

float co2Hist[NUM_ZONES][WINDOW];
float pm25Hist[NUM_ZONES][WINDOW];

void initTrendHistory() {
  for (int z = 0; z < NUM_ZONES; z++) {
    for (int w = 0; w < WINDOW; w++) {
      co2Hist[z][w] = 0;
      pm25Hist[z][w] = 0;
    }
  }
}

void pushHistory(float hist[], float newVal) {
  for (int i = 0; i < WINDOW - 1; i++) {
    hist[i] = hist[i + 1];
  }
  hist[WINDOW - 1] = newVal;
}

float weightedAverage(float hist[]) {
  float sum = 0, weightSum = 0;
  for (int i = 0; i < WINDOW; i++) {
    float w = i + 1;
    sum += hist[i] * w;
    weightSum += w;
  }
  return sum / weightSum;
}

float slopeOf(float hist[]) {
  return (hist[WINDOW - 1] - hist[0]) / (float)(WINDOW - 1);
}

float sensitivityMultiplier(String sens) {
  if (sens == "high") return 1.5;
  if (sens == "medium") return 1.0;
  return 0.6;
}

void calculateTrendsAndTiers(ZoneData zones[], int count) {
  for (int z = 0; z < count; z++) {
    pushHistory(co2Hist[z], zones[z].co2);
    pushHistory(pm25Hist[z], zones[z].pm25);

    float co2WAvg = weightedAverage(co2Hist[z]);
    float pm25WAvg = weightedAverage(pm25Hist[z]);

    float co2Trend = slopeOf(co2Hist[z]);
    float pm25Trend = slopeOf(pm25Hist[z]);

    float compositeTrend = (co2Trend * 0.4) + (pm25Trend * 0.6);
    float severity = (co2WAvg / 100.0) + (pm25WAvg / 10.0);
    float sensMult = sensitivityMultiplier(zones[z].sensitivity);

    zones[z].riskScore = severity * (1 + compositeTrend * 0.1) * sensMult;

    if (zones[z].riskScore > 70) zones[z].tier = 3;
    else if (zones[z].riskScore > 40) zones[z].tier = 2;
    else zones[z].tier = 1;
  }
}