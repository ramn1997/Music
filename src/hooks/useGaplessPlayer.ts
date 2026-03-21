import { useEffect, useState } from 'react';
import TrackPlayer, { State, usePlaybackState, useActiveTrack, useProgress, Track, Event, useTrackPlayerEvents } from 'react-native-track-player';

/**
 * Easy to use React Hook exposing the state bounds of the Gapless Engine
 */
export const useGaplessPlayer = () => {
    const playState = usePlaybackState();
    
    // In RNTP v4, playState is an object -> playState.state
    const isPlaying = playState.state === State.Playing || playState.state === State.Buffering || playState.state === State.Ready;
    
    const currentTrack = useActiveTrack();
    const progress = useProgress(250); // Aggressive 250ms update interval
    const [queue, setQueue] = useState<Track[]>([]);

    const fetchQueue = async () => {
        const q = await TrackPlayer.getQueue();
        setQueue(q);
    };

    useTrackPlayerEvents([Event.PlaybackQueueEnded, Event.PlaybackActiveTrackChanged], async () => {
        fetchQueue();
    });

    useEffect(() => {
        fetchQueue();
    }, [currentTrack]);

    const play = async () => await TrackPlayer.play();
    const pause = async () => await TrackPlayer.pause();
    const next = async () => await TrackPlayer.skipToNext();
    const previous = async () => await TrackPlayer.skipToPrevious();
    const seek = async (seconds: number) => await TrackPlayer.seekTo(seconds);

    return {
        play,
        pause,
        next,
        previous,
        seek,
        queue,
        currentTrack,
        isPlaying,
        progress,
        fetchQueue
    };
};
