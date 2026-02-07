/**
 * TrackPlayerService.ts
 * 
 * Service file for react-native-track-player
 * This handles background playback and notification controls
 */

import TrackPlayer, { Event } from 'react-native-track-player';

/**
 * Playback service that handles remote events like notification controls
 */
export async function PlaybackService() {
    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
    TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
    TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
    TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
    TrackPlayer.addEventListener(Event.RemoteSeek, (event) => TrackPlayer.seekTo(event.position));

    // Handle notification being dismissed
    TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
        if (event.paused) {
            await TrackPlayer.pause();
        } else if (event.permanent) {
            await TrackPlayer.stop();
        } else {
            await TrackPlayer.play();
        }
    });
}
