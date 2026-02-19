import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import MusicInfo from 'expo-music-info-2';
const getMusicInfo = (MusicInfo as any)?.getMusicInfoAsync || MusicInfo;

import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { Alert, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { importService, ImportProgress as ImportProgressType, getRootFolder } from '../services/ImportService';



export type Song = {
    id: string;
    filename: string;
    uri: string;
    duration: number;
    title: string;
    artist: string;
    album?: string;
    year?: string;
    genre?: string;
    albumId?: string;
    coverImage?: string;
    dateAdded?: number;
    playCount?: number;
    lastPlayed?: number;
    playHistory?: number[]; // Array of timestamps
    addedToPlaylistAt?: number; // For playlists
    scanStatus?: string;
    folder?: string;
};

export type Playlist = {
    id: string;
    name: string;
    songs: Song[];
    createdAt: number;
    isSpecial?: boolean; // For "Favorites", "Recently Played"
    isFavorite?: boolean; // User marked as favorite
};

interface MusicLibraryContextType {
    songs: Song[];
    loading: boolean;
    hasPermission: boolean | undefined;
    fetchMusic: (showProgress?: boolean) => Promise<void>;
    scanForFolders: () => Promise<string[]>;
    loadSongsFromFolders: (folderNames: string[], saveToStorage?: boolean, showProgress?: boolean) => Promise<void>;
    refreshMetadata: () => Promise<void>;
    savedFolders: string[];
    likedSongs: Song[];
    toggleLike: (song: Song) => Promise<void>;
    isLiked: (songId: string) => boolean;
    playlists: Playlist[];
    createPlaylist: (name: string, initialSongs?: Song[]) => Promise<void>;
    deletePlaylist: (id: string) => Promise<void>;
    togglePlaylistFavorite: (id: string) => Promise<void>;
    addToPlaylist: (playlistId: string, song: Song | Song[]) => Promise<void>;
    removeFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
    incrementPlayCount: (songId: string) => Promise<void>;
    favoriteArtists: string[];
    toggleFavoriteArtist: (artistName: string) => Promise<void>;
    isFavoriteArtist: (artistName: string) => boolean;
    favoriteAlbums: string[];
    toggleFavoriteAlbum: (albumName: string) => Promise<void>;
    isFavoriteAlbum: (albumName: string) => boolean;
    favoriteGenres: string[];
    toggleFavoriteGenre: (genreName: string) => Promise<void>;
    isFavoriteGenre: (genreName: string) => boolean;
    updateSongMetadata: (songId: string, updates: Partial<Song>) => Promise<void>;
    importProgress: ImportProgressType | null;
    cancelImport: () => void;
    refreshSongMetadata: (songId: string) => Promise<void>;
}

const MusicLibraryContext = createContext<MusicLibraryContextType | null>(null);

export const MusicLibraryProvider = ({ children }: { children: ReactNode }) => {
    // 1. STATE - Declared first to avoid TDZ issues
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean | undefined>(undefined);
    const [likedSongs, setLikedSongs] = useState<Song[]>([]);
    const [favoriteArtists, setFavoriteArtists] = useState<string[]>([]);
    const [favoriteAlbums, setFavoriteAlbums] = useState<string[]>([]);
    const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
    const [importProgress, setImportProgress] = useState<ImportProgressType | null>(null);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [songMetadata, setSongMetadata] = useState<Record<string, { playCount: number, lastPlayed: number, playHistory: number[] }>>({});
    const [savedFolders, setSavedFolders] = useState<string[]>([]);
    const [customMetadata, setCustomMetadata] = useState<Record<string, Partial<Song>>>({});

    const cancelImport = useCallback(() => {
        importService.cancel();
    }, []);

    // Unified helper to merge all metadata (Custom Edits + Play History)
    const mergeSongData = useCallback((rawSongs: Song[], custom: Record<string, Partial<Song>>, stats: Record<string, { playCount: number, lastPlayed: number, playHistory: number[] }>) => {
        if (!rawSongs) return [];
        return rawSongs.map(s => {
            const customData = custom[s.id] || {};
            const statsData = stats[s.id];
            return {
                ...s,
                ...customData,
                playCount: statsData?.playCount || 0,
                lastPlayed: statsData?.lastPlayed || 0,
                playHistory: statsData?.playHistory || []
            };
        });
    }, []);


    // When updating song metadata, update local state too
    const updateSongMetadata = async (songId: string, updates: Partial<Song>) => {
        // Update custom metadata state first
        const newCustom = { ...customMetadata, [songId]: { ...(customMetadata[songId] || {}), ...updates } };
        setCustomMetadata(newCustom);

        // Then update songs array using unified merge (optimistic)
        setSongs(prevSongs => prevSongs.map(s => {
            if (s.id === songId) {
                return { ...s, ...updates };
            }
            return s;
        }));

        setLikedSongs(prevLiked => prevLiked.map(s => {
            if (s.id === songId) {
                return { ...s, ...updates };
            }
            return s;
        }));

        // Now safe to use setPlaylists
        setPlaylists(prevPlaylists => prevPlaylists.map(p => ({
            ...p,
            songs: p.songs.map(s => s.id === songId ? { ...s, ...updates } : s)
        })));

        try {
            await AsyncStorage.setItem('custom_song_metadata', JSON.stringify(newCustom));
        } catch (e) {
            console.error('Failed to save custom metadata', e);
        }
    };

    // Use MetadataService to re-scan file tags
    const refreshSongMetadata = useCallback(async (songId: string) => {
        const song = songs.find(s => s.id === songId);
        if (!song) return;

        try {
            // Lazy load service to avoid cyclic deps if any (though currently clean)
            const { metadataService } = require('../services/MetadataService');
            const meta = await metadataService.fetchMetadata(song.uri, song.id);

            const updates: Partial<Song> = {};
            // Only update if value is present and different
            if (meta.title && meta.title !== song.title) updates.title = meta.title;
            if (meta.artist && meta.artist !== song.artist) updates.artist = meta.artist;
            if (meta.album && meta.album !== song.album) updates.album = meta.album;
            if (meta.genre && meta.genre !== song.genre) updates.genre = meta.genre;

            if (Object.keys(updates).length > 0) {
                console.log(`[MusicLibrary] Auto-correcting metadata for ${song.title}`, updates);
                await updateSongMetadata(songId, updates);
            }
        } catch (e) {
            console.warn('Failed to refresh metadata', e);
        }
    }, [songs, customMetadata]);

    // Background Process: Fix songs with missing/bad metadata (e.g. filename as title)
    const enhanceSuspiciousMetadata = useCallback(async (candidateSongs: Song[]) => {
        // Identify candidates: Unknown Artist, or Title looks like filename, or empty
        const suspicious = candidateSongs.filter(s =>
            (s.artist === 'Unknown Artist' || s.artist === '<unknown>' || !s.artist) ||
            (s.album === 'Unknown Album' || s.album === '<unknown>' || !s.album) ||
            (s.genre === 'Unknown Genre' || !s.genre) ||
            (s.title === s.filename) ||
            (s.title === s.filename.replace(/\.[^/.]+$/, '')) ||
            (!s.title)
        );

        if (suspicious.length === 0) return;
        console.log(`[MusicLibrary] Enhancing ${suspicious.length} songs with partial metadata...`);

        // Process sequentially to be gentle on I/O
        for (const song of suspicious) {
            const start = Date.now();
            await refreshSongMetadata(song.id);
            // Tiny throttle to yield checking
            if (Date.now() - start < 10) await new Promise(r => setTimeout(r, 10));
        }
    }, [refreshSongMetadata]);

    // Load songs from specific folders (Import flow)
    const loadSongsFromFolders = async (folderNames: string[] | null, saveToStorage = true, showProgress = true, forceDeepScan = false) => {
        setLoading(true);

        if (showProgress) {
            setImportProgress({
                phase: 'scanning',
                current: 0,
                total: 0,
                message: 'Starting import...',
                songsLoaded: 0
            });
        }

        if (saveToStorage && folderNames !== null) {
            setSavedFolders(folderNames);
            try {
                await AsyncStorage.setItem('selected_music_folders', JSON.stringify(folderNames));
            } catch (e) {
                console.error("Failed to save folders", e);
            }
        }

        if (folderNames !== null && folderNames.length === 0) {
            // User deselected all folders -> Clear everything
            setSongs([]);
            setLikedSongs([]);
            setFavoriteArtists([]);
            setFavoriteAlbums([]);
            setFavoriteGenres([]);
            setPlaylists(prev => prev.map(p => ({ ...p, songs: [] })));
            AsyncStorage.setItem('liked_songs', JSON.stringify([]));
            setLoading(false);
            if (showProgress) setImportProgress(null);
            return;
        }

        try {
            const foldersToLoad = folderNames === null ? [] : folderNames;
            // Background Import
            await importService.importSongs(foldersToLoad, {
                onProgress: (progress) => {
                    if (showProgress) {
                        setImportProgress(progress);

                        // If complete or cancelled, clear progress after delay
                        if (progress.phase === 'complete' || progress.phase === 'cancelled') {
                            setTimeout(() => {
                                setImportProgress(prev => {
                                    // Only clear if it's still the same phase (no new import started)
                                    if (prev?.phase === 'complete' || prev?.phase === 'cancelled') {
                                        return null;
                                    }
                                    return prev;
                                });
                            }, 2000);
                        }
                    }
                },
                onSongsUpdate: (batch) => {
                    const convertedBatch = batch.map(s => ({
                        ...s,
                        scanStatus: s.scanStatus as string | undefined
                    })) as Song[];

                    const mergedBatch = mergeSongData(convertedBatch, customMetadata, songMetadata);

                    // Efficiently update only the songs in this batch within the main state
                    setSongs(prevSongs => {
                        const batchMap = new Map(mergedBatch.map(b => [b.id, b]));
                        return prevSongs.map(s => batchMap.get(s.id) || s);
                    });

                    // Also sync with liked songs if any were enhanced
                    setLikedSongs(prevLiked => {
                        const batchMap = new Map(mergedBatch.map(b => [b.id, b]));
                        if (!prevLiked.some(l => batchMap.has(l.id))) return prevLiked;
                        return prevLiked.map(s => batchMap.get(s.id) || s);
                    });
                },
                onComplete: (finalSongs) => {
                    const convertedSongs = finalSongs.map(s => ({
                        ...s,
                        scanStatus: s.scanStatus as string | undefined
                    })) as Song[];
                    // Apply ALL metadata and load songs into app
                    setSongs(mergeSongData(convertedSongs, customMetadata, songMetadata));

                    // Don't clear progress immediately if we are enhancing
                    if (importService.isImportInProgress()) {
                        // let the enhancement updates continue showing
                    } else {
                        setTimeout(() => {
                            setImportProgress(null);
                        }, 1500);
                    }
                },
                onError: (error) => {
                    if (showProgress) {
                        Alert.alert('Import Error', error.message);
                        setImportProgress(null);
                    }
                }
            }, { forceDeepScan });
        } catch (e) {
            if (showProgress) setImportProgress(null);
        } finally {
            setLoading(false);
        }
    };

    // --- Playlists ---
    useEffect(() => {
        const loadPlaylists = async () => {
            try {
                const saved = await AsyncStorage.getItem('user_playlists');
                if (saved) {
                    setPlaylists(JSON.parse(saved));
                }
            } catch (e) {
                console.error("Failed to load playlists", e);
            }
        };
        loadPlaylists();
    }, []);

    const savePlaylists = async (newPlaylists: Playlist[]) => {
        setPlaylists(newPlaylists);
        try {
            await AsyncStorage.setItem('user_playlists', JSON.stringify(newPlaylists));
        } catch (e) {
            console.error("Failed to save playlists", e);
        }
    };

    const createPlaylist = async (name: string, initialSongs: Song[] = []) => {
        const manualTime = Date.now();
        const songsWithTime = initialSongs.map(s => ({ ...s, addedToPlaylistAt: manualTime }));
        const newPlaylist: Playlist = {
            id: Date.now().toString(),
            name: name.trim(),
            songs: songsWithTime,
            createdAt: Date.now()
        };
        const updated = [...playlists, newPlaylist];
        await savePlaylists(updated);
    };

    const deletePlaylist = async (id: string) => {
        const updated = playlists.filter(p => p.id !== id);
        await savePlaylists(updated);
    };

    const togglePlaylistFavorite = async (id: string) => {
        const updated = playlists.map(p => {
            if (p.id === id) {
                return { ...p, isFavorite: !p.isFavorite };
            }
            return p;
        });
        await savePlaylists(updated);
    };

    const addToPlaylist = async (playlistId: string, song: Song | Song[]) => {
        const songsToAdd = Array.isArray(song) ? song : [song];
        const updated = playlists.map(p => {
            if (p.id === playlistId) {
                const existingIds = new Set(p.songs.map(s => s.id));
                const manualTime = Date.now();
                const newSongs = songsToAdd
                    .filter(s => !existingIds.has(s.id))
                    .map(s => ({ ...s, addedToPlaylistAt: manualTime }));

                if (newSongs.length === 0) return p;
                return { ...p, songs: [...newSongs, ...p.songs] };
            }
            return p;
        });
        await savePlaylists(updated);
    };

    const removeFromPlaylist = async (playlistId: string, songId: string) => {
        const updated = playlists.map(p => {
            if (p.id === playlistId) {
                return { ...p, songs: p.songs.filter(s => s.id !== songId) };
            }
            return p;
        });
        await savePlaylists(updated);
    };

    // --- Likes ---
    React.useEffect(() => {
        const loadLikes = async () => {
            try {
                const savedLikes = await AsyncStorage.getItem('liked_songs');
                if (savedLikes) {
                    setLikedSongs(JSON.parse(savedLikes));
                }
            } catch (e) {
                console.error("Failed to load liked songs", e);
            }
        };
        loadLikes();
    }, []);

    const toggleLike = async (song: Song) => {
        const isAlreadyLiked = likedSongs.some(s => s.id === song.id);
        let newLikedSongs;
        if (isAlreadyLiked) {
            newLikedSongs = likedSongs.filter(s => s.id !== song.id);
        } else {
            const songWithTime = { ...song, addedToPlaylistAt: Date.now() };
            newLikedSongs = [songWithTime, ...likedSongs];
        }
        setLikedSongs(newLikedSongs);
        try {
            await AsyncStorage.setItem('liked_songs', JSON.stringify(newLikedSongs));
        } catch (e) {
            console.error("Failed to save liked songs", e);
        }
    };

    // --- Favorites (Artists, Albums, Genres) ---
    React.useEffect(() => {
        const loadFavoriteArtists = async () => {
            try {
                const saved = await AsyncStorage.getItem('favorite_artists');
                if (saved) setFavoriteArtists(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load favorite artists", e);
            }
        };
        loadFavoriteArtists();
    }, []);

    const toggleFavoriteArtist = async (artistName: string) => {
        const isAlready = favoriteArtists.includes(artistName);
        let newFavorites;
        if (isAlready) {
            newFavorites = favoriteArtists.filter(a => a !== artistName);
        } else {
            newFavorites = [...favoriteArtists, artistName];
        }
        setFavoriteArtists(newFavorites);
        try {
            await AsyncStorage.setItem('favorite_artists', JSON.stringify(newFavorites));
        } catch (e) {
            console.error("Failed to save favorite artists", e);
        }
    };

    const isFavoriteArtist = useCallback((artistName: string) => {
        return favoriteArtists.includes(artistName);
    }, [favoriteArtists]);

    React.useEffect(() => {
        const load = async () => {
            try {
                const saved = await AsyncStorage.getItem('favorite_albums');
                if (saved) setFavoriteAlbums(JSON.parse(saved));
            } catch (e) { console.error(e); }
        };
        load();
    }, []);

    const toggleFavoriteAlbum = async (albumName: string) => {
        const isAlready = favoriteAlbums.includes(albumName);
        let newFavorites;
        if (isAlready) newFavorites = favoriteAlbums.filter(a => a !== albumName);
        else newFavorites = [...favoriteAlbums, albumName];
        setFavoriteAlbums(newFavorites);
        AsyncStorage.setItem('favorite_albums', JSON.stringify(newFavorites));
    };

    const isFavoriteAlbum = useCallback((albumName: string) => {
        return favoriteAlbums.includes(albumName);
    }, [favoriteAlbums]);

    React.useEffect(() => {
        const load = async () => {
            try {
                const saved = await AsyncStorage.getItem('favorite_genres');
                if (saved) setFavoriteGenres(JSON.parse(saved));
            } catch (e) { console.error(e); }
        };
        load();
    }, []);

    const toggleFavoriteGenre = async (genreName: string) => {
        const isAlready = favoriteGenres.includes(genreName);
        let newFavorites;
        if (isAlready) newFavorites = favoriteGenres.filter(a => a !== genreName);
        else newFavorites = [...favoriteGenres, genreName];
        setFavoriteGenres(newFavorites);
        AsyncStorage.setItem('favorite_genres', JSON.stringify(newFavorites));
    };

    const isFavoriteGenre = useCallback((genreName: string) => {
        return favoriteGenres.includes(genreName);
    }, [favoriteGenres]);

    const isLiked = useCallback((songId: string) => {
        return likedSongs.some(s => s.id === songId);
    }, [likedSongs]);


    // --- Metadata ---
    useEffect(() => {
        const loadMeta = async () => {
            try {
                const saved = await AsyncStorage.getItem('song_metadata');
                if (saved) setSongMetadata(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load metadata", e);
            }
        };
        loadMeta();
    }, []);

    const incrementPlayCount = async (songId: string) => {
        const now = Date.now();
        const currentMeta = songMetadata[songId] || { playCount: 0, lastPlayed: 0, playHistory: [] };

        const updatedMeta = {
            ...currentMeta,
            playCount: currentMeta.playCount + 1,
            lastPlayed: now,
            playHistory: [...(currentMeta.playHistory || []), now]
        };

        const newMetadata = { ...songMetadata, [songId]: updatedMeta };
        setSongMetadata(newMetadata);

        setSongs(prevSongs => prevSongs.map(s => {
            if (s.id === songId) {
                return { ...s, playCount: updatedMeta.playCount, lastPlayed: updatedMeta.lastPlayed, playHistory: updatedMeta.playHistory };
            }
            return s;
        }));

        try {
            await AsyncStorage.setItem('song_metadata', JSON.stringify(newMetadata));
        } catch (e) {
            console.error(e);
        }
    };

    // 3. CORE LOGIC

    const scanForFolders = async (): Promise<string[]> => {
        setLoading(true);
        try {
            const permission = await MediaLibrary.getPermissionsAsync();
            if (permission.status !== 'granted') {
                const { status } = await MediaLibrary.requestPermissionsAsync();
                if (status !== 'granted') return [];
            }

            // Paginated Scan for Folders
            let allAssets: MediaLibrary.Asset[] = [];
            let hasNextPage = true;
            let after: any;

            let pageCount = 0;
            while (hasNextPage && pageCount < 50) {
                const media = await MediaLibrary.getAssetsAsync({
                    mediaType: MediaLibrary.MediaType.audio,
                    first: 2000,
                    after,
                    sortBy: [MediaLibrary.SortBy.modificationTime]
                });

                allAssets = [...allAssets, ...media.assets];
                hasNextPage = media.hasNextPage;
                after = media.endCursor;
                pageCount++;
            }

            const folderSet = new Set<string>();
            allAssets.forEach(asset => {
                try {
                    const folderName = getRootFolder(asset.uri);
                    if (folderName) {
                        folderSet.add(folderName);
                    }
                } catch (e) { }
            });

            return Array.from(folderSet).sort();
        } catch (error) {
            console.error(error);
            Alert.alert('Error scanning folders');
            return [];
        } finally {
            setLoading(false);
        }
    };



    const fetchMusic = useCallback(async (showProgress = false) => {
        if (savedFolders.length > 0) {
            await loadSongsFromFolders(savedFolders, false, showProgress);
            return;
        }
        setSongs([]);
    }, [savedFolders]);

    const refreshMetadata = async () => {
        try {
            await AsyncStorage.removeItem('song_data_cache');
            await importService.clearCache();
            await loadSongsFromFolders(savedFolders, false, true, true);
        } catch (e) {
            console.error("Failed to refresh metadata", e);
        }
    };

    // 4. INIT
    const isInitialized = useRef(false);

    React.useEffect(() => {
        if (isInitialized.current) return;
        isInitialized.current = true;

        const initLibrary = async () => {
            // 0. Pre-load ALL persistent metadata (Custom Edits + Play History)
            let loadedCustom: Record<string, Partial<Song>> = {};
            let loadedStats: Record<string, { playCount: number, lastPlayed: number, playHistory: number[] }> = {};

            try {
                const [savedCustom, savedStats] = await Promise.all([
                    AsyncStorage.getItem('custom_song_metadata'),
                    AsyncStorage.getItem('song_metadata')
                ]);

                if (savedCustom) {
                    loadedCustom = JSON.parse(savedCustom);
                    setCustomMetadata(loadedCustom);
                }
                if (savedStats) {
                    loadedStats = JSON.parse(savedStats);
                    setSongMetadata(loadedStats);
                }
            } catch (e) {
                console.error("Failed to load metadata", e);
            }

            // Reset import service
            importService.reset();
            setLoading(true);

            try {
                // 1. Check/Request Permission
                console.log('[MusicLibrary] Checking permissions...');
                let permission = await MediaLibrary.getPermissionsAsync();

                if (permission.status !== 'granted') {
                    console.log('[MusicLibrary] Requesting permissions...');
                    permission = await MediaLibrary.requestPermissionsAsync();
                }

                console.log('[MusicLibrary] Permission results:', permission.status);

                if (permission.status !== 'granted') {
                    console.warn('[MusicLibrary] Permission rejected');
                    setHasPermission(false);
                    setLoading(false);
                    return;
                }
                setHasPermission(true);

                // 2. Load Saved Folders
                let folderNames: string[] = [];
                try {
                    const savedJson = await AsyncStorage.getItem('selected_music_folders');
                    if (savedJson) {
                        folderNames = JSON.parse(savedJson);
                        setSavedFolders(folderNames);
                    }
                } catch (e) {
                    console.warn('Error loading folder selection', e);
                }

                // 3. Trigger Import Service (reuse existing logic)
                // This handles caching, enhancement, and "Unknown" checks automatically
                console.log('[MusicLibrary] Initializing library via ImportService...');
                await loadSongsFromFolders(folderNames, false, false);

            } catch (e: any) {
                console.error('[MusicLibrary] Init Failed', e);
                Alert.alert('Init Error', e.message);
                setLoading(false);
            }
        };
        initLibrary();
    }, []);

    const contextValue = useMemo(() => ({
        songs,
        loading,
        hasPermission,
        fetchMusic,
        scanForFolders,
        loadSongsFromFolders,
        refreshMetadata,
        savedFolders,
        likedSongs,
        toggleLike,
        isLiked,
        playlists,
        createPlaylist,
        deletePlaylist,
        togglePlaylistFavorite,
        addToPlaylist,
        removeFromPlaylist,
        incrementPlayCount,
        favoriteArtists,
        toggleFavoriteArtist,
        isFavoriteArtist,
        favoriteAlbums,
        toggleFavoriteAlbum,
        isFavoriteAlbum,
        favoriteGenres,
        toggleFavoriteGenre,
        isFavoriteGenre,
        updateSongMetadata,
        importProgress,
        cancelImport,
        refreshSongMetadata
    }), [
        songs, loading, hasPermission, fetchMusic, scanForFolders, loadSongsFromFolders,
        refreshMetadata,
        savedFolders, likedSongs, toggleLike, isLiked, playlists, createPlaylist,
        deletePlaylist, togglePlaylistFavorite, addToPlaylist, removeFromPlaylist,
        incrementPlayCount, favoriteArtists, toggleFavoriteArtist, isFavoriteArtist,
        favoriteAlbums, toggleFavoriteAlbum, isFavoriteAlbum, favoriteGenres,
        toggleFavoriteGenre, isFavoriteGenre, updateSongMetadata,
        importProgress, cancelImport, refreshSongMetadata
    ]);

    return (
        <MusicLibraryContext.Provider value={contextValue}>
            {children}
        </MusicLibraryContext.Provider>
    );
};

export const useMusicLibrary = () => {
    const context = useContext(MusicLibraryContext);
    if (!context) {
        throw new Error('useMusicLibrary must be used within a MusicLibraryProvider');
    }
    return context;
};
