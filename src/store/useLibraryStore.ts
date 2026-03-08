import { create } from 'zustand';
import { storage } from './mmkv';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';
import { importService, ImportProgress as ImportProgressType, getRootFolder } from '../services/ImportService';
import { databaseService } from '../services/DatabaseService';
import { Song, Playlist, ArtistMetadata } from '../types/library';

export { Song, Playlist, ArtistMetadata };



// Singleton refs to prevent render spam and manage background operations
let customMetadataRef: Record<string, Partial<Song>> = {};
let songMetadataRef: Record<string, { playCount: number, lastPlayed: number, playHistory: number[] }> = {};
let artistMetadataRef: Record<string, ArtistMetadata> = {};
let songMapRef: Map<string, Song> = new Map();
let updateBufferRef: { [id: string]: Song } = {};

let updateTimeoutRef: NodeJS.Timeout | null = null;
let calculationTimeoutRef: NodeJS.Timeout | null = null;
let isCalculatingStats = false;
let isLibraryInitialized = false;

// Unified helper to merge all metadata (Custom Edits + Play History)
const mergeSongData = (rawSongs: Song[], custom: any, stats: any) => {
    if (!rawSongs || !Array.isArray(rawSongs)) return [];
    const safeCustom = (custom && typeof custom === 'object') ? custom : {};
    const safeStats = (stats && typeof stats === 'object') ? stats : {};

    return rawSongs.map(s => {
        if (!s || !s.id) return null as any;
        const customData = safeCustom[s.id] || {};
        const statsData = safeStats[s.id];
        return {
            ...s,
            ...(typeof customData === 'object' ? customData : {}),
            playCount: statsData?.playCount || 0,
            lastPlayed: statsData?.lastPlayed || 0,
            playHistory: Array.isArray(statsData?.playHistory) ? statsData.playHistory : []
        };
    }).filter(Boolean);
};

// Helper for MMKV serialization/deserialization
const getSavedObject = <T>(key: string, fallback: T): T => {
    const data = storage.getString(key);
    if (!data) return fallback;
    try { return JSON.parse(data) as T; } catch { return fallback; }
};
const saveObject = (key: string, data: any) => {
    storage.set(key, JSON.stringify(data));
};

interface LibraryState {
    songs: Song[];
    loading: boolean;
    hasPermission: boolean | undefined;
    savedFolders: string[];
    likedSongs: Song[];
    favoriteArtists: string[];
    favoriteAlbums: string[];
    favoriteGenres: string[];
    importProgress: ImportProgressType | null;
    playlists: Playlist[];
    favoriteSpecialPlaylists: string[];
    topArtists: any[];
    recentlyPlayed: Song[];
    recentlyAdded: Song[];
    neverPlayed: Song[];
    artistMetadata: Record<string, ArtistMetadata>;
    sortedSongs: Song[];
    sortedLikedSongs: Song[];

