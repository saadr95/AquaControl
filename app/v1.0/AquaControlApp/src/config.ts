// MQTT is no longer touched directly by this app — the bridge service
// (mqtt-fcm-relay) is the only thing with real broker credentials. This
// app talks to Firestore instead (see src/hooks/useAuth.ts, useDevices.ts).

// Per-device FCM topic — must match the bridge's `aquacontrol_alerts_${deviceId}`
// pattern in mqtt-fcm-relay/index.js, so a customer's phone only gets pushes
// for a device they've actually claimed.
export const fcmTopicForDevice = (deviceId: string) => `aquacontrol_alerts_${deviceId}`

export const NOTIFICATION_CHANNEL_ID = 'aquacontrol-alerts'

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
