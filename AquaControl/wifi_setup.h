#pragma once
#include <WiFiManager.h>
#include "config.h"
#include "identity.h"

// ═══════════════════════════════════════════════════════════
// WiFi Provisioning — captive portal, no hardcoded credentials
//
// On boot, tries the last-saved WiFi network. If that fails (new location,
// never configured, wrong password) it opens its own hotspot named
// "AquaControl-Setup-<deviceShortId>". Connect a phone to it, a setup page
// opens automatically (or browse to 192.168.4.1), pick the real network,
// enter its password, and — on the same screen — set/rename this board's
// friendly name. Saved to flash; reboots onto the real network.
//
// To deliberately move a board to a new site: hold the MODE button for 5s
// at boot to forget the saved WiFi and reopen the portal immediately.
// ═══════════════════════════════════════════════════════════

WiFiManager wifiManager;
WiFiManagerParameter deviceNameParam("device_name", "Board name (e.g. Mark I)", "", 40);

void saveDeviceNameCallback() {
  saveDeviceName(String(deviceNameParam.getValue()));
}

// Hold BTN_MODE at boot for 5s to forget saved WiFi and force the portal
// open right away — for intentionally relocating the board.
void checkForWiFiReset() {
  if (digitalRead(BTN_MODE) != LOW) return;  // active LOW

  Serial.println("[WiFi] MODE held at boot — hold 5s to reset WiFi...");
  unsigned long t0 = millis();
  while (digitalRead(BTN_MODE) == LOW) {
    if (millis() - t0 > 5000) {
      Serial.println("[WiFi] Resetting saved WiFi credentials...");
      WiFiManager resetter;
      resetter.resetSettings();
      delay(300);
      ESP.restart();
    }
  }
}

void initWiFiProvisioning() {
  deviceNameParam.setValue(deviceName.c_str(), 40);
  wifiManager.addParameter(&deviceNameParam);
  wifiManager.setSaveParamsCallback(saveDeviceNameCallback);
  wifiManager.setConfigPortalTimeout(WIFI_PORTAL_TIMEOUT_S);

  String apName = String(WIFI_SETUP_AP_PREFIX) + "-" + deviceShortId;

  Serial.println("[WiFi] Connecting (setup hotspot '" + apName + "' if needed)...");
  bool ok = wifiManager.autoConnect(apName.c_str(), WIFI_SETUP_AP_PASSWORD);

  if (ok) {
    Serial.println("[WiFi] Connected — IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("[WiFi] Setup portal timed out — no WiFi yet, will keep retrying.");
  }
}

// ── Check WiFi and reconnect if dropped — call every loop() ────
// ESP32 retains the credentials WiFiManager saved, so a plain reconnect
// is enough for a runtime drop; the portal only reappears on a fresh
// boot with no known network, or after checkForWiFiReset().
void maintainWiFi() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi dropped — reconnecting...");
    WiFi.reconnect();
    delay(2000);
  }
}
