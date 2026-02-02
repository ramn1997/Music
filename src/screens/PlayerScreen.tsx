import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
// Removed Slider import as we are using custom view for now

import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';

import { usePlayerContext } from '../hooks/PlayerContext';
import { useTheme } from '../hooks/ThemeContext';
import { ScreenContainer } from '../components/ScreenContainer';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

const { width } = Dimensions.get('window');

export const PlayerScreen = ({ route, navigation }: Props) => {
    const {
        currentSong,
        isPlaying,
        playPause,
        nextTrack,
        prevTrack,
        position,
        duration,
        seek
    } = usePlayerContext();
    const { theme } = useTheme();
    const [barWidth, setBarWidth] = useState(0);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt, gestureState) => {
                handleSeek(evt.nativeEvent.locationX);
            },
            onPanResponderMove: (evt, gestureState) => {
                handleSeek(evt.nativeEvent.locationX);
            },
        })
    );

    const handleSeek = (locX: number) => {
        if (barWidth > 0) {
            const newProgress = Math.min(Math.max(locX / barWidth, 0), 1);
            seek(newProgress * duration);
        }
    };

    const progress = duration > 0 ? position / duration : 0;

    const formatTime = (millis: number) => {
        if (!millis) return "0:00";
        const minutes = Math.floor(millis / 60000);
        const seconds = ((millis % 60000) / 1000).toFixed(0);
        return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <ScreenContainer variant="player">
            <SafeAreaView style={styles.safeArea}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-down" size={30} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Now Playing</Text>
                    <TouchableOpacity>
                        <Ionicons name="ellipsis-horizontal" size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>

                {/* Album Art */}
                <View style={styles.artContainer}>
                    <GlassCard style={styles.artCard}>
                        {currentSong?.coverImage ? (
                            <Image source={{ uri: currentSong.coverImage }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                            <View style={styles.placeholderArt}>
                                <Ionicons name="musical-note" size={100} color={colors.primary} />
                            </View>
                        )}
                    </GlassCard>
                </View>

                {/* Info */}
                <View style={styles.infoContainer}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.songTitle, { color: theme.text }]} numberOfLines={1}>{currentSong?.title || "Not Playing"}</Text>
                        <Text style={[styles.artistName, { color: theme.primary }]} numberOfLines={1}>{currentSong?.artist || "Select a song"}</Text>
                        <Text style={[styles.albumName, { color: theme.textSecondary }]} numberOfLines={1}>{currentSong?.album || "Unknown Album"}</Text>
                        <View style={styles.metaRow}>
                            {currentSong?.year && <Text style={[styles.metaText, { color: theme.secondary }]}>{currentSong.year}</Text>}
                            {currentSong?.genre && <Text style={[styles.metaText, { color: theme.textSecondary, marginLeft: 10 }]}>{currentSong.genre}</Text>}
                        </View>
                    </View>
                    <TouchableOpacity>
                        <Ionicons name="thumbs-up-outline" size={28} color={theme.primary} />
                    </TouchableOpacity>
                </View>

                {/* Progress */}
                <View style={styles.progressContainer}>
                    <View
                        style={styles.progressBarBg}
                        onLayout={(e) => {
                            const { width } = e.nativeEvent.layout;
                            setBarWidth(width);
                        }}
                        {...panResponder.current.panHandlers}
                    >
                        <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: theme.primary }]} />
                        <View style={[styles.progressKnob, { left: `${progress * 100}%`, backgroundColor: theme.text }]} />
                    </View>
                    <View style={styles.timeContainer}>
                        <Text style={[styles.timeText, { color: theme.textSecondary }]}>{formatTime(position)}</Text>
                        <Text style={[styles.timeText, { color: theme.textSecondary }]}>{formatTime(duration)}</Text>
                    </View>
                </View>

                {/* Controls */}
                <View style={styles.controlsContainer}>
                    <TouchableOpacity>
                        <Ionicons name="shuffle" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={prevTrack}>
                        <Ionicons name="play-skip-back" size={36} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.playButton}
                        onPress={playPause}
                    >
                        <Ionicons name={isPlaying ? "pause" : "play"} size={36} color={colors.background} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={nextTrack}>
                        <Ionicons name="play-skip-forward" size={36} color={theme.text} />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Ionicons name="repeat" size={24} color={theme.textSecondary} />
                    </TouchableOpacity>
                </View>

            </SafeAreaView>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1, paddingHorizontal: 20, justifyContent: 'space-between', paddingBottom: 40 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    headerTitle: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '600',
    },
    artContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 30,
    },
    artCard: {
        width: width - 80,
        height: width - 80,
        padding: 0,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    placeholderArt: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(139, 92, 246, 0.2)', // primary color low opacity
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    songTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 5,
    },
    artistName: {
        fontSize: 18,
        color: colors.textSecondary,
    },
    progressContainer: {
        marginBottom: 40,
    },
    progressBarBg: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 2,
        marginBottom: 10,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 2,
    },
    progressKnob: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.text,
        position: 'absolute',
        top: -4,
        marginLeft: -6,
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    timeText: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    controlsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    albumName: {
        fontSize: 16,
        marginTop: 4,
    },
    metaRow: {
        flexDirection: 'row',
        marginTop: 6,
    },
    metaText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    playButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
    },
});
