# Music

A premium, comprehensive, and feature-rich music player application built with React Native and Expo. Designed for audiophiles who value aesthetics, performance, and complete control over their local library.

## ✨ New in v1.2.0

-   **Dolby Audio integration**: Immerse yourself with the new premium Dolby Codec and Ultra Quality Engine options, togglable in the new equalizer settings.
-   **Equalizer Overhaul**: A modern, sleek, and minimalist redesign for precise acoustic control.
-   **Zero-Flicker Artist Imagery**: Synchronous in-memory caches paired with background synchronization completely eliminates artist image loading flickers on the Home Screen.
-   **Peak UI Scrolling Performance**: Replaced legacy default lists (`FlatList`) with Shopify's `FlashList` on Favorites, Years, and Most Played screens.
-   **React Lifecycle Tuning**: Re-architected rendering procedures with `React.memo` and stable callbacks (`React.useCallback`) across the entire Home Screen and list modules, drastically cutting CPU overhead.

## ✨ Highlights from v1.1.0

-   **Artist Image Customization**: Personalize your library by picking artist images from your gallery, searching the web (Deezer API), or resetting to defaults.
-   **Deep Meta-Scan**: Enhanced metadata engine that fetches high-resolution (600x600px) artwork and detailed song info from the iTunes API.
-   **Lyrics Integration**: Search for and save synchronized or static lyrics using LRCLIB and OVH fallback. Edit lyrics manually for perfect accuracy.

## 🚀 Features

-   **Music Library Management**: Automatically scans and organizes local music by Artists, Albums, and Genres.
-   **Smart Library Engine**: High-performance background metadata enhancement and instant loading for heavy collections.
-   **Listening History**: 
    *   **Most Played**: Automatically generated based on your play counts.
    *   **Recently Played**: Quick access to your latest tracks.
    *   **Recently Added**: See your newest music at a glance.
    *   **Never Played**: Re-discover forgotten gems in your library.
-   **Premium Theming**: Choose from stunning themes including **Glassmorphism**, **Deep Blue**, **Purple**, **Emerald**, and **True Black**.
-   **Advanced Operations**:
    *   Batch scan and fix metadata issues.
    *   Create and manage custom playlists.
    *   Deep folder scanning for Internal and External SD Card storage.
-   **Native Experience**: High-quality audio playback with `react-native-track-player`, supporting notifications and lock-screen controls.

## 🛠 Tech Stack

-   **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Animations**: `react-native-reanimated` for smooth, high-fidelity transitions.
-   **Image Processing**: `expo-image-picker` and custom caching logic.
-   **APIs**:
    *   **iTunes Search API**: Metadata & Art.
    *   **Deezer API**: Artist Imagery.
    *   **LRCLIB / OVH**: Lyrics search.
-   **Storage**: `AsyncStorage` for user preferences and metadata persistence.

## 📦 Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/ramn1997/Music.git
    cd Music
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the application**:
    ```bash
    npx expo start
    ```
    -   Scan the QR code with the Expo Go app.
    -   Press `a` for Android or `i` for iOS.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

[MIT](LICENSE)
