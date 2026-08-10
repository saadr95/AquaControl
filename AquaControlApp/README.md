# AquaControl Android App

React Native dashboard for the AquaControl ESP32 system. Mirrors the web
dashboard (live tank levels, status, manual controls) plus offline caching,
pull-to-refresh, and push notifications via Firebase Cloud Messaging.

## One-time setup

### 1. Firebase project (required for push notifications)

1. Create a project at the [Firebase Console](https://console.firebase.google.com/).
2. Add an Android app with package name **`com.aquacontrolapp`**.
3. Download the generated `google-services.json` and save it as
   `android/app/google-services.json` (gitignored — never commit the real
   one). `android/app/google-services.json.example` is a placeholder with
   fake values, safe to commit, that lets the app build without Firebase —
   Firebase auth will just fail with it until you swap in the real file.
4. Generate a service account key (Project Settings → Service Accounts) for
   the [`mqtt-fcm-relay`](../mqtt-fcm-relay) service — that's the piece that
   actually pushes alerts to this app when it's backgrounded or closed.

### 2. Install dependencies

```
npm install
```

### 3. Run on Android

```
npx react-native run-android
```

Needs an emulator running or a device connected via USB with debugging
enabled.

### Windows-only: long path build failure

If the Gradle build fails with `ninja: error: Stat(...): Filename longer
than 260 characters`, it's Windows' path-length limit — the C++ codegen for
`react-native-safe-area-context` builds a nested path deep enough to blow
past 260 chars once combined with a long project path.

**Debug builds**: a `subst` virtual drive is enough, since Metro runs
separately as its own dev server and never touches the short drive:

```
subst R: "C:\path\to\AquaControlApp"
cd R:\android
.\gradlew.bat assembleDebug
```

**Release builds**: `subst` is *not* enough — Gradle bundles the JS itself
as part of the build, and Metro's file watcher resolves a `subst` drive back
to its real path internally, which breaks the bundling step with a
"Failed to get the SHA-1" error. For release builds, mirror the project to a
genuinely short **real** path instead and build from there:

```
robocopy "C:\path\to\AquaControlApp" "C:\rn\AquaControlApp" /E /MT:8
cd C:\rn\AquaControlApp\android
.\gradlew.bat assembleRelease
```

Copy the resulting APK back from
`C:\rn\AquaControlApp\android\app\build\outputs\apk\release\app-release.apk`.
(If you robocopy again later to pick up code changes, don't exclude any
folder named `build` — some npm packages, like `@react-native-community/cli`,
ship their compiled output in a folder called exactly that, and excluding it
globally silently breaks the copy.)

## Architecture notes

- **MQTT**: connects to `broker.hivemq.com` over WSS (`wss://…:8884/mqtt`),
  same broker as the firmware and web dashboard. See `src/config.ts`.
- **Multiple boards**: each board publishes to `aquacontrol/<device_id>/...`,
  where `device_id` is derived from its ESP32's factory-burned MAC address
  (unique per chip, no setup needed — see the firmware's `identity.h`). This
  app subscribes to `aquacontrol/+/status` and `+/alerts` (wildcard) to
  auto-discover every board currently online; a chip row appears in the
  header once more than one is seen, showing each board's friendly name
  (set via the firmware's WiFi setup portal). The selected board persists
  in AsyncStorage between sessions.
- **Offline support**: last known status (per device), alert log, and tank
  history are cached in AsyncStorage and loaded before the socket connects,
  so the app shows real data immediately even with no network.
- **Push notifications**: MQTT can't wake a killed app on Android — the OS
  suspends network connections once the app is backgrounded long enough.
  The [`mqtt-fcm-relay`](../mqtt-fcm-relay) service bridges
  `aquacontrol/+/alerts` (every board) → an FCM topic (`aquacontrol_alerts`)
  that this app subscribes to on startup (`src/notifications.ts`). Without
  that relay running, you'll only get alerts while the app is open in the
  foreground.
- **Notification channel**: created client-side via `@notifee/react-native`
  on app start (`aquacontrol-alerts`, matches the relay's `channelId`). On
  Android 8+, a push referencing a channel that doesn't exist is dropped
  silently, so open the app at least once after install before expecting
  background pushes to show up.

## Security note

`broker.hivemq.com` is an unauthenticated public broker — anyone who knows
the topic names can publish fake commands or read your tank data. Fine for
bench testing; move to a private/authenticated broker before this is used
for anything beyond development.
