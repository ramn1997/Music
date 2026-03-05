export type RootStackParamList = {
    Home: undefined;
    Playlist: { id: string; name: string; type: 'local' | 'playlist' | 'artist' | 'album' | 'genre' | 'most_played' | 'recently_played' | 'never_played' | 'recently_added' | 'year' };
    Player: { trackIndex: number; playlistId?: string };
    Settings: undefined;
    Songs: undefined;
    Albums: undefined;
    Artists: undefined;
    MostPlayed: undefined;
    RecentlyAdded: undefined;
    SearchMain: undefined;
    Playlists: undefined;
    PlaylistsMain: undefined;
    Favorites: undefined;
    FavoritesMain: undefined;
    Library: undefined;
    LibraryMain: undefined;
    About: undefined;
    Queue: undefined;
};

declare global {
    namespace ReactNavigation {
        interface RootParamList extends RootStackParamList { }
    }
}
