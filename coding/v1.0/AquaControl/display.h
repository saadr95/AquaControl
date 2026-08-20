#pragma once
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "config.h"

// ═══════════════════════════════════════════════════════════
// OLED Display — SSD1306 128x64 I2C
// ═══════════════════════════════════════════════════════════

Adafruit_SSD1306 display(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);

bool displayAvailable = false;

// ── Initialise display ───────────────────────────────────────
void initDisplay() {
  Wire.begin(OLED_SDA, OLED_SCL);

  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Serial.println("[OLED] Not found — continuing without display");
    displayAvailable = false;
    return;
  }

  displayAvailable = true;
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // Boot screen — shows the running firmware version, so after an OTA
  // reboot you can glance at the board and confirm which build landed.
  display.setTextSize(1);
  display.setCursor(15, 16);
  display.println("AquaControl");
  display.setCursor(30, 30);
  display.print("fw ");
  display.println(FW_VERSION);
  display.setCursor(35, 46);
  display.println("Booting...");
  display.display();
  delay(2000);

  Serial.println("[OLED] Initialised OK");
}

// ── Draw a tank level bar ────────────────────────────────────
void drawTankBar(int x, int y, int w, int h, int pct, bool error) {
  display.drawRect(x, y, w, h, SSD1306_WHITE);
  if (!error && pct >= 0) {
    int fillH = (h - 2) * pct / 100;
    int fillY = y + 1 + (h - 2 - fillH);
    display.fillRect(x + 1, fillY, w - 2, fillH, SSD1306_WHITE);
  }
}

// ── Main display update ──────────────────────────────────────
void updateDisplay(int underLevel, int roofLevel,
                   bool grid, bool pump, bool valve,
                   int systemMode, String stateLabel) {
  if (!displayAvailable) return;

  display.clearDisplay();
  display.setTextSize(1);

  // ── Row 1 — Title + Grid ──────────────────────────────────
  display.setCursor(0, 0);
  display.print("AquaCtrl");
  display.setCursor(72, 0);
  display.print(grid ? "GRD:OK" : "GRD:--");
  display.drawLine(0, 9, 127, 9, SSD1306_WHITE);

  // ── Left — Underground tank ───────────────────────────────
  display.setCursor(0, 11);
  display.print("UND");
  drawTankBar(0, 20, 18, 22, underLevel, underLevel < 0);
  display.setCursor(0, 44);
  if (underLevel < 0) display.print("ERR");
  else {
    display.print(underLevel);
    display.print("%");
  }

  // ── Centre — Roof tank ────────────────────────────────────
  display.setCursor(22, 11);
  display.print("ROOF");
  drawTankBar(22, 20, 18, 22, roofLevel, roofLevel < 0);
  display.setCursor(22, 44);
  if (roofLevel < 0) display.print("ERR");
  else {
    display.print(roofLevel);
    display.print("%");
  }

  // ── Right — Status ────────────────────────────────────────
  display.setCursor(50, 11);
  display.print("PMP:");
  display.print(pump ? "ON " : "OFF");

  display.setCursor(50, 21);
  display.print("VLV:");
  display.print(valve ? "OPN" : "CLS");

  display.setCursor(50, 31);
  display.print("MOD:");
  display.print(systemMode == 0 ? "AUT" : "MAN");

  display.setCursor(50, 41);
  display.print(grid ? "GRID:OK" : "GRID:--");

  // ── Bottom — State ────────────────────────────────────────
  display.drawLine(0, 52, 127, 52, SSD1306_WHITE);
  display.setCursor(0, 55);
  display.print(stateLabel);

  display.display();
}

// ── OTA progress screen — call repeatedly during the download ────
void displayOtaProgress(int percent) {
  if (!displayAvailable) return;

  percent = constrain(percent, 0, 100);

  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(22, 6);
  display.println("OTA UPDATE");

  int barX = 8, barY = 26, barW = 112, barH = 16;
  display.drawRect(barX, barY, barW, barH, SSD1306_WHITE);
  int fillW = (barW - 4) * percent / 100;
  if (fillW > 0) display.fillRect(barX + 2, barY + 2, fillW, barH - 4, SSD1306_WHITE);

  display.setCursor(52, 48);
  display.print(percent);
  display.print("%");

  display.display();
}

// ── Full screen alert ────────────────────────────────────────
void displayAlert(String line1, String line2, String line3) {
  if (!displayAvailable) return;

  display.clearDisplay();
  display.setTextSize(1);

  display.setCursor(0, 8);
  display.println(line1);
  display.setCursor(0, 24);
  display.println(line2);
  display.setCursor(0, 40);
  display.println(line3);

  display.display();
}