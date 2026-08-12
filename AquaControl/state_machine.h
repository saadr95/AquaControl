#pragma once
#include "config.h"
#include "sensors.h"
#include "actuators.h"
#include "mqtt_handler.h"
#include "ota.h"
#include "display.h"

// ═══════════════════════════════════════════════════════════
// State Machine — Core Automation Logic
// ═══════════════════════════════════════════════════════════

// ── System states ────────────────────────────────────────────
enum SystemState {
  STATE_IDLE,
  STATE_CHECKING_SUPPLY,
  STATE_FILLING_UNDERGROUND,
  STATE_UNDERGROUND_FULL,
  STATE_CHECKING_ROOF,
  STATE_FILLING_ROOF,
  STATE_ROOF_FULL,
  STATE_WAITING_PERMISSION,
  STATE_FAULT
};

// ── System variables ─────────────────────────────────────────
SystemState currentState    = STATE_IDLE;
int         systemMode      = MODE_AUTO;
bool        gridWasPresent  = true;
bool        permissionGranted = false;

int  underLevel = 0;
int  roofLevel  = 0;
bool grid       = true;

// Consecutive bad-read counters — tolerate the occasional glitchy ping
int  underErrCount = 0;
int  roofErrCount  = 0;

// Consecutive consistent grid readings — debounces AC_SENSE noise so a
// single blip near the threshold can't cascade into a full grid-loss
// event (permission request, pump/valve stop). See readAllSensors().
int  gridPresentCount = 0;
int  gridAbsentCount  = 0;

unsigned long lastSensorRead   = 0;
unsigned long stateEnteredAt   = 0;
unsigned long lastSupplyCheck  = 0;   // 0 = never checked yet

// True while we're filling underground *because the roof needs water* —
// lets the pump join in (concurrently) once the buffer level is reached.
bool fillingForRoof = false;

// ── Permission requests (grid lost, asking to run on solar) ──────
// Answered from the app via {"cmd":"YES"}/{"cmd":"NO"} — see
// waiting_permission/pending_action in the status JSON (mqtt_handler.h)
// and handleCommand() below.
bool          waitingForPermission  = false;
unsigned long permissionRequestTime = 0;
String        pendingAction         = "";

// ── Forward declarations (defined later in this file) ────────
void resetFault();
bool underSensorFaulted();
bool roofSensorFaulted();
void handleCommand(String cmd);

// ── State name for display and Serial ───────────────────────
String getStateName(SystemState s) {
  switch (s) {
    case STATE_IDLE:               return "IDLE";
    case STATE_CHECKING_SUPPLY:    return "CHK SUPPLY";
    case STATE_FILLING_UNDERGROUND:return "FILL UNDER";
    case STATE_UNDERGROUND_FULL:   return "UNDER FULL";
    case STATE_CHECKING_ROOF:      return "CHK ROOF";
    case STATE_FILLING_ROOF:       return "FILL ROOF";
    case STATE_ROOF_FULL:          return "ROOF FULL";
    case STATE_WAITING_PERMISSION: return "WAIT PERM";
    case STATE_FAULT:              return "FAULT";
    default:                       return "UNKNOWN";
  }
}

// ── Transition to a new state ────────────────────────────────
void transitionTo(SystemState newState) {
  if (newState == currentState) return;
  Serial.print("[STATE] ");
  Serial.print(getStateName(currentState));
  Serial.print(" → ");
  Serial.println(getStateName(newState));
  publishMqttAlert(getStateName(currentState) + " -> " + getStateName(newState));
  currentState   = newState;
  stateEnteredAt = millis();
}

// ── Ask permission for an action ────────────────────────────
// Used when grid is out and pump needs to run on solar. The app shows a
// Yes/No prompt whenever the status JSON reports waiting_permission=true,
// with pendingAction as the question text.
void requestPermission(String action) {
  waitingForPermission  = true;
  permissionRequestTime = millis();
  pendingAction         = action;
  publishMqttAlert("Permission requested: " + action);
  Serial.println("[PERMISSION] Requested: " + action);
}

