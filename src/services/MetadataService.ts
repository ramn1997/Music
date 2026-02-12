import MusicInfo from 'expo-music-info-2';
// @ts-ignore - Mimic ImportService pattern for compatibility
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';

// Robust import pattern from ImportService
const getMusicInfoAsync = (MusicInfo as any)?.getMusicInfoAsync || MusicInfo;

export interface ScannedMetadata {
    title?: string;
    artist?: string;
    album?: string;
    genre?: string;
    artwork?: string; // Local URI
}

class MetadataService {
    private cache: Map<string, ScannedMetadata> = new Map();
    private artworkCache: Map<string, string> = new Map();

    /**
     * Fetch metadata for a music file.
     * Use this to get reliable ID3 tags (Title, Artist, Album).
     * @param uri Local file URI (file://...) or Content URI (content://...)
     * @param assetId Optional MediaLibrary Asset ID (needed to resolve content:// URIs on Android)
     */
    async fetchMetadata(uri: string, assetId?: string, force: boolean = false): Promise<ScannedMetadata> {
        let lookupUri = uri;

        // Check basic cache first
        if (!force && this.cache.has(uri)) {
            return this.cache.get(uri)!;
        }

        // Logic to resolve Content URIs on Android (often fail with direct file access libs)
        // We prefer 'file://' or actual paths if possible.
        if (uri.startsWith('content://')) {
            if (assetId) {
                try {
                    // Try to get the "localUri" (filesystem path) from MediaLibrary
                    const asset = await MediaLibrary.getAssetInfoAsync(assetId);
                    if (asset && asset.localUri) {
                        lookupUri = asset.localUri;
                    }
                } catch (e) {
                    console.warn('[MetadataService] Failed to resolve content URI', e);
                }
            }
        }

        try {
            // Read ID3 tags
            let metadata;
            try {
                metadata = await getMusicInfoAsync(lookupUri, {
                    title: true,
                    artist: true,
                    album: true,
                    genre: true,
                    picture: false
                });
            } catch (innerError) {
                // Fallback for Android Content URIs
                if (lookupUri.startsWith('content://')) {
                    const tempFile = `${FileSystem.cacheDirectory}meta_resolve_${assetId || Date.now()}.mp3`;
                    try {
                        await FileSystem.copyAsync({ from: lookupUri, to: tempFile });
                        metadata = await getMusicInfoAsync(tempFile, {
                            title: true,
                            artist: true,
                            album: true,
                            genre: true,
                            picture: false
                        });
                        await FileSystem.deleteAsync(tempFile, { idempotent: true });
                    } catch (copyError) {
                        console.warn('[MetadataService] Fallback copy failed', copyError);
                    }
                }
            }

            const result: ScannedMetadata = {
                title: metadata?.title || undefined,
                artist: metadata?.artist || undefined,
                album: metadata?.album || undefined,
                genre: metadata?.genre || undefined,
            };

            // Cache by original URI to prevent re-resolution
            this.cache.set(uri, result);
            return result;
        } catch (error) {
            console.warn(`[MetadataService] Failed to fetch tags for ${lookupUri}:`, error);
            return {};
        }
    }

    /**
     * Fetch High-Res Artwork specifically.
     * Call this when displaying the full player or if list needs icons.
     * @param uri File URI
     */
    async fetchArtwork(uri: string): Promise<string | null> {
        if (this.artworkCache.has(uri)) {
            return this.artworkCache.get(uri)!;
        }

        try {
            const metadata = await getMusicInfoAsync(uri, {
                title: false,
                picture: true
            });

            if (metadata?.picture?.pictureData) {
                // Determine extension (default to jpg)
                const filename = uri.split('/').pop()?.replace(/\.[^/.]+$/, "") || `art_${Date.now()}`;
                const cachePath = `${FileSystem.cacheDirectory}${filename}_art.jpg`;

                // Write base64 to file
                await FileSystem.writeAsStringAsync(cachePath, metadata.picture.pictureData, {
                    encoding: FileSystem.EncodingType.Base64
                });

                this.artworkCache.set(uri, cachePath);
                return cachePath;
            }
        } catch (error) {
            console.warn(`[MetadataService] Failed to fetch artwork for ${uri}:`, error);
        }

        this.artworkCache.set(uri, ''); // mark as failed/empty
        return null;
    }

    /**
     * Helper to clean up cached artwork if needed
     */
    async clearCache() {
        this.cache.clear();
        this.artworkCache.clear();
    }
}

export const metadataService = new MetadataService();
