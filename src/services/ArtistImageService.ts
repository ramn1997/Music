import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'artist_img_url_';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory cache for the current session to avoid repeated AsyncStorage calls
const memoryCache = new Map<string, string | null>();
const activeRequests = new Map<string, Promise<string | null>>();

// Rate limiting
const MAX_CONCURRENT_REQUESTS = 4;
let requestCount = 0;
const requestQueue: (() => void)[] = [];

const processNext = () => {
    if (requestCount < MAX_CONCURRENT_REQUESTS && requestQueue.length > 0) {
        const next = requestQueue.shift();
        next?.();
    }
};

const fetchWithTimeout = (url: string, timeout = 5000) => {
    return Promise.race([
        fetch(url),
        new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeout)
        )
    ]);
};

export const ArtistImageService = {
    getArtistImage: async (artistName: string): Promise<string | null> => {
        if (!artistName || artistName === 'Unknown Artist') return null;
        const cleanName = artistName.trim();

        // 1. Check Memory Cache
        if (memoryCache.has(cleanName)) {
            return memoryCache.get(cleanName) || null;
        }

        // 2. Check Deduplication (Active Request)
        if (activeRequests.has(cleanName)) {
            return activeRequests.get(cleanName)!;
        }

        // 3. Initiate Request Logic
        const requestPromise = (async () => {
            const cacheKey = `${CACHE_PREFIX}${cleanName}`;

            // Check Persistent Cache
            try {
                const cachedUrl = await AsyncStorage.getItem(cacheKey);
                if (cachedUrl !== null) {
                    const result = cachedUrl === 'null' ? null : cachedUrl;
                    memoryCache.set(cleanName, result);
                    return result;
                }
            } catch (e) { }

            // Fetch from API
            // Wait for slot
            if (requestCount >= MAX_CONCURRENT_REQUESTS) {
                await new Promise<void>(resolve => requestQueue.push(resolve));
            }

            requestCount++;
            try {
                let searchQuery = cleanName;
                // Simple cleanup for better search results
                if (searchQuery.includes('feat.')) searchQuery = searchQuery.split('feat.')[0];
                if (searchQuery.includes('ft.')) searchQuery = searchQuery.split('ft.')[0];
                if (searchQuery.includes('&')) searchQuery = searchQuery.split('&')[0];
                if (searchQuery.includes(',')) searchQuery = searchQuery.split(',')[0];
                searchQuery = searchQuery.trim();

                const response = await fetchWithTimeout(
                    `https://api.deezer.com/search/artist?q=${encodeURIComponent(searchQuery)}&limit=1`,
                    4000
                );

                let imageUrl = null;
                if (response.ok) {
                    const json = await response.json();
                    if (json.data && json.data.length > 0) {
                        const artist = json.data[0];
                        // Prefer medium/big for lists, xl for details. Big is good compromise.
                        imageUrl = artist.picture_big || artist.picture_medium || artist.picture;
                    }
                }

                // Cache result
                memoryCache.set(cleanName, imageUrl);
                await AsyncStorage.setItem(cacheKey, imageUrl || 'null').catch(() => { });

                return imageUrl;
            } catch (e) {
                console.warn(`[ArtistImageService] Failed to fetch for ${cleanName}`);
                return null;
            } finally {
                requestCount--;
                processNext();
                activeRequests.delete(cleanName);
            }
        })();

        activeRequests.set(cleanName, requestPromise);
        return requestPromise;
    },

    clearCache: async () => {
        memoryCache.clear();
        try {
            const keys = await AsyncStorage.getAllKeys();
            const artistKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
            if (artistKeys.length > 0) {
                await AsyncStorage.multiRemove(artistKeys);
            }
        } catch (e) {
            console.error('[ArtistImageService] Failed to clear cache', e);
        }
    }
};