// ── Auto-deny a permission request after PERMISSION_TIMEOUT_MS ────
// Call every loop(); does nothing unless a request is actually pending.
void checkPermissionTimeout() {
  if (!waitingForPermission) return;
  if (millis() - permissionRequestTime <= PERMISSION_TIMEOUT_MS) return;

  waitingForPermission = false;
  publishMqttAlert("Permission request timed out — " + pendingAction + " cancelled.");
  Serial.println("[PERMISSION] Timed out");
  handleCommand("NO");
}

// ── Read all sensors ─────────────────────────────────────────
void readAllSensors() {
  if (millis() - lastSensorRead < SENSOR_READ_INTERVAL_MS) return;
  lastSensorRead = millis();

  // Hold the last good value on a bad read; only count the error.
  int u = getUndergroundLevel();
  if (u < 0) { underErrCount++; }
  else       { underErrCount = 0; underLevel = u; }

  int r = getRoofLevel();
  if (r < 0) { roofErrCount++; }
  else       { roofErrCount = 0; roofLevel = r; }

  // Debounce the raw reading — only accept a state change after several
  // consecutive consistent reads, so a single noisy blip near the
  // threshold can't trigger a grid-loss/restore cascade.
  bool rawGrid = isGridPresent();
  if (rawGrid) { gridPresentCount++; gridAbsentCount = 0; }
  else         { gridAbsentCount++;  gridPresentCount = 0; }
  if (gridPresentCount >= GRID_DEBOUNCE_READS) grid = true;
  if (gridAbsentCount  >= GRID_DEBOUNCE_READS) grid = false;

  Serial.print("[SENSORS] Under:");
  Serial.print(underSensorFaulted() ? -1 : underLevel);
  Serial.print("%  Roof:");
  Serial.print(roofSensorFaulted() ? -1 : roofLevel);
  Serial.print("%  Grid:");
  Serial.println(grid ? "YES" : "NO");
}

// A sensor is "faulted" only after several consecutive bad reads,
// not on a single glitchy ping.
bool underSensorFaulted() { return underErrCount >= MAX_SENSOR_ERRORS; }
bool roofSensorFaulted()  { return roofErrCount  >= MAX_SENSOR_ERRORS; }

// ── Handle grid loss during operation ───────────────────────
void handleGridLoss() {
  if (gridWasPresent && !grid) {
    gridWasPresent = false;
    Serial.println("[GRID] Grid lost");
    publishMqttAlert("Grid power lost");

    // If anything is running — stop it ALL (pump + valve, in case of a
    // concurrent fill) and ask permission to continue on solar power.
    if (isPumpRunning() || isValveOpen()) {
      bool wasPumping = isPumpRunning();
      stopPump();
      closeValve();
      fillingForRoof = false;
      requestPermission(wasPumping ? "Run pump on solar power?"
                                   : "Keep valve open on solar power?");
      transitionTo(STATE_WAITING_PERMISSION);
    }
  }

  if (!gridWasPresent && grid) {
    gridWasPresent = true;
    Serial.println("[GRID] Grid restored");
    publishMqttAlert("Grid power restored");
    // Resume from idle — state machine will pick up naturally
    if (currentState == STATE_WAITING_PERMISSION) {
      waitingForPermission = false;
      transitionTo(STATE_IDLE);
    }
  }
}

