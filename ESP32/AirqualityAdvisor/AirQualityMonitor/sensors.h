#ifndef SENSORS_H
#define SENSORS_H
#include "shared_types.h"

void initSensors();
void readRealSensor(ZoneData &zone);
void initRelay();
void setRelay(bool state);

#endif