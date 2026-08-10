import { Platform, PermissionsAndroid } from 'react-native'
import messaging from '@react-native-firebase/messaging'
import notifee, { AndroidImportance } from '@notifee/react-native'
import { FCM_TOPIC, NOTIFICATION_CHANNEL_ID } from './config'

// Call once on app start. Creates the notification channel the relay's FCM
// messages target (android.notification.channelId) — on Android 8+, a push
// referencing a channel that doesn't exist yet is silently dropped, so this
// has to run before any message can arrive.
export async function setupNotifications() {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
  }
  await messaging().requestPermission()
  await notifee.createChannel({
    id: NOTIFICATION_CHANNEL_ID,
    name: 'AquaControl Alerts',
    importance: AndroidImportance.HIGH,
  })
  await messaging().subscribeToTopic(FCM_TOPIC)
}

// Registered in index.js, outside the component tree, before AppRegistry
// mounts the app — required for Android to deliver messages while the app
// is backgrounded or fully killed. Firebase's Android SDK auto-displays the
// system notification for the `notification` payload block on its own; this
// handler only runs for any extra `data`-only handling you might add later.
export function registerBackgroundHandler() {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[FCM background]', remoteMessage)
  })
}
