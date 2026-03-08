import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type HomeSection = 'collections' | 'history' | 'topSongs' | 'topArtists' | 'playlists' | 'favorites' | 'madeForYou';

interface HomeSettingsContextType {
    sectionVisibility: Record<HomeSection, boolean>;
    toggleSectionVisibility: (section: HomeSection) => Promise<void>;
    isLoadingSettings: boolean;
}

const HomeSettingsContext = createContext<HomeSettingsContextType | null>(null);

const DEFAULT_VISIBILITY: Record<HomeSection, boolean> = {
    collections: true,
    history: true,
    topSongs: true,
    topArtists: true,
    playlists: true,
    favorites: true,
    madeForYou: true,
};

export const HomeSettingsProvider = ({ children }: { children: ReactNode }) => {
    const [sectionVisibility, setSectionVisibility] = useState<Record<HomeSection, boolean>>(DEFAULT_VISIBILITY);
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const saved = await AsyncStorage.getItem('home_section_visibility');
            if (saved) {
                setSectionVisibility({ ...DEFAULT_VISIBILITY, ...JSON.parse(saved) });
            }
        } catch (e) {
            console.error('Failed to load home section visibility settings', e);
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

    return (
        <HomeSettingsContext.Provider value={{ sectionVisibility, toggleSectionVisibility, isLoadingSettings }}>
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
