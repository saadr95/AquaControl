/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerBackgroundHandler } from './src/notifications';

// Must run before AppRegistry mounts the app — this is what lets Android
// deliver FCM messages while the app is backgrounded or fully killed.
registerBackgroundHandler();

AppRegistry.registerComponent(appName, () => App);
