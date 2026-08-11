#pragma once

// ═══════════════════════════════════════════════════════════
// AquaControl v1.0 — Configuration
// ESP32-WROOM-32E
// ═══════════════════════════════════════════════════════════

// ── Firmware version / OTA ─────────────────────────────────────
// Bump FW_VERSION with every release you publish to GitHub — it's what
// shows up in the app and in Serial. GitHub's "latest" release alias
// always resolves to whatever was most recently published under that
// exact asset name, so the URL below never needs to change.
#define FW_VERSION   "1.1.4"
#define OTA_URL      "https://github.com/saadr95/AquaControl/releases/latest/download/firmware.bin"

// ── WiFi ────────────────────────────────────────────────────
// No hardcoded SSID/password — see wifi_setup.h. On first boot (or after
// a WiFi reset) the board opens its own setup hotspot; connect a phone to
// it to enter the real network's credentials. Saved to flash from then on.
#define WIFI_SETUP_AP_PREFIX   "AquaControl-Setup"   // + short device ID
#define WIFI_SETUP_AP_PASSWORD "aquasetup123"        // portal hotspot password
#define WIFI_PORTAL_TIMEOUT_S  180                    // give up & retry later

// ── MQTT ────────────────────────────────────────────────────
// HiveMQ public broker — unauthenticated, anyone can publish to the
// commands topic. Fine for bench testing; swap for a private/authenticated
// broker before this runs unattended, since commands drive the pump relay.
//
// Client ID and topics are built at runtime from each board's unique
// hardware ID (see identity.h) — aquacontrol/<device_id>/status etc. —
// so multiple boards can share this broker without colliding.
#define MQTT_BROKER                 "broker.hivemq.com"
#define MQTT_PORT                   1883
#define MQTT_CLIENT_ID_PREFIX       "aquacontrol_"
#define MQTT_TOPIC_PREFIX           "aquacontrol/"
#define MQTT_PUBLISH_INTERVAL_MS    5000    // status publish rate
#define MQTT_RECONNECT_INTERVAL_MS  5000    // min gap between reconnect attempts

// ── Sensor Pins ─────────────────────────────────────────────
#define TRIG_UNDER        32
#define ECHO_UNDER        33
#define TRIG_ROOF         25
#define ECHO_ROOF         26
#define FLOW_SENSE        34
#define AC_SENSE          35

// ── Actuator Pins ───────────────────────────────────────────
#define RELAY_CTRL        27    // pump — HIGH = ON
#define VALVE_CTRL        14    // solenoid valve — HIGH = OPEN

// ── UI Pins ─────────────────────────────────────────────────
#define BTN_PUMP          4     // active LOW
#define BTN_VALVE         5     // active LOW
#define BTN_MODE          18    // active LOW
#define LED_PUMP          16    // HIGH = ON
#define LED_VALVE         17    // HIGH = ON
#define LED_FAULT         19    // HIGH = ON

// ── I2C ─────────────────────────────────────────────────────
#define OLED_SDA          21
#define OLED_SCL          22
#define OLED_ADDRESS      0x3C
#define OLED_WIDTH        128
#define OLED_HEIGHT       64

// ── Tank Configuration ───────────────────────────────────────
// JSN-SR04T mounted at top of tank, measuring distance to water
// Distance = empty, small distance = full

#define UNDER_TANK_DEPTH_CM     180   // full depth of underground tank in cm
#define ROOF_TANK_DEPTH_CM      120   // full depth of roof tank in cm

#define UNDER_TANK_LOW_PCT      20    // % — start filling underground
#define UNDER_TANK_HIGH_PCT     95    // % — stop filling underground
#define UNDER_TANK_MIN_PCT      15    // % — too low to run pump safely
#define UNDER_TANK_RESUME_PCT   50    // % — buffer reached while refilling:
                                      //     start the pump to roof now, with
                                      //     supply still topping underground.
                                      //     Must sit comfortably above MIN so
                                      //     the pump won't drain back to MIN.

#define ROOF_TANK_LOW_PCT       25    // % — start filling roof
#define ROOF_TANK_HIGH_PCT      95    // % — stop filling roof

// ── Timing ──────────────────────────────────────────────────
#define SENSOR_READ_INTERVAL_MS     5000    // read sensors every 5s
#define FLOW_CHECK_DURATION_MS      5000    // how long to check for flow
#define DEBOUNCE_MS                 50      // button debounce time
#define PERMISSION_TIMEOUT_MS       300000  // 5 min — auto-deny if no response
#define SUPPLY_RETRY_MS             600000  // 10 min — wait before re-checking supply
#define BTN_RELEASE_TIMEOUT_MS      1500    // max wait for button release (anti-hang)

// ── Fault tolerance ─────────────────────────────────────────
#define MAX_SENSOR_ERRORS           5       // consecutive bad reads before FAULT

// ── AC Sense ────────────────────────────────────────────────
#define AC_SENSE_THRESHOLD    50   // ADC value above this = grid present
                                    // tune after hardware testing
#define GRID_DEBOUNCE_READS   3    // consecutive consistent reads (~15s at
                                    // SENSOR_READ_INTERVAL_MS) before a grid
                                    // state change is accepted as real

// ── Ultrasonic ──────────────────────────────────────────────
#define MAX_DISTANCE_CM       300   // max range for JSN-SR04T
#define SENSOR_READINGS       9     // ping attempts per read (median of valid)

// ── Flow Rate (YF-S201) ───────────────────────────────────────
#define FLOW_PULSES_PER_LITRE  450.0  // sensor calibration constant (datasheet)
#define FLOW_RATE_SAMPLE_MS    1000   // how often the live rate is recalculated
#define MIN_FLOW_LPM           0.2    // above this, "flow" reads as detected

// ── System Modes ────────────────────────────────────────────
#define MODE_AUTO             0
#define MODE_MANUAL           1