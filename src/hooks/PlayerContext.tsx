// PlayerContext.tsx - Force Refresh
import React, { createContext, useContext, ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import { Song, useMusicLibrary as useLibrary } from './MusicLibraryContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus, Platform, PermissionsAndroid, NativeModules, NativeEventEmitter } from 'react-native';
import TrackPlayer, {
    Capability,
    Event,
    State,
    useTrackPlayerEvents,
    useProgress,
    RepeatMode,
    Track,
    useIsPlaying,
    useActiveTrack,
    AppKilledPlaybackBehavior
} from 'react-native-track-player';

const PLAYER_STATE_KEY = 'player_state_persistence';

interface PlayerContextType {
    currentTrack: Song | null;
    currentSong: Song | null;
    isPlaying: boolean;
    position: number;
    duration: number;
    play: (song: Song) => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    stop: () => Promise<void>;
    seekTo: (position: number) => Promise<void>;
    seek: (position: number) => void;
    playNext: () => Promise<void>;
    playPrevious: () => Promise<void>;
    setQueue: (songs: Song[], index?: number) => Promise<void>;
    playSongInPlaylist: (songs: Song[], index: number, playlistName?: string) => void;
    addToQueue: (song: Song) => void;
    addNext: (song: Song) => void;
    removeFromQueue: (index: number) => void;
    toggleShuffle: () => void;
    toggleRepeat: () => void;
    isShuffle: boolean;
    isShuffleOn: boolean;
    repeatMode: 'off' | 'one' | 'all';
    playPause: () => void;
    nextTrack: () => void;
    prevTrack: () => void;
    playlist: Song[];
    currentIndex: number;
    playlistName: string;
    gaplessEnabled: boolean;
    toggleGapless: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

const GRADIENT_COLORS = [
    '#4f46e5', '#be123c', '#0e7490', '#15803d', '#b45309',
    '#4338ca', '#7e22ce', '#0369a1', '#c2410c', '#1d4ed8'
];

// Custom base64 encoder for React Native environment
const toBase64 = (bytes: Uint8Array) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let i, len = bytes.length, base64 = '';

    for (i = 0; i < len; i += 3) {
        const b1 = bytes[i];
        const b2 = i + 1 < len ? bytes[i + 1] : 0;
        const b3 = i + 2 < len ? bytes[i + 2] : 0;

        base64 += chars[b1 >> 2];
        base64 += chars[((b1 & 3) << 4) | (b2 >> 4)];
        base64 += chars[((b2 & 15) << 2) | (b3 >> 6)];
        base64 += chars[b3 & 63];
    }

    if (len % 3 === 2) base64 = base64.substring(0, base64.length - 1) + '=';
    else if (len % 3 === 1) base64 = base64.substring(0, base64.length - 2) + '==';

    return base64;
};

// Generates a 1x1 solid color GIF data URI (extremely compatible)
const getColorDataUri = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    // 1x1 GIF File Structure
    const bytes = new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, r, g, b,
        0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02,
        0x02, 0x44, 0x01, 0x00, 0x3B
    ]);

    try {
        const b64 = toBase64(bytes);
        return 'data:image/gif;base64,' + b64;
    } catch (e) {
        return null;
    }
};

const getPlaceholderArt = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash |= 0;
    }
    const color = GRADIENT_COLORS[Math.abs(hash) % GRADIENT_COLORS.length];
    return getColorDataUri(color);
};

