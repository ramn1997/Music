import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { GlassCard } from './GlassCard';
import { useTheme } from '../hooks/ThemeContext';

interface ConfirmationModalProps {
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    visible,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = false
}) => {
    const { theme } = useTheme();

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: theme.menuBackground, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                    <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton, { backgroundColor: theme.card }]}
                            onPress={onCancel}
                        >
                            <Text style={[styles.buttonText, { color: theme.text }]}>{cancelText}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: isDestructive ? '#ef4444' : theme.primary }]}
                            onPress={onConfirm}
                        >
                            <Text style={[styles.buttonText, { color: 'white' }]}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    container: {
        width: '100%',
        maxWidth: 280,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center'
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 10,
        width: '100%'
    },
    button: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center'
    },
    cancelButton: {
        borderWidth: 0,
    },
    buttonText: {
        fontWeight: '600',
        fontSize: 14
    }
});
