import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLibrarySync } from '../hooks/useLibrarySync';

export const SyncProgressBar = () => {
    const { progress, isSyncing, total, processed } = useLibrarySync();

    if (!isSyncing || total === 0) return null;

    return (
        <View style={styles.container}>
            <View style={[styles.bar, { width: `${progress}%` }]} />
            <Text style={styles.text}>
                Optimizing Library: {progress}% ({processed}/{total})
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 24,
        backgroundColor: '#e0e0e0',
        width: '100%',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    bar: {
        height: '100%',
        backgroundColor: '#2196F3', // Professional blue
        position: 'absolute',
    },
    text: {
        fontSize: 11,
        textAlign: 'center',
        fontWeight: 'bold',
        color: '#000',
        zIndex: 1, // Ensure text is visible on top of bar
        textShadowColor: 'rgba(255, 255, 255, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 2,
    }
});
