import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '../theme/colors';

interface GlassCardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    contentStyle?: StyleProp<ViewStyle>;
    intensity?: number;
    disableBlur?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style, contentStyle, intensity = 20, disableBlur = false }) => {
    return (
        <View style={[styles.container, style, disableBlur && styles.noBlurContainer]}>
            {!disableBlur && <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />}
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
        backgroundColor: colors.card,
        position: 'relative',
    },
    content: {
        padding: 16,
        zIndex: 1,
    },
    noBlurContainer: {
        backgroundColor: '#1e1e1e', // Fallback for no blur
    }
});
