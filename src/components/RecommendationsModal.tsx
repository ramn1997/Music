import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/ThemeContext';
import { useMusicLibrary, Song } from '../hooks/MusicLibraryContext';
import { MusicImage } from './MusicImage';
import { usePlayerStore } from '../store/usePlayerStore';

interface RecommendationsModalProps {
    visible: boolean;
    onClose: () => void;
    song: Song | null;
}

const splitArtists = (artistStr: string | undefined | null): string[] => {
    if (!artistStr || artistStr.trim() === '' || artistStr === 'Unknown Artist') return [];
    
    // Split by common separators (feat, ft, featuring, vs, and, &, comma, semicolon, slash)
    const normalized = artistStr
        .replace(/\s+(feat\.?|ft\.?|featuring|vs\.?|and|\&)\s+/gi, '|')
        .replace(/[,;\/]/g, '|');
        
    return normalized
        .split('|')
        .map(a => a.trim())
        .filter(a => a.length > 0 && a.toLowerCase() !== 'unknown artist');
};

export const RecommendationsModal = ({ visible, onClose, song }: RecommendationsModalProps) => {
    const { theme } = useTheme();
    const { songs } = useMusicLibrary();
    const playSongInPlaylist = usePlayerStore(state => state.playSongInPlaylist);
    const { width, height } = Dimensions.get('window');

    const recommended = useMemo(() => {
        if (!song || !songs) return { sameAlbum: [], sameArtist: [], sameGenre: [], sameYear: [] };

        const seedArtists = splitArtists(song.artist);

        const sameAlbum = songs.filter(s => s.album === song.album && s.album !== 'Unknown Album' && s.id !== song.id);
        
        const sameArtist = songs.filter(s => {
            if (s.id === song.id || s.album === song.album) return false;
            const candidateArtists = splitArtists(s.artist);
            return seedArtists.some(sa => 
                candidateArtists.some(ca => ca.toLowerCase() === sa.toLowerCase())
            );
        }).sort((a, b) => {
            const getMatchCount = (songItem: Song) => {
                const candidateArtists = splitArtists(songItem.artist);
                return seedArtists.filter(sa =>
                    candidateArtists.some(ca => ca.toLowerCase() === sa.toLowerCase())
                ).length;
            };
            return getMatchCount(b) - getMatchCount(a);
        });

        const sameGenre = songs.filter(s => {
            if (s.id === song.id || s.genre !== song.genre || s.genre === 'Unknown Genre') return false;
            const candidateArtists = splitArtists(s.artist);
            const sharesArtist = seedArtists.some(sa => 
                candidateArtists.some(ca => ca.toLowerCase() === sa.toLowerCase())
            );
            return !sharesArtist;
        });
        
        const sameYear = songs.filter(s => {
            if (!s.year || !song.year || s.id === song.id) return false;
            const y1 = s.year.toString().trim().slice(0, 4);
            const y2 = song.year.toString().trim().slice(0, 4);
            if (y1 !== y2 || y1.length !== 4) return false;
            
            const candidateArtists = splitArtists(s.artist);
            const sharesArtist = seedArtists.some(sa => 
                candidateArtists.some(ca => ca.toLowerCase() === sa.toLowerCase())
            );
            return !sharesArtist;
        });

        return {
            sameAlbum: sameAlbum.slice(0, 15),
            sameArtist: sameArtist.slice(0, 15),
            sameGenre: sameGenre.slice(0, 15),
            sameYear: sameYear.slice(0, 15)
        };
    }, [song, songs]);

    const handlePlay = (s: Song, playlist: Song[]) => {
        const fullPlaylist = [s, ...playlist.filter(p => p.id !== s.id)];
        playSongInPlaylist(fullPlaylist, 0, 'Recommendations');
        onClose();
    };

    const renderSongItem = (s: Song, playlist: Song[]) => (
        <TouchableOpacity
            key={s.id}
            style={styles.songCard}
            onPress={() => handlePlay(s, playlist)}
        >
            <View style={[styles.imageContainer, { backgroundColor: theme.card }]}>
                <MusicImage uri={s.coverImage} id={s.id} assetUri={s.uri} style={styles.image} />
            </View>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{s.title}</Text>
            <Text style={[styles.artist, { color: theme.textSecondary }]} numberOfLines={1}>{s.artist}</Text>
        </TouchableOpacity>
    );

    const hasRecommendations = recommended.sameAlbum.length > 0 || recommended.sameArtist.length > 0 || recommended.sameGenre.length > 0 || recommended.sameYear.length > 0;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.background, borderColor: theme.cardBorder, height: height * 0.8 }]}>
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.headerTitle, { color: theme.text }]}>Because you like</Text>
                            <Text style={[styles.headerSubtitle, { color: theme.primary }]} numberOfLines={1}>{song?.title || 'this song'}</Text>
                        </View>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Ionicons name="close-circle" size={30} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>


                    <ScrollView style={styles.scrollContainer} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                        {!hasRecommendations && (
                            <View style={styles.emptyState}>
                                <Ionicons name="musical-notes-outline" size={60} color={theme.textSecondary} style={{ opacity: 0.5 }} />
                                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Not enough data to recommend songs yet.</Text>
                            </View>
                        )}

                        {recommended.sameAlbum.length > 0 && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: theme.text }]}>More from {song?.album}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                                    {recommended.sameAlbum.map(s => renderSongItem(s, recommended.sameAlbum))}
                                </ScrollView>
                            </View>
                        )}

                        {recommended.sameArtist.length > 0 && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: theme.text }]}>More by {song?.artist}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                                    {recommended.sameArtist.map(s => renderSongItem(s, recommended.sameArtist))}
                                </ScrollView>
                            </View>
                        )}

                        {recommended.sameYear.length > 0 && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: theme.text }]}>Tracks from {song?.year?.toString().trim().slice(0, 4)}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                                    {recommended.sameYear.map(s => renderSongItem(s, recommended.sameYear))}
                                </ScrollView>
                            </View>
                        )}

                        {recommended.sameGenre.length > 0 && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: theme.text }]}>More {song?.genre || 'similar'} tracks</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                                    {recommended.sameGenre.map(s => renderSongItem(s, recommended.sameGenre))}
                                </ScrollView>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.85)',
    },
    modalContent: {
        width: '100%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: 30,
        paddingHorizontal: 0,
        borderWidth: 1,
        borderBottomWidth: 0,
        elevation: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 25,
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_500Medium',
        opacity: 0.8,
    },
    headerSubtitle: {
        fontSize: 24,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginTop: 2,
    },
    closeButton: {
        padding: 5,
    },
    scrollContainer: {
        flex: 1,
    },
    section: {
        marginBottom: 35,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 15,
        paddingHorizontal: 25,
    },
    horizontalScroll: {
        paddingHorizontal: 20,
        gap: 15,
    },
    songCard: {
        width: 140,
    },
    imageContainer: {
        width: 140,
        height: 140,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 10,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    title: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        marginBottom: 3,
    },
    artist: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
        opacity: 0.7,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        marginTop: 50,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_500Medium',
        marginTop: 15,
        textAlign: 'center',
    },
});
