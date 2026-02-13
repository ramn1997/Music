/**
 * ImportService.ts
 * 
 * ULTRA-FAST music import service optimized for 1100+ files:
 * - Instant loading using MediaLibrary data only
 * - Zero file parsing during import
 * - Progressive metadata enhancement using batch MediaLibrary calls
 * - On-demand album art extraction only when needed
 */

import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import MusicInfo from 'expo-music-info-2';
import * as FileSystemMain from 'expo-file-system';
// @ts-ignore
import * as FileSystemLegacy from 'expo-file-system/legacy';
const FileSystem = { ...FileSystemMain, ...FileSystemLegacy } as any;

const getMusicInfoAsync = (MusicInfo as any)?.getMusicInfoAsync || MusicInfo;

export interface Song {
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
    dateAdded: number;
    playCount?: number;
    lastPlayed?: number;
    playHistory?: number[]; // Array of timestamps

    // Status tracking
    scanStatus?: 'pending' | 'enhanced' | 'cached';
    folder?: string;
}

export type ImportProgress = {
    phase: 'scanning' | 'loading' | 'enhancing' | 'complete' | 'cancelled';
    current: number;
    total: number;
    message: string;
    songsLoaded: number;
};

export interface ImportCallbacks {
    onProgress: (progress: ImportProgress) => void;
    onSongsUpdate?: (songs: Song[]) => void; // Optional progressive update
    onComplete: (songs: Song[]) => void;
    onError: (error: Error) => void;
}

const CACHE_KEY = '@music_cache_v3';
const METADATA_KEY = '@music_metadata_v2';
const albumArtCache = new Map<string, string | null>();

/**
 * Extract root folder from URI
 * Exported to ensure consistency with UI filtering
 */
export const getRootFolder = (uri: string): string | null => {
    try {
        const decoded = decodeURIComponent(uri);
        const path = decoded.startsWith('file://') ? decoded.slice(7) : decoded;
        const parts = path.split('/');

        // Handle Android scoped storage paths
        // e.g. /storage/emulated/0/Music/Song.mp3
        const storageIndex = parts.indexOf('storage');
        const emulatedIndex = parts.indexOf('emulated');

        if (storageIndex !== -1 && emulatedIndex !== -1) {
            // Usually /storage/emulated/0/...
            const rootIndex = emulatedIndex + 2; // +1 is '0', +2 is the folder
            if (rootIndex < parts.length) {
                const folderName = rootIndex === parts.length - 1 ? "Root" : parts[rootIndex];
                return `Internal > ${folderName}`;
            }
        }

        // Handle external SD cards
        // e.g. /storage/1234-5678/Music/...
        if (storageIndex !== -1 && emulatedIndex === -1) {
            const sdCardIndex = storageIndex + 1;
            if (sdCardIndex < parts.length) {
                // Check if next part mimics an ID
                const targetIndex = sdCardIndex + 1;
                if (targetIndex < parts.length) {
                    const folderName = targetIndex === parts.length - 1 ? "Root" : parts[targetIndex];
                    return `SD Card > ${folderName}`;
                }
            }
        }

        // Fallback for flat paths
        if (parts.length > 2) return `Internal > ${parts[parts.length - 2]}`;
        return 'Internal > Unknown';
    } catch {
        return 'Internal > Error';
    }
};

class ImportService {
    private isImporting = false;
    private isEnhancing = false;
    private cancelToken = { cancelled: false };

    /**
     * Reset service state (useful after app reload)
     */
    reset(): void {
        console.log('[ImportService] Resetting service state...');
        this.isImporting = false;
        this.isEnhancing = false;
        this.cancelToken = { cancelled: false };
    }

    /**
     * Parse metadata from filename
     */
    private parseFilename(filename: string): { title: string; artist: string; album: string } {
        const cleanName = filename.replace(/\.[^/.]+$/, '').replace(/%20/g, ' ').trim();

        // Try standard "Artist - Title" format
        const parts = cleanName.split(/\s*[-–—]\s*/);

        if (parts.length >= 2) {
            return {
                artist: parts[0].trim(),
                title: parts.slice(1).join(' - ').trim(),
                album: 'Unknown Album'
            };
        }

        return {
            title: cleanName,
            artist: 'Unknown Artist',
            album: 'Unknown Album'
        };
    }

