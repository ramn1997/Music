import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import MusicInfo from 'expo-music-info-2';
const getMusicInfo = (MusicInfo as any)?.getMusicInfoAsync || MusicInfo;

import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { Alert, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { importService, ImportProgress as ImportProgressType, getRootFolder } from '../services/ImportService';
import { databaseService } from '../services/DatabaseService';



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
    lyrics?: string;
};

export type Playlist = {
    id: string;
    name: string;
    songs: Song[];
    createdAt: number;
    isSpecial?: boolean; // For "Favorites", "Recently Played"
    isFavorite?: boolean; // User marked as favorite
};

export type ArtistMetadata = {
    coverImage?: string;
    bio?: string;
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
    addSongsToLiked: (songs: Song[]) => Promise<void>;
    isLiked: (songId: string) => boolean;
    playlists: Playlist[];
    createPlaylist: (name: string, initialSongs?: Song[]) => Promise<void>;
    deletePlaylist: (id: string) => Promise<void>;
    togglePlaylistFavorite: (id: string) => Promise<void>;
    addToPlaylist: (playlistId: string, song: Song | Song[]) => Promise<void>;
    removeFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
    renamePlaylist: (id: string, newName: string) => Promise<void>;
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
    topArtists: any[];
    recentlyPlayed: Song[];
    recentlyAdded: Song[];
    neverPlayed: Song[];
    favoriteSpecialPlaylists: string[];
    toggleSpecialPlaylistFavorite: (id: string) => Promise<void>;
    artistMetadata: Record<string, ArtistMetadata>;
    updateArtistMetadata: (artistName: string, updates: Partial<ArtistMetadata>) => Promise<void>;
}

const MusicLibraryContext = createContext<MusicLibraryContextType | null>(null);

