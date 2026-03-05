import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Platform, Share, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MusicImage } from './MusicImage';
import { Song } from '../hooks/MusicLibraryContext';
import { useTheme } from '../hooks/ThemeContext';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { GlassCard } from './GlassCard';

const { width } = Dimensions.get('window');

interface ShareCardModalProps {
    visible: boolean;
    onClose: () => void;
    song: Song | null;
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({ visible, onClose, song }) => {
    const { theme } = useTheme();
    const cardRef = useRef(null);
    const [isSharing, setIsSharing] = useState(false);

    if (!song) return null;

    const handleNativeShareText = async () => {
        try {
            await Share.share({
                message: `Listening to "${song.title}" by ${song.artist} on MusicApp!`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleShareImage = async () => {
        if (isSharing) return;
        setIsSharing(true);
        try {
            const uri = await captureRef(cardRef, {
                format: 'png',
                quality: 1,
            });
            await Sharing.shareAsync(uri);
        } catch (error) {
            console.error('Error sharing image:', error);
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
                    <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }} style={styles.cardWrapper}>
                        {/* Premium Share Card */}
                        <LinearGradient
                            colors={theme.gradient as any}
                            style={styles.card}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.artContainer}>
                                <MusicImage
                                    uri={song.coverImage}
                                    id={song.id}
                                    style={styles.artwork}
                                    iconSize={100}
                                />
                                <LinearGradient
                                    colors={['transparent', 'rgba(0,0,0,0.4)']}
                                    style={StyleSheet.absoluteFill}
                                />
                            </View>

                            <View style={styles.infoContainer}>
                                <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
                                    {song.title}
                                </Text>
                                <Text style={[styles.artist, { color: theme.textSecondary }]} numberOfLines={1}>
                                    {song.artist}
                                </Text>
                                <Text style={[styles.album, { color: theme.textSecondary, opacity: 0.6 }]} numberOfLines={1}>
                                    {song.album || 'Unknown Album'}
                                </Text>
                            </View>

                            <View style={styles.footer}>
                                <View style={styles.logoRow}>
                                    <Image
                                        source={require('../../assets/discicon.png')}
                                        style={styles.appIcon}
                                    />
                                    <Text style={[styles.logoText, { color: theme.text }]}>Music</Text>
                                </View>
                                <View style={[styles.badge, { backgroundColor: theme.primary + '20' }]}>
                                    <Text style={[styles.badgeText, { color: theme.primary }]}>NOW PLAYING</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </ViewShot>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: theme.primary }]}
                            onPress={handleShareImage}
                            disabled={isSharing}
                        >
                            {isSharing ? (
                                <ActivityIndicator color="#000" size="small" />
                            ) : (
                                <Ionicons name="image-outline" size={20} color="#000" />
                            )}
                            <Text style={styles.actionText}>{isSharing ? 'Capturing...' : 'Share Image'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.closeButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                            onPress={handleNativeShareText}
                        >
                            <Ionicons name="text-outline" size={18} color={theme.text} />
                            <Text style={[styles.closeText, { color: theme.text, marginLeft: 8 }]}>Text</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.iconOnlyButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                            onPress={onClose}
                        >
                            <Ionicons name="close" size={24} color={theme.text} />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: width * 0.85,
        alignItems: 'center',
    },
    cardWrapper: {
        width: '100%',
        aspectRatio: 0.7,
        borderRadius: 32,
        overflow: 'hidden',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        backgroundColor: '#111',
    },
    card: {
        flex: 1,
        padding: 24,
        justifyContent: 'space-between',
    },
    artContainer: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    artwork: {
        width: '100%',
        height: '100%',
    },
    infoContainer: {
        marginTop: 20,
    },
    title: {
        fontSize: 24,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        letterSpacing: -0.5,
        lineHeight: 30,
    },
    artist: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        marginTop: 4,
    },
    album: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_500Medium',
        marginTop: 2,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    appIcon: {
        width: 22,
        height: 22,
        borderRadius: 4,
    },
    logoText: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: -0.2,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 10,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 30,
        width: '100%',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 16,
    },
    actionText: {
        color: '#000',
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    closeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
    },
    closeText: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    iconOnlyButton: {
        width: 52,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
    }
});