    /**
     * Robust metadata fetcher with fallback for Android Content URIs
     */
    private async safeGetMusicInfo(uri: string, options: any, songId?: string, fallbackContentUri?: string): Promise<any> {
        try {
            // First attempt: Direct read usually works for file:// if permitted, or content:// if supported
            const meta = await getMusicInfoAsync(uri, options);
            if (meta) return meta;
            throw new Error('No metadata returned');
        } catch (e) {
            // Failure! likely due to Scoped Storage (Permission Denied on file://)
            // or expo-music-info-2 limitations with content:// streams.

            // Determine which URI to use for the copy-fallback.
            // If the original uri is content://, use it.
            // If the original was file:// (and failed), use the fallbackContentUri (content://).
            const uriToCopy = uri.startsWith('content://') ? uri : (fallbackContentUri?.startsWith('content://') ? fallbackContentUri : null);

            if (uriToCopy) {
                const tempFile = `${FileSystem.cacheDirectory}meta_${songId || Date.now()}_temp.mp3`;
                try {
                    console.log(`[ImportService] Copying ${songId} for metadata enhancement...`);
                    await FileSystem.copyAsync({ from: uriToCopy, to: tempFile });
                    const meta = await getMusicInfoAsync(tempFile, options);
                    // Cleanup
                    await FileSystem.deleteAsync(tempFile, { idempotent: true });
                    return meta;
                } catch (copyError) {
                    console.warn(`[ImportService] Meta-copy fallback failed for ${songId}`, copyError);
                    return null;
                }
            }
            return null;
        }
    }

    /**
     * Extract root folder from URI
     */



    /**
     * Extract root folder from URI
     */
    public getRootFolder(uri: string): string | null {
        return getRootFolder(uri);
    }

    /**
     * Create song from MediaLibrary asset - INSTANT - NO I/O
     * Only uses properties available on the asset object
     */
    private createSongFromAsset(asset: MediaLibrary.Asset, cached?: any, playMeta?: any): Song {
        const { title: parsedTitle, artist: parsedArtist, album: parsedAlbum } = this.parseFilename(asset.filename);
        const meta = playMeta || { playCount: 0, lastPlayed: 0, playHistory: [] };

        // If we have good cached data, use it
        if (cached) {
            return {
                id: asset.id,
                filename: asset.filename,
                uri: cached.uri || asset.uri,
                duration: asset.duration * 1000,
                title: cached.title || parsedTitle,
                artist: cached.artist || parsedArtist,
                album: cached.album || parsedAlbum,
                year: cached.year,
                genre: cached.genre,
                albumId: cached.albumId,
                coverImage: cached.coverImage,
                dateAdded: asset.modificationTime * 1000,
                playCount: meta.playCount,
                lastPlayed: meta.lastPlayed,
                playHistory: meta.playHistory,
                scanStatus: 'cached',
                folder: cached.folder || this.getRootFolder(asset.uri) || undefined
            };
        }

        // Get basic metadata from MediaLibrary
        // Cast to any to access properties that might not be in the strict type definition but are returned by Expo
        const anyAsset = asset as any;
        const title = anyAsset.title || parsedTitle;
        const artist = anyAsset.artist || parsedArtist;
        const album = anyAsset.album || parsedAlbum;
        const year = anyAsset.year;
        const genre = anyAsset.genre;
        const albumId = anyAsset.albumId || anyAsset.album_id;

        // Note: usage of 'pending' status triggers background enhancement
        return {
            id: asset.id,
            filename: asset.filename,
            uri: asset.uri,
            duration: asset.duration * 1000,
            title,
            artist,
            album,
            year,
            genre,
            albumId,
            coverImage: undefined, // Will be resolved during enhancement
            scanStatus: 'pending',
            folder: this.getRootFolder(asset.uri) || undefined,
            dateAdded: asset.modificationTime * 1000,
            playCount: meta.playCount,
            lastPlayed: meta.lastPlayed,
            playHistory: meta.playHistory
        };
    }

