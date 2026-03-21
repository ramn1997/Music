import { create } from 'zustand';
import { storage } from './mmkv';
import TrackPlayer, {
    Capability,
    RepeatMode,
    AppKilledPlaybackBehavior,
    State,
    Track,
    Event,
    RatingType
} from 'react-native-track-player';
import { useLibraryStore } from './useLibraryStore';
import { Platform, Image } from 'react-native';
import { Song } from '../types/library';
import { updateWidget, widgetEvents } from '../utils/musicWidget';
const PLAYER_STATE_KEY = 'player_state_persistence';
const PLAYER_POSITION_KEY = 'player_position';

// Optimization: Keep a small native queue window. We manage advancement ourselves.
const QUEUE_WINDOW_SIZE = 5; // songs ahead of current in native queue

// Helper for mapping Song -> Track

export const songToTrack = (song: Song): Track => {
    let artwork = song.coverImage;

    // Resolve system album art for Android if local
    if (Platform.OS === 'android') {
        if (song.albumId && !['null', 'undefined', '-1', '0'].includes(String(song.albumId))) {
            const isCustomOrExtracted = artwork && (artwork.includes('custom_art_') || artwork.includes('art_'));
            if (!artwork || (!artwork.startsWith('http') && !isCustomOrExtracted)) {
                artwork = `content://media/external/audio/albumart/${song.albumId}`;
            }
        }

        // Fallback to the premium generated cover art for BOTH widget and notifications
        if (!artwork) {
            // Provide explicit bundle path for TrackPlayer Notification Coil renderer
            artwork = require('../../assets/default_cover.png') as any;
        }
    } else {
        // iOS Fallback
        if (!artwork) {
            artwork = require('../../assets/default_cover.png') as any;
        }
    }

    return {
        id: song.id,
        url: song.uri,
        title: song.title,
        artist: song.artist,
        album: song.album,
        artwork: artwork,
        rating: useLibraryStore.getState().isLiked(song.id) ? 1 : 0,
    };
};

interface PlayerState {
    currentTrack: Song | null;
    isPlaying: boolean;
    isShuffleOn: boolean;
    repeatMode: 'off' | 'one' | 'all';
    playlist: Song[];
    currentIndex: number;
    playlistName: string;
    playbackSpeed: number;
    isGapless: boolean;
    isSpatial: boolean;
    audioQuality: 'normal' | 'high' | 'lossless' | 'hires';
    currentTrackMetadata: {
        bitrate?: string;
        sampleRate?: string;
        bitDepth?: string;
    } | null;
    isPlayerReady: boolean;
    isRestored: boolean;

    // Actions
    play: (song: Song) => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    stop: () => Promise<void>;
    seekTo: (position: number) => Promise<void>;
    seekBy: (seconds: number) => Promise<void>;
    seek: (position: number) => void;
    playNext: () => Promise<void>;
    playPrevious: () => Promise<void>;
    setQueue: (songs: Song[], index?: number) => Promise<void>;
    playSongInPlaylist: (songs: Song[], index: number, playlistName?: string) => Promise<void>;
    addToQueue: (song: Song) => Promise<void>;
    addNext: (song: Song) => Promise<void>;
    removeFromQueue: (index: number) => Promise<void>;
    toggleShuffle: () => void;
    toggleRepeat: () => Promise<void>;
    playPause: () => Promise<void>;
    nextTrack: () => Promise<void>;
    prevTrack: () => Promise<void>;
    setPlaybackSpeed: (speed: number) => Promise<void>;
    setGapless: (enabled: boolean) => Promise<void>;
    toggleSpatial: () => void;
    setAudioQuality: (quality: 'normal' | 'high' | 'lossless' | 'hires') => void;
    moveTrack: (fromIndex: number, toIndex: number) => Promise<void>;

    // Admin / Core
    setupPlayer: () => Promise<void>;
    loadPersistedState: () => Promise<void>;
    saveState: () => void;

