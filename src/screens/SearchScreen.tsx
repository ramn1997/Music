import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalMusic, Song } from '../hooks/useLocalMusic';
import { ScreenContainer } from '../components/ScreenContainer';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../hooks/ThemeContext';

export const SearchScreen = () => {
    const [query, setQuery] = useState('');
    const { songs, fetchMusic } = useLocalMusic();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { theme } = useTheme();

    useEffect(() => {
        fetchMusic();
    }, [fetchMusic]);

    const filteredSongs = songs.filter(s =>
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        s.artist.toLowerCase().includes(query.toLowerCase()) ||
        (s.album && s.album.toLowerCase().includes(query.toLowerCase()))
    );

    const renderItem = ({ item, index }: { item: Song, index: number }) => (
        <TouchableOpacity
            style={styles.resultItem}
            onPress={() => navigation.navigate('Player', { trackIndex: index })}
        >
            <View style={[styles.iconContainer, { backgroundColor: theme.card }]}>
                <Ionicons name="musical-note" size={20} color={theme.textSecondary} />
            </View>
            <View>
                <Text style={[styles.resultTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.resultSubtitle, { color: theme.textSecondary }]}>{item.artist} • {item.album || 'Single'}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <ScreenContainer variant="default">
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Search</Text>
            </View>

            <View style={[styles.searchBar, { backgroundColor: theme.card }]}>
                <Ionicons name="search" size={18} color={theme.textSecondary} />
                <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Artists, Songs, or Albums"
                    placeholderTextColor={theme.textSecondary}
                    value={query}
                    onChangeText={setQuery}
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={() => setQuery('')}>
                        <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={query ? filteredSongs : []}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                ListEmptyComponent={
                    query ? (
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No results found.</Text>
                    ) : (
                        <View style={styles.placeholderContainer}>
                            <Ionicons name="musical-notes-outline" size={80} color={theme.textSecondary + '40'} />
                            <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>Find your favorite music</Text>
                        </View>
                    )
                }
            />
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1, paddingHorizontal: 20 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginVertical: 20,
    },
    backButton: {
        marginRight: 15,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    searchBar: {
        flexDirection: 'row',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignItems: 'center',
        marginBottom: 20,
        marginHorizontal: 20,
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)'
    },
    iconContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        marginRight: 15
    },
    resultTitle: {
        fontSize: 16,
        fontWeight: '500'
    },
    resultSubtitle: {
        fontSize: 14
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
        opacity: 0.7
    },
    placeholderText: {
        fontSize: 16,
        marginTop: 20
    }
});
