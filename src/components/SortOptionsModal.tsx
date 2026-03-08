import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/ThemeContext';

export type SortOption = 'az' | 'za' | 'duration' | 'dateAdded';

interface SortOptionsModalProps {
    visible: boolean;
    onClose: () => void;
    currentSort: SortOption;
    onSelect: (option: SortOption) => void;
    options?: { label: string; value: SortOption; icon: string }[];
}

export const SortOptionsModal = ({ visible, onClose, currentSort, onSelect, options }: SortOptionsModalProps) => {
    const { theme } = useTheme();

    const defaultOptions = [
        { label: 'A-Z', value: 'az' as SortOption, icon: 'text' },
        { label: 'Z-A', value: 'za' as SortOption, icon: 'text' },
        { label: 'Duration', value: 'duration' as SortOption, icon: 'time-outline' },
    ];

    const displayOptions = options || defaultOptions;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={[styles.content, { backgroundColor: theme.menuBackground, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.title, { color: theme.text }]}>Sort By</Text>
                    {displayOptions.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={styles.option}
                            onPress={() => {
                                onSelect(option.value);
                                onClose();
                            }}
                        >
                            <View style={styles.optionLeft}>
                                <Ionicons name={option.icon as any} size={20} color={currentSort === option.value ? theme.primary : theme.textSecondary} style={{ marginRight: 12 }} />
                                <Text style={[styles.optionLabel, { color: currentSort === option.value ? theme.primary : theme.text }]}>
                                    {option.label}
                                </Text>
                            </View>
                            {currentSort === option.value && (
                                <Ionicons name="checkmark" size={20} color={theme.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '80%',
        borderRadius: 20,
        borderWidth: 1,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        marginLeft: 5,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 10,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionLabel: {
        fontSize: 16,
    },
});
