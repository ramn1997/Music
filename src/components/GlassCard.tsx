import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '../theme/colors';

interface GlassCardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    contentStyle?: StyleProp<ViewStyle>;
    intensity?: number;
    disableBlur?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    style,
    contentStyle,
    intensity = 20,
    disableBlur
}) => {
    // Disable blur by default on Android for performance
    const shouldDisableBlur = disableBlur ?? (Platform.OS === 'android');

    return (
        <View style={[styles.container, style, shouldDisableBlur && styles.noBlurContainer]}>
            {!shouldDisableBlur && <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} />}
            <View style={[styles.content, contentStyle]}>{children}</View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        overflow: 'hidden',
        borderColor: colors.cardBorder,
        borderWidth: 1,
        backgroundColor: 'transparent',
        position: 'relative',
    },
    content: {
        padding: 16,
        zIndex: 1,
    },
    noBlurContainer: {
        backgroundColor: 'rgba(255,255,255,0.05)', // Very subtle fallback
    }
});
