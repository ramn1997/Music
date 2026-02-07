
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';

// Try to register track player service if available
try {
    const TrackPlayer = require('react-native-track-player').default;
    const { PlaybackService } = require('./src/services/TrackPlayerService');

    if (TrackPlayer && TrackPlayer.registerPlaybackService) {
        TrackPlayer.registerPlaybackService(() => PlaybackService);
        console.log('[Player] Track Player service registered');
    }
} catch (e) {
    console.log('[Player] react-native-track-player not available in Expo Go');
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