export const MusicLibraryProvider = ({ children }: { children: ReactNode }) => {
    // 1. STATE - Declared first to avoid TDZ issues
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasPermission, setHasPermission] = useState<boolean | undefined>(undefined);
    const [likedSongs, setLikedSongs] = useState<Song[]>([]);
    const [favoriteArtists, setFavoriteArtists] = useState<string[]>([]);
    const [favoriteAlbums, setFavoriteAlbums] = useState<string[]>([]);
    const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
    const [importProgress, setImportProgress] = useState<ImportProgressType | null>(null);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [favoriteSpecialPlaylists, setFavoriteSpecialPlaylists] = useState<string[]>([]);
    const [customMetadata, _setCustomMetadata] = useState<Record<string, Partial<Song>>>({});
    const customMetadataRef = useRef<Record<string, Partial<Song>>>({});
    const setCustomMetadata = useCallback((val: Record<string, Partial<Song>> | ((prev: Record<string, Partial<Song>>) => Record<string, Partial<Song>>)) => {
        if (typeof val === 'function') {
            _setCustomMetadata(prev => {
                const next = val(prev);
                customMetadataRef.current = next;
                return next;
            });
        } else {
            customMetadataRef.current = val;
            _setCustomMetadata(val);
        }
    }, []);

    const [songMetadata, _setSongMetadata] = useState<Record<string, { playCount: number, lastPlayed: number, playHistory: number[] }>>({});
    const songMetadataRef = useRef<Record<string, { playCount: number, lastPlayed: number, playHistory: number[] }>>({});
    const setSongMetadata = useCallback((val: Record<string, { playCount: number, lastPlayed: number, playHistory: number[] }> | ((prev: Record<string, { playCount: number, lastPlayed: number, playHistory: number[] }>) => Record<string, { playCount: number, lastPlayed: number, playHistory: number[] }>)) => {
        if (typeof val === 'function') {
            _setSongMetadata(prev => {
                const next = val(prev);
                songMetadataRef.current = next;
                return next;
            });
        } else {
            songMetadataRef.current = val;
            _setSongMetadata(val);
        }
    }, []);

    const [savedFolders, setSavedFolders] = useState<string[]>([]);

    const [topArtists, setTopArtists] = useState<any[]>([]);
    const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
    const [recentlyAdded, setRecentlyAdded] = useState<Song[]>([]);
    const [neverPlayed, setNeverPlayed] = useState<Song[]>([]);
    const calculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [artistMetadata, _setArtistMetadata] = useState<Record<string, ArtistMetadata>>({});
    const artistMetadataRef = useRef<Record<string, ArtistMetadata>>({});
    const setArtistMetadata = useCallback((val: Record<string, ArtistMetadata> | ((prev: Record<string, ArtistMetadata>) => Record<string, ArtistMetadata>)) => {
        if (typeof val === 'function') {
            _setArtistMetadata(prev => {
                const next = val(prev);
                artistMetadataRef.current = next;
                return next;
            });
        } else {
            artistMetadataRef.current = val;
            _setArtistMetadata(val);
        }
    }, []);

    const cancelImport = useCallback(() => {
        importService.cancel();
    }, []);

    // Unified helper to merge all metadata (Custom Edits + Play History)
    const mergeSongData = useCallback((rawSongs: Song[], custom: any, stats: any) => {
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
    }, []);


    // When updating song metadata, update local state too
    const updateSongMetadata = async (songId: string, updates: Partial<Song>) => {
        if (!songId || !updates || typeof updates !== 'object') return;

        const currentCustom = customMetadataRef.current || {};
        const newCustom = { ...currentCustom, [songId]: { ...(currentCustom[songId] || {}), ...updates } };
        setCustomMetadata(newCustom);

        // Then update songs array using unified merge (optimistic)
        setSongs(prevSongs => (prevSongs || []).map(s => {
            if (s && s.id === songId) {
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

    const updateArtistMetadata = async (artistName: string, updates: Partial<ArtistMetadata>) => {
        if (!artistName || !updates || typeof updates !== 'object') return;

        const currentMetadata = artistMetadataRef.current || {};
        const newMetadata = {
            ...currentMetadata,
            [artistName]: { ...(currentMetadata[artistName] || {}), ...updates }
        };
        setArtistMetadata(newMetadata);

        try {
            await AsyncStorage.setItem('artist_metadata', JSON.stringify(newMetadata));
        } catch (e) {
            console.error('Failed to save artist metadata', e);
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

    const updateBufferRef = useRef<{ [id: string]: Song }>({});
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load songs from specific folders (Import flow)
    const loadSongsFromFolders = async (folderNames: string[] | null, saveToStorage = true, showProgress = true, forceDeepScan = false, isQuiet = false) => {
        if (!isQuiet) setLoading(true);

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
                    batch.forEach(b => {
                        updateBufferRef.current[b.id] = { ...b, scanStatus: b.scanStatus as string | undefined } as Song;
                    });

                    if (!updateTimeoutRef.current) {
                        updateTimeoutRef.current = setTimeout(() => {
                            const currentBuffer = updateBufferRef.current;
                            updateBufferRef.current = {};
                            updateTimeoutRef.current = null;

                            const bufferArray = Object.values(currentBuffer);
                            if (bufferArray.length === 0) return;

                            const mergedBatch = mergeSongData(bufferArray, customMetadataRef.current, songMetadataRef.current);
                            const batchMap = new Map(mergedBatch.map(b => [b.id, b]));

                            setSongs(prevSongs => prevSongs.map(s => batchMap.get(s.id) || s));

                            setLikedSongs(prevLiked => {
                                let hasChanges = false;
                                const next = prevLiked.map(s => {
                                    const updated = batchMap.get(s.id);
                                    if (updated) {
                                        hasChanges = true;
                                        return updated;
                                    }
                                    return s;
                                });
                                return hasChanges ? next : prevLiked;
                            });
                        }, 2500); // Flush updates every 2.5s to prevent freezing
                    }
                },
                onComplete: (finalSongs) => {
                    const convertedSongs = finalSongs.map(s => ({
                        ...s,
                        scanStatus: s.scanStatus as string | undefined
                    })) as Song[];
                    // Apply ALL metadata and load songs into app
                    setSongs(mergeSongData(convertedSongs, customMetadataRef.current, songMetadataRef.current));

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
            if (!isQuiet) setLoading(false);
        }
    };

    // Playlists are now initialized in initLibrary


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

    const renamePlaylist = async (id: string, newName: string) => {
        const updated = playlists.map(p => {
            if (p.id === id) {
                return { ...p, name: newName.trim() };
            }
            return p;
        });
        await savePlaylists(updated);
    };

    const toggleSpecialPlaylistFavorite = async (id: string) => {
        const isFav = favoriteSpecialPlaylists.includes(id);
        let updated;
        if (isFav) {
            updated = favoriteSpecialPlaylists.filter(f => f !== id);
        } else {
            updated = [...favoriteSpecialPlaylists, id];
        }
        setFavoriteSpecialPlaylists(updated);
        try {
            await AsyncStorage.setItem('favorite_special_playlists', JSON.stringify(updated));
        } catch (e) {
            console.error("Failed to save favorite special playlists", e);
        }
    };


    // Likes are now initialized in initLibrary


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

    const addSongsToLiked = async (songsToAdd: Song[]) => {
        const existingIds = new Set(likedSongs.map(s => s.id));
        const newSongs = songsToAdd
            .filter(s => !existingIds.has(s.id))
            .map(s => ({ ...s, addedToPlaylistAt: Date.now() }));

        if (newSongs.length === 0) return;

        const updatedLikes = [...newSongs, ...likedSongs];
        setLikedSongs(updatedLikes);
        try {
            await AsyncStorage.setItem('liked_songs', JSON.stringify(updatedLikes));
        } catch (e) {
            console.error("Failed to save liked songs", e);
        }
    };

    // Favorites are now initialized in initLibrary


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


    // Data loading is now consolidated in initLibrary (CORE initialization)


    const isCalculatingStats = useRef(false);

    // Background calculation for heavy stats
    // 2. STATISTICS - Heavy background task
    useEffect(() => {
        if (songs.length === 0) return;
        if (loading) return; // Skip entirely during import/loading

        if (calculationTimeoutRef.current) clearTimeout(calculationTimeoutRef.current);

        calculationTimeoutRef.current = setTimeout(() => {
            if (isCalculatingStats.current) return;
            isCalculatingStats.current = true;

            const calculateStats = async () => {
                const start = Date.now();
                // 1. Calculate Recently Played
                let recent = songs
                    .filter(s => {
                        const meta = songMetadataRef.current[s.id];
                        return meta && meta.lastPlayed > 0;
                    })
                    .sort((a, b) => {
                        const metaA = songMetadataRef.current[a.id];
                        const metaB = songMetadataRef.current[b.id];
                        return (metaB?.lastPlayed || 0) - (metaA?.lastPlayed || 0);
                    })
                    .slice(0, 50);

                recent = mergeSongData(recent, customMetadataRef.current, songMetadataRef.current);

                setRecentlyPlayed(recent);
                AsyncStorage.setItem('cached_recently_played', JSON.stringify(recent)).catch(() => { });

                await new Promise(r => setTimeout(r, 10)); // Yield

                // 2. Calculate Recently Added
                let added = [...songs]
                    .sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0))
                    .slice(0, 50);

                added = mergeSongData(added, customMetadataRef.current, songMetadataRef.current);
                setRecentlyAdded(added);
                AsyncStorage.setItem('cached_recently_added', JSON.stringify(added)).catch(() => { });

                await new Promise(r => setTimeout(r, 10)); // Yield

                // 3. Calculate Never Played
                let never = songs
                    .filter(s => {
                        const meta = songMetadataRef.current[s.id];
                        return !meta || meta.playCount === 0;
                    })
                    .slice(0, 50);

                never = mergeSongData(never, customMetadataRef.current, songMetadataRef.current);
                setNeverPlayed(never);
                AsyncStorage.setItem('cached_never_played', JSON.stringify(never)).catch(() => { });

                await new Promise(r => setTimeout(r, 10)); // Yield

                // 4. Calculate Top Artists (Heavy)
                const artistMap = new Map<string, {
                    name: string,
                    totalPlays: number,
                    songCount: number,
                    coverImage?: string
                }>();

                songs.forEach(song => {
                    if (!song) return;
                    const meta = songMetadataRef.current[song.id];
                    const playCount = meta?.playCount || 0;

                    const artistName = song.artist || 'Unknown Artist';
                    const data = artistMap.get(artistName) || { name: artistName, totalPlays: 0, songCount: 0 };
                    data.totalPlays += playCount;
                    data.songCount += 1;
                    if (!data.coverImage && song.coverImage) data.coverImage = song.coverImage;
                    artistMap.set(artistName, data);
                });

                await new Promise(r => setTimeout(r, 10)); // Yield

                const top = Array.from(artistMap.values())
                    .map(a => ({
                        ...a,
                        score: (a.totalPlays * 4) + a.songCount
                    }))
                    .sort((a, b) => {
                        if (a.name === 'Unknown Artist') return 1;
                        if (b.name === 'Unknown Artist') return -1;
                        return b.score - a.score;
                    })
                    .slice(0, 10);

                setTopArtists(top);
                AsyncStorage.setItem('cached_top_artists', JSON.stringify(top)).catch(() => { });
                console.log(`[MusicLibrary] Background stats took ${Date.now() - start}ms`);
            };

            calculateStats().finally(() => {
                isCalculatingStats.current = false;
            });
        }, 15000);

        return () => {
            if (calculationTimeoutRef.current) clearTimeout(calculationTimeoutRef.current);
        };
    }, [songs, loading]);

    const incrementPlayCount = async (songId: string) => {
        const now = Date.now();
        const currentStats = songMetadataRef.current;
        const currentMeta = currentStats[songId] || { playCount: 0, lastPlayed: 0, playHistory: [] };

        const updatedMeta = {
            ...currentMeta,
            playCount: currentMeta.playCount + 1,
            lastPlayed: now,
            playHistory: [...(currentMeta.playHistory || []), now]
        };

        const newMetadata = { ...currentStats, [songId]: updatedMeta };
        setSongMetadata(newMetadata);

        // DO NOT mutate the main `songs` array for background play ticks! 
        // Calling setSongs here forces every screen in the app to re-evaluate 
        // complex useMemo filters and sorting, crippling background performance.

        // Manually trigger stats calculation to update Recently Played in background
        if (calculationTimeoutRef.current) clearTimeout(calculationTimeoutRef.current);
        calculationTimeoutRef.current = setTimeout(() => {
            let recent = songs
                .filter(s => {
                    const meta = songMetadataRef.current[s.id];
                    return meta && meta.lastPlayed > 0;
                })
                .sort((a, b) => {
                    const metaA = songMetadataRef.current[a.id];
                    const metaB = songMetadataRef.current[b.id];
                    return (metaB?.lastPlayed || 0) - (metaA?.lastPlayed || 0);
                })
                .slice(0, 30);

            recent = mergeSongData(recent, customMetadataRef.current, songMetadataRef.current);
            setRecentlyPlayed(recent);
        }, 3000);

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

                allAssets.push(...media.assets);
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
            // Only scan for newly added tracks, don't wipe existing cache or force full deep scan.
            await loadSongsFromFolders(savedFolders, false, true, false);
        } catch (e) {
            console.error("Failed to scan for new music", e);
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

            // Reset import service
            importService.reset();

            try {
                // 0. Load ALL Persistent Metadata in Parallel (Defensive Consolidate)
                const [
                    savedCustom,
                    savedStats,
                    savedFoldersJson,
                    savedPlaylists,
                    savedLiked,
                    savedFavArtists,
                    savedFavAlbums,
                    savedFavGenres,
                    savedFavSpecial,
                    cachedTop,
                    cachedRecent,
                    cachedAdded,
                    cachedNever,
                    savedArtistMeta
                ] = await Promise.all([
                    AsyncStorage.getItem('custom_song_metadata'),
                    AsyncStorage.getItem('song_metadata'),
                    AsyncStorage.getItem('selected_music_folders'),
                    AsyncStorage.getItem('user_playlists'),
                    AsyncStorage.getItem('liked_songs'),
                    AsyncStorage.getItem('favorite_artists'),
                    AsyncStorage.getItem('favorite_albums'),
                    AsyncStorage.getItem('favorite_genres'),
                    AsyncStorage.getItem('favorite_special_playlists'),
                    AsyncStorage.getItem('cached_top_artists'),
                    AsyncStorage.getItem('cached_recently_played'),
                    AsyncStorage.getItem('cached_recently_added'),
                    AsyncStorage.getItem('cached_never_played'),
                    AsyncStorage.getItem('artist_metadata')
                ]);

                // Safe parsing helpers
                const safeParse = (str: string | null, fallback: any) => {
                    if (!str) return fallback;
                    try {
                        const p = JSON.parse(str);
                        return (p && typeof p === 'object' || Array.isArray(p)) ? p : fallback;
                    } catch { return fallback; }
                };

                loadedCustom = safeParse(savedCustom, {});
                loadedStats = safeParse(savedStats, {});

                setCustomMetadata(loadedCustom);
                setSongMetadata(loadedStats);

                if (savedPlaylists) setPlaylists(safeParse(savedPlaylists, []));
                if (savedLiked) setLikedSongs(safeParse(savedLiked, []));
                if (savedFavArtists) setFavoriteArtists(safeParse(savedFavArtists, []));
                if (savedFavAlbums) setFavoriteAlbums(safeParse(savedFavAlbums, []));
                if (savedFavGenres) setFavoriteGenres(safeParse(savedFavGenres, []));
                if (savedFavSpecial) setFavoriteSpecialPlaylists(safeParse(savedFavSpecial, []));
                if (savedArtistMeta) setArtistMetadata(safeParse(savedArtistMeta, {}));

                // Instant UI lists
                if (cachedTop) setTopArtists(safeParse(cachedTop, []));
                if (cachedRecent) setRecentlyPlayed(safeParse(cachedRecent, []));
                if (cachedAdded) setRecentlyAdded(safeParse(cachedAdded, []));
                if (cachedNever) setNeverPlayed(safeParse(cachedNever, []));

                const folderNames = safeParse(savedFoldersJson, []);
                setSavedFolders(folderNames);

                // 1. Check Permissions
                console.log('[MusicLibrary] Checking permissions...');
                let permission = await MediaLibrary.getPermissionsAsync();
                if (permission.status !== 'granted') {
                    permission = await MediaLibrary.requestPermissionsAsync();
                }

                if (permission.status !== 'granted') {
                    setHasPermission(false);
                    setLoading(false);
                    return;
                }
                setHasPermission(true);


                // 2. Instant Load from DB (Fast-Pass)
                const [cachedSongs] = await Promise.all([
                    databaseService.getAllSongs() as Promise<Song[]>
                ]);

                if (cachedSongs && Array.isArray(cachedSongs) && cachedSongs.length > 0) {
                    console.log(`[MusicLibrary] Instant loading ${cachedSongs.length} songs from DB...`);
                    const merged = mergeSongData(cachedSongs, loadedCustom, loadedStats);
                    if (merged && merged.length > 0) {
                        setSongs(merged);
                        setLoading(false);
                    } else {
                        setLoading(true);
                    }
                } else {
                    // If no songs in DB, we MUST stay in loading state until first sync
                    setLoading(true);
                }

                // 3. Trigger Sync (Quiet if we already have songs)
                const isQuiet = Array.isArray(cachedSongs) && cachedSongs.length > 0;
                await loadSongsFromFolders(folderNames, false, false, false, isQuiet);

            } catch (e: any) {
                console.error('[MusicLibrary] Init Failed', e);
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
        addSongsToLiked,
        isLiked,
        playlists,
        createPlaylist,
        deletePlaylist,
        togglePlaylistFavorite,
        addToPlaylist,
        removeFromPlaylist,
        renamePlaylist,
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
        refreshSongMetadata,
        topArtists,
        recentlyPlayed,
        recentlyAdded,
        neverPlayed,
        favoriteSpecialPlaylists,
        toggleSpecialPlaylistFavorite,
        artistMetadata,
        updateArtistMetadata
    }), [
        songs, loading, hasPermission, fetchMusic, scanForFolders, loadSongsFromFolders,
        refreshMetadata,
        savedFolders, likedSongs, toggleLike, addSongsToLiked, isLiked, playlists, createPlaylist,
        deletePlaylist, togglePlaylistFavorite, addToPlaylist, removeFromPlaylist, renamePlaylist,
        incrementPlayCount, favoriteArtists, toggleFavoriteArtist, isFavoriteArtist,
        favoriteAlbums, toggleFavoriteAlbum, isFavoriteAlbum, favoriteGenres,
        toggleFavoriteGenre, isFavoriteGenre, updateSongMetadata,
        importProgress, cancelImport, refreshSongMetadata,
        topArtists, recentlyPlayed, recentlyAdded, neverPlayed,
        favoriteSpecialPlaylists, toggleSpecialPlaylistFavorite,
        artistMetadata, updateArtistMetadata
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
