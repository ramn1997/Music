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
    lastPlayed?: number;
    playHistory?: number[];
    addedToPlaylistAt?: number;
    scanStatus?: string;
    folder?: string;
    lyrics?: string;
};

export type Playlist = {
    id: string;
    name: string;
    songs: Song[];
    createdAt: number;
    isSpecial?: boolean;
    isFavorite?: boolean;
};

export type ArtistMetadata = {
    coverImage?: string;
    bio?: string;
};
