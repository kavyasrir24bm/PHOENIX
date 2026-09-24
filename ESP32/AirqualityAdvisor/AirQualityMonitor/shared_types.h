#ifndef SHARED_TYPES_H
#define SHARED_TYPES_H
#include <Arduino.h>

struct ZoneData {
  String name;
  String sensitivity;
  float co2, pm25, humidity;
  float riskScore;
  int tier;
  bool isReal;
};
#endif