// Mapper function: Song -> Track
const songToTrack = (song: Song): Track => {
    // 1. Determine best artwork for notification
    let artwork = song.coverImage;

    // 2. On Android, prefer content:// URIs for notifications as they have better permissions
    // compared to file:// URIs in the app's private storage.
    if (Platform.OS === 'android' && song.albumId && !['null', 'undefined', '-1', '0'].includes(String(song.albumId))) {
        // Construct the content:// URI which is accessible by the system media player
        // We only override if it's not a remote URL (likely a local file URI that might have permission issues)
        if (!artwork || !artwork.startsWith('http')) {
            artwork = `content://media/external/audio/albumart/${song.albumId}`;
        }
    }

    // 3. Fallback to placeholder if still no artwork
    if (!artwork) {
        const placeholder = getPlaceholderArt(song.id);
        // On Android, don't pass base64 to TrackPlayer as it's unsupported in notifications
        artwork = (Platform.OS === 'android' && placeholder?.startsWith('data:')) ? undefined : (placeholder || undefined);
    }

    return {
        id: song.id,
        url: song.uri,
        title: song.title,
        artist: song.artist,
        album: song.album,
        artwork: artwork,
        duration: song.duration ? song.duration / 1000 : undefined,
    };
};

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
    // Use TrackPlayer hooks but maintain local state for reliability
    const { playing } = useIsPlaying();
    const activeTrackFromHook = useActiveTrack();
    const { position, duration } = useProgress(500);

    const [currentTrack, setCurrentTrack] = useState<Song | null>(null);
    const [playlist, setPlaylist] = useState<Song[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false); // Restore local state

    const [isShuffleOn, setIsShuffleOn] = useState(false);
    const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>('off');
    const [playlistName, setPlaylistName] = useState<string>('');
    const [gaplessEnabled, setGaplessEnabled] = useState(true);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [isRestored, setIsRestored] = useState(false);

    // Widget Communication
    useEffect(() => {
        if (Platform.OS !== 'android') return;

        const { WidgetModule } = NativeModules;
        if (!WidgetModule) return;

        const eventEmitter = new NativeEventEmitter(WidgetModule);
        const subscription = eventEmitter.addListener('onWidgetCommand', async (command: string) => {
            console.log('[PlayerContext] Widget command:', command);
            if (command === 'PLAY_PAUSE') playPause();
            else if (command === 'NEXT') nextTrack();
            else if (command === 'PREV') prevTrack();
        });

        return () => subscription.remove();
    }, [isPlayerReady]);

    // Update Widget when playback state changes
    useEffect(() => {
        if (Platform.OS !== 'android' || !isPlayerReady) return;

        const { WidgetModule } = NativeModules;
        if (!WidgetModule) return;

        // Determine best artwork for widget (same logic as TrackPlayer)
        let widgetArtwork = currentTrack?.coverImage || null;
        if (Platform.OS === 'android' && currentTrack?.albumId && !['null', 'undefined', '-1', '0'].includes(String(currentTrack.albumId))) {
            if (!widgetArtwork || !widgetArtwork.startsWith('http')) {
                widgetArtwork = `content://media/external/audio/albumart/${currentTrack.albumId}`;
            }
        }
        // Don't send base64 to widget either
        if (widgetArtwork?.startsWith('data:')) widgetArtwork = null;

        WidgetModule.updateWidget(
            currentTrack?.title || 'No song playing',
            currentTrack?.artist || 'Select a track to start',
            isPlaying,
            widgetArtwork
        );
    }, [currentTrack, isPlaying, isPlayerReady]);


    const positionRef = useRef(0);
    const durationRef = useRef(0);
    const appStateRef = useRef(AppState.currentState);
    const initialRestorePositionRef = useRef(0); // Backup for restoration fail
    const playlistRef = useRef<Song[]>([]);
    const librarySongsRef = useRef<Song[]>([]);
    const isMountedRef = useRef(true);
    const currentTrackRef = useRef<Song | null>(null);

    // Get songs from MusicLibrary to sync metadata
    // PlayerProvider is now inside MusicLibraryProvider so this hook works
    const { songs: librarySongs } = useLibrary();

    // Keep refs in sync with state
    useEffect(() => {
        playlistRef.current = playlist;
    }, [playlist]);

    useEffect(() => {
        librarySongsRef.current = librarySongs;
    }, [librarySongs]);

    useEffect(() => {
        currentTrackRef.current = currentTrack;
    }, [currentTrack]);

    // Sync metadata from MusicLibrary to player's playlist
    // This ensures enhanced metadata (title, artist, album, coverImage) is reflected in the player
    useEffect(() => {
        if (librarySongs.length === 0 || playlist.length === 0) return;

        // Create a lookup map for faster access
        const libraryMap = new Map(librarySongs.map(s => [s.id, s]));

        let hasUpdates = false;
        const updatedPlaylist = playlist.map(song => {
            const librarySong = libraryMap.get(song.id);
            if (librarySong) {
                // Check if library has better metadata than current song
                const hasRealTitle = librarySong.title && librarySong.title !== librarySong.filename?.replace(/\.[^/.]+$/, '');
                const hasRealArtist = librarySong.artist && librarySong.artist !== 'Unknown Artist';
                const hasRealAlbum = librarySong.album && librarySong.album !== 'Unknown Album';

                // Check if song needs update (library has better data)
                const needsUpdate =
                    (hasRealTitle && librarySong.title !== song.title) ||
                    (hasRealArtist && librarySong.artist !== song.artist) ||
                    (hasRealAlbum && librarySong.album !== song.album) ||
                    (librarySong.coverImage && librarySong.coverImage !== song.coverImage) ||
                    (librarySong.genre && librarySong.genre !== song.genre);

                if (needsUpdate) {
                    hasUpdates = true;
                    return {
                        ...song,
                        title: librarySong.title || song.title,
                        artist: librarySong.artist || song.artist,
                        album: librarySong.album || song.album,
                        genre: librarySong.genre || song.genre,
                        year: librarySong.year || song.year,
                        coverImage: librarySong.coverImage || song.coverImage,
                    };
                }
            }
            return song;
        });

        if (hasUpdates) {
            setPlaylist(updatedPlaylist);

            // Also update currentTrack if it was updated
            if (currentTrack) {
                const updatedCurrent = updatedPlaylist.find(s => s.id === currentTrack.id);
                if (updatedCurrent && (
                    updatedCurrent.title !== currentTrack.title ||
                    updatedCurrent.artist !== currentTrack.artist ||
                    updatedCurrent.album !== currentTrack.album ||
                    updatedCurrent.coverImage !== currentTrack.coverImage
                )) {
                    setCurrentTrack(updatedCurrent);

                    // Also update TrackPlayer's now playing info for notification
                    // Also update TrackPlayer's internal queue metadata
                    // This ensures notification and lock screen update immediately and persistently
                    (async () => {
                        try {
                            const activeIndex = await TrackPlayer.getActiveTrackIndex();
                            if (activeIndex !== undefined && activeIndex !== null) {
                                const activeTrack = await TrackPlayer.getTrack(activeIndex);
                                if (activeTrack && String(activeTrack.id) === String(updatedCurrent.id)) {
                                    // Use the same artwork logic as songToTrack
                                    let artwork = updatedCurrent.coverImage;
                                    if (Platform.OS === 'android' && updatedCurrent.albumId && !['null', 'undefined', '-1', '0'].includes(String(updatedCurrent.albumId))) {
                                        if (!artwork || !artwork.startsWith('http')) {
                                            artwork = `content://media/external/audio/albumart/${updatedCurrent.albumId}`;
                                        }
                                    }
                                    if (!artwork) {
                                        const placeholder = getPlaceholderArt(updatedCurrent.id);
                                        artwork = (Platform.OS === 'android' && placeholder?.startsWith('data:')) ? undefined : (placeholder || undefined);
                                    }

                                    await TrackPlayer.updateMetadataForTrack(activeIndex, {
                                        title: updatedCurrent.title,
                                        artist: updatedCurrent.artist,
                                        album: updatedCurrent.album,
                                        artwork: artwork,
                                    });
                                }
                            }
                        } catch (e) {
                            console.warn('[PlayerContext] Failed to update track metadata:', e);
                        }
                    })();
                }
            }

            console.log('[PlayerContext] Synced metadata from library:', updatedPlaylist.filter((s, i) => s !== playlist[i]).length, 'songs updated');
        }
    }, [librarySongs]); // Only trigger when library songs change


    // Sync isPlaying with hook, but allow manual overrides
    useEffect(() => {
        if (playing !== undefined) {
            setIsPlaying(playing);
        }
    }, [playing]);

    // Sync metadata from activeTrack
    // RE-ENABLED: Manual event listener failed for UI updates. Trying hook again.
    useEffect(() => {
        const activeTrack = activeTrackFromHook;
        console.log('[PlayerContext] activeTrackFromHook updated:', activeTrack?.title);
        if (activeTrack) {
            // Priority 1: Find in current playlist for full object
            const songFromPlaylist = playlist.find(s => String(s.id) === String(activeTrack.id));
            if (songFromPlaylist) {
                console.log('[PlayerContext] Hook found song in playlist:', songFromPlaylist.title);
                setCurrentTrack(songFromPlaylist);
                const idx = playlist.findIndex(s => String(s.id) === String(activeTrack.id));
                if (idx !== -1) setCurrentIndex(idx);
            } else {
                // Priority 2: Try to find from the main library (for enhanced metadata)
                const songFromLibrary = librarySongs.find(s => String(s.id) === String(activeTrack.id));
                if (songFromLibrary) {
                    console.log('[PlayerContext] Hook found song in library:', songFromLibrary.title);
                    setCurrentTrack(songFromLibrary);
                    setCurrentIndex(-1);
                } else {
                    // Priority 3: Construct from track metadata (fallback)
                    console.warn('[PlayerContext] Hook Fallback to raw metadata');
                    setCurrentTrack({
                        id: String(activeTrack.id),
                        uri: activeTrack.url || '',
                        title: activeTrack.title || 'Unknown Title',
                        artist: activeTrack.artist || 'Unknown Artist',
                        album: activeTrack.album || undefined,
                        duration: (activeTrack.duration || 0) * 1000,
                        filename: '',
                    } as Song);
                    setCurrentIndex(-1);
                }
            }
        }
    }, [activeTrackFromHook, playlist, librarySongs]);

    // Polling Fail-Safe: Ensure UI stays in sync with Player
    // This catches cases where events are missed or hooks fail to update
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const activeTrack = await TrackPlayer.getActiveTrack();
                const currentId = currentTrackRef.current?.id;

                if (activeTrack && String(activeTrack.id) !== String(currentId)) {
                    console.log('[PlayerContext] Polling found mismatch! active:', activeTrack.title, 'current:', currentId);

                    // Force update logic (reusing logic from listener)
                    let song = playlistRef.current.find(s => String(s.id) === String(activeTrack.id));

                    if (!song) {
                        song = librarySongsRef.current.find(s => String(s.id) === String(activeTrack.id));
                    }

                    if (song) {
                        setCurrentTrack(song);
                        // Update index
                        const idx = playlistRef.current.findIndex(s => String(s.id) === String(song?.id));
                        if (idx !== -1) setCurrentIndex(idx);
                        else {
                            // Try to get index from player
                            const playerIndex = await TrackPlayer.getActiveTrackIndex();
                            if (playerIndex !== undefined && playerIndex !== null) setCurrentIndex(playerIndex);
                        }
                    } else {
                        // Raw metadata
                        setCurrentTrack({
                            id: String(activeTrack.id),
                            uri: activeTrack.url || '',
                            title: activeTrack.title || 'Unknown Title',
                            artist: activeTrack.artist || 'Unknown Artist',
                            album: activeTrack.album || undefined,
                            coverImage: activeTrack.artwork,
                            duration: (activeTrack.duration || 0) * 1000,
                            filename: '',
                            dateAdded: Date.now()
                        } as Song);
                        const playerIndex = await TrackPlayer.getActiveTrackIndex();
                        setCurrentIndex(playerIndex ?? -1);
                    }
                }
            } catch (e) {
                // Ignore errors (e.g. player not set up yet)
            }
        }, 1500); // Check every 1.5s

        return () => clearInterval(interval);
    }, []);

    // Use events for IMMEDIATE playback state updates
    useTrackPlayerEvents([
        Event.PlaybackActiveTrackChanged,
        Event.PlaybackState,
    ], async (event) => {
        if (event.type === Event.PlaybackActiveTrackChanged) {
            const track = (event as any).track;
            const index = (event as any).index;
            console.log('[PlayerContext] ActiveTrackChanged:', track?.title, 'ID:', track?.id, 'Index:', index);

            if (track) {
                // 1. Try finding by ID in playlist (Primary - Most Reliable)
                let song = playlistRef.current.find(s => String(s.id) === String(track.id));

                // 2. Try finding by Index in playlist (Fallback - if ID format mismatch)
                if (!song && typeof index === 'number' && index >= 0 && index < playlistRef.current.length) {
                    const candidate = playlistRef.current[index];
                    // If IDs sort of match (ignoring type), or just trust index as fallback
                    console.log('[PlayerContext] ID match failed, using Index match:', candidate?.title);
                    song = candidate;
                }

                // 3. Try finding in Library (Fallback 2 - if not in current playlist subset)
                if (!song) {
                    song = librarySongsRef.current.find(s => String(s.id) === String(track.id));
                }

                if (song) {
                    console.log('[PlayerContext] Updating CurrentTrack to:', song.title);
                    setCurrentTrack(song);
                    // Determine index
                    const newIndex = playlistRef.current.findIndex(s => String(s.id) === String(song?.id));
                    setCurrentIndex(newIndex !== -1 ? newIndex : (index ?? -1));
                } else {
                    // 4. Last Resort: Use Track Metadata directly (prevents blank UI)
                    console.warn('[PlayerContext] Song not found in app state. Using raw track data.');
                    setCurrentTrack({
                        id: String(track.id),
                        uri: track.url || '',
                        title: track.title || 'Unknown Title',
                        artist: track.artist || 'Unknown Artist',
                        album: track.album,
                        coverImage: track.artwork, // Use track artwork
                        duration: (track.duration || 0) * 1000,
                        filename: 'stream',
                        dateAdded: Date.now()
                    });
                    setCurrentIndex(index ?? -1);
                }
            }
        }

        if (event.type === Event.PlaybackState) {
            // Update state based on event
            const isNowPlaying = event.state === State.Playing || event.state === State.Buffering;
            setIsPlaying(isNowPlaying);

            // Double check active track when playing starts, in case we missed the change event
            if (event.state === State.Playing) {
                const activeTrack = await TrackPlayer.getActiveTrack();
                if (activeTrack && String(activeTrack.id) !== String(currentTrackRef.current?.id)) {
                    console.log('[PlayerContext] Detected missed track update via State change');
                    // We rely on the hook or the event above to catch this eventually
                }
            }
        }
    });

    // Sync refs for persistence
    useEffect(() => {
        positionRef.current = position * 1000;
        durationRef.current = duration * 1000;
    }, [position, duration]);

    // Initialize TrackPlayer
    const setup = useCallback(async () => {
        console.log('[PlayerContext] SETUP function called');
        try {
            if (Platform.OS === 'android') {
                console.log('[PlayerContext] Android Version:', Platform.Version);
                if (typeof Platform.Version === 'number' && Platform.Version >= 33) {
                    const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
                    console.log('[PlayerContext] Has POST_NOTIFICATIONS:', hasPermission);

                    if (!hasPermission) {
                        console.log('[PlayerContext] Requesting POST_NOTIFICATIONS...');
                        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
                        console.log('[PlayerContext] POST_NOTIFICATIONS result:', granted);

                        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                            console.warn('POST_NOTIFICATIONS permission not granted');
                            // Optional: Alert user if they need to enable it manually
                            // Alert.alert('Permission Required', 'Please enable notifications for playback controls.');
                        }
                    }
                }
            }

            console.log('[PlayerContext] Initializing TrackPlayer...');

            // Read gapless setting directly from storage for startup configuration
            let useGapless = true; // Default
            try {
                const saved = await AsyncStorage.getItem(PLAYER_STATE_KEY);
                if (saved) {
                    const state = JSON.parse(saved);
                    if (state.gaplessEnabled !== undefined) useGapless = state.gaplessEnabled;
                }
            } catch (e) { }

            console.log(`[PlayerContext] Configuring player with Gapless: ${useGapless}`);

            // Attempt setup, ignore if already initialized
            try {
                await TrackPlayer.setupPlayer({
                    waitForBuffer: useGapless, // If gapless disabled, we don't wait for buffer (starts faster but might gap)
                    autoHandleInterruptions: true,
                    // Optimized buffer settings for gapless if enabled
                    minBuffer: useGapless ? 25 : 15, // Seconds
                    maxBuffer: useGapless ? 100 : 50,
                    playBuffer: useGapless ? 5 : 2.5,
                    backBuffer: useGapless ? 20 : 10,
                });
                console.log('[PlayerContext] TrackPlayer.setupPlayer success');
            } catch (e: any) {
                console.log('[PlayerContext] TrackPlayer setup skipped (likely already active):', e.message);
            }

            if (!isMountedRef.current) {
                console.log('[PlayerContext] Unmounted during setup, aborting.');
                return;
            }

            await TrackPlayer.updateOptions({
                android: {
                    appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
                },
                stoppingAppPausesPlayback: false,
                capabilities: [
                    Capability.Play,
                    Capability.Pause,
                    Capability.SkipToNext,
                    Capability.SkipToPrevious,
                    Capability.SeekTo,
                ],
                compactCapabilities: [3, 0, 1, 2],
                progressUpdateEventInterval: 5,
            });
            console.log('[PlayerContext] TrackPlayer options updated');

            if (isMountedRef.current) {
                setIsPlayerReady(true);
                console.log('[PlayerContext] isPlayerReady set to true');
            }
        } catch (error) {
            console.error('[PlayerContext] Critical Error setting up TrackPlayer:', error);
        }
    }, []);

    // Initialize on mount
    useEffect(() => {
        console.log('[PlayerContext] PlayerProvider MOUNTED');
        // Small delay to avoid permission conflict with MusicLibrary
        const timer = setTimeout(() => {
            setup();
        }, 500);

        return () => {
            console.log('[PlayerContext] PlayerProvider UNMOUNTED');
            isMountedRef.current = false;
            clearTimeout(timer);
        };
    }, [setup]);

    // Handle Remote Events for Notification Controls (Foreground + Background Fallback)
    useTrackPlayerEvents([
        Event.RemotePlay,
        Event.RemotePause,
        Event.RemoteNext,
        Event.RemotePrevious,
        Event.RemoteSeek,
    ], async (event) => {
        if (event.type === Event.RemotePlay) {
            await TrackPlayer.play();
            setIsPlaying(true);
        } else if (event.type === Event.RemotePause) {
            await TrackPlayer.pause();
            setIsPlaying(false);
        } else if (event.type === Event.RemoteNext) {
            await nextTrack();
        } else if (event.type === Event.RemotePrevious) {
            await prevTrack();
        } else if (event.type === Event.RemoteSeek) {
            await TrackPlayer.seekTo(event.position);
        }
    });

    // Load persisted state
    useEffect(() => {
        if (!isPlayerReady) return;

        const loadPersistedState = async () => {
            try {
                const saved = await AsyncStorage.getItem(PLAYER_STATE_KEY);
                if (saved) {
                    const state = JSON.parse(saved);
                    if (state.currentTrack) {
                        setCurrentTrack(state.currentTrack);
                        setPlaylist(state.playlist || []);
                        setCurrentIndex(state.currentIndex ?? -1);
                        setPlaylistName(state.playlistName || '');
                        if (state.gaplessEnabled !== undefined) setGaplessEnabled(state.gaplessEnabled);

                        // Seed the queue but don't play
                        if (state.playlist && state.playlist.length > 0) {
                            const tracks = state.playlist.map(songToTrack);
                            // Clear existing queue first to be safe
                            await TrackPlayer.reset();
                            await TrackPlayer.add(tracks);

                            if (state.currentIndex >= 0 && state.currentIndex < tracks.length) {
                                await TrackPlayer.skip(state.currentIndex);

                                // Store position for restoration on first play
                                if (state.position > 0) {
                                    initialRestorePositionRef.current = state.position;
                                    positionRef.current = state.position;
                                    console.log(`[PlayerContext] Restored position ref: ${state.position / 1000}s`);
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to load player state', e);
            } finally {
                setIsRestored(true);
            }
        };
        loadPersistedState();

        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (appStateRef.current.match(/active/) && nextAppState.match(/inactive|background/)) {
                saveStateShortcut();
            }
            appStateRef.current = nextAppState;
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [isPlayerReady]);

    const saveStateShortcut = async () => {
        if (!isRestored) return;
        if (currentTrack) {
            try {
                // If we haven't played yet and position is 0, preserve the restored position
                // This prevents overwriting the saved progress with 0 if user opens and closes app
                let posToSave = positionRef.current;
                if (posToSave === 0 && initialRestorePositionRef.current > 0) {
                    posToSave = initialRestorePositionRef.current;
                }

                console.log('[PlayerContext] Saving state. Position:', posToSave);

                const state = {
                    currentTrack,
                    playlist,
                    currentIndex,
                    playlistName,
                    gaplessEnabled,
                    position: posToSave,
                    duration: durationRef.current
                };
                await AsyncStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(state));
            } catch (e) { }
        }
    };

    // Save metadata on changes
    useEffect(() => {
        const saveState = async () => {
            if (!isRestored) return;
            try {
                if (currentTrack) {
                    const state = {
                        currentTrack,
                        playlist,
                        currentIndex,
                        playlistName,
                        gaplessEnabled,
                        position: positionRef.current,
                        duration: durationRef.current
                    };
                    await AsyncStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(state));
                } else {
                    await AsyncStorage.removeItem(PLAYER_STATE_KEY);
                }
            } catch (e) {
                console.error('Failed to save player state', e);
            }
        };
        saveState();
    }, [currentTrack?.id, playlist.length, currentIndex, playlistName, isRestored]);

    // Listen for remote control events (notification controls)
    useTrackPlayerEvents([
        Event.RemotePlay,
        Event.RemotePause,
        Event.RemoteNext,
        Event.RemotePrevious,
        Event.RemoteSeek,
    ], async (event) => {
        console.log('Remote event received:', event.type);

        if (event.type === Event.RemotePlay) {
            console.log('Remote Play button pressed');
            await TrackPlayer.play();
        } else if (event.type === Event.RemotePause) {
            console.log('Remote Pause button pressed');
            await TrackPlayer.pause();
        } else if (event.type === Event.RemoteNext) {
            console.log('Remote Next button pressed');
            await TrackPlayer.skipToNext();

            // Update track info
            setTimeout(async () => {
                const activeTrackIndex = await TrackPlayer.getActiveTrackIndex();
                const queue = await TrackPlayer.getQueue();
                if (activeTrackIndex !== null && activeTrackIndex >= 0 && queue[activeTrackIndex]) {
                    const track = queue[activeTrackIndex];
                    const song = playlist.find(s => s.id === track.id);
                    if (song) {
                        setCurrentTrack(song);
                        setCurrentIndex(activeTrackIndex);
                    }
                }
            }, 100);
        } else if (event.type === Event.RemotePrevious) {
            console.log('Remote Previous button pressed');
            await TrackPlayer.skipToPrevious();

            // Update track info
            setTimeout(async () => {
                const activeTrackIndex = await TrackPlayer.getActiveTrackIndex();
                const queue = await TrackPlayer.getQueue();
                if (activeTrackIndex !== null && activeTrackIndex >= 0 && queue[activeTrackIndex]) {
                    const track = queue[activeTrackIndex];
                    const song = playlist.find(s => s.id === track.id);
                    if (song) {
                        setCurrentTrack(song);
                        setCurrentIndex(activeTrackIndex);
                    }
                }
            }, 100);
        } else if (event.type === Event.RemoteSeek) {
            console.log('Remote Seek:', event.position);
            await TrackPlayer.seekTo(event.position);
        }
    });

    // Update internal state from TrackPlayer events
    useTrackPlayerEvents([Event.PlaybackQueueEnded], async (event) => {
        if (event.type === Event.PlaybackQueueEnded) {
            // End of queue logic
        }
    });

    // Log when hook playing state changes
    useEffect(() => {
        console.log('Hook isPlaying changed to:', isPlaying);
    }, [isPlaying]);

    const playPause = async () => {
        if (!isPlayerReady) {
            console.log('[PlayerContext] Player NOT READY. Attempting Emergency Setup...');
            await setup();
            // Proceed even if state hasn't updated yet, trusting setup() did its best
        }

        try {
            if (isPlaying) {
                await TrackPlayer.pause();
                setIsPlaying(false); // Immediate UI update
            } else {
                // Check if player is alive/initialized before playing
                try {
                    await TrackPlayer.getState();
                } catch (e) {
                    console.warn('[PlayerContext] Player state check failed, attempting re-setup...', e);
                    await setup();
                }

                const queue = await TrackPlayer.getQueue();
                if (queue.length === 0 && currentTrack) {
                    // Queue was empty, need to re-initialize
                    await TrackPlayer.add([songToTrack(currentTrack)]);

                    // Seek to saved position if we have one (use backup if ref was overwritten)
                    const savedPosition = (initialRestorePositionRef.current > 0 ? initialRestorePositionRef.current : positionRef.current) / 1000;

                    if (savedPosition > 0) {
                        console.log('[PlayerContext] Seeking to saved position (empty queue):', savedPosition);
                        await new Promise(resolve => setTimeout(resolve, 200));
                        await TrackPlayer.seekTo(savedPosition);
                    }
                    initialRestorePositionRef.current = 0; // Consume
                } else if (initialRestorePositionRef.current > 0) {
                    const searchSec = initialRestorePositionRef.current / 1000;
                    console.log('[PlayerContext] restoring position (play-then-seek):', searchSec);

                    // Play first to initialize engine state properly
                    await TrackPlayer.play();
                    setIsPlaying(true);

                    // Small delay to allow buffering/metadata load and then seek
                    setTimeout(async () => {
                        await TrackPlayer.seekTo(searchSec);

                        // Verification after another delay
                        setTimeout(async () => {
                            const pos = await TrackPlayer.getPosition();
                            if (pos < 1 && searchSec > 5) {
                                console.log('[PlayerContext] Seek failed, retrying behavior...');
                                await TrackPlayer.seekTo(searchSec);
                            }
                        }, 800);
                    }, 300);

                    initialRestorePositionRef.current = 0; // Consume
                    return;
                }

                await TrackPlayer.play();
                setIsPlaying(true); // Immediate UI update
            }
        } catch (e: any) {
            console.error('PlayPause Error:', e);
            // Auto-recovery for "not initialized" error
            if (e.message?.includes('not initialized') || String(e).includes('not initialized')) {
                console.log('[PlayerContext] Recovering form "not initialized" error...');
                await setup();
                // Optionally retry the play command here if needed, but safer to let user tap again
                // await TrackPlayer.play(); 
            }
        }
    };

    async function nextTrack() {
        console.log('=== nextTrack called ===');
        try {
            await TrackPlayer.skipToNext();
            console.log('skipToNext command sent');

            // Manually fetch and update the new track using refs for latest state
            setTimeout(async () => {
                const activeTrackIndex = await TrackPlayer.getActiveTrackIndex();
                const queue = await TrackPlayer.getQueue();
                console.log('After skip - Active index:', activeTrackIndex, 'Queue length:', queue.length);

                if (activeTrackIndex !== null && activeTrackIndex >= 0 && queue[activeTrackIndex]) {
                    const track = queue[activeTrackIndex];
                    console.log('New active track:', track.title);

                    // Use ref to get latest playlist value
                    let song = playlistRef.current.find(s => String(s.id) === String(track.id));
                    // Fallback to library songs for enhanced metadata
                    if (!song) {
                        song = librarySongsRef.current.find(s => String(s.id) === String(track.id));
                    }
                    if (song) {
                        console.log('Updating to song:', song.title);
                        setCurrentTrack(song);
                        setCurrentIndex(activeTrackIndex);
                    }
                }
            }, 150);
        } catch (e) {
            console.error('nextTrack error:', e);
            if (repeatMode === 'all') {
                await TrackPlayer.skip(0);
                await TrackPlayer.play();
            }
        }
    }

    async function prevTrack() {
        console.log('=== prevTrack called ===');
        try {
            if (position > 3) { // If more than 3 seconds into the song, restart it
                console.log('Restarting current song (position > 3s)');
                await TrackPlayer.seekTo(0);
            } else {
                console.log('Skipping to previous track');
                await TrackPlayer.skipToPrevious();

                // Manually fetch and update the new track using refs for latest state
                setTimeout(async () => {
                    const activeTrackIndex = await TrackPlayer.getActiveTrackIndex();
                    const queue = await TrackPlayer.getQueue();
                    console.log('After prev - Active index:', activeTrackIndex, 'Queue length:', queue.length);

                    if (activeTrackIndex !== null && activeTrackIndex >= 0 && queue[activeTrackIndex]) {
                        const track = queue[activeTrackIndex];
                        console.log('New active track:', track.title);

                        // Use ref to get latest playlist value
                        let song = playlistRef.current.find(s => s.id === track.id);
                        // Fallback to library songs for enhanced metadata
                        if (!song) {
                            song = librarySongsRef.current.find(s => s.id === track.id);
                        }
                        if (song) {
                            console.log('Updating to song:', song.title);
                            setCurrentTrack(song);
                            setCurrentIndex(activeTrackIndex);
                        }
                    }
                }, 150);
            }
        } catch (e) {
            console.error('prevTrack error:', e);
        }
    }

    const player: PlayerContextType = {
        currentTrack,
        currentSong: currentTrack,
        isPlaying,
        position: (position > 0 ? position * 1000 : (initialRestorePositionRef.current > 0 ? initialRestorePositionRef.current : 0)),
        duration: (duration > 0 ? duration * 1000 : (currentTrack?.duration || 0)),
        isShuffle: isShuffleOn,
        isShuffleOn,
        repeatMode,
        playlist,
        currentIndex,
        playlistName,
        gaplessEnabled,
        toggleGapless: () => setGaplessEnabled(prev => !prev),
        play: async (song: Song) => {
            await TrackPlayer.reset();
            await TrackPlayer.add([songToTrack(song)]);
            setPlaylist([song]);
            setCurrentIndex(0);
            setCurrentTrack(song);
            await TrackPlayer.play();
            setIsPlaying(true); // Manual update
        },
        pause: async () => {
            await TrackPlayer.pause();
            setIsPlaying(false); // Manual update
        },
        resume: async () => {
            await TrackPlayer.play();
            setIsPlaying(true); // Manual update
        },
        stop: async () => {
            await TrackPlayer.reset();
            setCurrentTrack(null);
            setPlaylist([]);
            setCurrentIndex(-1);
            setIsPlaying(false); // Manual update
        },
        seekTo: async (millis: number) => {
            await TrackPlayer.seekTo(millis / 1000);
        },
        seek: (millis: number) => {
            TrackPlayer.seekTo(millis / 1000);
        },
        playNext: nextTrack,
        playPrevious: prevTrack,
        setQueue: async (songs: Song[], index?: number) => {
            await TrackPlayer.reset();
            await TrackPlayer.add(songs.map(songToTrack));
            setPlaylist(songs);
            const idx = index || 0;
            if (songs.length > idx) {
                setCurrentIndex(idx);
                setCurrentTrack(songs[idx]);
                await TrackPlayer.skip(idx);
                await TrackPlayer.play();
                setIsPlaying(true); // Manual update
            }
        },
        playSongInPlaylist: async (songs: Song[], index: number, name?: string) => {
            await TrackPlayer.reset();
            await TrackPlayer.add(songs.map(songToTrack));
            setPlaylist(songs);
            setPlaylistName(name || '');
            if (songs.length > index) {
                setCurrentIndex(index);
                setCurrentTrack(songs[index]);
                await TrackPlayer.skip(index);
                await TrackPlayer.play();
                setIsPlaying(true); // Manual update
            }
        },
        addToQueue: async (song: Song) => {
            await TrackPlayer.add([songToTrack(song)]);
            setPlaylist(prev => [...prev, song]);
        },
        addNext: async (song: Song) => {
            await TrackPlayer.add([songToTrack(song)], currentIndex + 1);
            setPlaylist(prev => {
                const updated = [...prev];
                updated.splice(currentIndex + 1, 0, song);
                return updated;
            });
        },
        removeFromQueue: async (index: number) => {
            await TrackPlayer.remove(index);
            setPlaylist(prev => prev.filter((_, i) => i !== index));
        },
        toggleShuffle: () => {
            // Basic toggle, logic for actual shuffle queue can be complex
            setIsShuffleOn(!isShuffleOn);
        },
        toggleRepeat: async () => {
            const modes: ('off' | 'one' | 'all')[] = ['off', 'one', 'all'];
            const currentModeIndex = modes.indexOf(repeatMode);
            const nextMode = modes[(currentModeIndex + 1) % modes.length];
            setRepeatMode(nextMode);

            if (nextMode === 'one') await TrackPlayer.setRepeatMode(RepeatMode.Track);
            else if (nextMode === 'all') await TrackPlayer.setRepeatMode(RepeatMode.Queue);
            else await TrackPlayer.setRepeatMode(RepeatMode.Off);
        },
        playPause,
        nextTrack,
        prevTrack,
    };

    return (
        <PlayerContext.Provider value={player}>
            {children}
        </PlayerContext.Provider>
    );
};

export const usePlayerContext = () => {
    const context = useContext(PlayerContext);
    if (!context) {
        throw new Error('usePlayerContext must be used within a PlayerProvider');
    }
    return context;
};
