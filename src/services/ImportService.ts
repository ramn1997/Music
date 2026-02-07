/**
 * ImportService.ts
 * 
 * ULTRA-FAST music import service:
 * - Instant loading using only MediaLibrary basic data + filename parsing
 * - NO slow file parsing or getAssetInfoAsync during initial import
 * - Complete immediately - album art loads on-demand when viewing songs
 */

import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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
    dateAdded?: number;
    playCount?: number;
    lastPlayed?: number;
    playHistory?: number[];
    addedToPlaylistAt?: number;
    scanStatus?: 'pending' | 'success' | 'failed' | 'cached';
}

export interface ImportProgress {
    phase: 'scanning' | 'loading-cache' | 'complete' | 'cancelled';
    current: number;
    total: number;
    message: string;
    songsLoaded: number;
}

export interface ImportCallbacks {
    onProgress: (progress: ImportProgress) => void;
    onSongsUpdate: (songs: Song[]) => void;
    onComplete: (songs: Song[]) => void;
    onError: (error: Error) => void;
}

// Storage keys
const CACHE_KEY = 'song_data_cache_v4';
const METADATA_KEY = 'song_metadata';

// In-memory album art cache for fast lookups
const albumArtCache = new Map<string, string | null>();

class ImportService {
    private cancelToken: { cancelled: boolean } = { cancelled: false };
    private isImporting = false;
    private enrichmentQueue: { assetId: string; uri: string }[] = [];
    private isEnrichmentRunning = false;
    private onSongEnriched?: (songId: string, coverImage: string) => void;

    /**
     * Set callback for when a song is enriched with album art
     */
    setEnrichmentCallback(callback: (songId: string, coverImage: string) => void) {
        this.onSongEnriched = callback;
    }

    /**
     * Get root folder from URI for filtering
     */
    private getRootFolder(uri: string): string | null {
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
    }

    /**
     * Parse filename for title and artist - INSTANT, no I/O
     */
    private parseFilename(filename: string): { title: string; artist: string } {
        const cleanFilename = filename.replace(/\.[^/.]+$/, "");
        let fallbackTitle = cleanFilename;
        let fallbackArtist = 'Unknown Artist';

        // Remove track numbers at the beginning
        const withoutTrackNum = cleanFilename.replace(/^\d+[.\-\s_]+/, '');

        if (withoutTrackNum.includes(' - ')) {
            const parts = withoutTrackNum.split(' - ');
            fallbackArtist = parts[0].trim();
            fallbackTitle = parts.slice(1).join(' - ').trim();
        } else if (withoutTrackNum.includes('-')) {
            const parts = withoutTrackNum.split('-');
            fallbackArtist = parts[0].trim();
            fallbackTitle = parts.slice(1).join('-').trim();
        } else if (withoutTrackNum.includes('_')) {
            const parts = withoutTrackNum.split('_');
            fallbackArtist = parts[0].trim();
            fallbackTitle = parts.slice(1).join('_').replace(/_/g, ' ').trim();
        } else {
            fallbackTitle = withoutTrackNum;
        }

        fallbackTitle = fallbackTitle || cleanFilename;

        return { title: fallbackTitle, artist: fallbackArtist };
    }

    /**
     * Create a Song object from MediaLibrary asset - INSTANT, no I/O
     */
    private createSongFromAsset(asset: MediaLibrary.Asset, cached?: any, playMeta?: any): Song {
        const { title: parsedTitle, artist: parsedArtist } = this.parseFilename(asset.filename);
        const meta = playMeta || { playCount: 0, lastPlayed: 0, playHistory: [] };

        // Use cached data if available
        if (cached && cached.coverImage) {
            return {
                id: asset.id,
                filename: asset.filename,
                uri: cached.uri || asset.uri,
                duration: asset.duration * 1000,
                title: cached.title || parsedTitle,
                artist: cached.artist || parsedArtist,
                album: cached.album || 'Unknown Album',
                year: cached.year,
                genre: cached.genre,
                albumId: cached.albumId,
                coverImage: cached.coverImage,
                dateAdded: asset.modificationTime * 1000,
                playCount: meta.playCount,
                lastPlayed: meta.lastPlayed,
                playHistory: meta.playHistory,
                scanStatus: 'cached'
            };
        }

        // Create song from basic asset data - NO I/O calls
        return {
            id: asset.id,
            filename: asset.filename,
            uri: asset.uri,
            duration: asset.duration * 1000,
            title: parsedTitle,
            artist: parsedArtist,
            album: 'Unknown Album',
            dateAdded: asset.modificationTime * 1000,
            playCount: meta.playCount,
            lastPlayed: meta.lastPlayed,
            playHistory: meta.playHistory,
            scanStatus: 'pending'
        };
    }

