/**
 * @file Background script for the Comic Dubber extension.
 * Handles installation, default settings, and backend communication.
 */

// --- CONFIGURATION ---
const DEFAULT_SETTINGS = {
    voiceIndex: 0,
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    batchSize: 5,
    backendUrl: "https://visual-web-comic-dubber.onrender.com",
};

// --- EVENT LISTENERS ---

/**
 * Handles the extension's installation or update.
 * Sets default settings and opens the popup on first install.
 */
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        console.log("Extension installed. Setting default values.");
        // Set default settings in chrome.storage.sync
        chrome.storage.sync.set(DEFAULT_SETTINGS, () => {
            console.log("Default settings saved.");
        });

        // Open the main popup UI for the user to configure settings
        chrome.tabs.create({
            url: "popup.html",
        });
    }
});

/**
 * Listens for messages from other parts of the extension,
 * primarily for checking the backend server's status.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "checkBackendStatus") {
        // Asynchronously check the backend status and respond
        checkBackendStatus(message.backendUrl)
            .then(status => sendResponse({ status }))
            .catch(error => sendResponse({ status: "error", message: error.message }));

        return true; // Indicates an asynchronous response
    }
});

// --- HELPER FUNCTIONS ---

/**
 * Checks the health of the backend OCR service.
 * @param {string} backendUrl - The base URL of the backend service.
 * @returns {Promise<string>} A promise that resolves to "online", "offline", or "error".
 */
async function checkBackendStatus(backendUrl) {
    if (!backendUrl || !backendUrl.startsWith("http")) {
        console.error("Invalid backend URL provided:", backendUrl);
        return "error";
    }

    try {
        const healthCheckUrl = `${backendUrl}/health`;
        console.log(`Pinging backend at: ${healthCheckUrl}`);

        const response = await fetch(healthCheckUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (response.ok) {
            console.log("Backend is online.");
            return "online";
        } else {
            console.warn(`Backend returned a non-OK status: ${response.status}`);
            return "error";
        }
    } catch (error) {
        console.error("Failed to connect to the backend:", error);
        return "offline";
    }
}
