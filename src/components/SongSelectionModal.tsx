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
                style={styles.itemContainer}
                activeOpacity={0.7}
                onPress={() => toggleSelection(item.id)}
            >
                <View style={[styles.artworkContainer, { backgroundColor: theme.cardBorder + '20' }]}>
                    <MusicImage
                        uri={item.coverImage}
                        id={item.id}
                        style={styles.artwork}
                        iconSize={20}
                    />
                    {isSelected && (
                        <View style={[styles.selectionOverlay, { backgroundColor: theme.primary + 'CC' }]}>
                            <Ionicons name="checkmark" size={20} color="#fff" />
                        </View>
                    )}
                </View>
                <View style={styles.info}>
                    <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.artist, { color: theme.textSecondary }]} numberOfLines={1}>{item.artist || 'Unknown Artist'}</Text>
                </View>
                <View style={[styles.checkOuter, { borderColor: isSelected ? theme.primary : theme.textSecondary + '40' }]}>
                    {isSelected && <View style={[styles.checkInner, { backgroundColor: theme.primary }]} />}
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

                        <View style={styles.handleContainer}>
                            <View style={[styles.handle, { backgroundColor: theme.textSecondary, opacity: 0.2 }]} />
                        </View>

                        <View style={styles.header}>
                            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                                <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={[styles.headerTitle, { color: theme.text }]}>Add Songs</Text>
                            <TouchableOpacity
                                onPress={handleConfirm}
                                disabled={selectedIds.size === 0}
                                style={styles.headerBtn}
                            >
                                <Text style={[
                                    styles.doneText,
                                    { color: selectedIds.size > 0 ? theme.primary : theme.textSecondary + '60' }
                                ]}>
                                    Done {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.searchContainer, { backgroundColor: theme.textSecondary + '10' }]}>
                            <Ionicons name="search" size={18} color={theme.textSecondary} />
                            <TextInput
                                style={[styles.searchInput, { color: theme.text }]}
                                placeholder="Search songs..."
                                placeholderTextColor={theme.textSecondary + '80'}
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
        backgroundColor: 'rgba(0,0,0,0.85)',
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
        height: '92%',
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        overflow: 'hidden',
        backgroundColor: '#000', // Usually black in these themes
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: -0.5,
    },
    headerBtn: {
        minWidth: 60,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    doneText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 20,
        paddingHorizontal: 16,
        height: 46,
        borderRadius: 23,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_500Medium',
        paddingVertical: 0,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    artworkContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        overflow: 'hidden',
        marginRight: 16,
        position: 'relative',
    },
    artwork: {
        width: '100%',
        height: '100%',
    },
    selectionOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    info: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        letterSpacing: -0.3,
    },
    artist: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_500Medium',
        marginTop: 2,
        opacity: 0.6,
    },
    checkOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
});