    /**
     * Load cached data from storage
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
            console.error('[ImportService] Failed to load cache:', e);
            return { songCache: {}, metadata: {} };
        }
    }

    /**
     * Save cache to storage
     */
    private async saveCache(songCache: Record<string, any>): Promise<void> {
        try {
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(songCache));
        } catch (e) {
            console.error('[ImportService] Failed to save cache:', e);
        }
    }

    /**
     * Cancel ongoing import
     */
    cancel(): void {
        if (this.isImporting) {
            this.cancelToken.cancelled = true;
        }
    }

    /**
     * Check if an import is in progress
     */
    isImportInProgress(): boolean {
        return this.isImporting;
    }

    /**
     * Get album art for a song on-demand (lazy loading)
     * This is called when the song needs to be displayed with album art
     */
    async getAlbumArt(songId: string, assetUri: string): Promise<string | null> {
        // Check memory cache first
        if (albumArtCache.has(songId)) {
            return albumArtCache.get(songId) || null;
        }

        try {
            // Get asset info to get album ID
            const assets = await MediaLibrary.getAssetsAsync({
                mediaType: MediaLibrary.MediaType.audio,
                first: 1,
            });

            // Find the asset by matching URI patterns
            const allAssets = await MediaLibrary.getAssetsAsync({
                mediaType: MediaLibrary.MediaType.audio,
                first: 20000,
            });

            const asset = allAssets.assets.find(a => a.id === songId);
            if (!asset) return null;

            const info = await MediaLibrary.getAssetInfoAsync(asset);
            const anyInfo = info as any;
            const anyAsset = asset as any;

            const albumIdRaw = anyInfo.albumId || anyAsset.albumId ||
                anyInfo.album_id || anyAsset.album_id;
            const albumId = (albumIdRaw !== undefined && albumIdRaw !== null)
                ? String(albumIdRaw)
                : undefined;

            if (Platform.OS === 'android' && albumId &&
                !['null', 'undefined', '-1', '0'].includes(albumId)) {
                const coverImage = `content://media/external/audio/albums/${albumId}`;
                albumArtCache.set(songId, coverImage);

                // Update persistent cache
                const { songCache } = await this.loadCache();
                songCache[songId] = {
                    ...songCache[songId],
                    albumId,
                    coverImage
                };
                await this.saveCache(songCache);

                return coverImage;
            }

            albumArtCache.set(songId, null);
            return null;
        } catch (e) {
            console.error('[ImportService] Failed to get album art:', e);
            albumArtCache.set(songId, null);
            return null;
        }
    }

    /**
     * Main import function - TRULY INSTANT
     * No getAssetInfoAsync calls - just MediaLibrary.getAssetsAsync + filename parsing
     */
    async importSongs(
        folderNames: string[],
        callbacks: ImportCallbacks
    ): Promise<Song[]> {
        if (this.isImporting) {
            callbacks.onError(new Error('Import already in progress'));
            return [];
        }

        this.isImporting = true;
        this.cancelToken = { cancelled: false };

        try {
            // Phase 1: Scan media library - FAST
            callbacks.onProgress({
                phase: 'scanning',
                current: 0,
                total: 0,
                message: 'Scanning music library...',
                songsLoaded: 0
            });

            const media = await MediaLibrary.getAssetsAsync({
                mediaType: MediaLibrary.MediaType.audio,
                first: 20000,
                sortBy: [MediaLibrary.SortBy.modificationTime]
            });

            if (this.cancelToken.cancelled) {
                callbacks.onProgress({
                    phase: 'cancelled',
                    current: 0,
                    total: 0,
                    message: 'Import cancelled',
                    songsLoaded: 0
                });
                return [];
            }

            // Filter by folders if specified
            const filteredAssets = folderNames && folderNames.length > 0
                ? media.assets.filter(asset => {
                    const assetFolder = this.getRootFolder(asset.uri);
                    return assetFolder && folderNames.includes(assetFolder);
                })
                : media.assets;

            const totalAssets = filteredAssets.length;

            if (totalAssets === 0) {
                callbacks.onProgress({
                    phase: 'complete',
                    current: 0,
                    total: 0,
                    message: 'No songs found',
                    songsLoaded: 0
                });
                callbacks.onComplete([]);
                return [];
            }

            // Phase 2: Load cache and create songs - INSTANT
            callbacks.onProgress({
                phase: 'loading-cache',
                current: 0,
                total: totalAssets,
                message: 'Loading songs...',
                songsLoaded: 0
            });

            const { songCache, metadata } = await this.loadCache();

            // Create ALL songs instantly - NO I/O per song!
            const allSongs: Song[] = [];

            for (let i = 0; i < totalAssets; i++) {
                if (this.cancelToken.cancelled) break;

                const asset = filteredAssets[i];
                const cached = songCache[asset.id];
                const playMeta = metadata[asset.id];

                const song = this.createSongFromAsset(asset, cached, playMeta);
                allSongs.push(song);

                // Update progress every 500 songs for minimal overhead
                if (i % 500 === 0) {
                    callbacks.onProgress({
                        phase: 'loading-cache',
                        current: i,
                        total: totalAssets,
                        message: `Loading ${i + 1} of ${totalAssets} songs...`,
                        songsLoaded: allSongs.length
                    });
                    // Yield to keep UI responsive
                    await new Promise(resolve => setTimeout(resolve, 1));
                }
            }

            if (this.cancelToken.cancelled) {
                callbacks.onProgress({
                    phase: 'cancelled',
                    current: 0,
                    total: 0,
                    message: 'Import cancelled',
                    songsLoaded: allSongs.length
                });
                return allSongs;
            }

            // COMPLETE IMMEDIATELY - No enrichment phase!
            callbacks.onProgress({
                phase: 'complete',
                current: totalAssets,
                total: totalAssets,
                message: `${allSongs.length} songs loaded!`,
                songsLoaded: allSongs.length
            });

            callbacks.onSongsUpdate(allSongs);
            callbacks.onComplete(allSongs);

            return allSongs;

        } catch (error) {
            callbacks.onError(error as Error);
            return [];
        } finally {
            this.isImporting = false;
        }
    }

    /**
     * Clear all cached data (for forced refresh)
     */
    async clearCache(): Promise<void> {
        try {
            await AsyncStorage.removeItem(CACHE_KEY);
            albumArtCache.clear();
        } catch (e) {
            console.error('[ImportService] Failed to clear cache:', e);
        }
    }
}

// Singleton instance
export const importService = new ImportService();
