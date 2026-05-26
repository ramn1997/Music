import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type HomeSection = 'collections' | 'likedSongs' | 'mostlyPlayed' | 'history' | 'topSongs' | 'topAlbums' | 'topArtists' | 'playlists' | 'favorites' | 'madeForYou' | 'dailyMix' | 'yearMix';
 
interface HomeSettingsContextType {
    sectionVisibility: Record<HomeSection, boolean>;
    toggleSectionVisibility: (section: HomeSection) => Promise<void>;
    sectionOrder: HomeSection[];
    updateSectionOrder: (newOrder: HomeSection[]) => Promise<void>;
    resetToDefault: () => Promise<void>;
    isLoadingSettings: boolean;
}
 
const HomeSettingsContext = createContext<HomeSettingsContextType | null>(null);
 
const DEFAULT_VISIBILITY: Record<HomeSection, boolean> = {
    collections: true,
    likedSongs: true,
    mostlyPlayed: true,
    history: true,
    topSongs: true,
    topAlbums: true,
    topArtists: true,
    playlists: true,
    favorites: true,
    madeForYou: true,
    dailyMix: true,
    yearMix: true,
};

const DEFAULT_ORDER: HomeSection[] = [
    'collections',
    'yearMix',
    'dailyMix',
    'favorites',
    'playlists',
    'history',
    'topSongs',
    'topAlbums',
    'topArtists',
];

export const HomeSettingsProvider = ({ children }: { children: ReactNode }) => {
    const [sectionVisibility, setSectionVisibility] = useState<Record<HomeSection, boolean>>(DEFAULT_VISIBILITY);
    const [sectionOrder, setSectionOrder] = useState<HomeSection[]>(DEFAULT_ORDER);
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const savedVisibility = await AsyncStorage.getItem('home_section_visibility');
            if (savedVisibility) {
                setSectionVisibility({ ...DEFAULT_VISIBILITY, ...JSON.parse(savedVisibility) });
            }

            const savedOrder = await AsyncStorage.getItem('home_section_order');
            if (savedOrder) {
                const parsedOrder = JSON.parse(savedOrder) as HomeSection[];
                // Keep only valid sections and maintain default entries for any missing ones
                const validParsed = parsedOrder.filter(s => DEFAULT_ORDER.includes(s));
                const missing = DEFAULT_ORDER.filter(s => !validParsed.includes(s));
                setSectionOrder([...validParsed, ...missing]);
            } else {
                setSectionOrder(DEFAULT_ORDER);
            }
        } catch (e) {
            console.error('Failed to load home section visibility or order settings', e);
        } finally {
            setIsLoadingSettings(false);
        }
    };

    const toggleSectionVisibility = async (section: HomeSection) => {
        setSectionVisibility((prev) => {
            const nextVisibility = { ...prev, [section]: !prev[section] };
            AsyncStorage.setItem('home_section_visibility', JSON.stringify(nextVisibility)).catch(console.error);
            return nextVisibility;
        });
    };

    const updateSectionOrder = async (newOrder: HomeSection[]) => {
        setSectionOrder(newOrder);
        try {
            await AsyncStorage.setItem('home_section_order', JSON.stringify(newOrder));
        } catch (e) {
            console.error('Failed to save home section order', e);
        }
    };

    const resetToDefault = async () => {
        setSectionVisibility(DEFAULT_VISIBILITY);
        setSectionOrder(DEFAULT_ORDER);
        try {
            await AsyncStorage.removeItem('home_section_visibility');
            await AsyncStorage.removeItem('home_section_order');
        } catch (e) {
            console.error('Failed to reset settings', e);
        }
    };

    return (
        <HomeSettingsContext.Provider value={{ 
            sectionVisibility, 
            toggleSectionVisibility, 
            sectionOrder, 
            updateSectionOrder, 
            resetToDefault,
            isLoadingSettings 
        }}>
            {children}
        </HomeSettingsContext.Provider>
    );
};

export const useHomeSettings = () => {
    const context = useContext(HomeSettingsContext);
    if (!context) {
        throw new Error('useHomeSettings must be used within a HomeSettingsProvider');
    }
    return context;
};