    // Actions
    initLibrary: () => Promise<void>;
    fetchMusic: (showProgress?: boolean) => Promise<void>;
    scanForFolders: () => Promise<string[]>;
    loadSongsFromFolders: (folderNames: string[] | null, saveToStorage?: boolean, showProgress?: boolean, forceDeepScan?: boolean, isQuiet?: boolean) => Promise<void>;
    refreshMetadata: () => Promise<void>;
    toggleLike: (song: Song) => Promise<void>;
    addSongsToLiked: (songs: Song[]) => Promise<void>;
    isLiked: (songId: string) => boolean;
    createPlaylist: (name: string, initialSongs?: Song[]) => Promise<void>;
    deletePlaylist: (id: string) => Promise<void>;
    togglePlaylistFavorite: (id: string) => Promise<void>;
    addToPlaylist: (playlistId: string, song: Song | Song[]) => Promise<void>;
    removeFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
    renamePlaylist: (id: string, newName: string) => Promise<void>;
    incrementPlayCount: (songId: string) => Promise<void>;
    deleteSong: (song: Song) => Promise<void>;
    toggleFavoriteArtist: (artistName: string) => Promise<void>;
    isFavoriteArtist: (artistName: string) => boolean;
    toggleFavoriteAlbum: (albumName: string) => Promise<void>;
    isFavoriteAlbum: (albumName: string) => boolean;
    toggleFavoriteGenre: (genreName: string) => Promise<void>;
    isFavoriteGenre: (genreName: string) => boolean;
    updateSongMetadata: (songId: string, updates: Partial<Song>) => Promise<void>;
    cancelImport: () => void;
    refreshSongMetadata: (songId: string) => Promise<void>;
    toggleSpecialPlaylistFavorite: (id: string) => Promise<void>;
    updateArtistMetadata: (artistName: string, updates: Partial<ArtistMetadata>) => Promise<void>;
    syncArtistImages: (names: string[]) => Promise<void>;
    calculateBackgroundStats: () => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
    songs: [],
    loading: true,
    hasPermission: undefined,
    savedFolders: [],
    likedSongs: [],
    favoriteArtists: [],
    favoriteAlbums: [],
    favoriteGenres: [],
    importProgress: null,
    playlists: [],
    favoriteSpecialPlaylists: [],
    topArtists: [],
    recentlyPlayed: [],
    recentlyAdded: [],
    neverPlayed: [],
    artistMetadata: {},
    sortedSongs: [],
    sortedLikedSongs: [],


    cancelImport: () => importService.cancel(),

    updateSongMetadata: async (songId, updates) => {
        if (!songId || !updates || typeof updates !== 'object') return;
        const currentCustom = customMetadataRef || {};
        const newCustom = { ...currentCustom, [songId]: { ...(currentCustom[songId] || {}), ...updates } };
        customMetadataRef = newCustom;
        saveObject('custom_song_metadata', newCustom);

        set(state => {
            const newSongs = state.songs.map(s => s.id === songId ? { ...s, ...updates } : s);
            const newLiked = state.likedSongs.map(s => s.id === songId ? { ...s, ...updates } : s);
            const newRecent = state.recentlyPlayed.map(s => s.id === songId ? { ...s, ...updates } : s);
            const newAdded = state.recentlyAdded.map(s => s.id === songId ? { ...s, ...updates } : s);
            const newNever = state.neverPlayed.map(s => s.id === songId ? { ...s, ...updates } : s);
            const newPlaylists = state.playlists.map(p => ({
                ...p,
                songs: p.songs.map(s => s.id === songId ? { ...s, ...updates } : s)
            }));
            return {
                songs: newSongs,
                likedSongs: newLiked,
                recentlyPlayed: newRecent,
                recentlyAdded: newAdded,
                neverPlayed: newNever,
                playlists: newPlaylists
            };
        });
    },

    updateArtistMetadata: async (artistName, updates) => {
        if (!artistName || !updates || typeof updates !== 'object') return;
        const currentMetadata = artistMetadataRef || {};
        const newMetadata = {
            ...currentMetadata,
            [artistName]: { ...(currentMetadata[artistName] || {}), ...updates }
        };
        artistMetadataRef = newMetadata;
        saveObject('artist_metadata', newMetadata);
        set({ artistMetadata: newMetadata });
    },

    syncArtistImages: async (names) => {
        if (!names || names.length === 0) return;
        const { ArtistImageService } = require('../services/ArtistImageService');
        for (const name of names) {
            if (!name || name === "Unknown Artist") continue;
            if (artistMetadataRef[name]?.coverImage) continue;
            try {
                const url = await ArtistImageService.getArtistImage(name);
                if (url) {
                    get().updateArtistMetadata(name, { coverImage: url });
                }
            } catch (e) { }
        }
    },

