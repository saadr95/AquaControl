#include "config.h"
#include "identity.h"
#include "sensors.h"
#include "actuators.h"
#include "wifi_setup.h"
#include "mqtt_handler.h"
#include "display.h"
#include "state_machine.h"

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("═══════════════════════════════");
  Serial.println("  AquaControl v1.0 — Booting  ");
  Serial.println("═══════════════════════════════");

  initActuators();  // buttons must be ready before checkForWiFiReset() reads BTN_MODE
  initIdentity();
  checkForWiFiReset();   // hold MODE at boot 5s to forget WiFi and re-provision
  initFlowSensor();
  initDisplay();
  initWiFiProvisioning();
  initMQTT();

  // Give the broker a moment to connect before the boot alert — unlike the
  // old Telegram HTTPS call, publishMqttAlert() silently no-ops until the
  // client is actually connected, and that normally only happens via
  // maintainMQTT() in loop().
  unsigned long mqttWaitStart = millis();
  while (!mqttClient.connected() && millis() - mqttWaitStart < 5000) {
    reconnectMQTT();
    delay(250);
  }
  publishMqttAlert("AquaControl online — " + deviceName + " (" + deviceShortId + ")");

  Serial.println("Boot complete — entering AUTO mode.");
}

void loop() {
  // Keep WiFi alive
  maintainWiFi();

  // Keep MQTT connected and publish periodic status
  maintainMQTT();

  // Read sensors and update display
  stateMachineTick();

  // Check MQTT commands from the app
  String mqttCmd = getMqttCommand();
  if (mqttCmd != "") handleCommand(mqttCmd);

  // Check physical buttons
  handleButtons();

  // Run automation logic — only in AUTO mode
  if (systemMode == MODE_AUTO) {
    runStateMachine();
  }

  // Small delay to prevent watchdog issues
  delay(10);
}