    // Directly update internal state (used by events)
    setCurrentTrack: (song: Song | null) => void;
    setIsPlaying: (playing: boolean) => void;
    setCurrentIndex: (index: number) => void;
    syncWidget: () => Promise<void>;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
    currentTrack: null,
    isPlaying: false,
    isShuffleOn: false,
    repeatMode: 'all',
    currentIndex: -1,
    playlistName: '',
    playbackSpeed: 1.0,
    isGapless: storage.getBoolean('player_gapless') ?? true,
    isSpatial: storage.getBoolean('player_spatial') ?? false,
    audioQuality: (storage.getString('player_quality') as any) ?? 'high',
    currentTrackMetadata: null,
    isPlayerReady: false,
    isRestored: false,
    playlist: [],

    setCurrentTrack: (song) => {
        set({ currentTrack: song, currentTrackMetadata: null });
        get().syncWidget();
        get().saveState();
    },
    setIsPlaying: (playing) => {
        set({ isPlaying: playing });
        get().syncWidget();
        get().saveState();
    },
    setCurrentIndex: (index) => set({ currentIndex: index }),

    toggleSpatial: () => {
        const next = !get().isSpatial;
        set({ isSpatial: next });
        storage.set('player_spatial', next);
        
        // If spatial is turned on, we need to pause the native player 
        // because the WebView implementation will handle the audio stream via HRTF
        if (next && get().isPlaying) {
            TrackPlayer.pause();
        } else if (!next && get().isPlaying) {
            // Re-sync progress and resume native playback
            TrackPlayer.play();
        }
    },

    setAudioQuality: (quality) => {
        set({ audioQuality: quality });
        storage.set('player_quality', quality);
    },

    syncWidget: async () => {
        if (Platform.OS !== 'android') return;
        const state = get();
        const duration = await TrackPlayer.getDuration();
        const progress = await TrackPlayer.getPosition();

        const formatTime = (seconds: number) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };

        const isLiked = state.currentTrack ? useLibraryStore.getState().isLiked(state.currentTrack.id) : false;

