import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'purple' | 'blue' | 'glass' | 'black' | 'cyber' | 'fire' | 'green' | 'light' | 'system';

interface Theme {
    background: string;
    primary: string;
    secondary: string;
    text: string;
    textSecondary: string;
    card: string;
    cardBorder: string;
    gradient: string[];
    gradientLocations?: number[];
    gradientStart?: { x: number, y: number };
    gradientEnd?: { x: number, y: number };
    menuBackground: string;
    textOnPrimary: string;
}

const Themes: Record<Exclude<ThemeType, 'system'>, Theme> = {

    purple: {
        background: '#090412', // Almost black with a hint of purple
        primary: '#a855f7', // Muted violet
        secondary: '#6b21a8', // Dark purple
        text: '#faf5ff', // Very light purple text
        textSecondary: '#a78bfa', // Soft purple-slate contrast
        card: '#12091d', // Dark purple-black card
        cardBorder: '#241235',
        gradient: ['#090412', '#12091d'],
        menuBackground: '#12091d',
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
    cyber: {
        background: '#050505',
        primary: '#d4ed31', // Reverted to yellowish lime
        secondary: '#a3b822',
        text: '#ffffff',
        textSecondary: '#a1a1aa',
        card: 'rgba(255, 255, 255, 0.04)', // Very slightly transparent
        cardBorder: 'rgba(255, 255, 255, 0.08)',
        gradient: ['#1DB954', '#0d3d1e', '#050505', '#050505'], // Spotify Green -> Dark Forest -> Deep Shadow -> Black
        gradientLocations: [0, 0.05, 0.4, 1], // Concentrated green glow in top-left corner
        gradientStart: { x: 0, y: 0 },
        gradientEnd: { x: 1, y: 1 },
        menuBackground: '#0a0a0c',
        textOnPrimary: '#000000'
    },
    green: {
        background: '#040d0a', // Almost black with a hint of green
        primary: '#10b981', // Muted emerald green
        secondary: '#065f46', // Dark emerald
        text: '#f0fdf4', // Very light mint text
        textSecondary: '#64748b', // Slate-ish contrast
        card: '#0a1a15', // Dark green-black card
        cardBorder: '#142d25',
        gradient: ['#040d0a', '#061a14'],
        menuBackground: '#061a14',
        textOnPrimary: '#000000'
    },
    fire: {
        background: '#050505',
        primary: '#ff5c4d', // Coral-fire red from button
        secondary: '#ff453a',
        text: '#ffffff',
        textSecondary: '#a1a1aa',
        card: 'rgba(255, 255, 255, 0.04)',
        cardBorder: 'rgba(255, 255, 255, 0.08)',
        gradient: ['#b91c1c', '#7f1d1d', '#050505', '#050505'], // Darker Deep Red -> Maroon -> Black
        gradientLocations: [0, 0.08, 0.3, 1], // More concentrated at the top
        gradientStart: { x: 0.5, y: 0 },
        gradientEnd: { x: 0.5, y: 1 },
        menuBackground: '#0a0a0c',
        textOnPrimary: '#000000'
    },
    light: {
        background: '#ffffff',
        primary: '#000000', // Black as highlight color
        secondary: '#d1d5db',
        text: '#000000',
        textSecondary: '#4b5563',
        card: '#f3f4f6',
        cardBorder: '#e5e7eb',
        gradient: ['#ffffff', '#f3f4f6'],
        menuBackground: '#ffffff',
        textOnPrimary: '#ffffff'
    },
};

export type PlayerStyle = 'square' | 'circle' | 'rounded' | 'squircle' | 'sharp' | 'soft';

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
    const [themeType, setThemeTypeState] = useState<ThemeType>('black');
    const [playerStyle, setPlayerStyleState] = useState<PlayerStyle>('rounded');

    useEffect(() => {
        const loadTheme = async () => {
            const savedTheme = await AsyncStorage.getItem('appTheme') as ThemeType | 'dark';
            if (savedTheme) {
                if (savedTheme === 'dark') {
                    setThemeTypeState('black');
                } else {
                    setThemeTypeState(savedTheme as ThemeType);
                }
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
            return Themes.black;
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
