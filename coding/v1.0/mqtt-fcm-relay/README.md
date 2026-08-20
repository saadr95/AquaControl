# AquaControl Bridge

The one service that talks to MQTT directly — everything else (web
dashboard, Android app) talks to Firestore instead. Three jobs:

1. **Mirrors device state into Firestore** — subscribes to
   `aquacontrol/+/status` and `+/alerts`, writes into `devices/{deviceId}`
   (auto-registering new devices the first time they're seen, unclaimed).
   Status writes are throttled to once per 15s per device and history
   points to once per 5min, independent of the firmware's 5s MQTT publish
   rate — otherwise Firestore's free-tier write quota gets tight fast as
   the fleet grows. See `firestore/README.md` for the full schema.
2. **Relays commands the other way** — watches every device's
   `pending_commands` subcollection (a Firestore
   [collection group query](https://firebase.google.com/docs/firestore/query-data/queries#collection-group-query),
   covers all devices with one listener), forwards new commands to
   `aquacontrol/<id>/commands`, then deletes them.
3. **Push notifications** — same as before, but now scoped per-device
   (`aquacontrol_alerts_<deviceId>` FCM topics) instead of one shared
   topic, so a customer's phone only gets pushes for devices they've
   actually claimed.

Needs to run continuously somewhere with network access — a Raspberry Pi,
home server, or a free-tier cloud host (Railway, Fly.io, a small VPS, etc.)
all work.

## Setup

1. In the [Firebase Console](https://console.firebase.google.com/), open your
   project → **Project Settings → Service Accounts → Generate new private key**.
   Save the downloaded JSON as `serviceAccountKey.json` in this folder (it's
   gitignored — never commit it).
2. Deploy `firestore/firestore.rules` to your project (Firestore Database →
   Rules in the console, or `firebase deploy --only firestore:rules` with
   the Firebase CLI) — this service bypasses them (Admin SDK), but the web
   dashboard and Android app depend on them actually being live.
3. Install dependencies:
   ```
   npm install
   ```
4. Run it:
   ```
   npm start
   ```

## Config (optional environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `MQTT_URL` | `mqtt://broker.hivemq.com:1883` | Broker to connect to |
| `MQTT_USERNAME` / `MQTT_PASSWORD` | (empty) | Set once the private broker is live |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | `./serviceAccountKey.json` | Path to the service account key |

## Notes

- Single-process, no persistence of its own — if it's down, MQTT messages
  published while it's offline are lost (not queued), and pending commands
  just wait in Firestore until it's back up and picks up the listener
  again. Add a process manager (pm2, systemd, a Docker restart policy) so
  it survives a crash or reboot.
- Once the private broker is live (see root `firestore/README.md` and
  `AquaControl/config.h`'s `MQTT_USE_TLS` block), set `MQTT_URL` to its
  host and the username/password env vars — nothing else here changes.