        updateWidget({
            title: state.currentTrack?.title || 'No Track',
            artist: state.currentTrack?.artist || 'Unknown Artist',
            isPlaying: state.isPlaying,
            isLiked: isLiked,
            isShuffleOn: state.isShuffleOn,
            repeatMode: state.repeatMode,
            artwork: state.currentTrack?.coverImage || (Platform.OS === 'android' ? 'android.resource://com.ram.musicapp/drawable/default_cover' : require('../../assets/default_cover.png')),
            progress: progress,
            duration: duration,
            currentTimeStr: formatTime(progress),
            totalTimeStr: formatTime(duration)
        });
    },

    saveState: () => {
        const state = get();
        if (!state.isRestored || !state.currentTrack) return;

        try {
            // CRITICAL OPTIMIZATION: Do NOT save 10,000 songs in a JSON string.
            // We save a window of 30 songs (15 before, 15 after) to keep MMKV fast.
            // On reload, we will use the playlistName context to try and recover the full list.
            const total = state.playlist.length;
            const start = Math.max(0, state.currentIndex - 15);
            const end = Math.min(total, state.currentIndex + 15);

            const windowPlaylist = state.playlist.slice(start, end).map(s => ({
                id: s.id,
                uri: s.uri,
                title: s.title,
                artist: s.artist,
                albumId: s.albumId,
                coverImage: (s.coverImage && s.coverImage.length > 500) ? undefined : s.coverImage
            }));

            const compactCurrentTrack = {
                ...state.currentTrack,
                coverImage: (state.currentTrack.coverImage && state.currentTrack.coverImage.length > 500)
                    ? undefined
                    : state.currentTrack.coverImage
            };

            const dataToSave = {
                currentTrack: compactCurrentTrack,
                playlist: windowPlaylist,
                currentIndexInWindow: state.currentIndex - start,
                fullIndex: state.currentIndex,
                playlistName: state.playlistName,
                repeatMode: state.repeatMode,
                shuffle: state.isShuffleOn,
                speed: state.playbackSpeed,
                gapless: state.isGapless,
                totalSize: total // Store total size so we know if we need to reconstruct later
            };

            storage.set(PLAYER_STATE_KEY, JSON.stringify(dataToSave));
        } catch (e) {
            console.warn('[PlayerStore] Persistence failed:', e);
        }
    },


    setupPlayer: async () => {
        const state = get();
        if (state.isPlayerReady) return;

        console.log('[PlayerStore] Configuring player...');
        const audioQuality = storage.getString('audio_quality') || 'medium';
        const qualityMultiplier = audioQuality === 'high' ? 2 : (audioQuality === 'low' ? 0.5 : 1);
        const isGapless = storage.getBoolean('player_gapless') ?? state.isGapless;

        let retries = 3;
        let success = false;

        while (retries > 0 && !success) {
            try {
                let alreadySetup = false;
                try {
                    await TrackPlayer.getQueue();
                    alreadySetup = true;
                    console.log('[PlayerStore] Player already initialized');
                } catch (e) {
                    // Not initialized
                }

                if (!alreadySetup) {
                    await TrackPlayer.setupPlayer({
                        waitForBuffer: true,
                        autoHandleInterruptions: true,
                        // Exact Buffer parameters requested for Gapless Playback
                        minBuffer: (isGapless ? 15 : 10) * qualityMultiplier,
                        maxBuffer: (isGapless ? 50 : 20) * qualityMultiplier,
                        playBuffer: 2.5 * qualityMultiplier,
                        backBuffer: 5 * qualityMultiplier,
                    });
                }

                await TrackPlayer.setRate(state.playbackSpeed);

                // FIX: Increase delay much more to ensure native service is stable
                // Line 188 NPE in MusicService.kt is often because notificationManager isn't ready
                await new Promise(r => setTimeout(r, 2500));
                try {
                    await TrackPlayer.updateOptions({
                        android: {
                            appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
                        },
                        ratingType: RatingType.Heart,
                        stoppingAppPausesPlayback: false,
                        capabilities: [
                            Capability.SkipToPrevious,
                            Capability.Play,
                            Capability.Pause,
                            Capability.SkipToNext,
                            Capability.SeekTo,
                        ],
                        compactCapabilities: [
                            Capability.SkipToPrevious,
                            Capability.Play,
                            Capability.SkipToNext,
                        ],
                        progressUpdateEventInterval: isGapless ? 0.25 : 1,
                    });
                } catch (e) {
                    console.warn('[PlayerStore] updateOptions failed:', e);
                }

                set({ isPlayerReady: true, isGapless });
                success = true;
                console.log('[PlayerStore] Player setup successful');
            } catch (error: any) {
                const message = error.message || String(error);
                if (message.includes('foreground') && retries > 1) {
                    console.log(`[PlayerStore] Foreground required, retrying... (${retries - 1} left)`);
                    await new Promise(r => setTimeout(r, 1000));
                    retries--;
                } else if ((message.includes('already') || error.code === 'player_already_initialized') && !success) {
                    // If it says already initialized but getQueue failed, try to force a success state
                    console.log('[PlayerStore] Player already initialized according to error');
                    set({ isPlayerReady: true, isGapless });
                    success = true;
                } else {
                    console.error('[PlayerStore] Critical Error setting up TrackPlayer:', error);
                    break;
                }
            }
        }
    },

    loadPersistedState: async () => {
        const state = get();
        if (!state.isPlayerReady) return;

        try {
            const savedStr = storage.getString(PLAYER_STATE_KEY);
            if (savedStr && savedStr.includes('{')) {
                const data = JSON.parse(savedStr);
                const updates: Partial<PlayerState> = {};

                if (data.shuffle !== undefined) updates.isShuffleOn = data.shuffle;
                if (data.repeat !== undefined) updates.repeatMode = data.repeat;
                if (data.speed !== undefined) {
                    updates.playbackSpeed = data.speed;
                    await TrackPlayer.setRate(data.speed);
                }
                if (data.gapless !== undefined) updates.isGapless = data.gapless;

                if (data.currentTrack) {
                    const currentTrack = data.currentTrack;
                    const playlist = data.playlist || [];
                    const currentIndex = data.fullIndex ?? data.currentIndex ?? -1;
                    const playlistName = data.playlistName || '';

                    set({
                        currentTrack,
                        playlist,
                        currentIndex,
                        playlistName,
                        isRestored: true
                    });

                    if (playlist.length > 0) {
                        // FIX: Add a small delay for native service synchronization
                        await new Promise(r => setTimeout(r, 500));
                        
                        // FIX: Check if player is already playing (e.g. from notification)
                        // If it is, DO NOT reset/add tracks as it would stop the music.
                        const activeTrack = await TrackPlayer.getActiveTrack();
                        if (!activeTrack) {
                            const tracks = playlist.map(songToTrack);
                            await TrackPlayer.reset();
                            await TrackPlayer.add(tracks);

                            const activeIndex = data.currentIndexInWindow ?? 0;
                            if (activeIndex >= 0 && activeIndex < tracks.length) {

                                let initialPos = 0;
                                const savedPos = storage.getNumber(PLAYER_POSITION_KEY);
                                if (savedPos && savedPos > 0) {
                                    initialPos = savedPos / 1000;
                                }
                                await TrackPlayer.skip(activeIndex, initialPos);
                            }
                        } else {
                            // If already playing, try to reconcile native index with our virtual playlist
                            console.log('[PlayerStore] Player already active on launch, skipping reset');
                            const nativeIdx = await TrackPlayer.getActiveTrackIndex();
                            if (typeof nativeIdx === 'number') {
                                updates.currentIndex = nativeIdx;
                            }
                        }
                    }
                }

                set({ ...updates, isRestored: true });
            } else {
                set({ isRestored: true });
            }
        } catch (e) {
            console.error('[PlayerStore] Failed to load state', e);
            set({ isRestored: true });
        }
    },

    play: async (song) => {
        const state = get();
        await TrackPlayer.reset();
        await TrackPlayer.add([songToTrack(song)]);
        set({
            playlist: [song],
            currentIndex: 0,
            currentTrack: song,
            isPlaying: true
        });
        await TrackPlayer.play();

        // Re-apply repeat mode
        const mode = state.repeatMode === 'one' ? RepeatMode.Track
            : state.repeatMode === 'all' ? RepeatMode.Queue
                : RepeatMode.Off;
        await TrackPlayer.setRepeatMode(mode);
        state.saveState();
    },

    pause: async () => {
        await TrackPlayer.pause();
        set({ isPlaying: false });
    },

    resume: async () => {
        await TrackPlayer.play();
        set({ isPlaying: true });
    },

    stop: async () => {
        await TrackPlayer.reset();
        set({
            currentTrack: null,
            playlist: [],
            currentIndex: -1,
            isPlaying: false
        });
        get().saveState();
    },

    seekTo: async (millis) => {
        await TrackPlayer.seekTo(millis / 1000);
    },

    seekBy: async (seconds) => {
        await TrackPlayer.seekBy(seconds);
    },

    seek: (millis) => {
        TrackPlayer.seekTo(millis / 1000);
    },

    setQueue: async (songs, index = 0) => {
        const activeTrack = await TrackPlayer.getActiveTrack();
        if (songs.length > index && activeTrack && String(activeTrack.id) === String(songs[index].id)) {
            await TrackPlayer.play();
            set({ isPlaying: true });
            return;
        }

        await TrackPlayer.reset();
        await TrackPlayer.add(songs.map(songToTrack));

        set({ playlist: songs });

        if (songs.length > index) {
            set({
                currentIndex: index,
                currentTrack: songs[index],
                isPlaying: true
            });
            await TrackPlayer.skip(index);
            await TrackPlayer.play();

            const state = get();
            const mode = state.repeatMode === 'one' ? RepeatMode.Track
                : state.repeatMode === 'all' ? RepeatMode.Queue
                    : RepeatMode.Off;
            await TrackPlayer.setRepeatMode(mode);
            state.saveState();
        }
    },

    playSongInPlaylist: async (songs, index, playlistName = '') => {
        const state = get();
        const activeTrack = await TrackPlayer.getActiveTrack();

        // If we're already playing this exact track from this playlist, just resume.
        if (songs.length > index && activeTrack && String(activeTrack.id) === String(songs[index].id) && state.playlistName === playlistName) {
            await TrackPlayer.play();
            set({ isPlaying: true });
            return;
        }

        // Load a look-ahead window: current track + next QUEUE_WINDOW_SIZE tracks
        const windowEnd = Math.min(songs.length, index + QUEUE_WINDOW_SIZE + 1);
        const window = songs.slice(index, windowEnd);
        const tracks = window.map(songToTrack);

        await TrackPlayer.reset();
        await TrackPlayer.add(tracks);
        // The selected song is always at native index 0 after reset+add(window)
        // No need to skip — just play from position 0

        set({
            playlist: songs,
            playlistName,
            currentIndex: index,
            currentTrack: songs[index],
            isPlaying: true
        });

        await TrackPlayer.play();

        const mode = state.repeatMode === 'one' ? RepeatMode.Track
            : state.repeatMode === 'all' ? RepeatMode.Queue
                : RepeatMode.Off;
        // Use RepeatMode.Off — we manage looping ourselves via the gapless engine
        await TrackPlayer.setRepeatMode(RepeatMode.Off);
        get().saveState();
    },


    addToQueue: async (song) => {
        await TrackPlayer.add([songToTrack(song)]);
        set(state => {
            const newPlaylist = [...state.playlist, song];
            storage.set(PLAYER_STATE_KEY, JSON.stringify({ ...state, playlist: newPlaylist }));
            return { playlist: newPlaylist };
        });
    },

    addNext: async (song) => {
        const state = get();
        await TrackPlayer.add([songToTrack(song)], state.currentIndex + 1);
        const newPlaylist = [...state.playlist];
        newPlaylist.splice(state.currentIndex + 1, 0, song);
        set({ playlist: newPlaylist });
        state.saveState();
    },

    removeFromQueue: async (index) => {
        await TrackPlayer.remove(index);
        set(state => {
            const newPlaylist = state.playlist.filter((_, i) => i !== index);
            return { playlist: newPlaylist };
        });
        get().saveState();
    },

    moveTrack: async (fromIndex, toIndex) => {
        const state = get();
        if (fromIndex === toIndex) return;

        const newPlaylist = [...state.playlist];
        const [movedItem] = newPlaylist.splice(fromIndex, 1);
        newPlaylist.splice(toIndex, 0, movedItem);

        try {
            await TrackPlayer.move(fromIndex, toIndex);
        } catch (e) {
            console.warn('[PlayerStore] TrackPlayer.move failed:', e);
        }

        let newCurrentIdx = state.currentIndex;
        if (fromIndex === state.currentIndex) {
            newCurrentIdx = toIndex;
        } else if (fromIndex < state.currentIndex && toIndex >= state.currentIndex) {
            newCurrentIdx--;
        } else if (fromIndex > state.currentIndex && toIndex <= state.currentIndex) {
            newCurrentIdx++;
        }

        set({ playlist: newPlaylist, currentIndex: newCurrentIdx });
        state.saveState();
    },

    toggleShuffle: () => {
        set(state => {
            const newShuffle = !state.isShuffleOn;
            return { isShuffleOn: newShuffle };
        });
        get().saveState();
    },

    toggleRepeat: async () => {
        const state = get();
        const modes: ('off' | 'one' | 'all')[] = ['off', 'one', 'all'];
        const currentModeIndex = modes.indexOf(state.repeatMode);
        const nextMode = modes[(currentModeIndex + 1) % modes.length];

        set({ repeatMode: nextMode });

        const mode = nextMode === 'one' ? RepeatMode.Track
            : nextMode === 'all' ? RepeatMode.Queue
                : RepeatMode.Off;
        await TrackPlayer.setRepeatMode(mode);
        get().saveState();
    },

    playPause: async () => {
        const state = get();
        if (!state.isPlayerReady) {
            await state.setupPlayer();
        }

        if (state.isPlaying) {
            await TrackPlayer.pause();
            set({ isPlaying: false });
        } else {
            try {
                await TrackPlayer.getState();
            } catch (e) {
                await state.setupPlayer();
            }

            const queue = await TrackPlayer.getQueue();
            if (queue.length === 0 && state.currentTrack) {
                await TrackPlayer.add([songToTrack(state.currentTrack)]);
                let initialPos = 0;
                const savedPos = storage.getNumber(PLAYER_POSITION_KEY);
                if (savedPos && savedPos > 0) {
                    initialPos = savedPos / 1000;
                }
                await TrackPlayer.skip(0, initialPos);
            }

            const currentPos = await TrackPlayer.getPosition();
            const currentDur = await TrackPlayer.getDuration();
            if (currentDur > 0 && currentPos >= currentDur - 1) {
                await TrackPlayer.seekTo(0);
            }

            await TrackPlayer.play();
            set({ isPlaying: true });
        }
    },

    nextTrack: async () => {
        const state = get();
        const playlist = state.playlist;
        if (playlist.length === 0) return;

        let nextVirtualIdx: number;
        if (state.repeatMode === 'one') {
            nextVirtualIdx = state.currentIndex;
        } else if (state.currentIndex >= playlist.length - 1) {
            if (state.repeatMode === 'all') {
                nextVirtualIdx = 0;
            } else {
                return; // end of queue, no repeat
            }
        } else {
            nextVirtualIdx = state.currentIndex + 1;
        }

        try {
            const nativeQueue = await TrackPlayer.getQueue();
            const nativeIdx = await TrackPlayer.getActiveTrackIndex();

            if (nativeIdx !== null && nativeIdx !== undefined && nativeIdx < nativeQueue.length - 1) {
                // Next track is already pre-buffered in native queue — just skip to it (gapless!)
                await TrackPlayer.skipToNext();
            } else {
                // Need to load the next track
                const nextSong = playlist[nextVirtualIdx];
                await TrackPlayer.reset();
                const windowEnd = Math.min(playlist.length, nextVirtualIdx + QUEUE_WINDOW_SIZE + 1);
                const window = playlist.slice(nextVirtualIdx, windowEnd);
                await TrackPlayer.add(window.map(songToTrack));
                await TrackPlayer.play();
            }

            set({ currentIndex: nextVirtualIdx, currentTrack: playlist[nextVirtualIdx] });
            get().saveState();
        } catch (e) {
            console.error('[PlayerStore] nextTrack error:', e);
        }
    },

    prevTrack: async () => {
        try {
            const currentPosition = await TrackPlayer.getPosition();
            if (currentPosition > 3) {
                await TrackPlayer.seekTo(0);
                return;
            }

            const state = get();
            const playlist = state.playlist;
            if (playlist.length === 0) return;

            const prevVirtualIdx = state.currentIndex <= 0
                ? (state.repeatMode === 'all' ? playlist.length - 1 : 0)
                : state.currentIndex - 1;

            const nativeQueue = await TrackPlayer.getQueue();
            const nativeIdx = await TrackPlayer.getActiveTrackIndex();

            if (nativeIdx !== null && nativeIdx !== undefined && nativeIdx > 0) {
                // Previous track is already in native queue before current
                await TrackPlayer.skipToPrevious();
            } else {
                // Load from virtual playlist
                const prevSong = playlist[prevVirtualIdx];
                await TrackPlayer.reset();
                const windowEnd = Math.min(playlist.length, prevVirtualIdx + QUEUE_WINDOW_SIZE + 1);
                const window = playlist.slice(prevVirtualIdx, windowEnd);
                await TrackPlayer.add(window.map(songToTrack));
                await TrackPlayer.play();
            }

            set({ currentIndex: prevVirtualIdx, currentTrack: playlist[prevVirtualIdx] });
            get().saveState();
        } catch (e) {
            console.error('[PlayerStore] prevTrack error:', e);
        }
    },

    setPlaybackSpeed: async (speed) => {
        set({ playbackSpeed: speed });
        if (get().isPlayerReady) {
            await TrackPlayer.setRate(speed);
        }
        get().saveState();
    },

    setGapless: async (enabled) => {
        set({ isGapless: enabled });
        storage.set('player_gapless', enabled);
        await TrackPlayer.updateOptions({
            progressUpdateEventInterval: enabled ? 0.5 : 1,
        });
        get().saveState();
    },

    // Maintain alias for currentSong
    get currentSong() {
        return get().currentTrack;
    },
    playNext: () => get().nextTrack(),
    playPrevious: () => get().prevTrack(),
}));

