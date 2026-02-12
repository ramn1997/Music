/**
 * ImportProgressModal.tsx
 * 
 * A beautiful, animated modal that shows import progress
 * with phase indicators and cancel support.
 */

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Easing,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/ThemeContext';
import { ImportProgress } from '../services/ImportService';

interface ImportProgressModalProps {
    visible: boolean;
    progress: ImportProgress;
    onCancel: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ImportProgressModal: React.FC<ImportProgressModalProps> = ({
    visible,
    progress,
    onCancel
}) => {
    const { theme } = useTheme();

    // Animations
    const spinAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Spinning animation for the icon
    useEffect(() => {
        if (visible && progress.phase !== 'complete' && progress.phase !== 'cancelled') {
            const spin = Animated.loop(
                Animated.timing(spinAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.linear,
                    useNativeDriver: true
                })
            );
            spin.start();
            return () => spin.stop();
        }
    }, [visible, progress.phase]);

    // Progress bar animation
    useEffect(() => {
        const targetProgress = progress.total > 0 ? progress.current / progress.total : 0;
        Animated.timing(progressAnim, {
            toValue: targetProgress,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false
        }).start();
    }, [progress.current, progress.total]);

    // Pulse animation for songs loaded counter
    useEffect(() => {
        if (progress.songsLoaded > 0) {
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 100,
                    useNativeDriver: true
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true
                })
            ]).start();
        }
    }, [progress.songsLoaded]);

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['360deg', '0deg']
    });

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

    const getPhaseIcon = () => {
        switch (progress.phase) {
            case 'scanning':
                return 'search';
            case 'loading':
                return 'flash';
            case 'complete':
                return 'checkmark-circle';
            case 'cancelled':
                return 'close-circle';
            default:
                return 'sync';
        }
    };

    const getPhaseColor = () => {
        switch (progress.phase) {
            case 'scanning':
                return '#6366F1';
            case 'loading':
                return '#22C55E';
            case 'complete':
                return '#10B981';
            case 'cancelled':
                return '#EF4444';
            default:
                return theme.primary;
        }
    };

    const getPhaseTitle = () => {
        switch (progress.phase) {
            case 'scanning':
                return 'Scanning Library';
            case 'loading':
                return 'Loading Songs';
            case 'complete':
                return 'Import Complete!';
            case 'cancelled':
                return 'Import Cancelled';
            default:
                return 'Importing...';
        }
    };

    const isComplete = progress.phase === 'complete' || progress.phase === 'cancelled';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View style={[styles.overlay, { backgroundColor: theme.background }]}>
                <View style={[styles.container, { backgroundColor: theme.card }]}>
                    {/* Header with icon */}
                    <View style={[styles.iconContainer, { backgroundColor: getPhaseColor() + '20' }]}>
                        <Animated.View style={{ transform: isComplete ? [] : [{ rotate: spin }] }}>
                            <Ionicons
                                name={getPhaseIcon() as any}
                                size={40}
                                color={getPhaseColor()}
                            />
                        </Animated.View>
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: theme.text }]}>
                        {getPhaseTitle()}
                    </Text>

                    {/* Progress message */}
                    <Text style={[styles.message, { color: theme.textSecondary }]}>
                        {progress.message}
                    </Text>

                    {/* Progress bar */}
                    {!isComplete && progress.total > 0 && (
                        <View style={styles.progressBarContainer}>
                            <View style={[styles.progressBarBg, { backgroundColor: theme.background }]}>
                                <Animated.View
                                    style={[
                                        styles.progressBarFill,
                                        {
                                            backgroundColor: getPhaseColor(),
                                            width: progressWidth
                                        }
                                    ]}
                                />
                            </View>
                            <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                                {progress.current} / {progress.total}
                            </Text>
                        </View>
                    )}

                    {/* Songs loaded counter */}
                    {progress.songsLoaded > 0 && (
                        <Animated.View
                            style={[
                                styles.songsCounter,
                                {
                                    backgroundColor: theme.primary + '15',
                                    transform: [{ scale: pulseAnim }]
                                }
                            ]}
                        >
                            <Ionicons name="musical-notes" size={20} color={theme.primary} />
                            <Text style={[styles.songsText, { color: theme.primary }]}>
                                {progress.songsLoaded.toLocaleString()} songs loaded
                            </Text>
                        </Animated.View>
                    )}

                    {/* Phase indicators */}
                    {!isComplete && (
                        <View style={styles.phaseIndicators}>
                            <PhaseIndicator
                                label="Scan"
                                active={progress.phase === 'scanning'}
                                complete={['loading', 'enhancing', 'complete'].includes(progress.phase)}
                                theme={theme}
                            />
                            <View style={[styles.phaseConnector, { backgroundColor: theme.textSecondary + '30' }]} />
                            <PhaseIndicator
                                label="Load"
                                active={progress.phase === 'loading'}
                                complete={['enhancing', 'complete'].includes(progress.phase)}
                                theme={theme}
                            />
                            <View style={[styles.phaseConnector, { backgroundColor: theme.textSecondary + '30' }]} />
                            <PhaseIndicator
                                label="Enhance"
                                active={progress.phase === 'enhancing'}
                                complete={progress.phase === 'complete'}
                                theme={theme}
                            />
                        </View>
                    )}

                    {/* Cancel button */}
                    {!isComplete && (
                        <TouchableOpacity
                            style={[styles.cancelButton, { borderColor: theme.textSecondary + '40' }]}
                            onPress={onCancel}
                        >
                            <Ionicons name="close" size={18} color={theme.textSecondary} />
                            <Text style={[styles.cancelText, { color: theme.textSecondary }]}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const PhaseIndicator: React.FC<{
    label: string;
    active: boolean;
    complete: boolean;
    theme: any;
}> = ({ label, active, complete, theme }) => (
    <View style={styles.phaseItem}>
        <View
            style={[
                styles.phaseDot,
                {
                    backgroundColor: complete ? '#22C55E' : active ? theme.primary : theme.textSecondary + '30',
                    transform: [{ scale: active ? 1.2 : 1 }]
                }
            ]}
        >
            {complete && <Ionicons name="checkmark" size={10} color="#fff" />}
        </View>
        <Text
            style={[
                styles.phaseLabel,
                {
                    color: active ? theme.primary : complete ? '#22C55E' : theme.textSecondary,
                    fontWeight: active ? 'bold' : 'normal'
                }
            ]}
        >
            {label}
        </Text>
    </View>
);

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30
    },
    container: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        padding: 30,
        alignItems: 'center'
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center'
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20
    },
    progressBarContainer: {
        width: '100%',
        marginBottom: 16
    },
    progressBarBg: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 6
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4
    },
    progressText: {
        fontSize: 12,
        textAlign: 'center'
    },
    songsCounter: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginBottom: 20,
        gap: 8
    },
    songsText: {
        fontSize: 15,
        fontWeight: '600'
    },
    phaseIndicators: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24
    },
    phaseItem: {
        alignItems: 'center'
    },
    phaseDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4
    },
    phaseConnector: {
        width: 30,
        height: 2,
        marginHorizontal: 6,
        marginBottom: 18
    },
    phaseLabel: {
        fontSize: 11
    },
    actionButtons: {
        alignItems: 'center',
        width: '100%'
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 8
    },
    primaryButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff'
    },
    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6
    },
    cancelText: {
        fontSize: 14,
        fontWeight: '500'
    },
    hintText: {
        fontSize: 12,
        marginTop: 16,
        fontStyle: 'italic',
        textAlign: 'center'
    }
});
