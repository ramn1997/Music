import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'dark' | 'purple' | 'blue' | 'glass' | 'system';

interface Theme {
    background: string;
    primary: string;
    secondary: string;
    text: string;
    textSecondary: string;
    card: string;
    cardBorder: string;
    gradient: string[];
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
        gradient: ['#050505', '#1a0b2e']
    },
    purple: {
        background: '#1a0b2e',
        primary: '#d8b4fe',
        secondary: '#f472b6',
        text: '#ffffff',
        textSecondary: '#c084fc',
        card: 'rgba(139, 92, 246, 0.1)',
        cardBorder: 'rgba(139, 92, 246, 0.2)',
        gradient: ['#2e1065', '#1a0b2e']
    },
    blue: {
        background: '#020617',
        primary: '#38bdf8',
        secondary: '#818cf8',
        text: '#ffffff',
        textSecondary: '#94a3b8',
        card: 'rgba(30, 41, 59, 0.5)',
        cardBorder: 'rgba(56, 189, 248, 0.2)',
        gradient: ['#0f172a', '#020617']
    },
    glass: {
        background: '#000000',
        primary: '#ffffff',
        secondary: '#a1a1aa',
        text: '#ffffff',
        textSecondary: '#d1d5db',
        card: 'rgba(255, 255, 255, 0.1)',
        cardBorder: 'rgba(255, 255, 255, 0.2)',
        gradient: ['#000000', '#111827']
    },
};

interface ThemeContextType {
    theme: Theme;
    themeType: ThemeType;
    setThemeType: (type: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemScheme = useColorScheme();
    const [themeType, setThemeTypeState] = useState<ThemeType>('dark');

    useEffect(() => {
        const loadTheme = async () => {
            const savedTheme = await AsyncStorage.getItem('appTheme');
            if (savedTheme && savedTheme !== 'light') { // Ensure we don't load 'light' logic if saved previously
                setThemeTypeState(savedTheme as ThemeType);
            } else if (savedTheme === 'light') {
                setThemeTypeState('dark');
            }
        };
        loadTheme();
    }, []);

    const setThemeType = async (type: ThemeType) => {
        setThemeTypeState(type);
        await AsyncStorage.setItem('appTheme', type);
    };

    const getActiveTheme = (): Theme => {
        if (themeType === 'system') {
            return Themes.dark;
        }
        return Themes[themeType];
    };

    return (
        <ThemeContext.Provider value={{ theme: getActiveTheme(), themeType, setThemeType }}>
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
