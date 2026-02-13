import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'dark' | 'green' | 'purple' | 'blue' | 'glass' | 'black' | 'system';

interface Theme {
    background: string;
    primary: string;
    secondary: string;
    text: string;
    textSecondary: string;
    card: string;
    cardBorder: string;
    gradient: string[];
    menuBackground: string;
    textOnPrimary: string;
}

const Themes: Record<Exclude<ThemeType, 'system'>, Theme> = {
    dark: {
        background: '#050505',
        primary: '#8b5cf6',
        secondary: '#ec4899',
        text: '#ffffff',
        textSecondary: '#a1a1aa',
        card: 'rgba(255, 255, 255, 0.05)',
        cardBorder: 'rgba(255, 255, 255, 0.1)',
        gradient: ['#050505', '#1a0b2e'],
        menuBackground: '#1F1F1F',
        textOnPrimary: '#ffffff'
    },
    purple: {
        background: '#1a0b2e',
        primary: '#d8b4fe',
        secondary: '#f472b6',
        text: '#ffffff',
        textSecondary: '#c084fc',
        card: 'rgba(139, 92, 246, 0.1)',
        cardBorder: 'rgba(139, 92, 246, 0.2)',
        gradient: ['#2e1065', '#1a0b2e'],
        menuBackground: '#2E1065',
        textOnPrimary: '#000000'
    },
    blue: {
        background: '#020617',
        primary: '#38bdf8',
        secondary: '#818cf8',
        text: '#ffffff',
        textSecondary: '#94a3b8',
        card: 'rgba(30, 41, 59, 0.5)',
        cardBorder: 'rgba(56, 189, 248, 0.2)',
        gradient: ['#0f172a', '#020617'],
        menuBackground: '#1E293B',
        textOnPrimary: '#000000'
    },
    glass: {
        background: '#000000',
        primary: '#ffffff',
        secondary: '#a1a1aa',
        text: '#ffffff',
        textSecondary: '#d1d5db',
        card: 'rgba(255, 255, 255, 0.1)',
        cardBorder: 'rgba(255, 255, 255, 0.2)',
        gradient: ['#000000', '#111827'],
        menuBackground: '#1F2937',
        textOnPrimary: '#000000'
    },
    black: {
        background: '#000000',
        primary: '#ffffff',
        secondary: '#525252',
        text: '#ffffff',
        textSecondary: '#a3a3a3',
        card: '#121212', // Solid dark grey card for OLED contrast
        cardBorder: '#262626',
        gradient: ['#000000', '#000000'],
        menuBackground: '#000000',
        textOnPrimary: '#000000'
    },
    green: {
        background: '#022c22', // Deep forest green
        primary: '#4ade80', // bright green for accents
        secondary: '#10b981', // emerald green
        text: '#ecfccb', // light lime/cream text
        textSecondary: '#a7f3d0', // soft mint text
        card: '#064e3b', // darker forest card
        cardBorder: '#065f46', // slightly lighter border
        gradient: ['#022c22', '#064e3b'],
        menuBackground: '#064e3b',
        textOnPrimary: '#000000'
    },
};

export type PlayerStyle = 'square' | 'circle' | 'rounded' | 'squircle';

interface ThemeContextType {
    theme: Theme;
    themeType: ThemeType;
    setThemeType: (type: ThemeType) => void;
    playerStyle: PlayerStyle;
    setPlayerStyle: (style: PlayerStyle) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemScheme = useColorScheme();
    const [themeType, setThemeTypeState] = useState<ThemeType>('dark');
    const [playerStyle, setPlayerStyleState] = useState<PlayerStyle>('rounded');

    useEffect(() => {
        const loadTheme = async () => {
            const savedTheme = await AsyncStorage.getItem('appTheme');
            if (savedTheme) {
                setThemeTypeState(savedTheme as ThemeType);
            }

            const savedStyle = await AsyncStorage.getItem('playerStyle');
            if (savedStyle) {
                setPlayerStyleState(savedStyle as PlayerStyle);
            }
        };
        loadTheme();
    }, []);

    const setThemeType = async (type: ThemeType) => {
        setThemeTypeState(type);
        await AsyncStorage.setItem('appTheme', type);
    };

    const setPlayerStyle = async (style: PlayerStyle) => {
        setPlayerStyleState(style);
        await AsyncStorage.setItem('playerStyle', style);
    };

    const getActiveTheme = (): Theme => {
        if (themeType === 'system') {
            return Themes.dark;
        }
        return Themes[themeType];
    };

    return (
        <ThemeContext.Provider value={{ theme: getActiveTheme(), themeType, setThemeType, playerStyle, setPlayerStyle }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