    refreshSongMetadata: async (songId) => {
        const { songs, updateSongMetadata } = get();
        const song = songs.find(s => s.id === songId);
        if (!song) return;
        try {
            const { metadataService } = require('../services/MetadataService');
            const meta = await metadataService.fetchMetadata(song.uri, song.id);
            const updates: Partial<Song> = {};
            if (meta.title && meta.title !== song.title) updates.title = meta.title;
            if (meta.artist && meta.artist !== song.artist) updates.artist = meta.artist;
            if (meta.album && meta.album !== song.album) updates.album = meta.album;
            if (meta.genre && meta.genre !== song.genre) updates.genre = meta.genre;

            if (Object.keys(updates).length > 0) {
                console.log(`[LibraryStore] Auto-correcting metadata for ${song.title}`, updates);
                await updateSongMetadata(songId, updates);
            }
        } catch (e) {
            console.warn('Failed to refresh metadata', e);
        }
    },

    loadSongsFromFolders: async (folderNames, saveToStorage = true, showProgress = true, forceDeepScan = false, isQuiet = false) => {
        if (!isQuiet) set({ loading: true });

        if (showProgress) {
            set({ importProgress: { phase: 'scanning', current: 0, total: 0, message: 'Starting import...', songsLoaded: 0 } });
        }

        if (saveToStorage && folderNames !== null) {
            set({ savedFolders: folderNames });
            saveObject('selected_music_folders', folderNames);
        }

        if (saveToStorage && folderNames !== null && folderNames.length === 0) {
            // Cleared all folders
            set({ songs: [], likedSongs: [], favoriteArtists: [], favoriteAlbums: [], favoriteGenres: [], playlists: get().playlists.map(p => ({ ...p, songs: [] })) });
            saveObject('liked_songs', []);
            set({ loading: false });
            if (showProgress) set({ importProgress: null });
            return;
        }

        try {
            const foldersToLoad = folderNames === null ? [] : folderNames;
            await importService.importSongs(foldersToLoad, {
                onProgress: (progress) => {
                    if (showProgress) {
                        set({ importProgress: progress });
                        if (progress.phase === 'complete' || progress.phase === 'cancelled') {
                            setTimeout(() => {
                                set(state => {
                                    if (state.importProgress?.phase === 'complete' || state.importProgress?.phase === 'cancelled') {
                                        return { importProgress: null };
                                    }
                                    return {};
                                });
                            }, 2000);
                        }
                    }
                },
                onSongsUpdate: (batch) => {
                    batch.forEach(b => {
                        updateBufferRef[b.id] = { ...b, scanStatus: b.scanStatus as string | undefined } as Song;
                    });
                    if (!updateTimeoutRef) {
                        updateTimeoutRef = setTimeout(() => {
                            const currentBuffer = updateBufferRef;
                            updateBufferRef = {};
                            updateTimeoutRef = null;
                            const bufferArray = Object.values(currentBuffer);
                            if (bufferArray.length === 0) return;

                            const mergedBatch = mergeSongData(bufferArray, customMetadataRef, songMetadataRef);
                            const batchMap = new Map(mergedBatch.map(b => [b.id, b]));

                            set(state => {
                                const newSongs = state.songs.map(s => {
                                    const updated = batchMap.get(s.id);
                                    if (updated) songMapRef.set(updated.id, updated);
                                    return updated || s;
                                });
                                let hasChanges = false;
                                const newLiked = state.likedSongs.map(s => {
                                    const updated = batchMap.get(s.id);
                                    if (updated) { hasChanges = true; return updated; }
                                    return s;
                                });
                                return {
                                    songs: newSongs,
                                    likedSongs: hasChanges ? newLiked : state.likedSongs
                                };
                            });

                        }, 2500);
                    }
                },
                onComplete: (finalSongs) => {
                    const convertedSongs = (finalSongs || []).map(s => ({
                        ...s,
                        scanStatus: s.scanStatus as string | undefined
                    })) as Song[];

                    const mergedSongs = mergeSongData(convertedSongs, customMetadataRef, songMetadataRef);
                    mergedSongs.forEach(s => songMapRef.set(s.id, s));
                    set({ songs: mergedSongs });
                    get().calculateBackgroundStats();


                    if (!importService.isImportInProgress()) {
                        setTimeout(() => { set({ importProgress: null }); }, 1500);
                    }
                },
                onError: (error) => {
                    if (showProgress) {
                        Alert.alert('Import Error', error.message);
                        set({ importProgress: null });
                    }
                }
            }, { forceDeepScan });
        } catch (e) {
            if (showProgress) set({ importProgress: null });
        } finally {
            if (!isQuiet) set({ loading: false });
        }
    },

