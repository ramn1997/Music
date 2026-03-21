import TrackPlayer, { Event } from 'react-native-track-player';


const PlaybackService = async function () {
    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());

    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
        try {
            await TrackPlayer.skipToNext();
        } catch (e) {
            console.log('RemoteNext failed', e);
        }
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
        try {
            const position = await TrackPlayer.getPosition();
            if (position > 5) {
                await TrackPlayer.seekTo(0);
            } else {
                await TrackPlayer.skipToPrevious();
            }
        } catch (e) {
            console.log('RemotePrevious failed', e);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
        TrackPlayer.seekTo(event.position);
    });

    TrackPlayer.addEventListener(Event.RemoteLike, () => {
        // Dynamic import to avoid heavy dependencies at registration time
        const { usePlayerStore } = require('./src/store/usePlayerStore');
        const { useLibraryStore } = require('./src/store/useLibraryStore');
        
        const state = usePlayerStore.getState();
        if (state.currentTrack) {
            useLibraryStore.getState().toggleLike(state.currentTrack);
        }
    });

    TrackPlayer.addEventListener(Event.PlaybackError, async (error) => {
        console.warn('[GaplessPlayerService] Network drop or unload error:', error);
        try {
            // Attempt forceful advanced skip if preload fails
            await TrackPlayer.skipToNext();
            await TrackPlayer.play();
        } catch (e) {
             console.error('Graceful recovery failed', e);
        }
    });
};

export default PlaybackService;
