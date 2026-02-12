import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing, withSequence } from 'react-native-reanimated';
import { colors } from '../theme/colors';

interface PlayingIndicatorProps {
    color?: string;
    size?: number;
    barCount?: number;
    isPlaying?: boolean;
}

export const PlayingIndicator: React.FC<PlayingIndicatorProps> = ({
    color = colors.primary,
    size = 16,
    barCount = 3,
    isPlaying = true
}) => {
    const bars = Array.from({ length: barCount });

    return (
        <View style={[styles.container, { height: size, width: size }]}>
            {bars.map((_, index) => (
                <AnimatedBar key={index} index={index} color={color} isPlaying={isPlaying} />
            ))}
        </View>
    );
};

const AnimatedBar = ({ index, color, isPlaying }: { index: number, color: string, isPlaying: boolean }) => {
    const height = useSharedValue(0.3);

    useEffect(() => {
        if (isPlaying) {
            const delay = index * 200;
            // Randomize initial delay slightly for organic feel
            const timer = setTimeout(() => {
                height.value = withRepeat(
                    withSequence(
                        withTiming(1, { duration: 500 - (index * 50), easing: Easing.linear }),
                        withTiming(0.3, { duration: 500 - (index * 50), easing: Easing.linear })
                    ),
                    -1,
                    true // reverse
                );
            }, delay);
            return () => clearTimeout(timer);
        } else {
            // Smoothly go back to baseline when paused
            height.value = withTiming(0.3, { duration: 300 });
        }
    }, [isPlaying]);

    const style = useAnimatedStyle(() => {
        return {
            height: `${height.value * 100}%`,
        };
    });

    return (
        <Animated.View
            style={[
                styles.bar,
                { backgroundColor: color },
                style
            ]}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    bar: {
        width: '25%',
        borderRadius: 2,
    }
});
