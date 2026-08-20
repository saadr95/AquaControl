#pragma once
#include <NewPing.h>
#include "config.h"

// ── Ultrasonic sensor objects ────────────────────────────────
NewPing sonar_under(TRIG_UNDER, ECHO_UNDER, MAX_DISTANCE_CM);
NewPing sonar_roof(TRIG_ROOF, ECHO_ROOF, MAX_DISTANCE_CM);

// ── Raw distance reading with median filter ─────────────────
// Takes several pings, keeps the valid ones, and returns their MEDIAN.
// Median (not average) throws out the occasional wild spike an empty /
// noisy tank produces, and multiple attempts give a flaky sensor more
// chances to return at least one clean echo (fewer false -1 errors).
int readDistance(NewPing &sonar) {
  int vals[SENSOR_READINGS];
  int valid = 0;

  for (int i = 0; i < SENSOR_READINGS; i++) {
    delay(30);  // JSN-SR04T needs 29ms minimum between pings
    int d = sonar.ping_cm();
    if (d > 0 && d < MAX_DISTANCE_CM) {
      vals[valid++] = d;
    }
  }

  if (valid == 0) return -1;  // no echo at all → sensor error

  // Insertion sort the valid readings, then take the middle one.
  for (int i = 1; i < valid; i++) {
    int key = vals[i];
    int j = i - 1;
    while (j >= 0 && vals[j] > key) { vals[j + 1] = vals[j]; j--; }
    vals[j + 1] = key;
  }
  return vals[valid / 2];  // median
}

// ── Convert distance to tank level percentage ────────────────
// Sensor is at top, measures distance DOWN to water surface
// distance = 0   → tank full (water at sensor)
// distance = max → tank empty
int distanceToPercent(int distance_cm, int tank_depth_cm) {
  if (distance_cm < 0) return -1;  // sensor error
  int water_depth = tank_depth_cm - distance_cm;
  if (water_depth < 0) water_depth = 0;
  int pct = (water_depth * 100) / tank_depth_cm;
  return constrain(pct, 0, 100);
}

// ── Read underground tank level ──────────────────────────────
int getUndergroundLevel() {
  int dist = readDistance(sonar_under);
  return distanceToPercent(dist, UNDER_TANK_DEPTH_CM);
}

// ── Read roof tank level ─────────────────────────────────────
int getRoofLevel() {
  int dist = readDistance(sonar_roof);
  return distanceToPercent(dist, ROOF_TANK_DEPTH_CM);
}

// ── Check if water is flowing in supply line ─────────────────
// YF-S201 outputs pulses — count them over FLOW_CHECK_DURATION_MS
volatile int flowPulseCount = 0;

// Separate, never-reset pulse count for continuous rate tracking below —
// kept independent of flowPulseCount so isWaterFlowing()'s reset doesn't
// disturb the running rate calculation, and vice versa.
volatile unsigned long flowPulseTotal = 0;

// Result of the last isWaterFlowing() check — only updated while a supply
// check actually runs (STATE_CHECKING_SUPPLY), not continuously monitored.
// Exposed for MQTT status reporting.
bool lastFlowState = false;

// Continuously-updated flow rate (litres/minute) — see updateFlowRate().
float currentFlowRateLpm = 0.0;

void IRAM_ATTR flowPulseISR() {
  flowPulseCount++;
  flowPulseTotal++;
}

void initFlowSensor() {
  pinMode(FLOW_SENSE, INPUT);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSE), flowPulseISR, RISING);
}

bool isWaterFlowing() {
  flowPulseCount = 0;
  delay(FLOW_CHECK_DURATION_MS);
  // YF-S201: ~450 pulses per litre
  // If we get >10 pulses in 5 seconds, water is flowing
  lastFlowState = (flowPulseCount > 10);
  return lastFlowState;
}

// ── Continuous flow rate — call every loop(), self-throttled ─────
// Unlike isWaterFlowing() (a rare, blocking 5s check used only during a
// supply check), this samples the pulse counter every FLOW_RATE_SAMPLE_MS
// without blocking, so the live rate is available at any moment — e.g.
// right now, while testing by blowing into the sensor.
unsigned long lastFlowSampleAt    = 0;
unsigned long lastFlowSampleCount = 0;

void updateFlowRate() {
  unsigned long now = millis();
  if (now - lastFlowSampleAt < FLOW_RATE_SAMPLE_MS) return;

  noInterrupts();
  unsigned long count = flowPulseTotal;
  interrupts();

  unsigned long deltaPulses = count - lastFlowSampleCount;
  unsigned long deltaMs     = now - lastFlowSampleAt;

  float litres  = deltaPulses / FLOW_PULSES_PER_LITRE;
  float minutes = deltaMs / 60000.0;
  currentFlowRateLpm = (minutes > 0) ? (litres / minutes) : 0.0;

  lastFlowSampleCount = count;
  lastFlowSampleAt    = now;
}

// ── Check if grid power is present ──────────────────────────
// Exposed for calibrating AC_SENSE_THRESHOLD against real readings —
// watch this in the status JSON with mains definitely off vs definitely
// on, and set the threshold well clear of the noise floor you observe.
int lastAcVariation = 0;

bool isGridPresent() {
  // ZMPT101B output: sine wave when AC present, flat DC when no grid
  // Read multiple samples and check for variation
  int minVal = 4095, maxVal = 0;
  for (int i = 0; i < 100; i++) {
    int val = analogRead(AC_SENSE);
    if (val < minVal) minVal = val;
    if (val > maxVal) maxVal = val;
    delay(2);
  }
  int variation = maxVal - minVal;
  lastAcVariation = variation;
  // If AC present, variation will be large (sine wave swings)
  // If no AC, variation will be near zero (flat signal)
  return (variation > AC_SENSE_THRESHOLD);
}