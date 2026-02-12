import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/ThemeContext';
import { useMusicLibrary } from '../hooks/MusicLibraryContext';

export const CompactImportProgress = () => {
    const { theme } = useTheme();
    const { importProgress, cancelImport } = useMusicLibrary();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (importProgress) {
            setIsVisible(true);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true
            }).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true
            }).start(() => setIsVisible(false));
        }
    }, [importProgress]);

    if (!isVisible) return null;

    const progress = importProgress ? (importProgress.total > 0 ? importProgress.current / importProgress.total : 0) : 0;
    const isComplete = importProgress ? (importProgress.phase === 'complete' || importProgress.phase === 'cancelled') : false;

    return (
        <Animated.View style={[styles.container, {
            backgroundColor: theme.background, // Solid background
            borderColor: theme.cardBorder,
            opacity: fadeAnim,
            borderWidth: 1 // Ensure visibility
        }]}>
            <View style={styles.content}>
                <View style={[styles.iconBox, { backgroundColor: theme.primary + '20' }]}>
                    <Ionicons
                        name={importProgress?.phase === 'enhancing' ? 'sparkles' : 'sync'}
                        size={20}
                        color={theme.primary}
                    />
                </View>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={[styles.title, { color: theme.text, flex: 1, marginBottom: 0 }]} numberOfLines={1}>
                            {importProgress?.message || 'Processing...'}
                        </Text>
                        {importProgress && importProgress.total > 0 && (
                            <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600', marginLeft: 8 }}>
                                {importProgress.current} / {importProgress.total}
                            </Text>
                        )}
                    </View>
                    <View style={[styles.progressBarBg, { backgroundColor: theme.card }]}>
                        <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: theme.primary }]} />
                    </View>
                </View>
                {!isComplete && (
                    <TouchableOpacity onPress={cancelImport} style={styles.cancelBtn}>
                        <Ionicons name="close-circle" size={24} color={theme.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 15,
        borderRadius: 16,
        padding: 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
    },
    progressBarBg: {
        height: 4,
        borderRadius: 2,
        width: '100%',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    cancelBtn: {
        padding: 4,
    }
});
