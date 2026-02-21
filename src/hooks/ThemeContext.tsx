import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'green' | 'purple' | 'blue' | 'glass' | 'black' | 'system';

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
