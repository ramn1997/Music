# Music App

A comprehensive and feature-rich music player application built with React Native and Expo. This app allows you to manage and play your local music library with an intuitive and beautiful interface.

## Features

-   **Music Library Management**: Automatically scans and organizes your local music files.
-   **Navigation**: Browse by Songs, Albums, Artists, Genres, and Playlists.
-   **Smart Playlists**:
    -   **Favorites**: Quickly access your favorite tracks.
    -   **Most Played**: Automatically tracks your most listened-to songs.
    -   **Recently Added**: See the latest additions to your library.
    -   **Years**: Browse music by release year.
-   **Advanced Player**:
    -   Full playback controls (Play, Pause, Next, Previous, Seek).
    -   Background playback support.
    -   Shuffle and Repeat modes.
    -   Interactive player screen with album art.
-   **Playlist Management**: Create, edit, and delete custom playlists.
-   **Search**: fast and efficient search functionality to find songs, albums, or artists.
-   **Equalizer**: Customize your audio experience (if supported).
-   **Settings**: Configure app preferences.
-   **Modern UI**: Sleek and responsive design with smooth animations.

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
