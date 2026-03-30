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
 
let lastTick = Date.now();

// Optimization: Keep a healthy native queue window. We manage advancement ourselves.
const QUEUE_WINDOW_SIZE = 50; // songs ahead of current in native queue

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
    originalPlaylist: Song[]; // Added to track original order for un-shuffling

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
    originalPlaylist: [],

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
                album: s.album,
                albumId: s.albumId,
                duration: s.duration,
                genre: s.genre,
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
                        minBuffer: 15,
                        maxBuffer: 50,
                        backBuffer: 30,
                        playBuffer: 2.5,
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
                const isForegroundError = message.toLowerCase().includes('foreground');
                const isAlreadyInitialized = message.toLowerCase().includes('already') || error.code === 'player_already_initialized';

                if (isForegroundError && retries > 1) {
                    console.log(`[PlayerStore] Foreground required, retrying... (${retries - 1} left)`);
                    await new Promise(r => setTimeout(r, 1500));
                    retries--;
                    continue; // Skip the error reporting and try again
                } 
                
                if (isAlreadyInitialized && !success) {
                    console.log('[PlayerStore] Player already initialized according to error');
                    set({ isPlayerReady: true, isGapless });
                    success = true;
                }

                if (success) {
                    const mode = state.repeatMode === 'one' ? RepeatMode.Track
                        : state.repeatMode === 'all' ? RepeatMode.Queue
                            : RepeatMode.Off;
                    await TrackPlayer.setRepeatMode(mode);
                } else {
                    // Only log error and break if we have exhausted retries or it's non-retriable
                    if (retries <= 1 || !isForegroundError) {
                        console.error('[PlayerStore] Critical Error setting up TrackPlayer:', error);
                        break;
                    }
                }
                retries--;
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
                if (data.repeat !== undefined) {
                    updates.repeatMode = data.repeat;
                    const mode = data.repeat === 'one' ? RepeatMode.Track
                        : data.repeat === 'all' ? RepeatMode.Queue
                            : RepeatMode.Off;
                    await TrackPlayer.setRepeatMode(mode);
                }
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
        const state = get();
        const activeTrack = await TrackPlayer.getActiveTrack();
        if (songs.length > index && activeTrack && String(activeTrack.id) === String(songs[index].id)) {
            await TrackPlayer.play();
            set({ isPlaying: true });
            return;
        }

        let finalSongs = [...songs];
        let finalIndex = index;

        if (state.isShuffleOn) {
            const selectedSong = finalSongs[index];
            const others = finalSongs.filter((_, i) => i !== index);
            for (let i = others.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [others[i], others[j]] = [others[j], others[i]];
            }
            finalSongs = [selectedSong, ...others];
            finalIndex = 0;
        }

        // Phase 1 Gapless Engine: Strict Memory + Native-Level Queuing Look-ahead
        const START_INDEX = finalIndex;
        const safeWindowEnd = Math.min(finalSongs.length, finalIndex + 2);
        const window = finalSongs.slice(START_INDEX, safeWindowEnd);

        await TrackPlayer.reset();
        await TrackPlayer.add(window.map(songToTrack));

        set({ 
            playlist: finalSongs,
            originalPlaylist: songs,
            currentIndex: finalIndex, 
            currentTrack: finalSongs[finalIndex],
            isPlaying: true 
        });

        if (finalSongs.length > finalIndex) {
            await TrackPlayer.skip(0);
            await TrackPlayer.play();

            const mode = state.repeatMode === 'one' ? RepeatMode.Track
                : state.repeatMode === 'all' ? RepeatMode.Queue
                    : RepeatMode.Off;
            await TrackPlayer.setRepeatMode(mode);
            get().saveState();
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

        let finalSongs = [...songs];
        let finalIndex = index;

        if (state.isShuffleOn) {
            // Pivot shuffle: Keep the selected song at index 0, shuffle the rest
            const selectedSong = finalSongs[index];
            const others = finalSongs.filter((_, i) => i !== index);
            for (let i = others.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [others[i], others[j]] = [others[j], others[i]];
            }
            finalSongs = [selectedSong, ...others];
            finalIndex = 0;
        }

        // Phase 1 Gapless Fix: Slice AROUND the current index so ExoPlayer can natively skip back without JS reload.
        const START_INDEX = finalIndex;
        const safeWindowEnd = Math.min(finalSongs.length, finalIndex + 2);
        const window = finalSongs.slice(START_INDEX, safeWindowEnd);
        const tracks = window.map(songToTrack);

        await TrackPlayer.reset();
        await TrackPlayer.add(tracks);

        try {
            // Skip to the correct relative position in the newly created native queue
            await TrackPlayer.skip(0);
        } catch (e) { }

        set({
            playlist: finalSongs,
            originalPlaylist: songs, // Always store the unshuffled source
            playlistName,
            currentIndex: finalIndex,
            currentTrack: finalSongs[finalIndex],
            isPlaying: true
        });

        await TrackPlayer.play();

        const mode = state.repeatMode === 'one' ? RepeatMode.Track
            : state.repeatMode === 'all' ? RepeatMode.Queue
                : RepeatMode.Off;
        // Native gapless looping support properly bridged to physical ExoPlayer queue!
        await TrackPlayer.setRepeatMode(mode);
        get().saveState();
    },


    addToQueue: async (song) => {
        await TrackPlayer.add([songToTrack(song)]);
        const state = get();
        const newPlaylist = [...state.playlist, song];
        const newOriginal = state.originalPlaylist.length > 0 ? [...state.originalPlaylist, song] : [];
        set({ playlist: newPlaylist, originalPlaylist: newOriginal });
        get().saveState();
    },

    addNext: async (song) => {
        const state = get();
        await TrackPlayer.add([songToTrack(song)], state.currentIndex + 1);
        
        const newPlaylist = [...state.playlist];
        newPlaylist.splice(state.currentIndex + 1, 0, song);
        
        let newOriginal = state.originalPlaylist;
        if (newOriginal.length > 0) {
            newOriginal = [...newOriginal];
            // If shuffle is on, we don't know where to add it in original.
            // Best bet: add it at the end or after the current track's original position.
            const currentSongId = state.currentTrack?.id;
            const originalIdx = newOriginal.findIndex(s => s.id === currentSongId);
            if (originalIdx !== -1) {
                newOriginal.splice(originalIdx + 1, 0, song);
            } else {
                newOriginal.push(song);
            }
        }
        
        set({ playlist: newPlaylist, originalPlaylist: newOriginal });
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

    toggleShuffle: async () => {
        const state = get();
        const turningOn = !state.isShuffleOn;

        if (turningOn) {
            if (state.playlist.length <= 1) {
                set({ isShuffleOn: true });
                return;
            }

            const currentIdx = state.currentIndex;
            const currentSong = state.playlist[currentIdx];
            const others = state.playlist.filter((_, i) => i !== currentIdx);

            // Fisher-Yates
            for (let i = others.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [others[i], others[j]] = [others[j], others[i]];
            }

            const shuffled = [currentSong, ...others];
            set({
                isShuffleOn: true,
                originalPlaylist: state.playlist,
                playlist: shuffled,
                currentIndex: 0
            });
        } else {
            const original = state.originalPlaylist;
            if (original && original.length > 0) {
                const currentSongId = state.currentTrack?.id;
                const newIdx = original.findIndex(s => s.id === currentSongId);
                
                set({
                    isShuffleOn: false,
                    playlist: original,
                    currentIndex: newIdx !== -1 ? newIdx : 0,
                    originalPlaylist: []
                });
            } else {
                set({ isShuffleOn: false });
            }
        }

        // IMPROVED NATIVE SYNC: Rebuild queue to ensure Next/Prev are consistent
        const newState = get();
        if (newState.isPlayerReady && newState.currentTrack) {
            try {
                const activeIdx = await TrackPlayer.getActiveTrackIndex();
                
                if (typeof activeIdx === 'number') {
                    // 1. Remove everything AFTER the current track
                    const queue = await TrackPlayer.getQueue();
                    if (activeIdx < queue.length - 1) {
                        const indicesToRemove = [];
                        for (let i = activeIdx + 1; i < queue.length; i++) indicesToRemove.push(i);
                        await TrackPlayer.remove(indicesToRemove);
                    }
                    
                    // 2. Remove everything BEFORE the current track
                    // Note: When we remove index 0, the current track's index shifts down.
                    if (activeIdx > 0) {
                        const indicesBefore = [];
                        for (let i = 0; i < activeIdx; i++) indicesBefore.push(0); // Always remove the first one
                        await TrackPlayer.remove(indicesBefore);
                    }
                    
                    // Now the current track is effectively at index 0 in the native queue.
                    // 3. Add the rest of the playlist (limit for IPC safety)
                    const nextItems = newState.playlist.slice(newState.currentIndex + 1, newState.currentIndex + 51);
                    if (nextItems.length > 0) {
                        await TrackPlayer.add(nextItems.map(songToTrack));
                    }

                    // 4. Also add a few previous items if possible to allow 'Prev' to work
                    // This is harder in TP without skipping, but we can at least ensure we don't crash.
                }
            } catch (e) {
                console.warn('[PlayerStore] Failed to sync native queue after shuffle toggle:', e);
            }
        }

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

        try {
            const tpState = await TrackPlayer.getState();
            const isActuallyPlaying = tpState === State.Playing || tpState === State.Buffering;

            if (isActuallyPlaying) {
                await TrackPlayer.pause();
                set({ isPlaying: false });
            } else {
                // Ensure player status is ready
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
        } catch (e) {
            console.error('[PlayerStore] playPause error:', e);
            // Fallback to store state if TP fails
            if (state.isPlaying) {
                await TrackPlayer.pause();
                set({ isPlaying: false });
            } else {
                await TrackPlayer.play();
                set({ isPlaying: true });
            }
        }
    },

    nextTrack: async () => {
        const state = get();
        const playlist = state.playlist;
        if (playlist.length === 0) return;

        // Requirement: Always play next/prev even if we are on start or end part of list
        const nextVirtualIdx = state.currentIndex >= playlist.length - 1 ? 0 : state.currentIndex + 1;

        try {
            const nativeQueue = await TrackPlayer.getQueue();
            const nativeIdx = await TrackPlayer.getActiveTrackIndex();

            const isLoopingBack = nextVirtualIdx === 0 && state.currentIndex >= playlist.length - 1;
            const canSkipNatively = !isLoopingBack && (typeof nativeIdx === 'number' && nativeIdx < nativeQueue.length - 1);

            if (canSkipNatively) {
                await TrackPlayer.skip(nativeIdx + 1);
                await TrackPlayer.play();
            } else {
                const START_INDEX = nextVirtualIdx;
                const safeWindowEnd = Math.min(playlist.length, nextVirtualIdx + 2);
                const window = playlist.slice(START_INDEX, safeWindowEnd);
                await TrackPlayer.reset();
                await TrackPlayer.add(window.map(songToTrack));
                await TrackPlayer.skip(0);
                await TrackPlayer.play();
            }
            
            // Absolute Sync: Update state immediately so UI provides instant feedback
            const nextSong = playlist[nextVirtualIdx];
            set({ currentIndex: nextVirtualIdx, currentTrack: nextSong, isPlaying: true });
            get().saveState();
            get().syncWidget();
        } catch (e) {
            console.error('[PlayerStore] nextTrack error:', e);
        }
    },

    prevTrack: async () => {
        try {
            const currentPosition = await TrackPlayer.getPosition();
            if (currentPosition > 5) {
                await TrackPlayer.seekTo(0);
                return;
            }

            const state = get();
            const playlist = state.playlist;
            if (playlist.length === 0) return;

            // Requirement: Always play next/prev even if we are on start or end part of list
            const prevVirtualIdx = state.currentIndex <= 0 ? playlist.length - 1 : state.currentIndex - 1;

            const nativeQueue = await TrackPlayer.getQueue();
            const nativeIdx = await TrackPlayer.getActiveTrackIndex();

            const canSkipNatively = (typeof nativeIdx === 'number' && nativeIdx > 0);

            if (canSkipNatively) {
                await TrackPlayer.skip(nativeIdx - 1);
                await TrackPlayer.play();
            } else {
                const START_INDEX = prevVirtualIdx;
                const safeWindowEnd = Math.min(playlist.length, prevVirtualIdx + 2);
                const window = playlist.slice(START_INDEX, safeWindowEnd);
                await TrackPlayer.reset();
                await TrackPlayer.add(window.map(songToTrack));
                await TrackPlayer.skip(0);
                await TrackPlayer.play();
            }

            // Sync UI state immediately
            const prevSong = playlist[prevVirtualIdx];
            set({ currentIndex: prevVirtualIdx, currentTrack: prevSong, isPlaying: true });
            get().saveState();
            get().syncWidget();
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

// Track last scrobbled IDs to avoid double-counting in some window
let lastRecentPlayedId: string | null = null;
let lastIncrementedId: string | null = null;

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
                
                // CRITICAL: Double-verify the track isn't already set to avoid race conditions 
                // that flip details back to old tracks during rapid skips.
                if (state.currentIndex !== virtualIndex || state.currentTrack?.id !== song.id) {
                    state.setCurrentTrack(song);
                    state.setCurrentIndex(virtualIndex);
                }

                // Immediate history recording for Recently Played
                if (song && String(song.id) !== lastRecentPlayedId) {
                    lastRecentPlayedId = String(song.id);
                    useLibraryStore.getState().recordRecentPlay(String(song.id));
                }
            }
        }
    });

    TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
        const state = usePlayerStore.getState();
        const playbackState = event.state;

        if (playbackState === State.Playing || playbackState === State.Buffering) {
            state.setIsPlaying(true);
        } else if (
            playbackState === State.Paused || 
            playbackState === State.Stopped || 
            playbackState === State.None || 
            playbackState === (State as any).Error
        ) {
            state.setIsPlaying(false);
        } else if (playbackState === State.Ready) {
            // In v4, Ready often means paused but with a track loaded.
            // Check if we were supposed to be playing.
            // If the player is Ready but not Playing, and we've been in this state for a moment,
            // set isPlaying to false to sync UI.
            setTimeout(async () => {
                const currentState = await TrackPlayer.getState();
                if (currentState === State.Ready || currentState === State.Paused) {
                    state.setIsPlaying(false);
                }
            }, 500);
        }
        
        lastTick = Date.now();
    });

    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
        usePlayerStore.getState().setIsPlaying(false);
    });

    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async (event) => {
        if (event.position > 0) {
            const pos = event.position;
            storage.set(PLAYER_POSITION_KEY, pos * 1000);

            const state = usePlayerStore.getState();

            // Most Played Algorithm: only increment if they've listened for a "significant" duration (15s+)
            if (state.currentTrack && String(state.currentTrack.id) !== lastIncrementedId) {
                const threshold = Math.min(15, (event.duration || 30) * 0.5);
                if (pos >= threshold && pos > 0) {
                    lastIncrementedId = String(state.currentTrack.id);
                    useLibraryStore.getState().incrementPlayCount(lastIncrementedId);
                    // Log to daily stats for "Heavy Rotation" filtering
                    useLibraryStore.getState().updateDailyStats(lastIncrementedId, 0, true);
                }
            }

            // Track Listening Time (Throttled to every 10 seconds to keep UI light)
            const now = Date.now();
            const delta = now - lastTick;
            
            // Only count if within reasonable bounds (e.g. not a huge jump after backgrounding)
            if (state.isPlaying && state.currentTrack && delta >= 10000) {
                useLibraryStore.getState().updateDailyStats(state.currentTrack.id, delta, false);
                lastTick = now;
            } else if (!state.isPlaying) {
                lastTick = now;
            }

            // Periodically update widget (every ~5 seconds of playback)
            if (Math.floor(event.position) % 5 === 0) {
                state.syncWidget();
            }

            if (state.isGapless && event.duration > 0) {
                // Phase 1: True Gapless - 90% Look-ahead Strategy
                // Instead of artificially skipping on the JS bridge (which causes latency),
                // we ensure ExoPlayer's native ConcatenatingMediaSource has the next track buffered.
                const percentComplete = event.position / event.duration;
                
                // If we reach 90% completion and we are near the end of the native queue, top it up.
                if (percentComplete >= 0.9) {
                    try {
                        const nativeIdx = await TrackPlayer.getActiveTrackIndex();
                        const nativeQueue = await TrackPlayer.getQueue();
                        
                        // If we only have 1 or 0 tracks left natively, push the next batch to ensure seamless handoff
                        if (nativeIdx !== undefined && nativeIdx !== null && (nativeQueue.length - nativeIdx) <= 2) {
                            const lastNativeTrackId = nativeQueue[nativeQueue.length - nativeIdx > 0 ? nativeQueue.length - 1 : 0]?.id;
                            const lastNativeIdxInPlaylist = state.playlist.findIndex(s => String(s.id) === String(lastNativeTrackId));
                            
                            if (lastNativeIdxInPlaylist !== -1) {
                                let tracksToAdd: Track[] = [];

                                if (lastNativeIdxInPlaylist + 1 < state.playlist.length) {
                                    // Add next 3 tracks silently into native queue buffer to maintain strict memory limits
                                    tracksToAdd = state.playlist
                                        .slice(lastNativeIdxInPlaylist + 1, lastNativeIdxInPlaylist + 4)
                                        .map(songToTrack);
                                }
                                
                                if (tracksToAdd.length > 0) {
                                    console.log('[Gapless Engine] 90% Look-ahead triggered. Pre-buffering next batch seamlessly.');
                                    await TrackPlayer.add(tracksToAdd);
                                }
                            }
                        }
                    } catch (e) {
                         console.warn('[Gapless Engine] Look-ahead buffer checking failed', e);
                    }
                }
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

    // Remote playback actions handled by service.js
};
