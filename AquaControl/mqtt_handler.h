#pragma once
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "identity.h"

// ═══════════════════════════════════════════════════════════
// MQTT — Status publishing, alerts, and remote commands
//
// Broker: HiveMQ public (plain TCP, no auth). Fine for bench testing;
// anyone can subscribe or publish on these topics, so this must move to
// a private/authenticated broker before it's left running unattended —
// the commands topic drives the pump relay directly.
//
// Client ID and topics are namespaced per-board (aquacontrol/<id>/...) via
// identity.h, so multiple boards can share this broker without colliding.
// ═══════════════════════════════════════════════════════════

WiFiClient   mqttNetClient;
PubSubClient mqttClient(mqttNetClient);

unsigned long lastMqttReconnectAttempt = 0;
unsigned long lastMqttStatusPublish    = 0;
String        pendingMqttCommand       = "";

// ── Incoming message handler — parses aquacontrol/commands ────
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.println("[MQTT] Received on " + String(topic) + ": " + msg);

  StaticJsonDocument<128> doc;
  if (deserializeJson(doc, msg) != DeserializationError::Ok) {
    Serial.println("[MQTT] Bad command JSON — ignored");
    return;
  }
  String cmd = doc["cmd"] | "";

  // Map MQTT command names onto the strings handleCommand() understands.
  if (cmd == "MODE_AUTO")        cmd = "AUTO";
  else if (cmd == "MODE_MANUAL") cmd = "MANUAL";
  else if (cmd == "RESET_FAULT") cmd = "RESET";

  pendingMqttCommand = cmd;
}

// ── Fetch and clear any command received via MQTT since last call ──
String getMqttCommand() {
  String cmd = pendingMqttCommand;
  pendingMqttCommand = "";
  return cmd;
}

// ── Connect to the broker and (re)subscribe — rate-limited ────
void reconnectMQTT() {
  if (millis() - lastMqttReconnectAttempt < MQTT_RECONNECT_INTERVAL_MS) return;
  lastMqttReconnectAttempt = millis();

  Serial.print("[MQTT] Connecting to broker as " + mqttClientId() + "...");
  if (mqttClient.connect(mqttClientId().c_str())) {
    Serial.println(" connected");
    mqttClient.subscribe(mqttTopicCommands().c_str());
  } else {
    Serial.print(" failed, rc=");
    Serial.println(mqttClient.state());
  }
}

// ── Setup — call once from setup(), after WiFi is connected ────
void initMQTT() {
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(512);  // default 256B is tight for the status JSON

  // NTP sync so status/alert timestamps are real unix time, not millis().
  // Non-blocking — time(nullptr) just reads 1970 until the first sync lands.
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");

  Serial.println("[MQTT] Initialised — broker: " + String(MQTT_BROKER));
}

// ── Keep the MQTT connection alive — call every loop() ─────────
void maintainMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;

  if (!mqttClient.connected()) {
    reconnectMQTT();
  }
  mqttClient.loop();
}

// ── Publish an alert — event-driven, not rate-limited ───────────
void publishMqttAlert(String message) {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<256> doc;
  doc["message"]     = message;
  doc["device_id"]   = deviceShortId;
  doc["device_name"] = deviceName;
  doc["timestamp"]   = (unsigned long)time(nullptr);

  char buf[256];
  serializeJson(doc, buf);
  mqttClient.publish(mqttTopicAlerts().c_str(), buf);
}

// ── Publish current status — self-throttled to MQTT_PUBLISH_INTERVAL_MS ─
// Call every loop from stateMachineTick(); actual sends happen every 5s.
void publishMqttStatus(int underPct, int roofPct, bool grid, bool pump,
                        bool valve, bool flow, float flowRateLpm,
                        bool waitingPermission, String pendingAction, int mode,
                        String stateLabel) {
  if (millis() - lastMqttStatusPublish < MQTT_PUBLISH_INTERVAL_MS) return;
  lastMqttStatusPublish = millis();

  if (!mqttClient.connected()) return;

  StaticJsonDocument<384> doc;
  doc["device_id"]        = deviceShortId;
  doc["device_name"]      = deviceName;
  doc["underground_pct"] = underPct;
  doc["roof_pct"]        = roofPct;
  doc["grid"]             = grid;
  doc["pump"]             = pump;
  doc["valve"]            = valve;
  doc["flow"]             = flow;
  doc["flow_rate_lpm"]    = round(flowRateLpm * 10) / 10.0;  // 1 decimal place
  doc["waiting_permission"] = waitingPermission;
  doc["pending_action"]     = pendingAction;
  doc["mode"]             = (mode == MODE_AUTO) ? "AUTO" : "MANUAL";
  doc["state"]            = stateLabel;
  doc["timestamp"]        = (unsigned long)time(nullptr);

  char buf[384];
  serializeJson(doc, buf);
  mqttClient.publish(mqttTopicStatus().c_str(), buf);
}