    createPlaylist: async (name, initialSongs = []) => {
        const manualTime = Date.now();
        const songsWithTime = initialSongs.map(s => ({ ...s, addedToPlaylistAt: manualTime }));
        const newPlaylist: Playlist = {
            id: Date.now().toString(),
            name: name.trim(),
            songs: songsWithTime,
            createdAt: Date.now()
        };
        const updated = [...get().playlists, newPlaylist];
        set({ playlists: updated });
        saveObject('user_playlists', updated);
    },

    deletePlaylist: async (id) => {
        const updated = get().playlists.filter(p => p.id !== id);
        set({ playlists: updated });
        saveObject('user_playlists', updated);
    },

    togglePlaylistFavorite: async (id) => {
        const updated = get().playlists.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p);
        set({ playlists: updated });
        saveObject('user_playlists', updated);
    },

    addToPlaylist: async (playlistId, song) => {
        const songsToAdd = Array.isArray(song) ? song : [song];
        const updated = get().playlists.map(p => {
            if (p.id === playlistId) {
                const existingIds = new Set(p.songs.map(s => s.id));
                const manualTime = Date.now();
                const newSongs = songsToAdd.filter(s => !existingIds.has(s.id)).map(s => ({ ...s, addedToPlaylistAt: manualTime }));
                if (newSongs.length === 0) return p;
                return { ...p, songs: [...newSongs, ...p.songs] };
            }
            return p;
        });
        set({ playlists: updated });
        saveObject('user_playlists', updated);
    },

    removeFromPlaylist: async (playlistId, songId) => {
        const updated = get().playlists.map(p => p.id === playlistId ? { ...p, songs: p.songs.filter(s => s.id !== songId) } : p);
        set({ playlists: updated });
        saveObject('user_playlists', updated);
    },

    renamePlaylist: async (id, newName) => {
        const updated = get().playlists.map(p => p.id === id ? { ...p, name: newName.trim() } : p);
        set({ playlists: updated });
        saveObject('user_playlists', updated);
    },

    toggleSpecialPlaylistFavorite: async (id) => {
        const current = get().favoriteSpecialPlaylists;
        const updated = current.includes(id) ? current.filter(f => f !== id) : [...current, id];
        set({ favoriteSpecialPlaylists: updated });
        saveObject('favorite_special_playlists', updated);
    },

    toggleLike: async (song) => {
        const currentLiked = get().likedSongs;
        const isAlreadyLiked = currentLiked.some(s => s.id === song.id);
        const newLikedSongs = isAlreadyLiked
            ? currentLiked.filter(s => s.id !== song.id)
            : [{ ...song, addedToPlaylistAt: Date.now() }, ...currentLiked];
        set({ likedSongs: newLikedSongs });
        saveObject('liked_songs', newLikedSongs);
    },

    addSongsToLiked: async (songsToAdd) => {
        const currentLiked = get().likedSongs;
        const existingIds = new Set(currentLiked.map(s => s.id));
        const newSongs = songsToAdd.filter(s => !existingIds.has(s.id)).map(s => ({ ...s, addedToPlaylistAt: Date.now() }));
        if (newSongs.length === 0) return;
        const updated = [...newSongs, ...currentLiked];
        set({ likedSongs: updated });
        saveObject('liked_songs', updated);
    },

    isLiked: (songId) => get().likedSongs.some(s => s.id === songId),

    toggleFavoriteArtist: async (artistName) => {
        const current = get().favoriteArtists;
        const updated = current.includes(artistName) ? current.filter(a => a !== artistName) : [...current, artistName];
        set({ favoriteArtists: updated });
        saveObject('favorite_artists', updated);
    },

    isFavoriteArtist: (artistName) => get().favoriteArtists.includes(artistName),

    toggleFavoriteAlbum: async (albumName) => {
        const current = get().favoriteAlbums;
        const updated = current.includes(albumName) ? current.filter(a => a !== albumName) : [...current, albumName];
        set({ favoriteAlbums: updated });
        saveObject('favorite_albums', updated);
    },

    isFavoriteAlbum: (albumName) => get().favoriteAlbums.includes(albumName),

    toggleFavoriteGenre: async (genreName) => {
        const current = get().favoriteGenres;
        const updated = current.includes(genreName) ? current.filter(g => g !== genreName) : [...current, genreName];
        set({ favoriteGenres: updated });
        saveObject('favorite_genres', updated);
    },

    isFavoriteGenre: (genreName) => get().favoriteGenres.includes(genreName),

    scanForFolders: async () => {
        set({ loading: true });
        try {
            const permission = await MediaLibrary.getPermissionsAsync();
            if (permission.status !== 'granted') {
                const { status } = await MediaLibrary.requestPermissionsAsync();
                if (status !== 'granted') return [];
            }
            let allAssets: MediaLibrary.Asset[] = [];
            let hasNextPage = true;
            let after: any;
            let pageCount = 0;
            while (hasNextPage && pageCount < 50) {
                const media = await MediaLibrary.getAssetsAsync({ mediaType: MediaLibrary.MediaType.audio, first: 2000, after });
                allAssets.push(...media.assets);
                hasNextPage = media.hasNextPage;
                after = media.endCursor;
                pageCount++;
            }
            const folderSet = new Set<string>();
            allAssets.forEach(asset => {
                const folderName = getRootFolder(asset.uri);
                if (folderName) folderSet.add(folderName);
            });
            return Array.from(folderSet).sort();
        } catch (error) {
            console.error(error);
            Alert.alert('Error scanning folders');
            return [];
        } finally {
            set({ loading: false });
        }
    },

    fetchMusic: async (showProgress = false) => {
        if (get().savedFolders.length > 0) {
            await get().loadSongsFromFolders(get().savedFolders, false, showProgress);
            return;
        }
        set({ songs: [] });
    },

    refreshMetadata: async () => {
        try {
            await databaseService.markIncompleteSongsAsPending();
            await get().loadSongsFromFolders(get().savedFolders, false, true, true);
        } catch (e) {
            console.error("Failed to scan for new music", e);
        }
    },

    incrementPlayCount: async (songId) => {
        const now = Date.now();
        const currentMeta = songMetadataRef[songId] || { playCount: 0, lastPlayed: 0, playHistory: [] };
        const updatedMeta = { ...currentMeta, playCount: (currentMeta.playCount || 0) + 1, lastPlayed: now, playHistory: [...(currentMeta.playHistory || []), now] };
        songMetadataRef[songId] = updatedMeta;
        saveObject('song_metadata', songMetadataRef);

        set(state => {
            // Find song anywhere we can
            let currentSong = songMapRef.get(songId) ||
                state.songs.find(s => s.id === songId) ||
                state.recentlyPlayed.find(s => s.id === songId);

            if (!currentSong) return state;

            const updatedSong = { ...currentSong, ...updatedMeta };
            songMapRef.set(songId, updatedSong); // Update map too

            // Update main songs array for reactive children (like Top Songs)
            const newSongs = state.songs.map(s => s.id === songId ? updatedSong : s);
            const newSortedSongs = state.sortedSongs.map(s => s.id === songId ? updatedSong : s);

            let newRecent = [...state.recentlyPlayed];
            // Remove existing if present to move to top
            const existingIndex = newRecent.findIndex(s => s.id === songId);
            if (existingIndex !== -1) {
                newRecent.splice(existingIndex, 1);
            }
            newRecent.unshift(updatedSong);
            newRecent = newRecent.slice(0, 50); // Keep last 50

            let newTop = state.topArtists;
            if (updatedSong.artist && updatedSong.artist !== 'Unknown Artist') {
                let found = false;
                const updated = state.topArtists.map(a => {
                    if (a.name === updatedSong.artist) {
                        found = true;
                        return { ...a, totalPlays: (a.totalPlays || 0) + 1, score: (a.score || 0) + 4 };
                    }
                    return a;
                });
                if (!found) {
                    updated.push({ name: updatedSong.artist, totalPlays: 1, songCount: 1, score: 4, coverImage: updatedSong.coverImage });
                }
                newTop = updated.sort((a, b) => b.score - a.score).slice(0, 15);
            }

            // Persistence for reliability
            saveObject('cached_recently_played', newRecent);
            saveObject('cached_top_artists', newTop);

            return {
                songs: newSongs,
                sortedSongs: newSortedSongs,
                recentlyPlayed: newRecent,
                topArtists: newTop
            };
        });
    },

    deleteSong: async (song) => {
        try {
            const MusicScanner = require('../../modules/music-scanner').default;
            // filePath may be a content:// URI or a `/storage/...` path
            const filePath = song.uri.startsWith('/') ? song.uri : '';
            await MusicScanner.deleteAudioFileAsync(song.id, filePath);
        } catch (e: any) {
            // Rejection means the native delete failed — stop here
            throw new Error(e?.message || 'Failed to delete file from device');
        }

        // Remove from all in-memory state
        const id = song.id;
        songMapRef.delete(id);
        delete songMetadataRef[id];
        delete customMetadataRef[id];

        set(state => ({
            songs: state.songs.filter(s => s.id !== id),
            sortedSongs: state.sortedSongs.filter(s => s.id !== id),
            likedSongs: state.likedSongs.filter(s => s.id !== id),
            recentlyPlayed: state.recentlyPlayed.filter(s => s.id !== id),
            recentlyAdded: state.recentlyAdded.filter(s => s.id !== id),
            neverPlayed: state.neverPlayed.filter(s => s.id !== id),
            playlists: state.playlists.map(p => ({
                ...p,
                songs: p.songs.filter(s => s.id !== id)
            })),
        }));
    },

    calculateBackgroundStats: () => {
        if (calculationTimeoutRef) clearTimeout(calculationTimeoutRef);
        // @ts-ignore
        calculationTimeoutRef = setTimeout(async () => {
            if (isCalculatingStats) return;
            isCalculatingStats = true;
            try {
                const { songs, syncArtistImages } = get();
                if (songs.length === 0) return;
                let recent = songs.filter(s => {
                    const meta = songMetadataRef[s.id];
                    return meta && meta.lastPlayed > 0;
                }).sort((a, b) => (songMetadataRef[b.id]?.lastPlayed || 0) - (songMetadataRef[a.id]?.lastPlayed || 0));


                // Limit persistence of recently played to 50 items (UI cache only, DB has full history)
                recent = mergeSongData(recent, customMetadataRef, songMetadataRef).slice(0, 50);

                set({ recentlyPlayed: recent });
                saveObject('cached_recently_played', recent);

                await new Promise(r => setTimeout(r, 10));

                const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
                const cutoff = Date.now() - THIRTY_DAYS;
                let addedSorted = [...songs].sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
                let added = addedSorted.filter(s => (s.dateAdded || 0) > cutoff);
                if (added.length < 10) added = addedSorted.slice(0, 50);
                added = mergeSongData(added, customMetadataRef, songMetadataRef);
                set({ recentlyAdded: added });
                saveObject('cached_recently_added', added);
                await new Promise(r => setTimeout(r, 10));

                let never = songs.filter(s => !songMetadataRef[s.id] || songMetadataRef[s.id].playCount === 0).slice(0, 100);
                never = mergeSongData(never, customMetadataRef, songMetadataRef);
                set({ neverPlayed: never });
                saveObject('cached_never_played', never);

                await new Promise(r => setTimeout(r, 10));

                const artistMap = new Map<string, any>();
                songs.forEach(song => {
                    if (!song) return;
                    const meta = songMetadataRef[song.id];
                    const playCount = meta?.playCount || 0;
                    const artistName = song.artist || 'Unknown Artist';
                    const data = artistMap.get(artistName) || { name: artistName, totalPlays: 0, songCount: 0 };
                    data.totalPlays += playCount;
                    data.songCount += 1;
                    if (!data.coverImage && song.coverImage) data.coverImage = song.coverImage;
                    artistMap.set(artistName, data);
                });
                await new Promise(r => setTimeout(r, 10));

                const top = Array.from(artistMap.values()).map(a => ({ ...a, score: (a.totalPlays * 4) + a.songCount }))
                    .sort((a, b) => {
                        if (a.name === 'Unknown Artist') return 1;
                        if (b.name === 'Unknown Artist') return -1;
                        return b.score - a.score;
                    }).slice(0, 10);
                set({ topArtists: top });
                saveObject('cached_top_artists', top);
                syncArtistImages(top.map(a => a.name));
            } finally {
                isCalculatingStats = false;
            }
        }, 3000);
    },

    initLibrary: async () => {
        if (isLibraryInitialized) return;
        isLibraryInitialized = true;

        importService.reset();

        customMetadataRef = getSavedObject('custom_song_metadata', {});
        songMetadataRef = getSavedObject('song_metadata', {});

        set({
            playlists: getSavedObject('user_playlists', []),
            likedSongs: getSavedObject('liked_songs', []),
            favoriteArtists: getSavedObject('favorite_artists', []),
            favoriteAlbums: getSavedObject('favorite_albums', []),
            favoriteGenres: getSavedObject('favorite_genres', []),
            favoriteSpecialPlaylists: getSavedObject('favorite_special_playlists', []),
            artistMetadata: getSavedObject('artist_metadata', {}),
            topArtists: getSavedObject('cached_top_artists', []),
            recentlyPlayed: getSavedObject('cached_recently_played', []),
            recentlyAdded: getSavedObject('cached_recently_added', []),
            neverPlayed: getSavedObject('cached_never_played', [])
        });
        const folderNames = getSavedObject('selected_music_folders', [] as string[]);
        set({ savedFolders: folderNames });
        artistMetadataRef = get().artistMetadata;

        let permission = await MediaLibrary.getPermissionsAsync();
        if (permission.status !== 'granted') {
            permission = await MediaLibrary.requestPermissionsAsync();
        }
        if (permission.status !== 'granted') {
            set({ hasPermission: false, loading: false });
            return;
        }
        set({ hasPermission: true });

        const allCachedSongs = await databaseService.getAllSongs() as Song[];
        const cachedSongs = folderNames.length > 0 ? allCachedSongs.filter(s => s.folder && folderNames.includes(s.folder)) : [];

        if (cachedSongs && cachedSongs.length > 0) {
            const merged = mergeSongData(cachedSongs, customMetadataRef, songMetadataRef);
            if (merged && merged.length > 0) {
                merged.forEach(s => songMapRef.set(s.id, s));

                // Sorting 10k songs once here is much better than in every frame
                const sorted = [...merged].sort((a, b) => (a.title || '').localeCompare(b.title || ''));

                set({
                    songs: merged,
                    sortedSongs: sorted,
                    loading: false
                });
            } else {
                set({ loading: true });
            }
        } else {
            set({ loading: true });
        }

        get().calculateBackgroundStats();

        // Background check for missing metadata/new files
        await databaseService.markIncompleteSongsAsPending().catch(() => { });
        const isQuiet = Array.isArray(cachedSongs) && cachedSongs.length > 0;
        await get().loadSongsFromFolders(folderNames, false, false, false, isQuiet);
    },

}));
