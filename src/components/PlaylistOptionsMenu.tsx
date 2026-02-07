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
                <View style={[styles.container, { backgroundColor: theme.menuBackground }]}>
                    <View style={[styles.header, { borderBottomColor: theme.cardBorder }]}>
                        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                            {playlistName}
                        </Text>
                    </View>

                    {onToggleFavorite && (
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                onClose();
                                onToggleFavorite();
                            }}
                        >
                            <Ionicons
                                name={isFavorite ? "heart-dislike-outline" : "heart-outline"}
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 40,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
    },
    header: {
        paddingBottom: 15,
        marginBottom: 10,
        borderBottomWidth: 1,
        alignItems: 'center'
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    icon: {
        marginRight: 20,
    },
    menuText: {
        fontSize: 16,
        fontWeight: '500',
    }
});
