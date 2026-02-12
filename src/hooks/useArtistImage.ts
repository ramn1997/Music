import { useState, useEffect } from 'react';
import { ArtistImageService } from '../services/ArtistImageService';

/**
 * Hook to fetch and cache artist image from Deezer
 * @param artistName Name of the artist
 * @returns The remote image URI if found, null otherwise
 */
export const useArtistImage = (artistName: string) => {
    const [imageUri, setImageUri] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const fetchImage = async () => {
            if (!artistName || artistName === 'Unknown Artist') return;

            // Try to get from service (Cache -> Queue -> API)
            const uri = await ArtistImageService.getArtistImage(artistName);

            if (mounted && uri) {
                setImageUri(uri);
            }
        };

        fetchImage();

        return () => { mounted = false; };
    }, [artistName]);

    return imageUri;
};
