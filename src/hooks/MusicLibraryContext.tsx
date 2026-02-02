import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import * as MediaLibrary from 'expo-media-library';
import { Alert, Platform, Linking } from 'react-native';

export type Song = {
    id: string;
    filename: string;
    uri: string;
    duration: number;
    title: string;
    artist: string;
    album?: string;
    year?: string;
    genre?: string;
    albumId?: string;
    coverImage?: string;
    dateAdded?: number;
    playCount?: number;
};

interface MusicLibraryContextType {
    songs: Song[];
    loading: boolean;
    hasPermission: boolean | undefined;
    fetchMusic: () => Promise<void>;
}

const MusicLibraryContext = createContext<MusicLibraryContextType | null>(null);

export const MusicLibraryProvider = ({ children }: { children: ReactNode }) => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean | undefined>(undefined);

    const fetchMusic = useCallback(async () => {
        setLoading(true);
        try {
            // Check existing permissions first
            const permission = await MediaLibrary.getPermissionsAsync();
            let finalStatus = permission.status;

            // If not granted but can ask, request it
            if (finalStatus !== 'granted' && permission.canAskAgain) {
                const { status } = await MediaLibrary.requestPermissionsAsync();
                finalStatus = status;
            }

            setHasPermission(finalStatus === 'granted');

            if (finalStatus === 'granted') {
                const media = await MediaLibrary.getAssetsAsync({
                    mediaType: MediaLibrary.MediaType.audio,
                    first: 1000, // Increased limit
                    sortBy: [MediaLibrary.SortBy.modificationTime]
                });

                if (media.assets.length > 0) {
                    const mappedSongs: Song[] = media.assets.map(asset => {
                        const nameParts = asset.filename.replace(/\.[^/.]+$/, "").split('-');
                        let title = asset.filename.replace(/\.[^/.]+$/, "");
                        let artist = 'Unknown Artist';

                        if (nameParts.length > 1) {
                            artist = nameParts[0].trim();
                            title = nameParts.slice(1).join('-').trim();
                        }

                        // Use available metadata if present, fallback to filename parsing
                        return {
                            id: asset.id,
                            filename: asset.filename,
                            uri: asset.uri,
                            duration: asset.duration * 1000,
                            title: title, // You could also try to read ID3 tags here using expo-av if needed, but filename is faster for basic scan
                            artist: artist,
                            album: 'Unknown Album',
                            dateAdded: asset.modificationTime * 1000,
                            playCount: 0
                        };
                    });
                    setSongs(mappedSongs);
                } else {
                    setSongs([]);
                    // Optional: Don't alert on empty, just show empty state in UI
                    console.log('No music files found');
                }
            } else {
                // If denied and cannot ask again (or just denied), explain why
                Alert.alert(
                    'Permission Required',
                    'This app needs access to your audio files to function.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Open Settings',
                            onPress: () => {
                                if (Platform.OS === 'ios') {
                                    Linking.openURL('app-settings:');
                                } else {
                                    Linking.openSettings();
                                }
                            }
                        }
                    ]
                );
            }
        } catch (error) {
            console.error("Error fetching music:", error);
            Alert.alert('Error', 'An error occurred while scanning for music.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-fetch on mount
    React.useEffect(() => {
        fetchMusic();
    }, [fetchMusic]);

    return (
        <MusicLibraryContext.Provider value={{ songs, loading, hasPermission, fetchMusic }}>
            {children}
        </MusicLibraryContext.Provider>
    );
};

export const useMusicLibrary = () => {
    const context = useContext(MusicLibraryContext);
    if (!context) {
        throw new Error('useMusicLibrary must be used within a MusicLibraryProvider');
    }
    return context;
};
