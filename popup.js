class UIManager {
    constructor() {
        this.checkboxes = {};
        this.statusDiv = null;
        this.searchManager = null;
        this.init();
    }

    async init() {
        await this.loadUIConfig();
        this.attachEventListeners();
        // Initialize SearchManager after UI is created
        this.searchManager = new SearchManager();
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

        // Add title
        const title = this.createElement(config.title);
        mainContainer.appendChild(title);

        // Add tabs
        const tabs = this.createElement(config.tabs);
        mainContainer.appendChild(tabs);

        // Add tab contents
        const clearTab = this.createElement(config.clearTab);
        mainContainer.appendChild(clearTab);

        const searchTab = this.createElement(config.searchTab);
        mainContainer.appendChild(searchTab);

        // Add footer
        const footer = this.createElement(config.footer);
        mainContainer.appendChild(footer);

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
        // Clear tab event listeners
        document.getElementById('clearBtn').addEventListener('click', () => this.handleClear(false));
        document.getElementById('clearReloadBtn').addEventListener('click', () => this.handleClear(true));

        // Tab switching functionality
        const tabButtons = document.querySelectorAll('.tab-btn');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons and content
                document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked button and corresponding content
                button.classList.add('active');
                const tabId = button.getAttribute('data-tab');
                document.getElementById(`${tabId}-tab`).classList.add('active');
            });
        });
    }
}

class SearchManager {
    constructor() {
        this.init();
    }

    init() {
        // Wait for the next tick to ensure UI elements are created
        setTimeout(() => {
            this.storageType = document.getElementById('storageType');
            this.searchInput = document.getElementById('searchInput');
            this.searchBtn = document.getElementById('searchBtn');
            this.clearSearchBtn = document.getElementById('clearSearchBtn');
            this.filterType = document.querySelector('input[name="filterType"]:checked').value;
            this.resultsTable = document.getElementById('resultsTable').querySelector('tbody');
            
            this.attachEventListeners();
        }, 0);
    }

    attachEventListeners() {
        if (!this.searchBtn || !this.searchInput || !this.clearSearchBtn) {
            console.error('Search UI elements not found');
            return;
        }

        this.searchBtn.addEventListener('click', () => this.performSearch());
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        document.querySelectorAll('input[name="filterType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.filterType = e.target.value;
            });
        });

        // Add event listener for storage type change
        this.storageType.addEventListener('change', () => {
            this.clearSearch();
        });

        // Add event listener for clear button
        this.clearSearchBtn.addEventListener('click', () => {
            this.clearSearch();
        });
    }

    clearSearch() {
        this.searchInput.value = '';
        this.resultsTable.innerHTML = '';
    }

    async performSearch() {
        const searchText = this.searchInput.value.toLowerCase();
        if (!searchText) return;

        const activeTab = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = activeTab[0].id;
        const url = new URL(activeTab[0].url);
        const domain = url.hostname;

        try {
            let results = [];
            
            switch (this.storageType.value) {
                case 'localStorage':
                    results = await this.searchLocalStorage(tabId, searchText);
                    break;
                case 'sessionStorage':
                    results = await this.searchSessionStorage(tabId, searchText);
                    break;
                case 'cookies':
                    results = await this.searchCookies(domain, searchText);
                    break;
            }

            this.displayResults(results);
        } catch (error) {
            console.error('Error performing search:', error);
        }
    }

    async searchLocalStorage(tabId, searchText) {
        const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: (searchText, filterType) => {
                const items = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    const value = localStorage.getItem(key);
                    
                    if (filterType === 'key' && key.toLowerCase().includes(searchText)) {
                        items.push({ key, value });
                    } else if (filterType === 'value' && value.toLowerCase().includes(searchText)) {
                        items.push({ key, value });
                    } else if (filterType === 'both' && 
                        (key.toLowerCase().includes(searchText) || value.toLowerCase().includes(searchText))) {
                        items.push({ key, value });
                    }
                }
                return items;
            },
            args: [searchText, this.filterType]
        });
        return results[0].result;
    }

    async searchSessionStorage(tabId, searchText) {
        const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: (searchText, filterType) => {
                const items = [];
                for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    const value = sessionStorage.getItem(key);
                    
                    if (filterType === 'key' && key.toLowerCase().includes(searchText)) {
                        items.push({ key, value });
                    } else if (filterType === 'value' && value.toLowerCase().includes(searchText)) {
                        items.push({ key, value });
                    } else if (filterType === 'both' && 
                        (key.toLowerCase().includes(searchText) || value.toLowerCase().includes(searchText))) {
                        items.push({ key, value });
                    }
                }
                return items;
            },
            args: [searchText, this.filterType]
        });
        return results[0].result;
    }

    async searchCookies(domain, searchText) {
        const cookies = await chrome.cookies.getAll({ domain });
        return cookies.filter(cookie => {
            if (this.filterType === 'key' && cookie.name.toLowerCase().includes(searchText)) {
                return true;
            } else if (this.filterType === 'value' && cookie.value.toLowerCase().includes(searchText)) {
                return true;
            } else if (this.filterType === 'both' && 
                (cookie.name.toLowerCase().includes(searchText) || cookie.value.toLowerCase().includes(searchText))) {
                return true;
            }
            return false;
        }).map(cookie => ({
            key: cookie.name,
            value: cookie.value
        }));
    }

    displayResults(results) {
        this.resultsTable.innerHTML = '';
        
        if (results.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="3" style="text-align: center;">No results found</td>';
            this.resultsTable.appendChild(row);
            return;
        }

        results.forEach(item => {
            const row = document.createElement('tr');
            const truncatedKey = this.truncateText(item.key, 100);
            const truncatedValue = this.truncateText(item.value, 100);
            
            row.innerHTML = `
                <td title="${this.escapeHtml(item.key)}">${this.escapeHtml(truncatedKey)}</td>
                <td title="${this.escapeHtml(item.value)}">${this.escapeHtml(truncatedValue)}</td>
                <td>
                    <button class="clear-row-btn" data-key="${this.escapeHtml(item.key)}">Delete</button>
                </td>
            `;
            
            const clearBtn = row.querySelector('.clear-row-btn');
            clearBtn.addEventListener('click', () => this.clearItem(item.key));
            
            this.resultsTable.appendChild(row);
        });
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    async clearItem(key) {
        const activeTab = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = activeTab[0].id;
        const url = new URL(activeTab[0].url);
        const domain = url.hostname;

        try {
            switch (this.storageType.value) {
                case 'localStorage':
                    await chrome.scripting.executeScript({
                        target: { tabId },
                        func: (key) => localStorage.removeItem(key),
                        args: [key]
                    });
                    break;
                case 'sessionStorage':
                    await chrome.scripting.executeScript({
                        target: { tabId },
                        func: (key) => sessionStorage.removeItem(key),
                        args: [key]
                    });
                    break;
                case 'cookies':
                    const protocol = url.protocol;
                    await chrome.cookies.remove({
                        url: `${protocol}//${domain}`,
                        name: key
                    });
                    break;
            }
            
            // Refresh the search results
            this.performSearch();
        } catch (error) {
            console.error('Error clearing item:', error);
        }
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize the extension when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new UIManager();
}); 