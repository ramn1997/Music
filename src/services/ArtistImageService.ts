import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'artist_img_url_';
const CACHE_EXPIRY_PREFIX = 'artist_img_expiry_';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

const QUEUE_DELAY = 300; // 300ms delay = ~3 req/sec (safe)
let requestQueue: { name: string; resolve: (url: string | null) => void; }[] = [];
let isProcessingQueue = false;

const processQueue = async () => {
    if (isProcessingQueue || requestQueue.length === 0) return;
    isProcessingQueue = true;

    const { name, resolve } = requestQueue.shift()!;

    try {
        const response = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=1`);
        const json = await response.json();

        let imageUrl = null;
        if (json.data && json.data.length > 0) {
            const artist = json.data[0];
            imageUrl = artist.picture_xl || artist.picture_big || artist.picture_medium || artist.picture;
        }

        // Cache result
        const cleanName = name.trim();
        const cacheKey = `${CACHE_PREFIX}${cleanName}`;
        const expiryKey = `${CACHE_EXPIRY_PREFIX}${cleanName}`;

        await AsyncStorage.setItem(cacheKey, imageUrl || 'null');
        await AsyncStorage.setItem(expiryKey, (Date.now() + CACHE_DURATION).toString());

        resolve(imageUrl);
    } catch (e) {
        console.warn(`[ArtistImageService] Failed to fetch for ${name}`, e);
        resolve(null); // Resolve null on error to unblock UI
    } finally {
        setTimeout(() => {
            isProcessingQueue = false;
            processQueue();
        }, QUEUE_DELAY);
    }
};

export const ArtistImageService = {
    /**
     * Get artist image URL from cache or fetch from Deezer API (Queued)
     */
    getArtistImage: async (artistName: string): Promise<string | null> => {
        if (!artistName || artistName === 'Unknown Artist') return null;

        const cleanName = artistName.trim();
        const cacheKey = `${CACHE_PREFIX}${cleanName}`;

        // 1. Check Cache (Immediate)
        try {
            const cachedUrl = await AsyncStorage.getItem(cacheKey);
            // Ignore expiry for now to speed up UI, trust cache until cleared
            if (cachedUrl) return cachedUrl === 'null' ? null : cachedUrl;
        } catch (e) { }

        // 2. Add to Queue if not cached
        return new Promise((resolve) => {
            requestQueue.push({ name: cleanName, resolve });
            processQueue();
        });
    },

    /**
     * Clear all artist image cache
     */
    clearCache: async () => {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const artistKeys = keys.filter(k => k.startsWith(CACHE_PREFIX) || k.startsWith(CACHE_EXPIRY_PREFIX));
            if (artistKeys.length > 0) {
                await AsyncStorage.multiRemove(artistKeys);
            }
            console.log('[ArtistImageService] Cache cleared');
        } catch (e) {
            console.error('[ArtistImageService] Failed to clear cache', e);
        }
    }
};
