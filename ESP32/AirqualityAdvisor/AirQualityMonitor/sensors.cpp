#include "sensors.h"
#include <DHT.h>

#define MQ135_PIN 32
#define DHT_PIN 4
#define DHT_TYPE DHT11
#define DUST_LED_PIN 25
#define DUST_VO_PIN 33
#define RELAY_FAN_PIN 26
#define RELAY_BUZZER_PIN 27

DHT dht(DHT_PIN, DHT_TYPE);

void initSensors() {
  dht.begin();
  pinMode(DUST_LED_PIN, OUTPUT);
  digitalWrite(DUST_LED_PIN, HIGH);
}

void initRelay() {
  pinMode(RELAY_FAN_PIN, OUTPUT);
  pinMode(RELAY_BUZZER_PIN, OUTPUT);
  digitalWrite(RELAY_FAN_PIN, LOW);
  digitalWrite(RELAY_BUZZER_PIN, LOW);
}

float readDustSensor() {
  digitalWrite(DUST_LED_PIN, LOW);
  delayMicroseconds(280);
  int raw = analogRead(DUST_VO_PIN);
  delayMicroseconds(40);
  digitalWrite(DUST_LED_PIN, HIGH);
  delayMicroseconds(9680);

  float voltage = raw * (3.3 / 4095.0);
  float dustDensity = (voltage - 0.6) * 170.0;
  if (dustDensity < 0) dustDensity = 0;
  return dustDensity;
}

void readRealSensor(ZoneData &zone) {
  zone.name = "School Zone";
  zone.sensitivity = "high";
  zone.isReal = true;

  int mqRaw = analogRead(MQ135_PIN);
  float mqVoltage = mqRaw * (3.3 / 4095.0);
  zone.co2 = 400 + (mqVoltage * 300);

  float h = dht.readHumidity();
  if (!isnan(h)) zone.humidity = h;

  zone.pm25 = readDustSensor();
}

void setRelay(bool state) {
  digitalWrite(RELAY_FAN_PIN, state ? HIGH : LOW);
  digitalWrite(RELAY_BUZZER_PIN, state ? HIGH : LOW);
}