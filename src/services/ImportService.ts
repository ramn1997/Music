/**
 * ImportService.ts
 * 
 * ULTRA-FAST music import service optimized for large libraries:
 * - Instant loading using MediaLibrary data only
 * - Zero file parsing during import
 * - Progressive metadata enhancement using batch MediaLibrary calls
 * - On-demand album art extraction only when needed
 */

import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import MusicInfo from 'expo-music-info-2';
import * as FileSystem from 'expo-file-system/legacy';

import { databaseService } from './DatabaseService';

// Hack for expo-music-info-2 compatibility
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
    onSongsUpdate?: (songs: Song[]) => void;
    onComplete: (songs: Song[]) => void;
    onError: (error: Error) => void;
}

const CACHE_KEY = '@music_cache_v4'; // Kept for legacy cleanup
const albumArtCache = new Map<string, string | null>();

/**
 * Extract root folder from URI
 */
export const getRootFolder = (uri: string): string | null => {
    try {
        const decoded = decodeURIComponent(uri);
        const path = decoded.startsWith('file://') ? decoded.slice(7) : decoded;
        const parts = path.split('/');

        // Handle Android scoped storage paths
        const storageIndex = parts.indexOf('storage');
        const emulatedIndex = parts.indexOf('emulated');

        if (storageIndex !== -1 && emulatedIndex !== -1) {
            const rootIndex = emulatedIndex + 2;
            if (rootIndex < parts.length) {
                const folderName = rootIndex === parts.length - 1 ? "Root" : parts[rootIndex];
                return `Internal > ${folderName}`;
            }
        }

        // Handle external SD cards
        if (storageIndex !== -1 && emulatedIndex === -1) {
            const sdCardIndex = storageIndex + 1;
            if (sdCardIndex < parts.length) {
                const targetIndex = sdCardIndex + 1;
                if (targetIndex < parts.length) {
                    const folderName = targetIndex === parts.length - 1 ? "Root" : parts[targetIndex];
                    return `SD Card > ${folderName}`;
                }
            }
        }

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
    private activeArtExtractions = new Map<string, Promise<string | null>>();

    reset(): void {
        console.log('[ImportService] Resetting service state...');
        this.cancelToken.cancelled = true;
        this.cancelToken = { cancelled: false };
        this.isImporting = false;
        this.isEnhancing = false;
    }

    private parseFilename(filename: string): { title: string; artist: string; album: string } {
        const cleanName = filename.replace(/\.[^/.]+$/, '').replace(/%20/g, ' ').trim();
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

    private async safeGetMusicInfo(uri: string, options: any, songId?: string, fallbackContentUri?: string): Promise<any> {
        try {
            // In Android 11+, localUri (file://) bypasses Scoped Storage for read 
            // operations better than content:// if the library allows it. 
            // expo-music-info-2 uses MediaMetadataRetriever which natively handles both.
            const meta = await getMusicInfoAsync(uri, options);
            if (meta) return meta;
            return null;
        } catch (e) {
            // If the native retriever fails, 99% of the time the file has corrupt 
            // or totally missing ID3 headers. Copying it to cache won't fix it.
            return null;
        }
    }

    public getRootFolder(uri: string): string | null {
        return getRootFolder(uri);
    }

    private createSongFromAsset(asset: MediaLibrary.Asset): Song {
        const { title: parsedTitle, artist: parsedArtist, album: parsedAlbum } = this.parseFilename(asset.filename);
        const anyAsset = asset as any;

        const title = anyAsset.title || parsedTitle;
        const artist = anyAsset.artist || parsedArtist;
        const album = anyAsset.album || parsedAlbum;
        const albumId = anyAsset.albumId || anyAsset.album_id;

        return {
            id: asset.id,
            filename: asset.filename,
            uri: asset.uri,
            duration: asset.duration * 1000,
            title,
            artist,
            album,
            year: anyAsset.year,
            albumId,
            coverImage: undefined,
            scanStatus: 'pending',
            folder: this.getRootFolder(asset.uri) || undefined,
            dateAdded: anyAsset.creationTime || Date.now(),
            playCount: 0,
            lastPlayed: 0,
            playHistory: []
        };
    }

    private async startEnhancement(callbacks: ImportCallbacks, forceDeepScan = false) {
        if (this.isEnhancing) return;
        this.isEnhancing = true;

        console.log('[ImportService] Starting background enhancement (Optimized)...');

        let pendingCount = 1;
        let processed = 0;

        // Optimize: Fetch total count once
        const totalSongsToEnhance = await databaseService.getUnenhancedSongsCount();
        const totalSongsInDb = await databaseService.getSongsCount();

        callbacks.onProgress({
            phase: 'enhancing',
            current: 0,
            total: totalSongsToEnhance,
            message: `Enhancing metadata... 0/${totalSongsToEnhance}`,
            songsLoaded: totalSongsInDb
        });

        // Loop until all done
        while (pendingCount > 0 && !this.cancelToken.cancelled) {
            // 1. Fetch a larger batch to work on
            const batch = await databaseService.getUnenhancedSongs(1000) as Song[];

            if (batch.length === 0) break;
            pendingCount = batch.length;

            const processedSongsForDb: Song[] = [];

            // 2. Process batch with limited concurrency (Sequence of chunks)
            // We process larger native chunks to maximize bridge throughput for 2000+ songs
            const CHUNK_SIZE = 100;
            for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
                if (this.cancelToken.cancelled) break;

                const chunk = batch.slice(i, i + CHUNK_SIZE);

                const chunkPromises = chunk.map(async (song) => {
                    try {
                        const info = await MediaLibrary.getAssetInfoAsync(song.id);
                        if (!info) {
                            console.warn(`[ImportService] Could not get asset info for ${song.filename}`);
                            return;
                        }
                        const anyInfo = info as any;

                        let libTitle = anyInfo.title;
                        let libArtist = anyInfo.artist;
                        let libAlbum = anyInfo.album;
                        let libYear = anyInfo.year;
                        const albumId = anyInfo.albumId || anyInfo.album_id;
                        const targetUri = anyInfo.localUri || song.uri;

                        let systemArtUri = null;
                        if (Platform.OS === 'android' && albumId && !['null', 'undefined', '-1', '0'].includes(String(albumId))) {
                            systemArtUri = `content://media/external/audio/albumart/${albumId}`;
                        }

                        const missingText = !libTitle || !libArtist || libArtist === 'Unknown Artist' || !libAlbum || libAlbum === 'Unknown Album';
                        const missingArt = !systemArtUri;

                        // PRODUCTION FIX: Do NOT force heavy MP3 file extraction just for missing art during background sync.
                        // MusicImage uses `getAlbumArt` which lazily extracts Art when the user actually looks at the song.
                        const needsFileExtraction = forceDeepScan || missingText;
                        let extractedArtUri = null;

                        if (needsFileExtraction) {
                            try {
                                // Add timeout to prevent hanging
                                const extractionPromise = this.safeGetMusicInfo(targetUri, {
                                    title: true,
                                    artist: true,
                                    album: true,
                                    year: true,
                                    picture: missingArt
                                }, song.id, song.uri);

                                const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));

                                const meta = await Promise.race([extractionPromise, timeoutPromise]);

                                if (meta) {
                                    if (meta.title) libTitle = meta.title;
                                    if (meta.artist) libArtist = meta.artist;
                                    if (meta.album) libAlbum = meta.album;
                                    if (meta.year) libYear = meta.year;

                                    if (missingArt && meta.picture?.pictureData) {
                                        let base64Data = meta.picture.pictureData;
                                        if (base64Data.startsWith('data:')) {
                                            base64Data = base64Data.split(',')[1];
                                        }
                                        base64Data = base64Data.replace(/[\r\n]+/g, '');

                                        const cacheDir = FileSystem.cacheDirectory;
                                        const artPath = `${cacheDir}art_${song.id}_v3.jpg`;

                                        await FileSystem.writeAsStringAsync(artPath, base64Data, {
                                            encoding: 'base64'
                                        });
                                        extractedArtUri = artPath;
                                    }
                                }
                            } catch (e) {
                                console.warn(`[ImportService] Extraction failed for ${song.filename}`);
                            }
                        }

                        // Prepare updated song object
                        processedSongsForDb.push({
                            ...song,
                            title: libTitle?.trim() || song.title,
                            artist: libArtist?.trim() || song.artist,
                            album: libAlbum?.trim() || song.album,
                            year: libYear || song.year,
                            coverImage: extractedArtUri || systemArtUri || null,
                            scanStatus: 'enhanced'
                        });

                    } catch (e) {
                        console.warn(`[ImportService] Enhancement processed failed ${song.id}`, e);
                        // Mark enhanced so we don't retry forever
                        processedSongsForDb.push({ ...song, scanStatus: 'enhanced' });
                    }
                });

                await Promise.all(chunkPromises);

                // Yield to the JS thread to prevent UI freezing (reduced for speed)
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            // 3. Batch DB Update (Huge performance win)
            if (processedSongsForDb.length > 0) {
                await databaseService.upsertSongs(processedSongsForDb);
                processed += processedSongsForDb.length;

                // Notify UI of the newly enhanced batch
                if (callbacks.onSongsUpdate) {
                    callbacks.onSongsUpdate(processedSongsForDb);
                }
            }

            // 4. Update Progress
            callbacks.onProgress({
                phase: 'enhancing',
                current: processed,
                total: totalSongsToEnhance,
                message: `Enhancing... ${processed}/${totalSongsToEnhance}`,
                songsLoaded: totalSongsInDb
            });

            // Yield longer between batches (reduced for speed)
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        this.isEnhancing = false;

        // Final completion notification
        const finalStats = await databaseService.getSyncStatus();
        callbacks.onProgress({
            phase: 'complete',
            current: finalStats.processed,
            total: finalStats.total,
            message: 'Enhancement complete',
            songsLoaded: finalStats.total
        });

        console.log('[ImportService] Enhancement complete!');
    }

    async getAlbumArt(songId: string, assetUri: string, forceExtract = false): Promise<string | null> {
        if (!songId) return null;

        // Check memory cache
        if (!forceExtract && albumArtCache.has(songId)) {
            const cached = albumArtCache.get(songId);
            if (cached) return cached;
        }

        // Deduplicate simultaneous requests for the exact same song's album art
        const cacheKey = `${songId}_${forceExtract ? 'force' : 'normal'}`;
        if (this.activeArtExtractions.has(cacheKey)) {
            return this.activeArtExtractions.get(cacheKey)!;
        }

        const extractionPromise = (async () => {
            try {
                // 1. Check DB first (fastest persistent source)
                const songFromDb = await databaseService.getSongById(songId);
                if (songFromDb?.coverImage && !forceExtract) {
                    const uri = songFromDb.coverImage;
                    albumArtCache.set(songId, uri);
                    return uri;
                }

                // 2. Fallback to System (Android) - Lazy lookup
                if (Platform.OS === 'android') {
                    try {
                        const info = await MediaLibrary.getAssetInfoAsync(songId);
                        const anyInfo = info as any;
                        const albumId = anyInfo.albumId || anyInfo.album_id;
                        const targetUri = anyInfo.localUri || assetUri || anyInfo.uri;

                        // Try system art first if not forcing deep extraction
                        if (!forceExtract && albumId && !['null', 'undefined', '-1', '0'].includes(String(albumId))) {
                            const systemUri = `content://media/external/audio/albumart/${albumId}`;
                            albumArtCache.set(songId, systemUri);
                            return systemUri;
                        }

                        // 3. Deep extraction from Metadata (Original Art)
                        // If we are here, either system art failed or we want to force deep extraction
                        const meta = await this.safeGetMusicInfo(targetUri, { picture: true }, songId, assetUri);

                        if (meta?.picture?.pictureData) {
                            let base64Data = meta.picture.pictureData;
                            if (base64Data.startsWith('data:')) {
                                base64Data = base64Data.split(',')[1];
                            }
                            base64Data = base64Data.replace(/[\r\n]+/g, '');

                            const cacheDir = FileSystem.cacheDirectory;
                            const artPath = `${cacheDir}art_${songId}_v4.jpg`;

                            await FileSystem.writeAsStringAsync(artPath, base64Data, {
                                encoding: 'base64'
                            });

                            albumArtCache.set(songId, artPath);
                            // Store in DB for instant access next time
                            databaseService.updateSong(songId, { coverImage: artPath });

                            return artPath;
                        }

                        // Final fallback to system art if extraction failed
                        if (albumId && !['null', 'undefined', '-1', '0'].includes(String(albumId))) {
                            const systemUri = `content://media/external/audio/albumart/${albumId}`;
                            return systemUri;
                        }
                    } catch (err) {
                        console.warn(`[ImportService] Original art extraction failed for ${songId}`, err);
                    }
                }

                return null;
            } catch (e) {
                return null;
            } finally {
                this.activeArtExtractions.delete(cacheKey);
            }
        })();

        this.activeArtExtractions.set(cacheKey, extractionPromise);
        return extractionPromise;
    }

    async importSongs(
        folderNames: string[],
        callbacks: ImportCallbacks,
        options: { forceDeepScan?: boolean } = {}
    ): Promise<void> {
        if (this.isImporting) {
            console.warn('[ImportService] Import already in progress, resetting...');
            this.reset();
        }

        this.isImporting = true;
        this.cancelToken = { cancelled: false };

        try {
            await databaseService.init(); // Ensure FS DB is loaded

            callbacks.onProgress({
                phase: 'scanning',
                current: 0,
                total: 0,
                message: 'Scanning library indexes...',
                songsLoaded: 0
            });

            let allAssets: any[] = [];
            let hasNextPage = true;
            let after: any;
            let pageCount = 0;

            // 2000 initial limit per safety request, but loop for full library
            while (hasNextPage && !this.cancelToken.cancelled && pageCount < 50) {
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

            if (this.cancelToken.cancelled) {
                this.isImporting = false;
                callbacks.onComplete([]);
                return;
            }

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
                return;
            }
            // Phase 2: Bulk Insert into SQLite
            callbacks.onProgress({
                phase: 'loading',
                current: 0,
                total: total,
                message: `Indexing ${total} songs...`,
                songsLoaded: 0
            });

            // Fetch existing DB songs to preserve metadata
            const existingSongs = await databaseService.getAllSongs() as Song[];
            const existingMap = new Map(existingSongs.map(s => [s.id, s]));

            // Convert to Song objects, preserving DB metadata
            const songs = filteredAssets.map(asset => {
                const fresh = this.createSongFromAsset(asset);
                const existing = existingMap.get(asset.id);

                if (existing) {
                    // Preserve enhanced metadata
                    return {
                        ...fresh, // Update URI/Duration/ModificationTime from system
                        title: existing.scanStatus === 'enhanced' ? existing.title : fresh.title,
                        artist: existing.scanStatus === 'enhanced' ? existing.artist : fresh.artist,
                        album: existing.scanStatus === 'enhanced' ? existing.album : fresh.album,
                        year: existing.scanStatus === 'enhanced' ? existing.year : fresh.year,
                        coverImage: existing.coverImage,
                        scanStatus: existing.scanStatus,
                        playCount: existing.playCount,
                        lastPlayed: existing.lastPlayed,
                        playHistory: existing.playHistory,
                        albumId: existing.albumId, // Keep enhanced albumId if any
                        dateAdded: existing.dateAdded || fresh.dateAdded // Preserve original date added
                    };
                }
                return fresh;
            });

            // Upsert into DB (Batch)
            await databaseService.upsertSongs(songs);

            // Start Background Enhancement
            this.startEnhancement(callbacks, options.forceDeepScan).catch(e => {
                console.error('[ImportService] Background enhancement failed', e);
            });

            // Return immediately with the basic list so UI can render
            callbacks.onComplete(songs);
            this.isImporting = false;

        } catch (error) {
            console.error('[ImportService] Import error:', error);
            this.isImporting = false;
            callbacks.onError(error as Error);
        }
    }

    cancel(): void {
        this.reset();
    }

    async clearCache(): Promise<void> {
        await AsyncStorage.removeItem(CACHE_KEY);
        await databaseService.reset();
        albumArtCache.clear();
    }

    isImportInProgress(): boolean {
        return this.isImporting || this.isEnhancing;
    }
}

export const importService = new ImportService();