// Track last scrobbled ID to avoid double-counting the same track
let lastScrobbledId: string | null = null;

// Setup TrackPlayer hooks outside store but interacting with it
export const initializePlayerEvents = () => {
    TrackPlayer.addEventListener(Event.RemoteSetRating, async () => {
        const state = usePlayerStore.getState();
        if (state.currentTrack) {
            useLibraryStore.getState().toggleLike(state.currentTrack);
            setTimeout(async () => {
                const isLiked = useLibraryStore.getState().isLiked(state.currentTrack!.id);
                try {
                    const activeIndex = await TrackPlayer.getActiveTrackIndex();
                    if (activeIndex !== undefined && activeIndex !== null) {
                        await TrackPlayer.updateMetadataForTrack(activeIndex, {
                            rating: isLiked ? 1 : 0
                        });
                    }
                } catch (e) {}
            }, 100);
        }
    });

    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
        const state = usePlayerStore.getState();
        const { track, index } = event;

        if (track) {
            // Find virtual index in our full playlist (MMKV/Zustand side)
            let virtualIndex = state.playlist.findIndex(s => String(s.id) === String(track.id));

            // Fallback if not found
            if (virtualIndex === -1 && typeof index === 'number') {
                virtualIndex = state.currentIndex + (index - (await TrackPlayer.getActiveTrackIndex().catch(() => index) ?? index));
                if (virtualIndex < 0) virtualIndex = 0;
                if (virtualIndex >= state.playlist.length) virtualIndex = state.playlist.length - 1;
            }

            if (virtualIndex !== -1 && virtualIndex < state.playlist.length) {
                const song = state.playlist[virtualIndex];
                state.setCurrentTrack(song);
                state.setCurrentIndex(virtualIndex);

                // Increment play count for Recently Played / Top Songs / Most Played
                if (song && String(song.id) !== lastScrobbledId) {
                    lastScrobbledId = String(song.id);
                    useLibraryStore.getState().incrementPlayCount(String(song.id));
                }

                // ENHANCED GAPLESS PRE-BUFFER: Only if enabled
                const playlist = state.playlist;
                const nextVirtualIdx = virtualIndex + 1;
                const isGaplessEnabled = state.isGapless;

                if (isGaplessEnabled && nextVirtualIdx < playlist.length) {
                    try {
                        const nativeQueue = await TrackPlayer.getQueue();
                        const activeNativeIdx = await TrackPlayer.getActiveTrackIndex() ?? 0;

                        // Buffer up to 2 tracks ahead for super smooth transitions
                        const tracksToBuffer = [];
                        for (let offset = 1; offset <= 2; offset++) {
                            const targetIdx = virtualIndex + offset;
                            if (targetIdx < playlist.length) {
                                const song = playlist[targetIdx];
                                const isBuffered = nativeQueue.some(t => String(t.id) === String(song.id));
                                if (!isBuffered) {
                                    tracksToBuffer.push(songToTrack(song));
                                }
                            }
                        }

                        if (tracksToBuffer.length > 0) {
                            await TrackPlayer.add(tracksToBuffer);
                            console.log(`[PlayerStore] Gapless: buffered ${tracksToBuffer.length} tracks`);
                        }

                        // Optimize performance: Prune tracks that are no longer needed
                        if (activeNativeIdx > 5) {
                            const indicesToRemove = Array.from({ length: activeNativeIdx - 3 }, (_, i) => i);
                            if (indicesToRemove.length > 0) {
                                await TrackPlayer.remove(indicesToRemove);
                            }
                        }
                    } catch (e) {
                        console.warn('[PlayerStore] Gapless management error:', e);
                    }
                } else if (isGaplessEnabled && state.repeatMode === 'all' && playlist.length > 0) {
                    // Wrap around pre-buffering
                    try {
                        const nativeQueue = await TrackPlayer.getQueue();
                        const firstSong = playlist[0];
                        const isBuffered = nativeQueue.some(t => String(t.id) === String(firstSong.id));
                        if (!isBuffered) {
                            await TrackPlayer.add([songToTrack(firstSong)]);
                        }
                    } catch (e) { }
                }
            }
        }
    });

    TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
        const state = usePlayerStore.getState();
        const isNowPlaying = event.state === State.Playing || event.state === State.Buffering;
        state.setIsPlaying(isNowPlaying);
    });

    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
        usePlayerStore.getState().setIsPlaying(false);
    });

    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (event) => {
        if (event.position > 0) {
            // Write directly to MMKV asynchronously but fast. No bridge delays.
            storage.set(PLAYER_POSITION_KEY, event.position * 1000);

            // Periodically update widget (every ~5 seconds of playback)
            if (Math.floor(event.position) % 5 === 0) {
                usePlayerStore.getState().syncWidget();
            }
        }
    });

    // Handle widget actions
    if (widgetEvents) {
        widgetEvents.addListener('WIDGET_PLAY_PAUSE', () => {
            usePlayerStore.getState().playPause();
        });
        widgetEvents.addListener('WIDGET_NEXT', () => {
            usePlayerStore.getState().nextTrack();
        });
        widgetEvents.addListener('WIDGET_PREVIOUS', () => {
            usePlayerStore.getState().prevTrack();
        });
        widgetEvents.addListener('WIDGET_LIKE', () => {
            const state = usePlayerStore.getState();
            if (state.currentTrack) {
                useLibraryStore.getState().toggleLike(state.currentTrack);
                state.syncWidget(); // Update the widget to reflect the new like status
            }
        });

        widgetEvents.addListener('onWidgetAction', (action: string) => {
            const state = usePlayerStore.getState();
            switch (action) {
                case 'ACTION_PLAY_PAUSE':
                    state.playPause();
                    break;
                case 'ACTION_NEXT':
                    state.nextTrack();
                    break;
                case 'ACTION_PREV':
                    state.prevTrack();
                    break;
                case 'ACTION_SHUFFLE':
                    state.toggleShuffle();
                    break;
                case 'ACTION_REPEAT':
                    state.toggleRepeat();
                    break;
            }
        });
    }

    // Remote playback actions
    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
    TrackPlayer.addEventListener(Event.RemoteNext, () => usePlayerStore.getState().nextTrack());
    TrackPlayer.addEventListener(Event.RemotePrevious, () => usePlayerStore.getState().prevTrack());
    TrackPlayer.addEventListener(Event.RemoteSeek, (event) => TrackPlayer.seekTo(event.position));
    TrackPlayer.addEventListener(Event.RemoteLike, () => {
        const state = usePlayerStore.getState();
        if (state.currentTrack) {
            useLibraryStore.getState().toggleLike(state.currentTrack);
        }
    });
};
