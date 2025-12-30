# Tabs Manager

![Version](https://img.shields.io/badge/version-3.0-blue.svg)
![License](https://img.shields.io/badge/license-Apache%202.0-green.svg)

Tabs Manager is a powerful and lightweight Chrome extension designed to help you efficiently manage your browser tabs. With features like visual thumbnails, advanced grouping by domain, and instant search, it transforms how you navigate the web.

## Key Features

- **Visual Thumbnails**: Get a bird's-eye view of all open tabs with auto-updating thumbnails.
- **Smart Grouping**: Automatically groups tabs by domain, making it easy to find related pages.
- **Multi-Window Support**: Seamlessly manage tabs across multiple Chrome windows.
- **Instant Search**: Quickly filter tabs by title or URL using the built-in search bar.
- **Zoom Preview**: Hover over any thumbnail to see a larger, detailed preview.
- **Drag & Drop**: (Planned) Reorder tabs easily.
- **Privacy Focused**: Your data stays on your device. We do not track your browsing history.

## Installation

### For Users
1.  **Download**: Get the latest version from the releases page (if available) or clone this repository.
2.  **Load Unpacked**:
    -   Open Chrome and navigate to `chrome://extensions`.
    -   Enable "Developer mode" in the top right corner.
    -   Click "Load unpacked" and select the directory where you cloned/downloaded this repository.

## Usage Guide

-   **Opening the Manager**: Click the Tabs Manager icon in your browser toolbar.
-   **Searching**: Start typing in the "Filter by..." box to narrow down tabs.
-   **Closing Tabs**: Click the trash icon on a tab card to close it. You can also close an entire group.
-   **Switching Tabs**: Click anywhere on a tab's card to jump to it.
-   **Options**: Click the gear icon to customize settings, such as thumbnail size.

## Development

This project is built with:
-   **HTML5 & CSS3**: For structure and styling (using specific libraries like Bootstrap and Material Design Lite).
-   **Vanilla JavaScript**: Core logic for tab management and interaction.
-   **Chrome Extensions API**: Manifest V3.

### Project Structure
-   `manifest.json`: Extension configuration.
-   `js/`: JavaScript logic (background service worker, content scripts, UI builders).
-   `css/`: Stylesheets.
-   `img/`: Icons and assets.

## Contributing

We welcome contributions from the community! Whether it's fixing a bug, improving documentation, or adding a new feature, your help is appreciated. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

Tabs Manager is open-source software licensed under the [Apache License 2.0](LICENSE).

---

**Feedback & Support:**
-   **Email**: [tabsmanagers@gmail.com](mailto:tabsmanagers@gmail.com?Subject=Feedback)
-   **GitHub**: [Report Issues](https://github.com/islamElbanna/Tabs-Manager/issues)
