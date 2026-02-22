import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Safe import for ImagePicker to prevent crash if native module is missing
let ImagePicker: any;
try {
    ImagePicker = require('expo-image-picker');
} catch (e) {
    console.warn('[EditSongModal] expo-image-picker not found');
}
import * as FileSystem from 'expo-file-system/legacy';

import { Song } from '../hooks/useLocalMusic';
import { useTheme } from '../hooks/ThemeContext';
import { MusicImage } from './MusicImage';

interface EditSongModalProps {
    visible: boolean;
    onClose: () => void;
    song: Song | null;
    onSave: (songId: string, updates: Partial<Song>) => void;
}

export const EditSongModal: React.FC<EditSongModalProps> = ({
    visible,
    onClose,
    song,
    onSave
}) => {
    const { theme } = useTheme();
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [album, setAlbum] = useState('');
    const [year, setYear] = useState('');
    const [lyrics, setLyrics] = useState('');
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [isArtModified, setIsArtModified] = useState(false);
    const [isLyricsLoading, setIsLyricsLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    useEffect(() => {
        if (song) {
            setTitle(song.title || '');
            setArtist(song.artist || '');
            setAlbum(song.album || '');
            setYear(song.year || '');
            setLyrics(song.lyrics || '');
            setCoverImage(song.coverImage || null);
            setIsArtModified(false);
        }
    }, [song]);

    if (!song) return null;

    const handlePickImage = async () => {
        if (!ImagePicker || !ImagePicker.launchImageLibraryAsync) {
            Alert.alert(
                'Build Required',
                'Custom image picking requires a new native build. Please rebuild your development client to enable this feature.',
                [{ text: 'OK' }]
            );
            return;
        }

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const pickedUri = result.assets[0].uri;

                // Save permanently to app storage
                const fileName = `custom_art_${song.id}_${Date.now()}.jpg`;
                const dest = `${FileSystem.documentDirectory}${fileName}`;

                await FileSystem.copyAsync({
                    from: pickedUri,
                    to: dest
                });

                setCoverImage(dest);
                setIsArtModified(true);
            }
        } catch (e) {
            console.error('[EditSongModal] Image pick failed', e);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleResetArt = () => {
        setCoverImage(null);
        setIsArtModified(true);
    };

    const handleSave = () => {
        const updates: Partial<Song> = {
            title: title.trim() || song.title,
            artist: artist.trim() || song.artist,
            album: album.trim() || song.album,
            year: year.trim() || song.year,
            lyrics: lyrics.trim() || undefined,
        };

        if (isArtModified) {
            updates.coverImage = coverImage || undefined;
        }

        onSave(song.id, updates);
        onClose();
    };

    const handleScanTags = async () => {
        if (!song) return;
        setIsScanning(true);
        setStatusMessage('Scanning local tags...');

        try {
            const { metadataService } = require('../services/MetadataService');

            // 1. Local Scan
            const localMeta = await metadataService.fetchMetadata(song.uri, song.id, true);
            const localArt = await metadataService.fetchArtwork(song.uri);

            let currentTitle = localMeta.title || title || song.title;
            let currentArtist = localMeta.artist || artist || song.artist;

            if (localMeta.title) setTitle(localMeta.title);
            if (localMeta.artist) setArtist(localMeta.artist);
            if (localMeta.album) setAlbum(localMeta.album);
            if (localArt) {
                setCoverImage(localArt);
                setIsArtModified(true);
            }

            // 2. Internet Scan (iTunes API for better metadata & high-res art)
            setStatusMessage('Searching internet...');
            const searchTerm = encodeURIComponent(`${currentTitle} ${currentArtist}`);
            const response = await fetch(`https://itunes.apple.com/search?term=${searchTerm}&entity=song&limit=1`);

            if (response.ok) {
                const data = await response.json();
                if (data.results && data.results.length > 0) {
                    const result = data.results[0];

                    // Update metadata if found
                    if (result.trackName) setTitle(result.trackName);
                    if (result.artistName) setArtist(result.artistName);
                    if (result.collectionName) setAlbum(result.collectionName);
                    if (result.releaseDate) setYear(new Date(result.releaseDate).getFullYear().toString());

                    // High-res artwork (convert 100x100 to 600x600)
                    if (result.artworkUrl100) {
                        const highResArt = result.artworkUrl100.replace('100x100bb', '600x600bb');
                        setCoverImage(highResArt);
                        setIsArtModified(true);
                    }

                    setStatusMessage('Match found!');
                } else {
                    setStatusMessage('No internet match found.');
                }
            } else {
                setStatusMessage('Internet search failed.');
            }
        } catch (e) {
            console.error('[EditSongModal] Scan failed', e);
            setStatusMessage('Scan encountered an error.');
        } finally {
            setIsScanning(false);
            // Clear message after 3 seconds
            setTimeout(() => setStatusMessage(null), 3000);
        }
    };

    const handleSearchLyrics = async () => {
        if (!song) return;
        setIsLyricsLoading(true);

        const fetchWithTimeout = (url: string, timeout = 5000) => {
            return Promise.race([
                fetch(url),
                new Promise<Response>((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), timeout)
                )
            ]);
        };

        try {
            const cleanArtist = artist.trim() || song.artist;
            const cleanTitle = title.trim() || song.title;

            console.log('[EditSongModal] Searching lyrics for:', cleanArtist, '-', cleanTitle);

            // 1. Try LRCLIB
            try {
                const response = await fetchWithTimeout(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.plainLyrics) {
                        setLyrics(data.plainLyrics);
                        setIsLyricsLoading(false);
                        return;
                    }
                }
            } catch (e) {
                console.log('[EditSongModal] LRCLIB search failed or timed out:', e instanceof Error ? e.message : String(e));
            }

            // 2. Fallback to OVH
            try {
                const ovhResponse = await fetchWithTimeout(`https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`);
                if (ovhResponse.ok) {
                    const ovhData = await ovhResponse.json();
                    if (ovhData.lyrics) {
                        setLyrics(ovhData.lyrics);
                        setIsLyricsLoading(false);
                        return;
                    }
                }
            } catch (e) {
                console.log('[EditSongModal] OVH search failed or timed out:', e instanceof Error ? e.message : String(e));
            }

            setStatusMessage('Lyrics not found.');

        } catch (e) {
            console.error('[EditSongModal] Global search error:', e);
            setStatusMessage('Network error occurred.');
        } finally {
            setIsLyricsLoading(false);
            // Clear message after 3 seconds
            setTimeout(() => setStatusMessage(null), 3000);
        }
    };

    const inputFields = [
        { label: 'Title', value: title, setValue: setTitle, placeholder: 'Song title' },
        { label: 'Artist', value: artist, setValue: setArtist, placeholder: 'Artist name' },
        { label: 'Album', value: album, setValue: setAlbum, placeholder: 'Album name' },
        { label: 'Year', value: year, setValue: setYear, placeholder: 'Year', keyboardType: 'numeric' as const },
    ];

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <View style={[styles.container, { backgroundColor: theme.background }]}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: theme.cardBorder }]}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={theme.text} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Details</Text>
                        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                            <Text style={[styles.saveText, { color: theme.primary }]}>Save</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.formScrollView}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Art Section */}
                        <View style={styles.artSection}>
                            <TouchableOpacity
                                onPress={handlePickImage}
                                style={styles.artWrapper}
                                activeOpacity={0.8}
                            >
                                <MusicImage
                                    uri={coverImage || undefined}
                                    id={song.id}
                                    style={styles.art}
                                    iconSize={60}
                                    containerStyle={[styles.artContainer, { backgroundColor: theme.card }]}
                                />
                                <View style={styles.editOverlay}>
                                    <Ionicons name="camera" size={18} color="#fff" />
                                    <Text style={styles.editText}>CHANGE</Text>
                                </View>
                            </TouchableOpacity>

                            <View style={styles.artActions}>
                                <TouchableOpacity
                                    onPress={handleScanTags}
                                    disabled={isScanning}
                                    style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                                >
                                    {isScanning ? (
                                        <ActivityIndicator size="small" color={theme.primary} />
                                    ) : (
                                        <Ionicons name="scan-outline" size={16} color={theme.primary} />
                                    )}
                                    <Text style={[styles.actionButtonText, { color: theme.primary }]}>
                                        {isScanning ? 'SCANNING...' : 'SCAN TAGS'}
                                    </Text>
                                </TouchableOpacity>

                                {isArtModified && (
                                    <TouchableOpacity
                                        onPress={handleResetArt}
                                        style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                                    >
                                        <Ionicons name="refresh-outline" size={16} color={theme.textSecondary} />
                                        <Text style={[styles.actionButtonText, { color: theme.textSecondary }]}>RESET</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            {statusMessage && (
                                <Text style={[styles.statusText, { color: theme.primary }]}>
                                    {statusMessage}
                                </Text>
                            )}
                        </View>

                        {/* Form Fields */}
                        {inputFields.map((field, index) => (
                            <View key={index} style={styles.fieldContainer}>
                                <Text style={[styles.label, { color: theme.textSecondary }]}>{field.label}</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        {
                                            color: theme.text,
                                            backgroundColor: theme.card,
                                            borderColor: theme.cardBorder
                                        }
                                    ]}
                                    value={field.value}
                                    onChangeText={field.setValue}
                                    placeholder={field.placeholder}
                                    placeholderTextColor={theme.textSecondary}
                                    keyboardType={field.keyboardType || 'default'}
                                />
                            </View>
                        ))}

                        {/* Lyrics Field */}
                        <View style={styles.fieldContainer}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <Text style={[styles.label, { color: theme.textSecondary, marginBottom: 0 }]}>Lyrics</Text>
                                <TouchableOpacity
                                    onPress={handleSearchLyrics}
                                    disabled={isLyricsLoading}
                                    style={{ flexDirection: 'row', alignItems: 'center' }}
                                >
                                    {isLyricsLoading ? (
                                        <ActivityIndicator size="small" color={theme.primary} />
                                    ) : (
                                        <>
                                            <Ionicons name="search" size={12} color={theme.primary} style={{ marginRight: 4 }} />
                                            <Text style={{ color: theme.primary, fontSize: 11, fontWeight: 'bold' }}>SEARCH</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        color: theme.text,
                                        backgroundColor: theme.card,
                                        borderColor: theme.cardBorder,
                                        height: 150,
                                        textAlignVertical: 'top',
                                        paddingTop: 10
                                    }
                                ]}
                                value={lyrics}
                                onChangeText={setLyrics}
                                placeholder="Paste or search lyrics..."
                                placeholderTextColor={theme.textSecondary}
                                multiline={true}
                                numberOfLines={8}
                            />
                        </View>
                        <View style={styles.bottomSpacing} />
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '92%',
        width: '100%',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: 'bold',
    },
    saveButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    saveText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    formScrollView: {
        padding: 20,
    },
    artSection: {
        alignItems: 'center',
        marginBottom: 25,
    },
    artWrapper: {
        position: 'relative',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    art: {
        width: 140,
        height: 140,
        borderRadius: 16,
    },
    artContainer: {
        width: 140,
        height: 140,
        borderRadius: 16,
        overflow: 'hidden',
    },
    editOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        gap: 6,
    },
    editText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    artActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 15,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1.5,
        gap: 8,
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    fieldContainer: {
        marginBottom: 12,
    },
    label: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        fontSize: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
    },
    bottomSpacing: {
        height: 60,
    },
    statusText: {
        fontSize: 11,
        fontWeight: 'bold',
        marginTop: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    }
});
