# Music App

A comprehensive and feature-rich music player application built with React Native and Expo. This app allows you to manage and play your local music library with an intuitive and beautiful interface.

## Features

-   **Music Library Management**: Automatically scans and organizes your local music files with background metadata enhancement.
-   **Advanced Performance**: Efficient caching and background calculations for instant loading of Top Artists and Recently Played lists.
-   **Navigation**: Browse by Songs, Albums, Artists, Genres, and Playlists via a sleek bottom navigation bar with modernized icons.
-   **Smart Playlists**:
    -   **Favorites**: Quickly access your favorite tracks.
    -   **Recently Played**: Instant access to your listening history.
    -   **Recently Added**: See the latest additions to your library.
    -   **Never Played**: Discover tracks you haven't heard yet.
-   **Advanced Player**:
    -   Full playback controls (Play, Pause, Next, Previous, Seek).
    -   Background playback support.
    -   Shuffle and Repeat modes.
    -   Interactive player screen with high-quality album art display.
-   **Customization**: Premium "Dark-Blackish" themes (Deep Emerald, Midnight Purple, True Black) for a sophisticated look.
-   **Playlist Management**: Create, edit, rename and delete custom playlists directly in the app.
-   **Search**: fast and efficient search functionality to find songs, albums, or artists.
-   **Equalizer**: Customize your audio experience (if supported).
-   **Settings**: Configure app preferences.
-   **Modern UI**: Premium and responsive design with smooth animations and glassmorphism elements.

## Tech Stack

-   **Framework**: [React Native](https://reactnative.dev/)
-   **Platform**: [Expo](https://expo.dev/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Navigation**: [React Navigation](https://reactnavigation.org/)
-   **State/Data Management**:
    -   `expo-sqlite` for local database storage.
    -   `expo-media-library` for accessing device media files.
-   **Audio Playback**: `react-native-track-player` / `expo-av`
-   **UI Components**: Custom components with `react-native-reanimated` for animations.
-   **Icons**: `@expo/vector-icons`

## Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/ramn1997/Music.git
    cd Music
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Run the application**:
    ```bash
    npx expo start
    ```
    -   Scan the QR code with the Expo Go app on your Android or iOS device.
    -   Or press `a` to run on an Android emulator, `i` for iOS simulator.

## Development

This project uses `patch-package` to handle any necessary patches to node modules. Ensure `postinstall` scripts run after installation.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT](LICENSE)
