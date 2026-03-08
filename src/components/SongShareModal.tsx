import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
    Share,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { MusicImage } from './MusicImage';
import { Song } from '../hooks/MusicLibraryContext';
import { useTheme } from '../hooks/ThemeContext';

interface SongShareModalProps {
    visible: boolean;
    onClose: () => void;
    song: Song | null;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(width - 48, 360);

export const SongShareModal: React.FC<SongShareModalProps> = ({ visible, onClose, song }) => {
    const { theme } = useTheme();
    const cardRef = useRef<ViewShot>(null);
    const [sharing, setSharing] = useState(false);

    if (!song) return null;

    const formatDuration = (ms?: number) => {
        if (!ms) return '';
        const total = Math.floor(ms / 1000);
        const m = Math.floor(total / 60);
        const s = total % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleShareBoth = async () => {
        try {
            setSharing(true);

            // 1. Capture the card
            const cardUri = await captureRef(cardRef, {
                format: 'png',
                quality: 1.0,
                result: 'tmpfile',
            });

            const canShare = await Sharing.isAvailableAsync();
            if (!canShare) {
                Alert.alert('Not supported', 'Sharing is not available on this device.');
                return;
            }

            // 2. Share the card first
            await Sharing.shareAsync(cardUri, {
                mimeType: 'image/png',
                dialogTitle: `Share Card – ${song.title}`,
            });

            // 3. Then share the audio file
            let audioUri = song.uri;
            if (!audioUri.startsWith('file://') && !audioUri.startsWith('content://')) {
                audioUri = `file://${audioUri}`;
            }

            // Small delay to ensure the first dialog is fully dismissed before the next one peaks
            // This is the only way without a native binary rebuild for RNShare
            await new Promise(resolve => setTimeout(resolve, 800));

            await Sharing.shareAsync(audioUri, {
                mimeType: 'audio/*',
                dialogTitle: `Share Audio – ${song.title}`,
            });

        } catch (e: any) {
            if (!e?.message?.includes('dismissed')) {
                Alert.alert('Share failed', 'Could not share the song.');
            }
        } finally {
            setSharing(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide" // Better for bottom sheets
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    style={[styles.sheet, { backgroundColor: theme.menuBackground, borderColor: theme.cardBorder, borderWidth: 1, borderBottomWidth: 0 }]}
                >
                    {/* Progress handle */}
                    <View style={styles.handleRow}>
                        <View style={[styles.handle, { backgroundColor: theme.textSecondary + '40' }]} />
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        <Text style={[styles.sheetTitle, { color: theme.text }]}>Share Song</Text>

                        {/* Preview Card */}
                        <View style={styles.cardWrapper}>
                            <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }}>
                                <View style={[styles.card, { width: CARD_WIDTH }]}>
                                    <View style={styles.cardBg}>
                                        <MusicImage
                                            uri={song.coverImage}
                                            id={song.id}
                                            style={StyleSheet.absoluteFillObject as any}
                                            iconSize={0}
                                        />
                                        <LinearGradient
                                            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
                                            style={StyleSheet.absoluteFill}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 0, y: 1 }}
                                        />
                                    </View>

                                    <View style={styles.cardContent}>
                                        <View style={styles.cardAlbumArt}>
                                            <MusicImage
                                                uri={song.coverImage}
                                                id={song.id}
                                                style={{ width: '100%', height: '100%' }}
                                                iconSize={48}
                                            />
                                        </View>

                                        <View style={styles.cardMeta}>
                                            <View style={styles.cardTextContent}>
                                                <Text style={styles.cardTitle} numberOfLines={2}>{song.title}</Text>
                                                <Text style={styles.cardArtist} numberOfLines={1}>{song.artist}</Text>
                                                {song.album ? (
                                                    <Text style={styles.cardAlbum} numberOfLines={1}>{song.album}</Text>
                                                ) : null}
                                            </View>

                                            <View style={styles.cardFooter}>
                                                <View style={styles.cardDurationBadge}>
                                                    <Ionicons name="musical-note" size={12} color="rgba(255,255,255,0.7)" />
                                                    <Text style={styles.cardDurationText}>
                                                        {formatDuration(song.duration)}
                                                    </Text>
                                                </View>
                                                <View style={styles.cardAppNameContainer}>
                                                    <Ionicons name="disc-outline" size={12} color="rgba(255,255,255,0.4)" />
                                                    <Text style={styles.cardAppName}>Music</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </ViewShot>
                        </View>

                        {/* Share Actions */}
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                                onPress={handleShareBoth}
                                disabled={sharing}
                            >
                                <Ionicons name="share-social-outline" size={22} color={theme.textOnPrimary || "#000"} />
                                <Text style={[styles.actionText, { color: theme.textOnPrimary || "#000" }]}>Card & Audio</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: theme.cardBorder }]}
                                onPress={async () => {
                                    try {
                                        setSharing(true);
                                        let audioUri = song.uri;
                                        if (!audioUri.startsWith('file://') && !audioUri.startsWith('content://')) {
                                            audioUri = `file://${audioUri}`;
                                        }
                                        await Sharing.shareAsync(audioUri, { mimeType: 'audio/*', dialogTitle: `Share Audio – ${song.title}` });
                                    } catch (e) {
                                        console.warn('Audio share failed', e);
                                    } finally {
                                        setSharing(false);
                                    }
                                }}
                                disabled={sharing}
                            >
                                <Ionicons name="musical-notes-outline" size={22} color={theme.text} />
                                <Text style={[styles.actionText, { color: theme.text }]}>Audio Only</Text>
                            </TouchableOpacity>
                        </View>

                        {sharing && (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator color={theme.primary} size="small" />
                                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Preparing…</Text>
                            </View>
                        )}

                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        maxHeight: '85%',
        overflow: 'hidden', // Added back to clip BlurView
    },
    scrollContent: {
        paddingBottom: 40,
    },
    handleRow: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handle: {
        width: 38,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.2)'
    },
    sheetTitle: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
        textAlign: 'center',
        marginBottom: 16, // Reduced from 24
        letterSpacing: -0.5,
    },
    cardWrapper: {
        alignItems: 'center',
        marginBottom: 24, // Reduced from 32
        paddingHorizontal: 20,
        // UI Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 20,
    },
    card: {
        borderRadius: 28,
        overflow: 'hidden',
        height: 210,
        backgroundColor: '#1a1a1c', // Solid background for capture
    },
    cardBg: {
        ...StyleSheet.absoluteFillObject,
    },
    cardContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 24,
        gap: 20,
    },
    cardAlbumArt: {
        width: 125,
        height: 125,
        borderRadius: 20,
        overflow: 'hidden',
        flexShrink: 0,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
    },
    cardMeta: {
        flex: 1,
        justifyContent: 'space-between',
        height: 125,
    },
    cardTextContent: {
        flex: 1,
        justifyContent: 'center',
        gap: 2,
    },
    cardTitle: {
        color: '#fff',
        fontSize: 19,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: -0.6,
        lineHeight: 24,
    },
    cardArtist: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        marginTop: 2,
    },
    cardAlbum: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    cardDurationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
        gap: 5,
    },
    cardDurationText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 11,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    cardAppNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cardAppName: {
        color: 'rgba(255,255,255,0.35)',
        fontSize: 11,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    actionText: {
        color: '#fff',
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 8,
        marginBottom: 4,
    },
    loadingText: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    cancelBtn: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    cancelText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
});
