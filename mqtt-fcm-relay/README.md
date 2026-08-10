# AquaControl MQTT → FCM Relay

Bridges `aquacontrol/+/alerts` (MQTT — wildcard, covers every board in the
fleet) to a Firebase Cloud Messaging topic, so the Android app gets a real
push notification even when it's fully closed. MQTT alone can't do this —
Android suspends a closed app's network connections, so without this relay
"background" notifications would stop working once the app is killed. One
relay instance covers all boards; the push notification's title includes
each board's friendly name so you can tell them apart.

Needs to run continuously somewhere with network access — a Raspberry Pi,
home server, or a free-tier cloud host (Railway, Fly.io, a small VPS, etc.)
all work.

## Setup

1. In the [Firebase Console](https://console.firebase.google.com/), open your
   project → **Project Settings → Service Accounts → Generate new private key**.
   Save the downloaded JSON as `serviceAccountKey.json` in this folder (it's
   gitignored — never commit it).
2. Install dependencies:
   ```
   npm install
   ```
3. Run it:
   ```
   npm start
   ```

## Config (optional environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `MQTT_URL` | `mqtt://broker.hivemq.com:1883` | Broker to subscribe to |
| `MQTT_TOPIC_ALERTS` | `aquacontrol/+/alerts` | Topic (wildcard) to relay |
| `FCM_TOPIC` | `aquacontrol_alerts` | FCM topic the Android app subscribes to |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | `./serviceAccountKey.json` | Path to the service account key |

## Notes

- This is a single-process relay with no persistence — if it's down, alerts
  published while it's offline are lost (not queued). Fine for a home setup;
  add a process manager (pm2, systemd, a Docker restart policy) so it comes
  back up after a crash or reboot.
- Same public-broker caveat as the rest of the project: `broker.hivemq.com`
  is unauthenticated, so anyone could publish fake alerts that this relay
  would dutifully push to your phone. Move to a private broker before this
  matters for real.
