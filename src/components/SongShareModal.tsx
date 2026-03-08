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

    const handleShareCard = async () => {
        try {
            setSharing(true);
            // Capture the card as PNG
            const cardUri = await captureRef(cardRef, {
                format: 'png',
                quality: 1.0,
                result: 'tmpfile',
            });

            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(cardUri, {
                    mimeType: 'image/png',
                    dialogTitle: `Share – ${song.title}`,
                });
            } else {
                await Share.share({ message: `${song.title} by ${song.artist}` });
            }
        } catch (e: any) {
            if (!e?.message?.includes('dismissed')) {
                Alert.alert('Share failed', 'Could not share the card.');
            }
        } finally {
            setSharing(false);
        }
    };

    const handleShareAudio = async () => {
        try {
            setSharing(true);
            const canShare = await Sharing.isAvailableAsync();
            if (!canShare) {
                Alert.alert('Not supported', 'Sharing is not available on this device.');
                return;
            }

            // Local music files on Android are /storage/... paths → convert to file://
            // content:// URIs are shared directly (expo-sharing handles them on Android)
            let fileUri = song.uri;
            if (!fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
                fileUri = `file://${fileUri}`;
            }

            await Sharing.shareAsync(fileUri, {
                mimeType: 'audio/*',
                dialogTitle: `Share "${song.title}"`,
            });
        } catch (e: any) {
            if (!e?.message?.includes('dismissed')) {
                Alert.alert('Share failed', 'Could not share the audio file.');
            }
        } finally {
            setSharing(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} style={styles.sheet}>
                    <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />

                    {/* Drag handle */}
                    <View style={styles.handleRow}>
                        <View style={styles.handle} />
                    </View>

                    <Text style={[styles.sheetTitle, { color: theme.text }]}>Share Song</Text>

                    {/* Preview Card — this is what gets captured */}
                    <View style={styles.cardWrapper}>
                        <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }}>
                            <View style={[styles.card, { width: CARD_WIDTH }]}>
                                {/* Background blur/gradient */}
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

                                {/* Card Content */}
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
                                        <Text style={styles.cardTitle} numberOfLines={2}>{song.title}</Text>
                                        <Text style={styles.cardArtist} numberOfLines={1}>{song.artist}</Text>
                                        {song.album ? (
                                            <Text style={styles.cardAlbum} numberOfLines={1}>{song.album}</Text>
                                        ) : null}

                                        <View style={styles.cardFooter}>
                                            <View style={styles.cardDurationBadge}>
                                                <Ionicons name="musical-note" size={12} color="rgba(255,255,255,0.7)" />
                                                <Text style={styles.cardDurationText}>
                                                    {formatDuration(song.duration)}
                                                </Text>
                                            </View>
                                            <Text style={styles.cardAppName}>🎵 Musync</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </ViewShot>
                    </View>

                    {/* Share Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: theme.primary + 'dd' }]}
                            onPress={handleShareCard}
                            disabled={sharing}
                        >
                            <Ionicons name="image-outline" size={22} color="#fff" />
                            <Text style={styles.actionText}>Share Card</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#1a1a2e' }]}
                            onPress={handleShareAudio}
                            disabled={sharing}
                        >
                            <Ionicons name="musical-notes-outline" size={22} color="#fff" />
                            <Text style={styles.actionText}>Share Audio</Text>
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
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
        paddingBottom: 40,
        paddingTop: 8,
    },
    handleRow: { alignItems: 'center', paddingVertical: 10 },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
    sheetTitle: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
        textAlign: 'center',
        marginBottom: 20,
        letterSpacing: -0.3,
    },
    cardWrapper: {
        alignItems: 'center',
        marginBottom: 24,
        // Shadow around card
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 16,
    },
    card: {
        borderRadius: 24,
        overflow: 'hidden',
        height: 200,
    },
    cardBg: {
        ...StyleSheet.absoluteFillObject,
    },
    cardContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 16,
    },
    cardAlbumArt: {
        width: 120,
        height: 120,
        borderRadius: 16,
        overflow: 'hidden',
        flexShrink: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 8,
    },
    cardMeta: {
        flex: 1,
        justifyContent: 'center',
        gap: 4,
    },
    cardTitle: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: -0.5,
        lineHeight: 22,
    },
    cardArtist: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        marginTop: 2,
    },
    cardAlbum: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    cardDurationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 3,
        gap: 4,
    },
    cardDurationText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    cardAppName: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        marginBottom: 12,
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
        borderColor: 'rgba(255,255,255,0.1)',
    },
    actionText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 8,
    },
    loadingText: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    cancelBtn: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    cancelText: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
});
