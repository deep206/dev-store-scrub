# Dev Store Scrub

A simple yet powerful browser extension for developers to manage application storage in Chrome and Edge browsers. This tool provides a simple interface to clear and manage session storage, local storage, and cookies directly from the browser toolbar.

## Features

### MVP Features

-   Clear individual or combined storage types:
    -   Session Storage
    -   Local Storage
    -   Cookies
-   Clear & Reload functionality:
    -   Clear selected storage types
    -   Automatically reload the page
-   Simple and intuitive user interface
-   Cross-browser support (Chrome & Edge)

## Installation

_Coming soon - Extension will be available on Chrome Web Store and Microsoft Edge Add-ons_

## Development Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/dev-store-scrub.git
cd dev-store-scrub
```

2. Load the extension in your browser:
    - Chrome: Navigate to `chrome://extensions/`, enable "Developer mode", click "Load unpacked"
    - Edge: Navigate to `edge://extensions/`, enable "Developer mode", click "Load unpacked"
    - Select the extension directory

## Usage

1. Click the extension icon in your browser toolbar
2. Select the storage types you want to manage using checkboxes
3. Choose your action:
    - "Clear" - Clears selected storage types
    - "Clear & Reload" - Clears selected storage types and reloads the page

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Roadmap

-   [ ] Add search functionality for storage items
-   [ ] Add ability to view storage contents
-   [ ] Add support for IndexedDB
-   [ ] Add keyboard shortcuts
-   [ ] Add dark mode support
-   [ ] Add customizable presets for common combinations
