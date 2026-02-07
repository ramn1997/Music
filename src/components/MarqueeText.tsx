import React from 'react';
import { Text, StyleSheet, View } from 'react-native';

interface MarqueeTextProps {
    text: string;
    style?: any;
    containerStyle?: any;
}

export const MarqueeText = ({
    text,
    style,
    containerStyle,
}: MarqueeTextProps) => {
    return (
        <View style={[styles.container, containerStyle]}>
            <Text
                style={[{ width: '100%' }, style]}
                numberOfLines={1}
                ellipsizeMode="tail"
            >
                {text}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
});
