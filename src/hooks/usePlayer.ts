/**
 * usePlayer.ts
 * 
 * Optimized player hook that uses react-native-track-player
 * for native notification controls and background playback.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer, {
    Capability,
    Event,
    RepeatMode,
    State,
    usePlaybackState,
    useProgress,
    useTrackPlayerEvents
} from 'react-native-track-player';
import { Song } from './useLocalMusic';

const STORAGE_KEYS = {
    CURRENT_SONG: 'music_player_current_song',
    PLAYLIST: 'music_player_playlist',
    INDEX: 'music_player_index',
    REPEAT: 'music_player_repeat',
    SHUFFLE: 'music_player_shuffle',
    PLAYLIST_NAME: 'music_player_playlist_name',
    ORIGINAL_PLAYLIST: 'music_player_original_playlist',
};

let isPlayerInitialized = false;

export async function setupPlayer(): Promise<boolean> {
    if (isPlayerInitialized) {
        return true;
    }

    try {
        await TrackPlayer.setupPlayer({
            // Options for player setup
        });

        await TrackPlayer.updateOptions({
            capabilities: [
                Capability.Play,
                Capability.Pause,
                Capability.SkipToNext,
                Capability.SkipToPrevious,
                Capability.Stop,
                Capability.SeekTo,
            ],
            compactCapabilities: [
                Capability.Play,
                Capability.Pause,
                Capability.SkipToNext,
                Capability.SkipToPrevious,
            ],
            notificationCapabilities: [
                Capability.Play,
                Capability.Pause,
                Capability.SkipToNext,
                Capability.SkipToPrevious,
            ],
            // Android specific
            android: {
                alwaysPauseOnInterruption: true,
            } as any,
        });

        isPlayerInitialized = true;
        return true;
    } catch (e) {
        console.error('[Player] Error setting up player:', e);
        return false;
    }
}

export const usePlayer = () => {
    const playbackState = usePlaybackState();
    const { position, duration } = useProgress(250);

    const [currentSong, setCurrentSong] = useState<Song | null>(null);
    const [playlist, setPlaylist] = useState<Song[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(-1);
    const [playlistName, setPlaylistName] = useState<string>('');
    const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
    const [isShuffle, setIsShuffle] = useState(false);
    const [originalPlaylist, setOriginalPlaylist] = useState<Song[]>([]);
    const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);

    const isPlaying = playbackState.state === State.Playing;

    // Initialize player on hook mount
    useEffect(() => {
        setupPlayer();
    }, []);

    // Initial load from storage
    useEffect(() => {
        const loadPersistedState = async () => {
            try {
                const [
                    persistedSong,
                    persistedPlaylist,
                    persistedIndex,
                    persistedRepeat,
                    persistedShuffle,
                    persistedName,
                    persistedOriginal
                ] = await Promise.all([
                    AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SONG),
                    AsyncStorage.getItem(STORAGE_KEYS.PLAYLIST),
                    AsyncStorage.getItem(STORAGE_KEYS.INDEX),
                    AsyncStorage.getItem(STORAGE_KEYS.REPEAT),
                    AsyncStorage.getItem(STORAGE_KEYS.SHUFFLE),
                    AsyncStorage.getItem(STORAGE_KEYS.PLAYLIST_NAME),
                    AsyncStorage.getItem(STORAGE_KEYS.ORIGINAL_PLAYLIST),
                ]);

                if (persistedSong) {
                    setCurrentSong(JSON.parse(persistedSong));
                }

                if (persistedPlaylist) {
                    const parsedPlaylist = JSON.parse(persistedPlaylist);
                    setPlaylist(parsedPlaylist);

                    // Add songs to track player queue
                    if (isPlayerInitialized) {
                        await TrackPlayer.reset();
                        await TrackPlayer.add(parsedPlaylist.map((s: Song) => ({
                            id: s.id,
                            url: s.uri,
                            title: s.title,
                            artist: s.artist,
                            artwork: s.coverImage,
                            duration: s.duration / 1000,
                        })));

                        if (persistedIndex) {
                            const idx = parseInt(persistedIndex);
                            setCurrentIndex(idx);
                            await TrackPlayer.skip(idx);
                        }
                    }
                }

                if (persistedOriginal) setOriginalPlaylist(JSON.parse(persistedOriginal));
                if (persistedRepeat) setRepeatMode(persistedRepeat as any);
                if (persistedShuffle) setIsShuffle(persistedShuffle === 'true');
                if (persistedName) setPlaylistName(persistedName);

                setTimeout(() => setIsLoadedFromStorage(true), 500);
            } catch (e) {
                console.error("[Player] Failed to load persisted state", e);
                setIsLoadedFromStorage(true);
            }
        };

        if (isPlayerInitialized) {
            loadPersistedState();
        }
    }, [isPlayerInitialized]);

    // Save state to storage
    useEffect(() => {
        if (!isLoadedFromStorage) return;

        const saveState = async () => {
            try {
                const tasks = [
                    AsyncStorage.setItem(STORAGE_KEYS.INDEX, currentIndex.toString()),
                    AsyncStorage.setItem(STORAGE_KEYS.REPEAT, repeatMode),
                    AsyncStorage.setItem(STORAGE_KEYS.SHUFFLE, isShuffle.toString()),
                    AsyncStorage.setItem(STORAGE_KEYS.PLAYLIST_NAME, playlistName),
                ];

                if (currentSong) tasks.push(AsyncStorage.setItem(STORAGE_KEYS.CURRENT_SONG, JSON.stringify(currentSong)));
                if (playlist.length > 0) tasks.push(AsyncStorage.setItem(STORAGE_KEYS.PLAYLIST, JSON.stringify(playlist)));
                if (originalPlaylist.length > 0) tasks.push(AsyncStorage.setItem(STORAGE_KEYS.ORIGINAL_PLAYLIST, JSON.stringify(originalPlaylist)));

                await Promise.all(tasks);
            } catch (e) {
                console.error("[Player] Failed to save state", e);
            }
        };

        saveState();
    }, [currentSong, playlist, currentIndex, repeatMode, isShuffle, playlistName, isLoadedFromStorage]);

    // Track Player Events
    useTrackPlayerEvents([Event.PlaybackTrackChanged, Event.PlaybackState], async (event) => {
        if (event.type === Event.PlaybackTrackChanged && event.nextTrack !== undefined) {
            const trackIndex = event.nextTrack;
            if (trackIndex !== null && playlist[trackIndex]) {
                setCurrentSong(playlist[trackIndex]);
                setCurrentIndex(trackIndex);
            }
        }
    });

    const playPause = async () => {
        const state = await TrackPlayer.getState();
        if (state === State.Playing) {
            await TrackPlayer.pause();
        } else {
            await TrackPlayer.play();
        }
    };

    const playSongInPlaylist = async (songs: Song[], index: number, name: string = '') => {
        try {
            setPlaylist(songs);
            setCurrentIndex(index);
            setPlaylistName(name);
            setCurrentSong(songs[index]);

            await TrackPlayer.reset();
            await TrackPlayer.add(songs.map(s => ({
                id: s.id,
                url: s.uri,
                title: s.title,
                artist: s.artist,
                artwork: s.coverImage,
                duration: s.duration / 1000,
            })));

            await TrackPlayer.skip(index);
            await TrackPlayer.play();
        } catch (e) {
            console.error('[Player] Error playing song in playlist:', e);
        }
    };

    const nextTrack = async () => {
        try {
            await TrackPlayer.skipToNext();
        } catch (e) {
            // If at end and repeat all is on
            if (repeatMode === 'all') {
                await TrackPlayer.skip(0);
                await TrackPlayer.play();
            }
        }
    };

    const prevTrack = async () => {
        try {
            await TrackPlayer.skipToPrevious();
        } catch (e) {
            if (repeatMode === 'all') {
                await TrackPlayer.skip(playlist.length - 1);
                await TrackPlayer.play();
            }
        }
    };

    const seek = async (positionMillis: number) => {
        await TrackPlayer.seekTo(positionMillis / 1000);
    };

    const toggleShuffle = async () => {
        if (!isShuffle) {
            setOriginalPlaylist(playlist);
            const shuffled = [...playlist].sort(() => Math.random() - 0.5);
            setPlaylist(shuffled);

            // For now, simple implementation - just shuffle the UI playlist
            // In a better version, we would shuffle the TrackPlayer queue
        } else {
            setPlaylist(originalPlaylist);
        }
        setIsShuffle(!isShuffle);
    };

    const toggleRepeat = async () => {
        let nextMode: 'off' | 'all' | 'one' = 'off';
        if (repeatMode === 'off') {
            nextMode = 'all';
            await TrackPlayer.setRepeatMode(RepeatMode.Queue);
        } else if (repeatMode === 'all') {
            nextMode = 'one';
            await TrackPlayer.setRepeatMode(RepeatMode.Track);
        } else {
            nextMode = 'off';
            await TrackPlayer.setRepeatMode(RepeatMode.Off);
        }
        setRepeatMode(nextMode);
    };

    const stop = async () => {
        await TrackPlayer.stop();
        setCurrentSong(null);
        setPlaylist([]);
        setCurrentIndex(-1);
    };

    return {
        isPlaying,
        currentSong,
        position: position * 1000,
        duration: duration * 1000,
        playPause,
        nextTrack,
        prevTrack,
        playSongInPlaylist,
        seek,
        playlist,
        currentIndex,
        playlistName,
        stop,
        isShuffle,
        toggleShuffle,
        repeatMode,
        toggleRepeat,
        addNext: () => { }, // TODO
        addToQueue: () => { }, // TODO
        removeFromQueue: () => { } // TODO
    };
};
