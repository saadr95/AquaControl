#pragma once
#include "config.h"

// Defined in mqtt_handler.h — forward-declared here so actuators.h doesn't
// need to pull in the whole MQTT stack (avoids a circular include, since
// mqtt_handler.h's status publish takes actuator state as parameters).
void publishMqttAlert(String message);

// ═══════════════════════════════════════════════════════════
// Actuator Control — Pump Relay and Solenoid Valve
// ═══════════════════════════════════════════════════════════

// ── State tracking ──────────────────────────────────────────
bool pumpRunning  = false;
bool valveOpen    = false;

// ── Initialise all actuator and UI pins ─────────────────────
void initActuators() {
  // Actuators
  pinMode(RELAY_CTRL, OUTPUT);
  pinMode(VALVE_CTRL, OUTPUT);

  // LEDs
  pinMode(LED_PUMP,  OUTPUT);
  pinMode(LED_VALVE, OUTPUT);
  pinMode(LED_FAULT, OUTPUT);

  // Buttons — input with internal pull-up as backup
  // (board already has external 10k pull-ups)
  pinMode(BTN_PUMP,  INPUT);
  pinMode(BTN_VALVE, INPUT);
  pinMode(BTN_MODE,  INPUT);

  // Safe default state — everything OFF
  digitalWrite(RELAY_CTRL, LOW);
  digitalWrite(VALVE_CTRL, LOW);
  digitalWrite(LED_PUMP,   LOW);
  digitalWrite(LED_VALVE,  LOW);
  digitalWrite(LED_FAULT,  LOW);

  Serial.println("Actuators initialised — all OFF");
}

// ── Pump control ────────────────────────────────────────────
void startPump() {
  if (pumpRunning) return;  // already running
  digitalWrite(RELAY_CTRL, HIGH);
  digitalWrite(LED_PUMP,   HIGH);
  pumpRunning = true;
  Serial.println("[PUMP] Started");
  publishMqttAlert("Pump started");
}

void stopPump() {
  if (!pumpRunning) return;  // already stopped
  digitalWrite(RELAY_CTRL, LOW);
  digitalWrite(LED_PUMP,   LOW);
  pumpRunning = false;
  Serial.println("[PUMP] Stopped");
  publishMqttAlert("Pump stopped");
}

bool isPumpRunning() {
  return pumpRunning;
}

// ── Valve control ────────────────────────────────────────────
void openValve() {
  if (valveOpen) return;
  digitalWrite(VALVE_CTRL, HIGH);
  digitalWrite(LED_VALVE,  HIGH);
  valveOpen = true;
  Serial.println("[VALVE] Opened");
  publishMqttAlert("Valve opened");
}

void closeValve() {
  if (!valveOpen) return;
  digitalWrite(VALVE_CTRL, LOW);
  digitalWrite(LED_VALVE,  LOW);
  valveOpen = false;
  Serial.println("[VALVE] Closed");
  publishMqttAlert("Valve closed");
}

bool isValveOpen() {
  return valveOpen;
}

// ── Fault LED ────────────────────────────────────────────────
void setFaultLED(bool state) {
  digitalWrite(LED_FAULT, state ? HIGH : LOW);
}

// ── Emergency stop — call this on any fault ──────────────────
void emergencyStop() {
  stopPump();
  closeValve();
  setFaultLED(true);
  Serial.println("[EMERGENCY STOP] All actuators OFF — fault LED ON");
}

// ── Button reading with debounce ─────────────────────────────
bool readButton(int pin) {
  if (digitalRead(pin) == LOW) {   // active LOW
    delay(DEBOUNCE_MS);
    if (digitalRead(pin) == LOW) { // confirm after debounce
      // Wait for release, but never hang forever on a stuck/held button
      unsigned long t0 = millis();
      while (digitalRead(pin) == LOW &&
             millis() - t0 < BTN_RELEASE_TIMEOUT_MS) {
        // spin until released or timeout
      }
      return true;
    }
  }
  return false;
}

// ── Check all buttons — returns which was pressed ────────────
// Returns: 0=none, 1=pump, 2=valve, 3=mode
int checkButtons() {
  if (readButton(BTN_PUMP))  return 1;
  if (readButton(BTN_VALVE)) return 2;
  if (readButton(BTN_MODE))  return 3;
  return 0;
}