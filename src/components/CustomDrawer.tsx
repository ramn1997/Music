import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    TouchableOpacity,
    TouchableWithoutFeedback,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

interface CustomDrawerProps {
    children: React.ReactNode;
}

// Global reference to open the drawer
export let openDrawerGlobal: () => void = () => { };

export const CustomDrawer: React.FC<CustomDrawerProps> = ({ children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const animation = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const { theme } = useTheme();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const openDrawer = () => {
        setIsVisible(true);
        Animated.timing(animation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const closeDrawer = () => {
        Animated.timing(animation, {
            toValue: -DRAWER_WIDTH,
            duration: 250,
            useNativeDriver: true,
        }).start(() => setIsVisible(false));
    };

    // Assign to global ref
    openDrawerGlobal = openDrawer;

    const navigateTo = (screen: keyof RootStackParamList) => {
        closeDrawer();
        navigation.navigate(screen as any);
    };

    return (
        <View style={styles.container}>
            {children}

            {isVisible && (
                <TouchableWithoutFeedback onPress={closeDrawer}>
                    <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
                </TouchableWithoutFeedback>
            )}

            <Animated.View
                style={[
                    styles.drawer,
                    {
                        backgroundColor: theme.background,
                        transform: [{ translateX: animation }],
                        borderRightColor: theme.cardBorder || 'rgba(255,255,255,0.1)',
                        borderRightWidth: 1,
                    },
                ]}
            >
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.header}>
                        <View style={[styles.profilePic, { backgroundColor: theme.primary }]}>
                            <Ionicons name="person" size={40} color="#fff" />
                        </View>
                        <Text style={[styles.userName, { color: theme.text }]}>Music Explorer</Text>
                        <Text style={[styles.userEmail, { color: theme.textSecondary }]}>v1.0.0</Text>
                    </View>

                    <View style={styles.menuItems}>
                    </View>

                    <TouchableOpacity style={styles.footer} onPress={closeDrawer}>
                        <Ionicons name="close-circle-outline" size={24} color={theme.textSecondary} />
                        <Text style={[styles.footerText, { color: theme.textSecondary }]}>Close Menu</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
    },
    drawer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: DRAWER_WIDTH,
        zIndex: 20,
        paddingTop: 20,
    },
    safeArea: { flex: 1 },
    header: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        marginBottom: 20,
    },
    profilePic: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userName: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    userEmail: {
        fontSize: 14,
        marginTop: 4,
    },
    menuItems: {
        paddingHorizontal: 10,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderRadius: 12,
        marginBottom: 5,
    },
    menuText: {
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 15,
    },
    footer: {
        marginTop: 'auto',
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    footerText: {
        marginLeft: 10,
        fontSize: 14,
    }
});