// ── Handle a command — from the app (MQTT), or "YES"/"NO"/"AUTO"/
// "MANUAL"/"RESET" internally mapped from MQTT_TOPIC_COMMANDS cmd names ──
void handleCommand(String cmd) {
  if (cmd == "") return;

  if (cmd == "YES" && currentState == STATE_WAITING_PERMISSION) {
    permissionGranted = true;
    waitingForPermission = false;
    publishMqttAlert("Permission granted — " + pendingAction);
    Serial.println("[PERMISSION] Granted");
    // Resume what was pending
    if (pendingAction.indexOf("pump") >= 0 ||
        pendingAction.indexOf("Pump") >= 0) {
      startPump();
      transitionTo(STATE_FILLING_ROOF);
    } else if (pendingAction.indexOf("valve") >= 0 ||
               pendingAction.indexOf("Valve") >= 0) {
      openValve();
      transitionTo(STATE_FILLING_UNDERGROUND);
    } else {
      transitionTo(STATE_IDLE);
    }
    return;
  }

  if (cmd == "NO" && currentState == STATE_WAITING_PERMISSION) {
    permissionGranted = false;
    waitingForPermission = false;
    publishMqttAlert("Permission denied — " + pendingAction + " cancelled.");
    transitionTo(STATE_IDLE);
    return;
  }

  // Manual override commands — only in MANUAL mode
  if (systemMode == MODE_MANUAL) {
    if (cmd == "PUMP_ON")     startPump();
    if (cmd == "PUMP_OFF")    stopPump();
    if (cmd == "VALVE_OPEN")  openValve();
    if (cmd == "VALVE_CLOSE") closeValve();
  } else {
    if (cmd == "PUMP_ON" || cmd == "PUMP_OFF" ||
        cmd == "VALVE_OPEN" || cmd == "VALVE_CLOSE") {
      publishMqttAlert("Switch to MANUAL mode first to use pump/valve controls.");
    }
  }

  // Clear a fault remotely — no reboot needed
  if (cmd == "RESET") {
    underErrCount = 0;
    roofErrCount  = 0;
    resetFault();
    return;
  }

  if (cmd == "AUTO") {
    systemMode = MODE_AUTO;
    stopPump();
    closeValve();
    setFaultLED(false);
    underErrCount = 0;
    roofErrCount  = 0;
    transitionTo(STATE_IDLE);
    publishMqttAlert("Mode: AUTO");
    return;
  }
  if (cmd == "MANUAL") {
    systemMode = MODE_MANUAL;
    publishMqttAlert("Mode: MANUAL");
    return;
  }

  if (cmd == "OTA_UPDATE") {
    performOTA();
    return;
  }

  if (cmd == "SET_NAME") {
    if (pendingSetNameValue != "") {
      saveDeviceName(pendingSetNameValue);
      publishMqttAlert("Renamed to " + pendingSetNameValue);
    }
    return;
  }
}

// ── Handle physical buttons ──────────────────────────────────
void handleButtons() {
  int btn = checkButtons();
  if (btn == 0) return;

  if (btn == 3) {
    // Mode toggle
    systemMode = (systemMode == MODE_AUTO) ? MODE_MANUAL : MODE_AUTO;
    Serial.print("[MODE] Switched to: ");
    Serial.println(systemMode == MODE_AUTO ? "AUTO" : "MANUAL");
    publishMqttAlert(systemMode == MODE_AUTO ? "Mode: AUTO" : "Mode: MANUAL");

    // If switching to auto — return to idle and clear any fault
    if (systemMode == MODE_AUTO) {
      stopPump();
      closeValve();
      setFaultLED(false);
      underErrCount = 0;
      roofErrCount  = 0;
      transitionTo(STATE_IDLE);
    }
    return;
  }

  // Pump and valve buttons only work in manual mode
  if (systemMode == MODE_MANUAL) {
    if (btn == 1) { isPumpRunning() ? stopPump()   : startPump();  }
    if (btn == 2) { isValveOpen()   ? closeValve() : openValve();  }
  } else {
    Serial.println("[BUTTON] Switch to MANUAL mode first (BTN_MODE)");
  }
}

// ── Enter the fault state once (idempotent, no spam) ─────────
void enterFault(String reason) {
  if (currentState == STATE_FAULT) return;  // already faulted
  emergencyStop();                           // pump off, valve closed, LED on
  publishMqttAlert("FAULT: " + reason);
  transitionTo(STATE_FAULT);
}

// ── Start pumping underground → roof (pure pump, no supply) ──
// On solar it asks permission first; on grid it just runs.
void beginRoofPump() {
  fillingForRoof = false;
  if (!grid) {
    requestPermission(String("Start pump to fill roof tank on solar? ") +
      "Roof: " + String(roofLevel) + "%");
    transitionTo(STATE_WAITING_PERMISSION);
  } else {
    publishMqttAlert("Roof low (" + String(roofLevel) +
      "%) — pumping from underground.");
    startPump();
    transitionTo(STATE_FILLING_ROOF);
  }
}

