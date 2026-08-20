// MQTT is no longer touched directly by this app — the bridge service
// (mqtt-fcm-relay) is the only thing with real broker credentials. This
// app talks to Firestore instead (see src/firebase.js, src/hooks/useDevices.js).

export const SELECTED_DEVICE_KEY = 'aquacontrol_selected_device'

export const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000
export const MAX_ALERTS = 20

export const UNDER_LOW_PCT = 20
export const ROOF_LOW_PCT = 25

// Rough estimate from approximate dimensions (~3.54m x 2.655m x 2.2m) —
// refine with the tank's rated capacity or a precise measurement when
// available. Only the underground tank has a flow sensor (on the supply
// line feeding it), so ETA is only meaningful for that tank.
export const UNDER_TANK_CAPACITY_L = 20800
