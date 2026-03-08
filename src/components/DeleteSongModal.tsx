import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    Easing,
    runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../hooks/ThemeContext';
import { MusicImage } from './MusicImage';
import { Song } from '../hooks/MusicLibraryContext';

interface DeleteSongModalProps {
    visible: boolean;
    song: Song | null;
    onCancel: () => void;
    onConfirm: () => Promise<void>;
    isDeleting?: boolean;
}

const { width } = Dimensions.get('window');
const MODAL_WIDTH = Math.min(width - 48, 360);

export const DeleteSongModal: React.FC<DeleteSongModalProps> = ({
    visible,
    song,
    onCancel,
    onConfirm,
    isDeleting = false,
}) => {
    const { theme } = useTheme();

    const scale = useSharedValue(0.88);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.ease) });
            scale.value = withSpring(1, { damping: 18, stiffness: 220 });
        } else {
            opacity.value = withTiming(0, { duration: 160 });
            scale.value = withTiming(0.88, { duration: 160 });
        }
    }, [visible]);

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    if (!song) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onCancel}
            statusBarTranslucent
        >
            {/* Backdrop */}
            <Animated.View style={[styles.backdrop, backdropStyle]}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={isDeleting ? undefined : onCancel} />
            </Animated.View>

            {/* Card */}
            <View style={styles.centeredView} pointerEvents="box-none">
                <Animated.View style={[styles.card, cardStyle]}>
                    <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={[styles.cardInner, { backgroundColor: 'rgba(18,18,22,0.92)', borderColor: 'rgba(255,255,255,0.08)' }]}>

                        {/* Warning icon */}
                        <View style={styles.iconRing}>
                            <View style={[styles.iconOuter, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                                <Ionicons name="trash-outline" size={28} color="#ef4444" />
                            </View>
                        </View>

                        {/* Title */}
                        <Text style={styles.title}>Delete Song</Text>
                        <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.45)' }]}>
                            This will permanently remove
                        </Text>

                        {/* Song chip */}
                        <View style={[styles.songChip, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.08)' }]}>
                            <View style={styles.chipArt}>
                                <MusicImage
                                    uri={song.coverImage}
                                    id={song.id}
                                    style={{ width: '100%', height: '100%' }}
                                    iconSize={16}
                                />
                            </View>
                            <View style={styles.chipMeta}>
                                <Text style={[styles.chipTitle, { color: '#fff' }]} numberOfLines={1}>
                                    {song.title}
                                </Text>
                                <Text style={[styles.chipArtist, { color: 'rgba(255,255,255,0.45)' }]} numberOfLines={1}>
                                    {song.artist}
                                </Text>
                            </View>
                        </View>

                        <Text style={[styles.warning, { color: 'rgba(255,255,255,0.35)' }]}>
                            from your device. This action cannot be undone.
                        </Text>

                        {/* Divider */}
                        <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.07)' }]} />

                        {/* Actions */}
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={[styles.btn, styles.cancelBtn, { borderColor: 'rgba(255,255,255,0.10)' }]}
                                onPress={onCancel}
                                disabled={isDeleting}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.btnText, { color: 'rgba(255,255,255,0.55)' }]}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.btn, styles.deleteBtn]}
                                onPress={onConfirm}
                                disabled={isDeleting}
                                activeOpacity={0.8}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <Ionicons name="trash-outline" size={16} color="#fff" />
                                        <Text style={[styles.btnText, { color: '#fff' }]}>Delete</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.72)',
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    card: {
        width: MODAL_WIDTH,
        borderRadius: 28,
        overflow: 'hidden',
    },
    cardInner: {
        borderRadius: 28,
        borderWidth: 1,
        padding: 28,
        alignItems: 'center',
    },
    iconRing: {
        marginBottom: 20,
    },
    iconOuter: {
        width: 60,
        height: 60,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#fff',
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_400Regular',
        textAlign: 'center',
        marginBottom: 16,
    },
    songChip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 14,
        padding: 10,
        gap: 10,
        width: '100%',
        marginBottom: 12,
    },
    chipArt: {
        width: 40,
        height: 40,
        borderRadius: 8,
        overflow: 'hidden',
        flexShrink: 0,
    },
    chipMeta: {
        flex: 1,
    },
    chipTitle: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    chipArtist: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_400Regular',
        marginTop: 1,
    },
    warning: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_400Regular',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 18,
    },
    divider: {
        width: '100%',
        height: 1,
        marginBottom: 20,
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
    },
    btn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        borderRadius: 14,
    },
    cancelBtn: {
        borderWidth: 1,
    },
    deleteBtn: {
        backgroundColor: '#ef4444',
    },
    btnText: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
});
