import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/ThemeContext';

interface PlaylistOptionsMenuProps {
    visible: boolean;
    onClose: () => void;
    playlistName: string;
    onDelete?: () => void;
    isFavorite?: boolean;
    onToggleFavorite?: () => void;
}

export const PlaylistOptionsMenu: React.FC<PlaylistOptionsMenuProps> = ({
    visible,
    onClose,
    playlistName,
    onDelete,
    isFavorite,
    onToggleFavorite
}) => {
    const { theme } = useTheme();

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <View style={styles.handleContainer}>
                        <View style={[styles.handle, { backgroundColor: theme.textSecondary, opacity: 0.2 }]} />
                    </View>

                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                            {playlistName}
                        </Text>
                    </View>

                    <View style={[styles.divider, { backgroundColor: theme.textSecondary + '10' }]} />

                    {onToggleFavorite && (
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                onClose();
                                onToggleFavorite();
                            }}
                        >
                            <Ionicons
                                name={isFavorite ? "thumbs-down-outline" : "thumbs-up-outline"}
                                size={24}
                                color={theme.primary}
                                style={styles.icon}
                            />
                            <Text style={[styles.menuText, { color: theme.text }]}>
                                {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {onDelete && (
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                onClose();
                                onDelete();
                            }}
                        >
                            <Ionicons name="trash-outline" size={24} color="#ef4444" style={styles.icon} />
                            <Text style={[styles.menuText, { color: theme.text }]}>Delete Playlist</Text>
                        </TouchableOpacity>
                    )}

                    {/* Add more playlist specific options here if needed later */}
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        paddingBottom: 40,
        backgroundColor: '#000',
        borderWidth: 1,
        borderBottomWidth: 0,
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
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    title: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: -0.5,
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: 10,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
    },
    icon: {
        marginRight: 16,
        width: 24,
    },
    menuText: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    }
});
