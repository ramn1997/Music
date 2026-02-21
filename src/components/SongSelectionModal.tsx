import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/ThemeContext';
import { Song } from '../hooks/useLocalMusic';
import { FlashList } from '@shopify/flash-list';
import { MarqueeText } from './MarqueeText'; // Adjust import path if needed
import { MusicImage } from './MusicImage';     // Adjust import path

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const FlashListAny = FlashList as any;

interface SongSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    onAddSongs: (songs: Song[]) => void;
    availableSongs: Song[];
    existingSongIds: Set<string>; // IDs to exclude or show as already added
}

export const SongSelectionModal: React.FC<SongSelectionModalProps> = ({
    visible,
    onClose,
    onAddSongs,
    availableSongs,
    existingSongIds
}) => {
    const { theme } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Filter songs: Remove existing ones?
    // User logic: "show songs list and allow to add them". Usually exclude already added ones.
    const filteredSongs = useMemo(() => {
        let songs = availableSongs.filter(s => !existingSongIds.has(s.id));
        if (searchQuery.trim()) {
            const low = searchQuery.toLowerCase();
            songs = songs.filter(s =>
                s.title.toLowerCase().includes(low) ||
                (s.artist && s.artist.toLowerCase().includes(low))
            );
        }
        return songs; // Limit? Maybe not.
    }, [availableSongs, existingSongIds, searchQuery]);

    const toggleSelection = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleConfirm = () => {
        const selectedSongs = filteredSongs.filter(s => selectedIds.has(s.id));
        onAddSongs(selectedSongs);
        setSelectedIds(new Set()); // Reset
        setSearchQuery('');
        onClose();
    };

    const renderItem = useCallback(({ item }: { item: Song }) => {
        const isSelected = selectedIds.has(item.id);
        return (
            <TouchableOpacity
                style={[styles.itemContainer, { borderBottomColor: theme.cardBorder }]}
                onPress={() => toggleSelection(item.id)}
            >
                <View style={[styles.artworkMessage, { backgroundColor: theme.card }]}>
                    <MusicImage
                        uri={item.coverImage}
                        id={item.id}
                        style={{ width: 34, height: 34, borderRadius: 5 }}
                        iconSize={16}
                    />
                </View>
                <View style={styles.info}>
                    <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.artist, { color: theme.textSecondary }]} numberOfLines={1}>{item.artist || 'Unknown Artist'}</Text>
                </View>
                {/* Radio button */}
                <View style={[styles.radioOuter, { borderColor: isSelected ? theme.primary : theme.textSecondary }]}>
                    {isSelected && <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />}
                </View>
            </TouchableOpacity>
        );
    }, [selectedIds, theme, toggleSelection]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.overlay}>
                    <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                    <View style={[styles.container, { backgroundColor: theme.background }]}>

                        {/* Handle Bar */}
                        <View style={styles.handleContainer}>
                            <View style={[styles.handle, { backgroundColor: theme.cardBorder }]} />
                        </View>

                        {/* Header */}
                        <View style={[styles.header, { borderBottomColor: theme.cardBorder }]}>
                            <TouchableOpacity onPress={onClose}>
                                <Text style={{ color: theme.textSecondary, fontSize: 16 }}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={[styles.headerTitle, { color: theme.text }]}>Add Songs</Text>
                            <TouchableOpacity
                                onPress={handleConfirm}
                                disabled={selectedIds.size === 0}
                            >
                                <Text style={{ color: selectedIds.size > 0 ? theme.primary : theme.textSecondary, fontSize: 16, fontWeight: 'bold' }}>
                                    Done ({selectedIds.size})
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Search */}
                        <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
                            <Ionicons name="search" size={20} color={theme.textSecondary} />
                            <TextInput
                                style={[styles.searchInput, { color: theme.text }]}
                                placeholder="Search songs..."
                                placeholderTextColor={theme.textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* List */}
                        <View style={{ flex: 1 }}>
                            <FlashListAny
                                data={filteredSongs}
                                renderItem={renderItem}
                                estimatedItemSize={60}
                                keyExtractor={item => item.id}
                                contentContainerStyle={{ paddingBottom: 40 }}
                                keyboardShouldPersistTaps="handled"
                                extraData={selectedIds}
                            />
                        </View>

                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    container: {
        height: '90%', // Almost full screen
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 15,
        paddingHorizontal: 15,
        height: 40,
        borderRadius: 10,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 7,
        paddingHorizontal: 16,
        borderBottomWidth: 0.5,
    },
    artworkMessage: {
        width: 34,
        height: 34,
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    info: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '500',
    },
    artist: {
        fontSize: 14,
        marginTop: 2,
    },
    radioOuter: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioInner: {
        width: 9,
        height: 9,
        borderRadius: 5,
    },
});
