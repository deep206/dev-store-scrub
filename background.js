// Listen for the keyboard shortcut command
chrome.commands.onCommand.addListener((command) => {
    if (command === "open-extension") {
        // Open the extension popup
        chrome.action.openPopup();
    }
}); 