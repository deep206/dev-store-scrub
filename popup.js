class StorageManager {
    constructor() {
        this.checkboxes = {};
        this.statusDiv = null;
        this.init();
    }

    async init() {
        await this.loadUIConfig();
        this.attachEventListeners();
    }

    async loadUIConfig() {
        try {
            const response = await fetch(chrome.runtime.getURL('config/ui-config.json'));
            const config = await response.json();
            this.renderUI(config);
        } catch (error) {
            console.error('Error loading UI config:', error);
        }
    }

    createElement(config) {
        if (config.type === 'text') {
            return document.createTextNode(config.content);
        }

        const element = document.createElement(config.type);

        if (config.class) {
            element.className = config.class;
        }

        if (config.attributes) {
            Object.entries(config.attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
        }

        if (config.text) {
            element.textContent = config.text;
        }

        if (config.children) {
            config.children.forEach(childConfig => {
                const childElement = this.createElement(childConfig);
                element.appendChild(childElement);
            });
        }

        return element;
    }

    renderUI(config) {
        const container = document.getElementById('app');
        container.innerHTML = '';
        
        // Create main container
        const mainContainer = document.createElement('div');
        mainContainer.className = 'container';

        Object.values(config).forEach(elementConfig => {
            const element = this.createElement(elementConfig);
            mainContainer.appendChild(element);
        });

        container.appendChild(mainContainer);

        // Store references to important elements
        this.statusDiv = document.getElementById('status');
        this.checkboxes = {
            sessionStorage: document.getElementById('sessionStorage'),
            localStorage: document.getElementById('localStorage'),
            cookies: document.getElementById('cookies')
        };
    }

    showStatus(message, isError = false) {
        this.statusDiv.textContent = message;
        this.statusDiv.className = `status ${isError ? 'error' : 'success'}`;
        setTimeout(() => {
            this.statusDiv.textContent = '';
            this.statusDiv.className = 'status';
        }, 3000);
    }

    showLoading() {
        this.statusDiv.innerHTML = '<span class="loading"></span>Processing...';
    }

    async clearStorage() {
        const activeTab = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = activeTab[0].id;
        const url = new URL(activeTab[0].url);
        const domain = url.hostname;

        try {
            if (this.checkboxes.sessionStorage.checked) {
                await chrome.scripting.executeScript({
                    target: { tabId },
                    func: () => window.sessionStorage.clear()
                });
            }

            if (this.checkboxes.localStorage.checked) {
                await chrome.scripting.executeScript({
                    target: { tabId },
                    func: () => window.localStorage.clear()
                });
            }

            if (this.checkboxes.cookies.checked) {
                // Get all cookies for the domain and its subdomains
                const cookies = await chrome.cookies.getAll({
                    domain: domain,
                    path: '/'
                });

                if (cookies.length === 0) {
                    // Try getting cookies without domain restriction
                    const allCookies = await chrome.cookies.getAll({});
                    
                    // Filter cookies that belong to the current domain
                    const domainCookies = allCookies.filter(cookie => {
                        return cookie.domain === domain || 
                            cookie.domain === `.${domain}` || 
                            domain.endsWith(cookie.domain);
                    });
                    
                    // Remove filtered cookies
                    for (const cookie of domainCookies) {
                        const protocol = cookie.secure ? 'https' : 'http';
                        const cookieUrl = `${protocol}://${cookie.domain}${cookie.path}`;
                        
                        await chrome.cookies.remove({
                            url: cookieUrl,
                            name: cookie.name
                        });
                    }
                } else {
                    // Remove cookies found with domain restriction
                    for (const cookie of cookies) {
                        const protocol = cookie.secure ? 'https' : 'http';
                        const cookieUrl = `${protocol}://${cookie.domain}${cookie.path}`;
                        
                        await chrome.cookies.remove({
                            url: cookieUrl,
                            name: cookie.name
                        });
                    }
                }
            }

            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            return false;
        }
    }

    async handleClear(reload = false) {
        this.showLoading();
        const success = await this.clearStorage();
        
        if (success) {
            if (reload) {
                this.showStatus('Storage cleared and page reloaded successfully!');
                const activeTab = await chrome.tabs.query({ active: true, currentWindow: true });
                chrome.tabs.reload(activeTab[0].id);
            } else {
                this.showStatus('Storage cleared successfully!');
            }
        } else {
            this.showStatus('Error clearing storage', true);
        }
    }

    attachEventListeners() {
        document.getElementById('clearBtn').addEventListener('click', () => this.handleClear(false));
        document.getElementById('clearReloadBtn').addEventListener('click', () => this.handleClear(true));
    }
}

// Initialize the extension when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new StorageManager();
}); 