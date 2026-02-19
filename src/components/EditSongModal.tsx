import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
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
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [isArtModified, setIsArtModified] = useState(false);

    useEffect(() => {
        if (song) {
            setTitle(song.title || '');
            setArtist(song.artist || '');
            setAlbum(song.album || '');
            setYear(song.year || '');
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
        };

        if (isArtModified) {
            updates.coverImage = coverImage || undefined;
        }

        onSave(song.id, updates);
        onClose();
    };

    const handleScanTags = async () => {
        try {
            const { metadataService } = require('../services/MetadataService');
            console.log('[EditSongModal] Scanning tags for:', song.title);

            // Force fetch to bypass cache
            const meta = await metadataService.fetchMetadata(song.uri, song.id, true);
            console.log('[EditSongModal] Scan result:', meta);

            // Also try to fetch artwork
            const art = await metadataService.fetchArtwork(song.uri);
            if (art) {
                setCoverImage(art);
                setIsArtModified(true);
                console.log('[EditSongModal] Found artwork:', art);
            }

            let hasUpdates = false;
            if (meta.title) { setTitle(meta.title); hasUpdates = true; }
            if (meta.artist) { setArtist(meta.artist); hasUpdates = true; }
            if (meta.album) { setAlbum(meta.album); hasUpdates = true; }

            if (!hasUpdates) {
                console.log('[EditSongModal] No better metadata found in tags');
            }
        } catch (e) {
            console.warn('Scan failed', e);
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
                                    style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                                >
                                    <Ionicons name="scan-outline" size={16} color={theme.primary} />
                                    <Text style={[styles.actionButtonText, { color: theme.primary }]}>SCAN TAGS</Text>
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
    }
});
