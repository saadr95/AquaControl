# Firestore schema

Deploy `firestore.rules` via the Firebase Console (Firestore Database →
Rules → paste and Publish) or the Firebase CLI (`firebase deploy --only
firestore:rules`). These rules are the actual security boundary for the web
dashboard and Android app — the bridge service writes through the Admin SDK,
which bypasses them entirely (that's correct; it's the one trusted writer).

## Collections

### `users/{uid}`
```
{
  email: string,
  role: "customer" | "admin",
  createdAt: timestamp
}
```
Created client-side on first sign-in (`role` always starts as `"customer"` —
promoting to `"admin"` is a manual step in the Firebase Console or via the
Admin SDK, never client-writable).

### `devices/{deviceId}`
`deviceId` is the firmware's 12-hex-char hardware ID (e.g. `DCE8B5DF948C`).
```
{
  ownerUid: string | null,       // null until claimed
  claimed: boolean,
  claimedAt: timestamp | null,
  internalLabel: string,          // "Mark I" etc — admin-only, never shown to customers
  customerName: string,           // whatever the owner named it via SET_NAME
  status: { ...latest status JSON from MQTT... },
  lastSeenAt: timestamp
}
```
Auto-created by the bridge service (unclaimed) the first time it sees a new
device publish on MQTT — no manual registration step needed.

**Claiming**: a signed-in user can update an *unclaimed* device's `ownerUid`
to themselves — see the rule for the exact constraints (can't touch any
other field, can't claim an already-claimed device). Once claimed, only an
admin can change ownership going forward.

### `devices/{deviceId}/alerts/{alertId}`
Mirrors `aquacontrol/<id>/alerts` — one document per alert, written by the
bridge, read-only to clients.

### `devices/{deviceId}/history/{pointId}`
Tank level history points (for the 24h chart), same idea — bridge writes,
clients read.

### `devices/{deviceId}/pending_commands/{commandId}`
How a client sends a command to a device: write a document here (`{cmd:
"PUMP_ON", ...}`), matching the same command shape the firmware already
understands over MQTT. The bridge is watching this subcollection, relays
each new doc to `aquacontrol/<id>/commands`, then deletes it. Clients never
need to read this back — the result shows up as an updated `status` field or
a new `alerts` entry shortly after.

`OTA_UPDATE` is blocked at the rules level for non-admin writers — a
customer account cannot create a `pending_commands` doc with that `cmd`
value no matter what the UI does, since the check is server-side.
