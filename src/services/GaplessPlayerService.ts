import TrackPlayer, { Event, RepeatMode, State, Track } from 'react-native-track-player';

/**
 * Robust Queue Management and graceful error handler.
 */
class GaplessPlayerService {
    /**
     * Appends tracks to the native ExoPlayer queue to enable pre-buffering.
     */
    async add(tracks: Track[]) {
        await TrackPlayer.add(tracks);
    }
    
    async remove(indices: number[]) {
        await TrackPlayer.remove(indices);
    }

    async skip(index: number) {
        await TrackPlayer.skip(index);
    }

    /**
     * Emulates full-queue shuffle by scrambling the upcoming tracks.
     */
    async shuffle() {
        const queue = await TrackPlayer.getQueue();
        const current = await TrackPlayer.getActiveTrackIndex() || 0;
        
        // Only shuffle tracks AFTER the current track so gapless continues
        const remaining = queue.slice(current + 1);
        for (let i = remaining.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
        }
        
        const newQueue = [...queue.slice(0, current + 1), ...remaining];
        
        // Overwrite the native queue safely
        await TrackPlayer.reset();
        await TrackPlayer.add(newQueue);
        await TrackPlayer.skip(current);
        const state = await TrackPlayer.getPlaybackState();
        if (state.state !== State.Playing) {
             await TrackPlayer.play();
        }
    }

    async setRepeat(mode: RepeatMode) {
        await TrackPlayer.setRepeatMode(mode);
    }

    async clear() {
        await TrackPlayer.reset();
    }

    /**
     * Background service exported for index.js registration
     */
    static registerBackgroundService() {
        return async function() {
            TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
            TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
            TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
            TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
            TrackPlayer.addEventListener(Event.RemoteSeek, (e) => TrackPlayer.seekTo(e.position));

            // Graceful error handling for failed preloads / dropped network streams
            TrackPlayer.addEventListener(Event.PlaybackError, async (error) => {
                console.warn('[GaplessPlayerService] Native network drop or decode failure:', error);
                try {
                    // Evict the corrupted track and aggressively attempt to skip to safety
                    await TrackPlayer.skipToNext();
                    await TrackPlayer.play();
                } catch (e) {
                    console.error('[GaplessPlayerService] Graceful recovery failed', e);
                }
            });
        };
    }
}

export const gaplessPlayer = new GaplessPlayerService();
