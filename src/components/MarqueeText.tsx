import React from 'react';
import { Text, StyleSheet, View } from 'react-native';

interface MarqueeTextProps {
    text?: string;
    children?: string | string[];
    style?: any;
    containerStyle?: any;
    speed?: number;
    delay?: number;
}

export const MarqueeText = ({
    text,
    children,
    style,
    containerStyle,
}: MarqueeTextProps) => {
    const displayText = text || (typeof children === 'string' ? children : (Array.isArray(children) ? children.join('') : ''));
    
    return (
        <View style={[styles.container, containerStyle]}>
            <Text
                style={[{ width: '100%' }, style]}
                numberOfLines={1}
                ellipsizeMode="tail"
            >
                {displayText}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
});
