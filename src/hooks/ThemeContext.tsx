import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'water' | 'black' | 'cyber' | 'fire' | 'forest' | 'light' | 'system';

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

    water: {
        background: '#040924',
        primary: '#00b4d8', // Deep sky blue
        secondary: '#0077b6',
        text: '#ffffff',
        textSecondary: '#94a3b8',
        card: 'rgba(30, 41, 59, 0.5)',
        cardBorder: 'rgba(0, 180, 216, 0.2)',
        gradient: ['#0077b6', '#023e8a', '#050505', '#050505'], // Ocean Blue -> Deep Blue -> Black
        gradientLocations: [0, 0.08, 0.3, 1], // Top centered glow like fire
        gradientStart: { x: 0.5, y: 0 },
        gradientEnd: { x: 0.5, y: 1 },
        menuBackground: '#023e8a',
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
        gradient: ['#d4ed31', '#6a7a18', '#050505', '#050505'], // Yellowish Lime -> Dark Olive -> Black
        gradientLocations: [0, 0.05, 0.4, 1], // Concentrated yellowish glow in top-left corner
        gradientStart: { x: 0, y: 0 },
        gradientEnd: { x: 1, y: 1 },
        menuBackground: '#0a0a0c',
        textOnPrimary: '#000000'
    },
    forest: {
        background: '#05120d',
        primary: '#10b981',
        secondary: '#065f46',
        text: '#f0fdf4',
        textSecondary: '#94a3b8',
        card: '#0d1f18',
        cardBorder: '#1a3a2e',
        gradient: ['#10b981', '#064e3b', '#050505', '#050505'], // Emerald -> Forest Green -> Black
        gradientLocations: [0, 0.08, 0.3, 1], // Top centered glow like fire
        gradientStart: { x: 0.5, y: 0 },
        gradientEnd: { x: 0.5, y: 1 },
        menuBackground: '#0d1f18',
        textOnPrimary: '#000000'
    },
    fire: {
        background: '#050505',
        primary: '#cc2900', // Deeper burnt orange/red
        secondary: '#801a00',
        text: '#ffffff',
        textSecondary: '#a1a1aa',
        card: 'rgba(255, 255, 255, 0.04)',
        cardBorder: 'rgba(255, 255, 255, 0.08)',
        gradient: ['#7f1d1d', '#450a0a', '#050505', '#050505'], // Very deep reds
        gradientLocations: [0, 0.08, 0.3, 1],
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



export type PlayerStyle = 'square' | 'circle' | 'sharp';

interface ThemeContextType {
    theme: Theme;
    themeType: ThemeType;
    setThemeType: (type: ThemeType) => void;
    playerStyle: PlayerStyle;
    setPlayerStyle: (style: PlayerStyle) => void;
    isCarouselEnabled: boolean;
    setCarouselEnabled: (enabled: boolean) => void;
    navigationStyle: 'full' | 'pill';
    setNavigationStyle: (style: 'full' | 'pill') => void;
    isSwipeEnabled: boolean;
    setSwipeEnabled: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemScheme = useColorScheme();
    const [themeType, setThemeTypeState] = useState<ThemeType>('black');
    const [playerStyle, setPlayerStyleState] = useState<PlayerStyle>('square');
    const [isCarouselEnabled, setIsCarouselEnabledState] = useState<boolean>(false);
    const [isSwipeEnabled, setIsSwipeEnabledState] = useState<boolean>(true);
    const [navigationStyle, setNavigationStyleState] = useState<'full' | 'pill'>('full');

    useEffect(() => {
        const loadTheme = async () => {
            const savedTheme = await AsyncStorage.getItem('appTheme') as ThemeType | 'dark';
            if (savedTheme) {
                if (savedTheme === 'dark') {
                    setThemeTypeState('black');
                } else if (savedTheme === 'system' || Themes[savedTheme as keyof typeof Themes]) {
                    setThemeTypeState(savedTheme as ThemeType);
                } else {
                    // Fallback for renamed/removed themes like 'blue' or 'purple'
                    setThemeTypeState('black');
                }
            }

            const savedStyle = await AsyncStorage.getItem('playerStyle');
            if (savedStyle) {
                setPlayerStyleState(savedStyle as PlayerStyle);
            }

            const savedCarousel = await AsyncStorage.getItem('isCarouselEnabled');
            if (savedCarousel !== null) {
                setIsCarouselEnabledState(savedCarousel === 'true');
            }

            const savedNavStyle = await AsyncStorage.getItem('navigationStyle');
            if (savedNavStyle) {
                setNavigationStyleState(savedNavStyle as 'full' | 'pill');
            }
            const savedSwipe = await AsyncStorage.getItem('isSwipeEnabled');
            if (savedSwipe !== null) {
                setIsSwipeEnabledState(savedSwipe === 'true');
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

    const setCarouselEnabled = async (enabled: boolean) => {
        setIsCarouselEnabledState(enabled);
        await AsyncStorage.setItem('isCarouselEnabled', enabled.toString());
    };

    const setNavigationStyle = async (style: 'full' | 'pill') => {
        setNavigationStyleState(style);
        await AsyncStorage.setItem('navigationStyle', style);
    };

    const setSwipeEnabled = async (enabled: boolean) => {
        setIsSwipeEnabledState(enabled);
        await AsyncStorage.setItem('isSwipeEnabled', enabled.toString());
    };

    const getActiveTheme = (): Theme => {
        if (themeType === 'system') {
            return Themes.black;
        }
        return Themes[themeType] || Themes.black; // Fallback to black if theme is missing
    };

    return (
        <ThemeContext.Provider value={{
            theme: getActiveTheme(),
            themeType,
            setThemeType,
            playerStyle,
            setPlayerStyle,
            isCarouselEnabled,
            setCarouselEnabled,
            navigationStyle,
            setNavigationStyle,
            isSwipeEnabled,
            setSwipeEnabled
        }}>
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
