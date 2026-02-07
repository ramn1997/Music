import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import MusicInfo from 'expo-music-info-2';
const getMusicInfo = (MusicInfo as any)?.getMusicInfoAsync || MusicInfo;

import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { Alert, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { importService, ImportProgress as ImportProgressType } from '../services/ImportService';

const getRootFolder = (uri: string): string | null => {
    const parts = uri.split('/');
    const storageIndex = parts.indexOf('storage');

    if (storageIndex !== -1) {
        if (parts[storageIndex + 1] === 'emulated') {
            const targetIndex = storageIndex + 3;
            if (targetIndex < parts.length) {
                const folderName = targetIndex === parts.length - 1 ? "Root" : parts[targetIndex];
                return `Internal > ${folderName}`;
            }
        } else {
            const targetIndex = storageIndex + 2;
            if (targetIndex < parts.length) {
                const folderName = targetIndex === parts.length - 1 ? "Root" : parts[targetIndex];
                return `SD Card > ${folderName}`;
            }
        }
    }
    if (parts.length > 2) return `Unknown > ${parts[parts.length - 2]}`;
    return null;
};

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
    playHistory?: number[];
    addedToPlaylistAt?: number;
    scanStatus?: string;
};

export type Playlist = {
    id: string;
    name: string;
    songs: Song[];
    createdAt: number;
    isSpecial?: boolean;
    isFavorite?: boolean;
};

interface MusicLibraryContextType {
    songs: Song[];
    loading: boolean;
    hasPermission: boolean | undefined;
    fetchMusic: () => Promise<void>;
    scanForFolders: () => Promise<string[]>;
    loadSongsFromFolders: (folderNames: string[], saveToStorage?: boolean) => Promise<void>;
    refreshMetadata: () => Promise<void>;
    savedFolders: string[];
    likedSongs: Song[];
    toggleLike: (song: Song) => Promise<void>;
    isLiked: (songId: string) => boolean;
    playlists: Playlist[];
    createPlaylist: (name: string) => Promise<void>;
    deletePlaylist: (id: string) => Promise<void>;
    togglePlaylistFavorite: (id: string) => Promise<void>;
    addToPlaylist: (playlistId: string, song: Song) => Promise<void>;
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
    // New progressive import features
    importProgress: ImportProgressType | null;
    cancelImport: () => void;
}

const MusicLibraryContext = createContext<MusicLibraryContextType | null>(null);

