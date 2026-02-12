import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

import { useTheme } from '../hooks/ThemeContext';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    Easing
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { useEffect } from 'react';

interface ScreenContainerProps {
    children: React.ReactNode;
    variant?: 'default' | 'player' | 'settings';
    style?: ViewStyle;
}

export const ScreenContainer = ({ children, variant = 'default', style }: ScreenContainerProps) => {
    const { theme } = useTheme();
    let gradientColors = theme.gradient;

    if (variant === 'player') {
        gradientColors = theme.gradient;
    }

    const isFocused = useIsFocused();
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(10);

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
            colors={gradientColors as any}
            style={[styles.container, style]}
        >
            <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
                <Animated.View style={animatedStyle}>
                    {children}
                </Animated.View>
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
