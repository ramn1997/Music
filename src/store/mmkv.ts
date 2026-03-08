import AsyncStorage from '@react-native-async-storage/async-storage';

// Robust persistence fallback for JSI-heavy environments (Reanimated 4 / RN 0.81)
// Bridges the gap when native MMKV fails or JSI isn't ready.
let _memoryCache = new Map<string, any>();
let _persistenceInitialized = false;

const initPersistence = async () => {
    if (_persistenceInitialized) return;
    try {
        const keys = await AsyncStorage.getAllKeys();
        const stores = await AsyncStorage.multiGet(keys);
        stores.forEach(([key, value]) => {
            if (value !== null) {
                _memoryCache.set(key, value);
            }
        });
        _persistenceInitialized = true;
        console.log('[Storage] Hydrated from AsyncStorage');
    } catch (e) {
        console.warn('[Storage] Hydration failed:', e);
    }
};

// Start hydration immediately
initPersistence();

export const storage = {
    set: (key: string, value: any) => {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        _memoryCache.set(key, stringValue);
        // Async background write
        AsyncStorage.setItem(key, stringValue).catch(() => { });
    },
    getString: (key: string) => {
        const val = _memoryCache.get(key);
        if (val === undefined || val === null) return undefined;
        return String(val);
    },
    getNumber: (key: string) => {
        const val = _memoryCache.get(key);
        if (val === undefined || val === null) return undefined;
        return Number(val);
    },
    getBoolean: (key: string) => {
        const val = _memoryCache.get(key);
        if (val === undefined || val === null) return undefined;
        if (typeof val === 'boolean') return val;
        return val === 'true' || val === '1' || val === 1;
    },
    delete: (key: string) => {
        _memoryCache.delete(key);
        AsyncStorage.removeItem(key).catch(() => { });
    },
    getAllKeys: () => Array.from(_memoryCache.keys()),
    contains: (key: string) => _memoryCache.has(key) && _memoryCache.get(key) !== undefined,
};