// ── Core state machine ───────────────────────────────────────
//
// IDLE is the ONLY resting/decision state. It leaves IDLE only when
// there is real work to do (a tank actually needs filling). The old
// CHECKING_ROOF / UNDERGROUND_FULL / ROOF_FULL "decision" states caused
// the IDLE↔CHK-ROOF ping-pong, so their logic is folded into IDLE.
void runStateMachine() {
  if (systemMode == MODE_MANUAL) return; // manual mode bypasses state machine

  switch (currentState) {

    // ── IDLE — resting state, decides what (if anything) to do ──
    //
    // GOAL: keep the ROOF tank full — it supplies the house.
    // Underground is just the buffer that feeds the pump.
    case STATE_IDLE:
      if (underSensorFaulted()) { enterFault("Underground sensor"); break; }
      if (roofSensorFaulted())  { enterFault("Roof sensor");        break; }

      // Priority 1: roof low → get water to the roof.
      if (roofLevel <= ROOF_TANK_LOW_PCT) {
        if (underLevel > UNDER_TANK_RESUME_PCT) {
          // Plenty of buffer — pump straight to the roof.
          beginRoofPump();
        } else if (lastSupplyCheck == 0 ||
                   millis() - lastSupplyCheck >= SUPPLY_RETRY_MS) {
          // Underground lowish — bring in supply first. The pump joins in
          // (concurrently) once underground reaches RESUME, so it never
          // drains down to MIN and cycles.
          fillingForRoof = true;
          transitionTo(STATE_CHECKING_SUPPLY);
        } else if (underLevel > UNDER_TANK_MIN_PCT) {
          // Supply on cooldown but we still have usable reserve — pump it.
          beginRoofPump();
        }
        // else: at MIN and supply on cooldown — wait quietly
        break;
      }

      // Priority 2: roof is fine — keep underground topped up so it's
      // ready for the next roof fill. Rate-limited (no spam on dry supply).
      if (underLevel <= UNDER_TANK_LOW_PCT) {
        if (lastSupplyCheck == 0 ||
            millis() - lastSupplyCheck >= SUPPLY_RETRY_MS) {
          fillingForRoof = false;   // opportunistic only — don't run the pump
          transitionTo(STATE_CHECKING_SUPPLY);
        }
        break;
      }

      // Both tanks OK — stay idle silently (no transition, no spam).
      break;

    // ── CHECKING SUPPLY — flow test, then act ─────────────────
    case STATE_CHECKING_SUPPLY:
      lastSupplyCheck = millis();
      publishMqttAlert("Checking supply line...");

      if (isWaterFlowing()) {
        publishMqttAlert("Supply water available — filling underground.");
        openValve();
        transitionTo(STATE_FILLING_UNDERGROUND);
      } else if (fillingForRoof && underLevel > UNDER_TANK_MIN_PCT) {
        // No supply, but the roof needs water and we have some reserve —
        // pump what we've got rather than leaving the house dry.
        publishMqttAlert("No supply water — pumping from underground reserve.");
        beginRoofPump();
      } else {
        publishMqttAlert("No supply water. Will retry in 10 min.");
        fillingForRoof = false;
        transitionTo(STATE_IDLE);
      }
      break;

    // ── FILLING UNDERGROUND — valve open; pump joins for the roof ─
    case STATE_FILLING_UNDERGROUND:
      if (underSensorFaulted()) {
        stopPump();
        closeValve();
        fillingForRoof = false;
        enterFault("Underground sensor during fill");
        break;
      }

      // Roof is waiting and underground has reached the safe buffer →
      // start the pump now, with supply STILL filling underground.
      if (fillingForRoof && grid && !isPumpRunning() &&
          underLevel >= UNDER_TANK_RESUME_PCT) {
        publishMqttAlert("Underground at " + String(underLevel) +
          "% — starting pump to roof (supply still filling).");
        startPump();
      }

      // Roof reached target → stop the pump; valve keeps topping underground.
      if (fillingForRoof && roofLevel >= ROOF_TANK_HIGH_PCT) {
        stopPump();
        fillingForRoof = false;
        publishMqttAlert("Roof tank full.");
      }

      // Safety net: if the pump still outran the supply down to MIN,
      // pause it; the open valve refills and it restarts at RESUME.
      if (isPumpRunning() && underLevel <= UNDER_TANK_MIN_PCT) {
        stopPump();
        publishMqttAlert("Underground at minimum — pump paused, supply refilling.");
      }

      // Underground full → close the valve and finish up.
      if (underLevel >= UNDER_TANK_HIGH_PCT) {
        closeValve();
        fillingForRoof = false;               // concurrent phase finished
        publishMqttAlert("Underground tank full (" + String(underLevel) + "%).");
        if (isPumpRunning()) {
          transitionTo(STATE_FILLING_ROOF);   // valve done, keep pumping roof
        } else {
          transitionTo(STATE_IDLE);
        }
      }
      // Otherwise keep filling — re-checked on next sensor read
      break;

    // ── FILLING ROOF — pure pump (no supply) until full / unsafe ─
    case STATE_FILLING_ROOF:
      if (roofSensorFaulted()) {
        stopPump();
        enterFault("Roof sensor during pump");
        break;
      }
      if (roofLevel >= ROOF_TANK_HIGH_PCT) {
        stopPump();
        publishMqttAlert("Roof tank full (" + String(roofLevel) + "%) — pump stopped.");
        transitionTo(STATE_IDLE);
        break;
      }
      if (underLevel <= UNDER_TANK_MIN_PCT) {
        // Reserve drained — pause and try to refill from supply, then
        // resume pumping (filling underground re-starts the pump at RESUME).
        stopPump();
        publishMqttAlert("Underground low (" + String(underLevel) +
          "%) — pausing pump, checking supply to refill.");
        if (lastSupplyCheck == 0 ||
            millis() - lastSupplyCheck >= SUPPLY_RETRY_MS) {
          fillingForRoof = true;
          transitionTo(STATE_CHECKING_SUPPLY);
        } else {
          transitionTo(STATE_IDLE);  // supply on cooldown — wait
        }
        break;
      }
      break;

    // ── WAITING PERMISSION ───────────────────────────────────
    case STATE_WAITING_PERMISSION:
      // YES/NO handled in handleCommand(); timeout in checkPermissionTimeout()
      break;

    // ── FAULT ────────────────────────────────────────────────
    case STATE_FAULT:
      // Outputs already safe (set on entry). Wait for RESET / MODE.
      break;

    // ── Legacy decision states — should never be entered now,
    //    but route any stray transition safely back to IDLE ────
    case STATE_UNDERGROUND_FULL:
    case STATE_CHECKING_ROOF:
    case STATE_ROOF_FULL:
      transitionTo(STATE_IDLE);
      break;
  }
}

// ── Reset fault state ────────────────────────────────────────
void resetFault() {
  setFaultLED(false);
  transitionTo(STATE_IDLE);
  publishMqttAlert("Fault cleared — system reset.");
  Serial.println("[FAULT] Cleared — returning to IDLE");
}

// ── Main state machine tick — call this every loop ───────────
void stateMachineTick() {
  readAllSensors();
  updateFlowRate();
  handleGridLoss();
  checkPermissionTimeout();
  // Show ERR on the display only after a real (latched) sensor fault,
  // not on a single glitchy ping.
  updateDisplay(underSensorFaulted() ? -1 : underLevel,
                roofSensorFaulted()  ? -1 : roofLevel,
                grid, isPumpRunning(), isValveOpen(),
                systemMode, getStateName(currentState));
  publishMqttStatus(underSensorFaulted() ? -1 : underLevel,
                     roofSensorFaulted()  ? -1 : roofLevel,
                     grid, lastAcVariation, isPumpRunning(), isValveOpen(),
                     currentFlowRateLpm > MIN_FLOW_LPM, currentFlowRateLpm,
                     waitingForPermission, pendingAction,
                     systemMode, getStateName(currentState));
}
