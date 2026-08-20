# AquaControl Android App

React Native dashboard for the AquaControl ESP32 system. Mirrors the web
dashboard (live tank levels, status, manual controls) plus offline caching,
pull-to-refresh, and push notifications via Firebase Cloud Messaging.

## One-time setup

### 1. Firebase project (required — this is now the app's whole data layer, not just push)

1. Create a project at the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** → Email/Password sign-in method.
3. Enable **Firestore Database** (production mode) and publish the rules in
   [`../firestore/firestore.rules`](../firestore/firestore.rules).
4. Add an Android app with package name **`com.aquacontrolapp`**.
5. Download the generated `google-services.json` and save it as
   `android/app/google-services.json` (gitignored — never commit the real
   one). `android/app/google-services.json.example` is a placeholder with
   fake values, safe to commit, that lets the app build without Firebase —
   auth/Firestore will just fail with it until you swap in the real file.
6. Generate a service account key (Project Settings → Service Accounts) for
   the [`mqtt-fcm-relay`](../mqtt-fcm-relay) service — that's the one
   trusted backend that mirrors MQTT into Firestore and pushes alerts to
   this app when it's backgrounded or closed.

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

- **No direct MQTT** — the app never talks to the broker. The
  [`mqtt-fcm-relay`](../mqtt-fcm-relay) bridge service is the only thing
  with real broker credentials; it mirrors device state into Firestore and
  relays commands back out to MQTT. The app reads/writes Firestore via
  `@react-native-firebase/firestore`, with real-time updates via Firestore's
  own listeners. See `src/hooks/useDevices.ts`.
- **Auth**: Firebase Authentication (email/password), `src/hooks/useAuth.ts`.
  Every account gets a `users/{uid}` profile doc with a `role` — `customer`
  (default; can only see/control their own claimed devices) or `admin`
  (sees and controls the whole fleet; only settable manually in the Firebase
  Console). OTA firmware updates are admin-only, enforced both by hiding the
  button in `ManualControls.tsx` and by Firestore security rules
  (`../firestore/firestore.rules`) — the rules are the real boundary.
- **Device claiming**: a customer links a board to their account by entering
  its device ID (the ESP32's factory-burned MAC, see the firmware's
  `identity.h`) in the "Add device" screen (`src/components/ClaimDevice.tsx`).
  Admins see every device automatically, no claiming needed.
- **Push notifications**: each device gets its own FCM topic
  (`aquacontrol_alerts_<deviceId>`), so a customer's phone only ever gets
  pushes for a device they actually own/are viewing — the app
  subscribes/unsubscribes as the selected device changes
  (`src/notifications.ts`). Without the bridge service running, you won't
  get any push at all (foreground or background), since it's also the only
  thing watching MQTT for alerts.
- **Notification channel**: created client-side via `@notifee/react-native`
  on app start (`aquacontrol-alerts`, matches the relay's `channelId`). On
  Android 8+, a push referencing a channel that doesn't exist is dropped
  silently, so open the app at least once after install before expecting
  background pushes to show up.

## Security note

The MQTT broker is a private, TLS-authenticated HiveMQ Cloud cluster —
credentials live only in the firmware and the bridge service, never in this
app. Firestore Security Rules (`../firestore/firestore.rules`) are the real
access boundary for the app itself: a customer account can only read/write
their own claimed device's data, enforced server-side regardless of what the
client does.
