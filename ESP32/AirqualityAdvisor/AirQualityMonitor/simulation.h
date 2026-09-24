#ifndef SIMULATION_H
#define SIMULATION_H
#include "shared_types.h"

void initSimZones(ZoneData zones[], int startIdx, int count);
void simulateZones(ZoneData zones[], int startIdx, int count);

#endif