#pragma once
#include <Preferences.h>
#include "config.h"

// ═══════════════════════════════════════════════════════════
// Device Identity — unique hardware ID + friendly name
//
// Two-tier identity so the fleet scales without a naming registry:
//   - deviceShortId: derived from the ESP32's factory-burned MAC address.
//     Globally unique, needs no setup, can never collide with another
//     board. This is what actually keeps MQTT topics/client IDs separate.
//   - deviceName: human-friendly label ("Mark I", "Roof House", ...) set
//     once through the WiFi setup portal (see wifi_setup.h) and stored in
//     flash. Purely cosmetic — shown in the apps' device picker.
// ═══════════════════════════════════════════════════════════

Preferences identityPrefs;

String deviceShortId;
String deviceName;

void initIdentity() {
  // Efuse MAC is burned in at the factory — stable across reflashes and
  // guaranteed unique per chip, unlike WiFi.macAddress() which isn't valid
  // until the WiFi stack has started.
  //
  // Uses the FULL 48-bit MAC, not a truncated slice — boards from the same
  // manufacturing batch share their OUI (manufacturer prefix) bytes, and an
  // earlier version of this code took exactly those shared bytes, giving
  // two different physical boards the same derived ID. Full MAC sidesteps
  // needing to know which half is actually unique.
  uint64_t mac = ESP.getEfuseMac();
  char buf[13];
  snprintf(buf, sizeof(buf), "%012llX", mac);
  deviceShortId = String(buf);

  identityPrefs.begin("aquaid", true);  // read-only
  deviceName = identityPrefs.getString("name", "");
  identityPrefs.end();

  if (deviceName == "") {
    deviceName = "Board-" + deviceShortId;  // until named via the portal
  }

  Serial.println("[IDENTITY] ID: " + deviceShortId + "  Name: " + deviceName);
}

void saveDeviceName(String name) {
  if (name == "" || name == deviceName) return;
  deviceName = name;
  identityPrefs.begin("aquaid", false);
  identityPrefs.putString("name", name);
  identityPrefs.end();
  Serial.println("[IDENTITY] Name saved: " + name);
}

String mqttClientId()   { return String(MQTT_CLIENT_ID_PREFIX) + deviceShortId; }
String mqttTopicStatus()   { return String(MQTT_TOPIC_PREFIX) + deviceShortId + "/status"; }
String mqttTopicAlerts()   { return String(MQTT_TOPIC_PREFIX) + deviceShortId + "/alerts"; }
String mqttTopicCommands() { return String(MQTT_TOPIC_PREFIX) + deviceShortId + "/commands"; }
