export type RootStackParamList = {
    Home: undefined;
    Playlist: { id: string; name: string; type: 'local' | 'playlist' | 'artist' | 'album' | 'genre' | 'most_played' | 'recently_played' | 'never_played' };
    Player: { trackIndex: number; playlistId?: string };
    Settings: undefined;
    Songs: undefined;
    Albums: undefined;
    Artists: undefined;
    Genres: undefined;
    MostPlayed: undefined;
    RecentlyAdded: undefined;
    Search: undefined;
    Playlists: undefined;
};

declare global {
    namespace ReactNavigation {
        interface RootParamList extends RootStackParamList { }
    }
}
