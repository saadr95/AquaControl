// HiveMQ public broker — unauthenticated. Anyone can read/publish these
// topics. Fine for bench testing; move to a private/authenticated broker
// before relying on this for real control.
export const MQTT_URL = 'wss://broker.hivemq.com:8884/mqtt'

// Topics are namespaced per-board: aquacontrol/<device_id>/status etc.
// The wildcard subscriptions below auto-discover every board currently
// online — see the device picker in the header.
export const TOPIC_PREFIX = 'aquacontrol'
export const TOPIC_STATUS_WILDCARD = `${TOPIC_PREFIX}/+/status`
export const TOPIC_ALERTS_WILDCARD = `${TOPIC_PREFIX}/+/alerts`
export const topicCommands = (deviceId) => `${TOPIC_PREFIX}/${deviceId}/commands`

export const HISTORY_KEY = 'aquacontrol_history'
export const ALERTS_KEY = 'aquacontrol_alerts'
export const LAST_STATUS_KEY = 'aquacontrol_last_status'
export const SELECTED_DEVICE_KEY = 'aquacontrol_selected_device'

export const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000
export const MAX_ALERTS = 20

// Below this unix-epoch-seconds value a timestamp is assumed to be junk
// (e.g. the ESP32 hasn't finished its first NTP sync yet) — fall back to
// the browser's own clock instead of plotting it at the 1970 origin.
export const MIN_VALID_EPOCH_S = 1600000000

export const UNDER_LOW_PCT = 20
export const ROOF_LOW_PCT = 25

// Rough estimate from approximate dimensions (~3.54m x 2.655m x 2.2m) —
// refine with the tank's rated capacity or a precise measurement when
// available. Only the underground tank has a flow sensor (on the supply
// line feeding it), so ETA is only meaningful for that tank.
export const UNDER_TANK_CAPACITY_L = 20800
