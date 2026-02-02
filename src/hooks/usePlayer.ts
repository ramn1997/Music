import { useState, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';
import { Song } from './useLocalMusic';

export const usePlayer = () => {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSong, setCurrentSong] = useState<Song | null>(null);
    const [playlist, setPlaylist] = useState<Song[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(-1);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    const loadSound = async (song: Song, autoPlay = true) => {
        try {
            if (sound) {
                await sound.unloadAsync();
            }

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: song.uri },
                { shouldPlay: autoPlay }
            );

            setSound(newSound);
            setCurrentSong(song);
            setIsPlaying(autoPlay);

            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded) {
                    setPosition(status.positionMillis);
                    setDuration(status.durationMillis || 0);
                    setIsPlaying(status.isPlaying);

                    if (status.didJustFinish) {
                        nextTrack();
                    }
                }
            });

        } catch (error) {
            console.error('Error loading sound:', error);
        }
    };

    const playPause = async () => {
        if (sound) {
            if (isPlaying) {
                await sound.pauseAsync();
            } else {
                await sound.playAsync();
            }
        } else if (currentSong) {
            loadSound(currentSong);
        }
    };

    const nextTrack = () => {
        if (currentIndex < playlist.length - 1) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            loadSound(playlist[nextIndex]);
        }
    };

    const prevTrack = () => {
        if (currentIndex > 0) {
            const prevIndex = currentIndex - 1;
            setCurrentIndex(prevIndex);
            loadSound(playlist[prevIndex]);
        }
    };

    const playSongInPlaylist = (songs: Song[], index: number) => {
        setPlaylist(songs);
        setCurrentIndex(index);
        loadSound(songs[index]);
    };

    const seek = async (positionMillis: number) => {
        if (sound) {
            await sound.setPositionAsync(positionMillis);
        }
    };

    return {
        sound,
        isPlaying,
        currentSong,
        position,
        duration,
        playPause,
        nextTrack,
        prevTrack,
        playSongInPlaylist,
        seek,
    };
};
