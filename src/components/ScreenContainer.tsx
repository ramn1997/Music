import React from 'react';
import { StyleSheet, ViewStyle, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/ThemeContext';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withRepeat,
    Easing
} from 'react-native-reanimated';
import { useIsFocused, useNavigationState } from '@react-navigation/native';
import { useEffect } from 'react';

interface ScreenContainerProps {
    children: React.ReactNode;
    variant?: 'default' | 'player' | 'settings';
    style?: ViewStyle;
}

export const ScreenContainer = ({ children, variant = 'default', style }: ScreenContainerProps) => {
    const { theme, themeType } = useTheme();
    let gradientColors = theme.gradient;
    let gradientStart = theme.gradientStart || { x: 0.5, y: 0 };
    let gradientEnd = theme.gradientEnd || { x: 0.5, y: 1 };
    let gradientLocations = theme.gradientLocations;

    // For player variant, we keep the theme gradient but can tweak it if needed
    // Removed hardcoded black to support light theme in player
    if (variant === 'player') {
        // Use theme gradient
    }

    const isFocused = useIsFocused();
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(10);
    
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const isLandscape = windowWidth > windowHeight;
    const currentRouteName = useNavigationState(state =>
        state ? (state.routes[state.index]?.name || null) : null
    );
    const noTabBarScreens = ['Player', 'Settings', 'EditSong', 'Lyrics'];
    const hasSidebars = isLandscape && variant !== 'player' && !noTabBarScreens.includes(currentRouteName || '');

    useEffect(() => {
        if (isFocused) {
            opacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) });
            translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) });
        } else {
            opacity.value = withTiming(0, { duration: 250 });
            translateY.value = withTiming(10, { duration: 250 });
        }
    }, [isFocused]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
        flex: 1
    }));

    return (
        <LinearGradient
            key={themeType}
            colors={gradientColors as any}
            start={gradientStart}
            end={gradientEnd}
            locations={gradientLocations as any}
            style={[styles.container, style]}
        >
            <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
                <View style={{ flex: 1, paddingLeft: hasSidebars ? 108 : 0, paddingRight: 0 }}>
                    {children}
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
});
