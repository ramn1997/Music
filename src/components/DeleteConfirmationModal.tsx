import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../hooks/ThemeContext';
import { Song } from '../hooks/useLocalMusic';

interface DeleteConfirmationModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    song: Song | null;
    isDeleting?: boolean;
}

const { width } = Dimensions.get('window');

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    visible,
    onClose,
    onConfirm,
    song,
    isDeleting = false,
}) => {
    const { theme } = useTheme();

    if (!song) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={isDeleting ? undefined : onClose}
            >

                <View style={[styles.container, { backgroundColor: theme.menuBackground, borderColor: theme.cardBorder }]}>
                    <View style={styles.iconContainer}>
                        <View style={[styles.warningIcon, { backgroundColor: '#ef444420' }]}>
                            <Ionicons name="trash-outline" size={32} color="#ef4444" />
                        </View>
                    </View>

                    <Text style={[styles.title, { color: theme.text }]}>Delete from Device?</Text>
                    <Text style={[styles.message, { color: theme.textSecondary }]}>
                        <Text style={{ color: theme.text, fontFamily: 'PlusJakartaSans_700Bold' }}>"{song.title}"</Text> will be permanently removed from your device. This action cannot be undone.
                    </Text>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton, { backgroundColor: theme.textSecondary + '10' }]}
                            onPress={onClose}
                            disabled={isDeleting}
                        >
                            <Text style={[styles.buttonText, { color: theme.text }]}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.deleteButton]}
                            onPress={onConfirm}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={[styles.buttonText, { color: '#fff' }]}>Delete</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 32,
        padding: 28,
        borderWidth: 1,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 15,
    },
    iconContainer: {
        marginBottom: 20,
    },
    warningIcon: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontFamily: 'PlusJakartaSans_700Bold',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    message: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_500Medium',
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 32,
        paddingHorizontal: 10,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    button: {
        flex: 1,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        // Subtle background
    },
    deleteButton: {
        backgroundColor: '#ef4444',
    },
    buttonText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
});