export const MusicLibraryProvider = ({ children }: { children: ReactNode }) => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean | undefined>(undefined);
    const [likedSongs, setLikedSongs] = useState<Song[]>([]);
    const [favoriteArtists, setFavoriteArtists] = useState<string[]>([]);
    const [favoriteAlbums, setFavoriteAlbums] = useState<string[]>([]);
    const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);

    // Import progress state for progressive loading
    const [importProgress, setImportProgress] = useState<ImportProgressType | null>(null);

    // Cancel import function
    const cancelImport = useCallback(() => {
        importService.cancel();
    }, []);

    // Check for liked songs on mount
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

    // Load favorite artists
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

    // Load favorite albums
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

    // Load favorite genres
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

    const scanForFolders = async (): Promise<string[]> => {
        setLoading(true);
        try {
            const permission = await MediaLibrary.getPermissionsAsync();
            if (permission.status !== 'granted') {
                const { status } = await MediaLibrary.requestPermissionsAsync();
                if (status !== 'granted') return [];
            }

            const media = await MediaLibrary.getAssetsAsync({
                mediaType: MediaLibrary.MediaType.audio,
                first: 10000,
                sortBy: [MediaLibrary.SortBy.modificationTime]
            });

            if (media.assets.length === 0) return [];

            const folderSet = new Set<string>();
            media.assets.forEach(asset => {
                const folderName = getRootFolder(asset.uri);
                if (folderName) {
                    folderSet.add(folderName);
                }
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

    const [savedFolders, setSavedFolders] = useState<string[]>([]);

    // Load saved folders on mount
    React.useEffect(() => {
        const initLibrary = async () => {
            try {
                const jsonValue = await AsyncStorage.getItem('selected_music_folders');
                if (jsonValue != null) {
                    const folders = JSON.parse(jsonValue);
                    setSavedFolders(folders);
                    loadSongsFromFolders(folders, false);
                } else {
                    loadSongsFromFolders([], false);
                }
            } catch (e) {
                console.error("Failed to load saved folders", e);
            }
        };
        initLibrary();
    }, []);

    const [songMetadata, setSongMetadata] = useState<Record<string, { playCount: number, lastPlayed: number, playHistory: number[] }>>({});

    // Load metadata
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

    const updateSongMetadata = async (songId: string, updates: Partial<Song>) => {
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

        setPlaylists(prevPlaylists => prevPlaylists.map(p => ({
            ...p,
            songs: p.songs.map(s => s.id === songId ? { ...s, ...updates } : s)
        })));

        try {
            const existingCustomMeta = await AsyncStorage.getItem('custom_song_metadata');
            const customMeta = existingCustomMeta ? JSON.parse(existingCustomMeta) : {};
            customMeta[songId] = { ...customMeta[songId], ...updates };
            await AsyncStorage.setItem('custom_song_metadata', JSON.stringify(customMeta));
        } catch (e) {
            console.error('Failed to save custom metadata', e);
        }
    };

    const loadSongsFromFolders = async (folderNames: string[], saveToStorage = true) => {
        setLoading(true);

        // Show import progress modal
        setImportProgress({
            phase: 'scanning',
            current: 0,
            total: 0,
            message: 'Starting import...',
            songsLoaded: 0
        });

        if (saveToStorage) {
            setSavedFolders(folderNames);
            try {
                await AsyncStorage.setItem('selected_music_folders', JSON.stringify(folderNames));
            } catch (e) {
                console.error("Failed to save folders", e);
            }
        }

        if (folderNames.length === 0) {
            setSongs([]);
            setLikedSongs([]);
            setFavoriteArtists([]);
            setFavoriteAlbums([]);
            setFavoriteGenres([]);
            setPlaylists(prev => prev.map(p => ({ ...p, songs: [] })));

            AsyncStorage.setItem('liked_songs', JSON.stringify([]));
            AsyncStorage.setItem('favorite_artists', JSON.stringify([]));
            AsyncStorage.setItem('favorite_albums', JSON.stringify([]));
            AsyncStorage.setItem('favorite_genres', JSON.stringify([]));
            AsyncStorage.getItem('user_playlists').then(saved => {
                if (saved) {
                    const pl = JSON.parse(saved);
                    const cleared = pl.map((p: any) => ({ ...p, songs: [] }));
                    AsyncStorage.setItem('user_playlists', JSON.stringify(cleared));
                }
            });
            setLoading(false);
            setImportProgress(null);
            return;
        }

        try {
            // Use the new progressive import service
            await importService.importSongs(folderNames, {
                onProgress: (progress) => {
                    setImportProgress(progress);
                },
                onSongsUpdate: (importedSongs) => {
                    // Convert imported songs to the correct type and update state
                    const convertedSongs = importedSongs.map(s => ({
                        ...s,
                        scanStatus: s.scanStatus as string | undefined
                    })) as Song[];
                    setSongs(convertedSongs);

                    // Update liked songs and playlists with latest song data
                    const songMap = new Map(convertedSongs.map(s => [s.id, s]));

                    setLikedSongs(prev => {
                        const updated = prev
                            .filter(s => songMap.has(s.id))
                            .map(s => ({ ...s, ...songMap.get(s.id)! }));
                        return updated;
                    });

                    setPlaylists(prev => {
                        return prev.map(p => ({
                            ...p,
                            songs: (p.songs || [])
                                .filter(s => songMap.has(s.id))
                                .map(s => ({ ...s, ...songMap.get(s.id)! }))
                        }));
                    });
                },
                onComplete: (finalSongs) => {
                    // Final update with all songs
                    const convertedSongs = finalSongs.map(s => ({
                        ...s,
                        scanStatus: s.scanStatus as string | undefined
                    })) as Song[];
                    setSongs(convertedSongs);

                    // Persist liked songs and playlists with updated data
                    const songMap = new Map(convertedSongs.map(s => [s.id, s]));

                    setLikedSongs(prev => {
                        const updated = prev
                            .filter(s => songMap.has(s.id))
                            .map(s => ({ ...s, ...songMap.get(s.id)! }));
                        AsyncStorage.setItem('liked_songs', JSON.stringify(updated));
                        return updated;
                    });

                    setPlaylists(prev => {
                        const updated = prev.map(p => ({
                            ...p,
                            songs: (p.songs || [])
                                .filter(s => songMap.has(s.id))
                                .map(s => ({ ...s, ...songMap.get(s.id)! }))
                        }));
                        AsyncStorage.setItem('user_playlists', JSON.stringify(updated));
                        return updated;
                    });

                    // Hide progress modal after a short delay
                    setTimeout(() => {
                        setImportProgress(null);
                    }, 1500);
                },
                onError: (error) => {
                    console.error('[Import Error]:', error);
                    Alert.alert('Import Error', error.message);
                    setImportProgress(null);
                }
            });
        } catch (e) {
            console.error(e);
            setImportProgress(null);
        } finally {
            setLoading(false);
        }
    };

    const fetchMusic = useCallback(async () => {
        if (savedFolders.length > 0) {
            await loadSongsFromFolders(savedFolders, false);
            return;
        }
        setSongs([]);
    }, [savedFolders]);

    const [playlists, setPlaylists] = useState<Playlist[]>([]);

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

    const createPlaylist = async (name: string) => {
        const newPlaylist: Playlist = {
            id: Date.now().toString(),
            name: name.trim(),
            songs: [],
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

    const addToPlaylist = async (playlistId: string, song: Song) => {
        const updated = playlists.map(p => {
            if (p.id === playlistId) {
                if (p.songs.some(s => s.id === song.id)) return p;
                const songWithTime = { ...song, addedToPlaylistAt: Date.now() };
                return { ...p, songs: [songWithTime, ...p.songs] };
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
    const refreshMetadata = async () => {
        try {
            // Clear both old and new cache
            await AsyncStorage.removeItem('song_data_cache');
            await importService.clearCache();
            await loadSongsFromFolders(savedFolders, false);
        } catch (e) {
            console.error("Failed to refresh metadata", e);
        }
    };

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
        // New progressive import features
        importProgress,
        cancelImport
    }), [
        songs, loading, hasPermission, fetchMusic, scanForFolders, loadSongsFromFolders,
        refreshMetadata,
        savedFolders, likedSongs, toggleLike, isLiked, playlists, createPlaylist,
        deletePlaylist, togglePlaylistFavorite, addToPlaylist, removeFromPlaylist,
        incrementPlayCount, favoriteArtists, toggleFavoriteArtist, isFavoriteArtist,
        favoriteAlbums, toggleFavoriteAlbum, isFavoriteAlbum, favoriteGenres,
        toggleFavoriteGenre, isFavoriteGenre, updateSongMetadata,
        importProgress, cancelImport
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
