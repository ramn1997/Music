import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing, withSequence } from 'react-native-reanimated';
import { colors } from '../theme/colors';

interface PlayingIndicatorProps {
    color?: string;
    size?: number;
    barCount?: number;
}

export const PlayingIndicator: React.FC<PlayingIndicatorProps> = ({
    color = colors.primary,
    size = 16,
    barCount = 3
}) => {
    const bars = Array.from({ length: barCount });

    return (
        <View style={[styles.container, { height: size, width: size }]}>
            {bars.map((_, index) => (
                <AnimatedBar key={index} index={index} color={color} />
            ))}
        </View>
    );
};

const AnimatedBar = ({ index, color }: { index: number, color: string }) => {
    const height = useSharedValue(0.3);

    useEffect(() => {
        const delay = index * 200;

        // Randomize initial delay slightly for organic feel
        setTimeout(() => {
            height.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 500 - (index * 50), easing: Easing.linear }),
                    withTiming(0.3, { duration: 500 - (index * 50), easing: Easing.linear })
                ),
                -1,
                true // reverse
            );
        }, delay);
    }, []);

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