    /**
     * Load cached data
     */
    private async loadCache(): Promise<{
        songCache: Record<string, any>;
        metadata: Record<string, any>;
    }> {
        try {
            const [cacheJson, metaJson] = await Promise.all([
                AsyncStorage.getItem(CACHE_KEY),
                AsyncStorage.getItem(METADATA_KEY)
            ]);

            return {
                songCache: cacheJson ? JSON.parse(cacheJson) : {},
                metadata: metaJson ? JSON.parse(metaJson) : {}
            };
        } catch (e) {
            return { songCache: {}, metadata: {} };
        }
    }

    /**
     * Save cache
     */
    private async saveCache(songCache: Record<string, any>): Promise<void> {
        try {
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(songCache));
        } catch (e) {
            console.error('[ImportService] Failed to save cache:', e);
        }
    }

    /**
     * FAST background enhancement using MediaLibrary only
     * No file parsing - just gets proper metadata from MediaLibrary
     */
    private async startEnhancement(songs: Song[], callbacks: ImportCallbacks, forceDeepScan = false) {
        // if (this.isEnhancing) return; // Allow re-entry or assume caller handles it
        this.isEnhancing = true;

        console.log('[ImportService] Starting background enhancement...');

        const { songCache } = await this.loadCache();
        const docDir = FileSystem.documentDirectory;
        console.log(`[ImportService] Starting enhancement. FileSystem initialized: ${!!docDir}`);

        // Filter songs that need enhancement - Metadata OR Art


        const pending = songs.filter(s => {
            const isUnknownArtist = !s.artist ||
                ['Unknown Artist', '<unknown>', 'Unknown', 'unknown'].includes(s.artist);
            const isUnknownAlbum = !s.album ||
                ['Unknown Album', '<unknown>', 'Unknown', 'unknown'].includes(s.album);
            const titleMatchFilename = s.title === s.filename ||
                s.title === s.filename.replace(/\.[^/.]+$/, '');

            const missingMeta = s.scanStatus === 'pending' || isUnknownArtist || isUnknownAlbum || titleMatchFilename;

            // Also check if we are missing art (no coverImage path set)
            const missingArt = !s.coverImage && (!s.scanStatus || s.scanStatus !== 'enhanced');

            return missingMeta || missingArt;
        });

        console.log(`[ImportService] Enhancing ${pending.length} songs (metadata only, art on-demand)...`);

        if (pending.length === 0) {
            this.isEnhancing = false;
            return;
        }

        callbacks.onProgress({
            phase: 'enhancing',
            current: 0,
            total: pending.length,
            message: 'Enhancing metadata...',
            songsLoaded: songs.length
        });

        // Balanced concurrency - selective file I/O only when needed
        const CONCURRENCY = 5;
        const UPDATE_INTERVAL = 10;

        const songIndexMap = new Map(songs.map((s, i) => [s.id, i]));
        const activePromises = new Set<Promise<void>>();
        let processed = 0;
        let resultsBuffer: any[] = [];

        const flushResults = async () => {
            if (resultsBuffer.length === 0) return;

            for (const result of resultsBuffer) {
                if (!result) continue;
                const { song, libTitle, libArtist, libAlbum, libGenre, libYear, albumId, systemArtUri } = result;
                const songIdx = songIndexMap.get(song.id);

                if (songIdx !== undefined) {
                    const updated: Song = {
                        ...songs[songIdx],
                        title: libTitle?.trim() || songs[songIdx].title,
                        artist: libArtist?.trim() || songs[songIdx].artist,
                        album: libAlbum?.trim() || songs[songIdx].album,
                        year: libYear?.toString() || songs[songIdx].year,
                        genre: libGenre?.trim(),
                        albumId: albumId ? String(albumId) : undefined,
                        coverImage: systemArtUri || songs[songIdx].coverImage, // Use system art if available
                        scanStatus: 'enhanced'
                    };
                    songs[songIdx] = updated;
                    songCache[updated.id] = updated;
                }
            }

            if (callbacks.onSongsUpdate) {
                callbacks.onSongsUpdate([...songs]);
            }
            await this.saveCache(songCache);
            resultsBuffer = [];
        };

        for (const song of pending) {
            if (this.cancelToken.cancelled) break;

            const promise = (async () => {
                try {
                    // Read from MediaLibrary first (fast)
                    const info = await MediaLibrary.getAssetInfoAsync(song.id);
                    const anyInfo = info as any;

                    let libTitle = anyInfo.title;
                    let libArtist = anyInfo.artist;
                    let libAlbum = anyInfo.album;
                    let libGenre = anyInfo.genre;
                    let libYear = anyInfo.year;
                    const albumId = anyInfo.albumId || anyInfo.album_id;
                    const targetUri = anyInfo.localUri || song.uri;

                    // Generate system art URI if we have albumId (Android only)
                    let systemArtUri = null;
                    if (Platform.OS === 'android' && albumId && !['null', 'undefined', '-1', '0'].includes(String(albumId))) {
                        systemArtUri = `content://media/external/audio/albumart/${albumId}`;
                    }

                    // Pre-check for existing cached art to avoid re-extraction
                    // ALWAYS check this, even if system art exists, because file cache is higher quality
                    let extractedArtUri = null;
                    const systemCacheDir = FileSystem.documentDirectory;
                    // Non-blocking cache dir check
                    const cacheDir = systemCacheDir ? (systemCacheDir.endsWith('/') ? systemCacheDir : `${systemCacheDir}/`) : null;
                    const embeddedPath = cacheDir ? `${cacheDir}art_${song.id}_v2.jpg` : null;
                    const getFileUri = (path: string) => path.startsWith('file://') ? path : `file://${path}`;

                    try {
                        const fileInfo = await FileSystem.getInfoAsync(embeddedPath);
                        if (fileInfo.exists) {
                            extractedArtUri = getFileUri(embeddedPath);
                        }
                    } catch (e) { }

                    // Check if we need to scan file for metadata OR art (if no system art and no cache)
                    // If systemArtUri is present, we trust it for art, so only check text metadata
                    const missingText = !libTitle || !libArtist || libArtist === 'Unknown Artist' || !libAlbum || libAlbum === 'Unknown Album';
                    const missingArt = !systemArtUri && !extractedArtUri;

                    // If forcing deep scan, we ignore system art/media library data and go straight to file
                    const needsFileExtraction = forceDeepScan || missingText || missingArt;
                    const shouldExtractArt = forceDeepScan || missingArt;

                    if (needsFileExtraction) {
                        try {
                            // Request picture only if we actually miss art
                            const meta = await this.safeGetMusicInfo(targetUri, {
                                title: true,
                                artist: true,
                                album: true,
                                genre: true,
                                year: true,
                                picture: shouldExtractArt // Extract picture if we don't have it or forcing
                            }, song.id, song.uri); // Pass song.uri (content://) as fallback

                            if (meta) {
                                if (meta.title) libTitle = meta.title;
                                if (meta.artist) libArtist = meta.artist;
                                if (meta.album) libAlbum = meta.album;
                                if (meta.genre) libGenre = meta.genre;
                                if (meta.year) libYear = meta.year;

                                // Handle Picture logic
                                if (shouldExtractArt && meta.picture?.pictureData && embeddedPath) {
                                    let base64Data = meta.picture.pictureData;
                                    if (base64Data.startsWith('data:')) {
                                        const commaIndex = base64Data.indexOf(',');
                                        if (commaIndex !== -1) base64Data = base64Data.substring(commaIndex + 1);
                                    }
                                    base64Data = base64Data.replace(/[\r\n]+/g, '');

                                    await FileSystem.writeAsStringAsync(embeddedPath, base64Data, {
                                        encoding: 'base64'
                                    });
                                    extractedArtUri = getFileUri(embeddedPath);

                                    // Populate cache map so subsequent getAlbumArt calls are instant
                                    albumArtCache.set(song.id, extractedArtUri);
                                }
                            }
                        } catch (e) {
                            console.warn(`[ImportService] File extraction failed for ${song.filename}`);
                        }
                    }

                    resultsBuffer.push({ song, libTitle, libArtist, libAlbum, libGenre, libYear, albumId, systemArtUri: extractedArtUri || systemArtUri });
                } catch (e) {
                    console.warn(`[ImportService] Enhancement failed for ${song.filename}`);
                } finally {
                    processed++;

                    if (processed % 5 === 0) {
                        callbacks.onProgress({
                            phase: 'enhancing',
                            current: processed,
                            total: pending.length,
                            message: `Enhancing metadata... ${processed}/${pending.length}`,
                            songsLoaded: songs.length
                        });
                    }

                    if (processed % UPDATE_INTERVAL === 0) {
                        await flushResults();
                    }
                }
            })();

            activePromises.add(promise);
            promise.then(() => activePromises.delete(promise));

            if (activePromises.size >= CONCURRENCY) {
                await Promise.race(activePromises);
            }
        }

        await Promise.all(activePromises);
        await flushResults();
        this.isEnhancing = false;

        callbacks.onProgress({
            phase: 'complete',
            current: pending.length,
            total: pending.length,
            message: 'Enhancement complete',
            songsLoaded: songs.length
        });

        console.log('[ImportService] Enhancement complete!');
    }

    /**
     * Get album art on-demand (lazy loading)
     */
    async getAlbumArt(songId: string, assetUri: string, forceExtract = false): Promise<string | null> {
        if (!songId) return null;

        if (!forceExtract && albumArtCache.has(songId)) {
            const cached = albumArtCache.get(songId);
            // Verify it still exists if it's a file
            if (cached) {
                if (cached.startsWith('file://') || cached.startsWith('/')) {
                    const info = await FileSystem.getInfoAsync(cached);
                    if (info.exists) return cached;
                    else albumArtCache.delete(songId); // Invalid cache
                } else {
                    return cached; // content:// or http://
                }
            }
        }

        try {
            const info = await MediaLibrary.getAssetInfoAsync(songId);
            if (!info) return null;

            const anyInfo = info as any;
            const albumId = anyInfo.albumId || anyInfo.album_id;
            const localUri = anyInfo.localUri || info.uri || assetUri;

            // 1. Check embedded art cache (High Quality) - Check this first!
            // If we have extracted art previously, it is likely better than system art
            const systemCacheDir = FileSystem.documentDirectory;
            // Non-blocking check
            const cacheDir = systemCacheDir ? (systemCacheDir.endsWith('/') ? systemCacheDir : `${systemCacheDir}/`) : null;
            const embeddedPath = cacheDir ? `${cacheDir}art_${songId}_v2.jpg` : null; // Versioned

            // Helper to get consistent URI
            const getFileUri = (path: string) => path.startsWith('file://') ? path : `file://${path}`;

            // Check if file exists (unless forcing re-extraction)
            if (!forceExtract && embeddedPath) {
                try {
                    const fileInfo = await FileSystem.getInfoAsync(embeddedPath);
                    if (fileInfo.exists) {
                        const uri = getFileUri(embeddedPath);
                        albumArtCache.set(songId, uri);
                        return uri; // Return high-res cached art
                    }
                } catch (e) { }
            }

            // 2. Android System Art (Fast, but maybe blurry)
            if (!forceExtract && Platform.OS === 'android' && albumId && !['null', 'undefined', '-1', '0'].includes(String(albumId))) {
                const uri = `content://media/external/audio/albumart/${albumId}`;
                return uri;
            }

            // 3. Extract from file (Slowest) - only if actually needed
            // Only proceed if we have a valid path to save to
            if (embeddedPath) {
                try {
                    // Explicitly request ONLY the picture to save memory
                    const metadata = await this.safeGetMusicInfo(localUri, {
                        title: false,
                        picture: true
                    }, songId, assetUri); // Pass assetUri (likely content://) as fallback

                    if (metadata?.picture?.pictureData) {
                        let base64Data = metadata.picture.pictureData;

                        // Sanitize base64 string if it contains data URI prefix
                        if (base64Data.startsWith('data:')) {
                            const commaIndex = base64Data.indexOf(',');
                            if (commaIndex !== -1) {
                                base64Data = base64Data.substring(commaIndex + 1);
                            }
                        }
                        // Remove newlines just in case
                        base64Data = base64Data.replace(/[\r\n]+/g, '');

                        await FileSystem.writeAsStringAsync(embeddedPath, base64Data, {
                            encoding: 'base64'
                        });

                        const uri = getFileUri(embeddedPath);
                        albumArtCache.set(songId, uri);
                        console.log(`[ImportService] Extracted art for ${songId}: ${uri}`);
                        return uri;
                    } else {
                        console.log(`[ImportService] No embedded art found for ${songId}`);
                        return null;
                    }
                } catch (e: any) {
                    console.warn(`[ImportService] Extraction failed for ${songId}:`, e.message);
                }
            }

            albumArtCache.set(songId, null);
            return null;
        } catch (e) {
            albumArtCache.set(songId, null);
            return null;
        }
    }

    /**
     * Main import - INSTANT for any number of files
     */
    async importSongs(
        folderNames: string[],
        callbacks: ImportCallbacks,
        options: { forceDeepScan?: boolean } = {}
    ): Promise<Song[]> {
        if (this.isImporting) {
            console.warn('[ImportService] Import already in progress, resetting...');
            this.reset();
        }

        this.isImporting = true;
        this.cancelToken = { cancelled: false };

        try {
            // Phase 1: Scan MediaLibrary (fast)
            callbacks.onProgress({
                phase: 'scanning',
                current: 0,
                total: 0,
                message: 'Scanning library indexes...',
                songsLoaded: 0
            });

            // Paginated Scan
            let allAssets: any[] = [];
            let hasNextPage = true;
            let after: any;

            let pageCount = 0;
            while (hasNextPage && !this.cancelToken.cancelled && pageCount < 50) {
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

            if (this.cancelToken.cancelled) {
                this.isImporting = false;
                return [];
            }

            // Filter by folders
            const filteredAssets = folderNames && folderNames.length > 0
                ? allAssets.filter(asset => {
                    const folder = this.getRootFolder(asset.uri);
                    return folder && folderNames.includes(folder);
                })
                : allAssets;

            const total = filteredAssets.length;

            if (total === 0) {
                callbacks.onComplete([]);
                this.isImporting = false;
                return [];
            }

            // Phase 2: Create songs INSTANTLY (no I/O per song)
            callbacks.onProgress({
                phase: 'loading',
                current: 0,
                total: total,
                message: `Loading ${total} songs...`,
                songsLoaded: 0
            });

            const { songCache, metadata } = await this.loadCache();
            const songs: Song[] = [];

            // Simple map, no promises needed as createSongFromAsset is now synchronous
            for (const asset of filteredAssets) {
                const cached = songCache[asset.id];
                const playMeta = metadata[asset.id];
                songs.push(this.createSongFromAsset(asset, cached, playMeta));
            }

            // Save basic cache
            const finalCache: Record<string, any> = {};
            songs.forEach(song => {
                finalCache[song.id] = song;
            });
            await this.saveCache({ ...songCache, ...finalCache });

            // Phase 3: Blocking Enhancement
            // Wait for full metadata + artwork extraction BEFORE showing the list
            callbacks.onProgress({
                phase: 'enhancing',
                current: 0,
                total: total,
                message: `Enhancing metadata... 0/${total}`,
                songsLoaded: total
            });

            await this.startEnhancement(songs, callbacks, options.forceDeepScan);

            // Save enhanced cache
            const enhancedCache: Record<string, any> = {};
            songs.forEach(song => {
                enhancedCache[song.id] = song;
            });
            await this.saveCache({ ...songCache, ...enhancedCache });

            callbacks.onProgress({
                phase: 'complete',
                current: total,
                total: total,
                message: `Imported ${total} songs`,
                songsLoaded: total
            });

            callbacks.onComplete(songs);
            this.isImporting = false;

            return songs;

        } catch (error) {
            console.error('[ImportService] Import error:', error);
            this.isImporting = false;
            callbacks.onError(error as Error);
            return [];
        }
    }

    /**
     * Cancel import
     */
    cancel(): void {
        this.reset();
    }

    /**
     * Clear cache
     */
    async clearCache(): Promise<void> {
        await AsyncStorage.removeItem(CACHE_KEY);
        albumArtCache.clear();
    }

    isImportInProgress(): boolean {
        return this.isImporting || this.isEnhancing;
    }
}

export const importService = new ImportService();
