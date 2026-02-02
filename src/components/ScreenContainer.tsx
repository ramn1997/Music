import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

import { useTheme } from '../hooks/ThemeContext';

interface ScreenContainerProps {
    children: React.ReactNode;
    variant?: 'default' | 'player' | 'settings';
    style?: ViewStyle;
}

export const ScreenContainer = ({ children, variant = 'default', style }: ScreenContainerProps) => {
    const { theme } = useTheme();
    let gradientColors = theme.gradient;

    if (variant === 'player') {
        gradientColors = [theme.background, '#000'];
    }

    return (
        <LinearGradient
            colors={gradientColors as any}
            style={[styles.container, style]}
        >
            <SafeAreaView style={styles.safeArea}>
                {children}
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
