import 'react-native-reanimated';
console.log('--- REANIMATED 4 / JS ENGINE READY ---');
import 'expo-dev-client';
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';

// Bridge-safe App initialization
const App = require('./App').default;

registerRootComponent(App);

// Playback service registration
TrackPlayer.registerPlaybackService(() => require('./service').default);

