import TrackPlayer, { Event } from 'react-native-track-player';

// Use string literals to ensure events are registered correctly in background
module.exports = async function () {
    console.log('PlaybackService: Started');

    TrackPlayer.addEventListener(Event.RemotePlay, () => {
        console.log('PlaybackService: RemotePlay');
        TrackPlayer.play();
    });

    TrackPlayer.addEventListener(Event.RemotePause, () => {
        console.log('PlaybackService: RemotePause');
        TrackPlayer.pause();
    });

    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
        console.log('PlaybackService: RemoteNext');
        try {
            await TrackPlayer.skipToNext();
        } catch (e) {
            // If skip fails (e.g. at end of list), check repeat mode if possible
            // But since we can't easily check context here, we rely on TrackPlayer's internal repeat mode
            console.log('PlaybackService: RemoteNext failed, could be at end of queue');
        }
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
        console.log('PlaybackService: RemotePrevious');
        try {
            // Check current position to decide whether to restart or skip back
            const position = await TrackPlayer.getPosition();
            if (position > 3) {
                await TrackPlayer.seekTo(0);
            } else {
                await TrackPlayer.skipToPrevious();
            }
        } catch (e) {
            console.log('PlaybackService: RemotePrevious failed');
        }
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
        console.log('PlaybackService: RemoteSeek', event.position);
        TrackPlayer.seekTo(event.position);
    });

    // Handle standard events as well just in case (though these are usually handled by hooks)
    // TrackPlayer.addEventListener(Event.PlaybackTrackChanged, () => { });
    // TrackPlayer.addEventListener(Event.PlaybackState, () => { });
};
