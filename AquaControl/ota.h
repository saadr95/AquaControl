#pragma once
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPUpdate.h>
#include "config.h"
#include "actuators.h"
#include "mqtt_handler.h"

// ═══════════════════════════════════════════════════════════
// Remote OTA — triggered by {"cmd":"OTA_UPDATE"} over MQTT.
//
// Downloads the firmware binary from OTA_URL (GitHub's "latest release"
// alias — see config.h) over HTTPS and flashes it. ESP32 keeps the
// currently-running firmware in its own partition until the new one is
// fully downloaded and verified, so a failed/interrupted download can't
// brick the board — it just keeps running what it already had.
//
// setInsecure() skips TLS certificate validation. Same tradeoff already
// accepted for the public MQTT broker elsewhere in this project — fine
// for now, but a real cert store would be the more correct long-term fix.
// ═══════════════════════════════════════════════════════════

void performOTA() {
  // Never start an OTA flash while actuators are mid-operation — the
  // download can take tens of seconds to a minute or more, during which
  // the main loop (and its safety checks, like the underground-min pump
  // cutoff) doesn't run at all.
  if (isPumpRunning() || isValveOpen()) {
    publishMqttAlert("OTA update refused — pump/valve active. Stop them first.");
    return;
  }

  publishMqttAlert("Starting OTA update (current: " + String(FW_VERSION) + ")...");
  Serial.println("[OTA] Downloading: " + String(OTA_URL));

  WiFiClientSecure client;
  client.setInsecure();

  httpUpdate.rebootOnUpdate(true);  // reboots into the new firmware automatically on success
  // GitHub's release download URL is a redirect chain (github.com -> a
  // signed blob-storage URL) — without this, the client sees the 302
  // response itself instead of following it, and update() fails with
  // "Wrong HTTP Code".
  httpUpdate.setFollowRedirects(HTTPC_FORCE_FOLLOW_REDIRECTS);

  t_httpUpdate_return result = httpUpdate.update(client, OTA_URL);

  // Only reached if the update FAILED — a success reboots before getting here.
  switch (result) {
    case HTTP_UPDATE_FAILED:
      publishMqttAlert("OTA update failed: " + httpUpdate.getLastErrorString());
      Serial.println("[OTA] Failed: " + httpUpdate.getLastErrorString());
      break;
    case HTTP_UPDATE_NO_UPDATES:
      publishMqttAlert("OTA: no update available at that URL.");
      break;
    default:
      break;
  }
}
