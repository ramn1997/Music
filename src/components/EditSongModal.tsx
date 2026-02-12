import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    const [genre, setGenre] = useState('');
    const [year, setYear] = useState('');
    const [coverImage, setCoverImage] = useState<string | null>(null);

    useEffect(() => {
        if (song) {
            setTitle(song.title || '');
            setArtist(song.artist || '');
            setAlbum(song.album || '');
            setGenre(song.genre || '');
            setYear(song.year || '');
            setCoverImage(song.coverImage || null);
        }
    }, [song]);

    if (!song) return null;



    const handleSave = () => {
        onSave(song.id, {
            title: title.trim() || song.title,
            artist: artist.trim() || song.artist,
            album: album.trim() || song.album,
            genre: genre.trim() || song.genre,
            year: year.trim() || song.year,
            coverImage: coverImage || song.coverImage,
        });
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
                console.log('[EditSongModal] Found artwork:', art);
            }

            let hasUpdates = false;
            if (meta.title) { setTitle(meta.title); hasUpdates = true; }
            if (meta.artist) { setArtist(meta.artist); hasUpdates = true; }
            if (meta.album) { setAlbum(meta.album); hasUpdates = true; }
            if (meta.genre) { setGenre(meta.genre); hasUpdates = true; }

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
        { label: 'Genre', value: genre, setValue: setGenre, placeholder: 'Genre' },
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

                    <View style={styles.contentRow}>
                        {/* Left: Cover Art */}
                        <View style={styles.coverSide}>
                            <View style={styles.artWrapper}>
                                {coverImage ? (
                                    <Image
                                        source={{ uri: coverImage }}
                                        style={styles.art}
                                    />
                                ) : (
                                    <MusicImage
                                        uri={song.coverImage}
                                        id={song.id}
                                        style={styles.art}
                                        iconSize={40}
                                        containerStyle={[styles.artContainer, { backgroundColor: theme.card }]}
                                    />
                                )}
                            </View>
                            <TouchableOpacity onPress={handleScanTags} style={{ marginTop: 12, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: theme.card, borderRadius: 8, borderWidth: 1, borderColor: theme.cardBorder, alignItems: 'center' }}>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.primary }}>Scan Tags</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Right: Form Fields */}
                        <ScrollView
                            style={styles.formContainer}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
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
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
        minHeight: '70%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    closeButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    saveButton: {
        padding: 4,
    },
    saveText: {
        fontSize: 16,
        fontWeight: '600',
    },
    contentRow: {
        flexDirection: 'row',
        flex: 1,
        paddingTop: 20,
    },
    coverSide: {
        paddingHorizontal: 20,
    },
    artWrapper: {
        position: 'relative',
    },
    art: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    artContainer: {
        width: 80,
        height: 80,
        borderRadius: 8,
        overflow: 'hidden',
    },
    editOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 40,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    editText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    formContainer: {
        flex: 1,
        paddingRight: 20,
    },
    fieldContainer: {
        marginBottom: 12,
    },
    label: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        fontSize: 15,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
    },
});
