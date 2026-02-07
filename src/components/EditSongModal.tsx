import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
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

    const pickImage = async () => {
        try {
            // Lazy load ImagePicker to prevent startup crash if native module is missing
            let ImagePicker;
            try {
                // ImagePicker = require('expo-image-picker');
                ImagePicker = null;
            } catch (e) {
                Alert.alert('Not Supported', 'Image picking is not supported on this device/environment (Missing Native Module).');
                return;
            }

            if (!ImagePicker || !ImagePicker.requestMediaLibraryPermissionsAsync) {
                Alert.alert('Not Supported', 'Image picking is not supported on this device/environment.');
                return;
            }

            // Request permission
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant permission to access your photos.');
                return;
            }

            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setCoverImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        }
    };

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

                    {/* Song Preview with editable cover */}
                    <View style={styles.songPreview}>
                        <TouchableOpacity onPress={pickImage} style={styles.artWrapper}>
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
                            <View style={[styles.editOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                                <Ionicons name="camera" size={24} color="white" />
                                <Text style={styles.editText}>Change</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Form Fields */}
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
    songPreview: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    artWrapper: {
        position: 'relative',
    },
    art: {
        width: 120,
        height: 120,
        borderRadius: 12,
    },
    artContainer: {
        width: 120,
        height: 120,
        borderRadius: 12,
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
        paddingHorizontal: 20,
    },
    fieldContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        fontSize: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
});
