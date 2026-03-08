import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SafeApp() {
    return (
        <View style={styles.center}>
            <Text style={styles.text}>React Native 0.81 Safe Mode</Text>
            <Text style={styles.subtext}>Initialization in progress...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
    text: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    subtext: { color: '#94a3b8', marginTop: 10 }
});
