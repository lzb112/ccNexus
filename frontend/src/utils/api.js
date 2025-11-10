// API utility functions
const API_BASE = window.API_BASE_URL || '/api';

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null) {
    const url = `${API_BASE}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        // For responses that are plain text (like config, stats, logs)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        return await response.text();
    } catch (error) {
        console.error(`API request failed: ${method} ${endpoint}`, error);
        throw error;
    }
}

// GET request
export async function apiGet(endpoint) {
    return apiRequest('GET', endpoint);
}

// POST request
export async function apiPost(endpoint, data) {
    return apiRequest('POST', endpoint, data);
}

// PUT request
export async function apiPut(endpoint, data) {
    return apiRequest('PUT', endpoint, data);
}

// DELETE request
export async function apiDelete(endpoint) {
    return apiRequest('DELETE', endpoint);
}

// Config API
export async function getConfig() {
    const data = await apiGet('/config');
    return typeof data === 'string' ? JSON.parse(data) : data;
}

export async function updateConfig(config) {
    return apiPost('/config', { config: JSON.stringify(config) });
}

// Version API
export async function getVersion() {
    return apiGet('/version');
}

// Stats API
export async function getStats() {
    const data = await apiGet('/stats');
    return typeof data === 'string' ? JSON.parse(data) : data;
}

// Endpoints API
export async function addEndpoint(name, apiUrl, apiKey, transformer, model, remark) {
    return apiPost('/endpoints', { name, apiUrl, apiKey, transformer, model, remark });
}

export async function updateEndpoint(index, name, apiUrl, apiKey, transformer, model, remark) {
    return apiPut(`/endpoints/${index}`, { name, apiUrl, apiKey, transformer, model, remark });
}

export async function removeEndpoint(index) {
    return apiDelete(`/endpoints/${index}`);
}

export async function toggleEndpoint(index, enabled) {
    return apiPost(`/endpoints/${index}/toggle`, { enabled });
}

export async function testEndpoint(index) {
    const data = await apiPost(`/endpoints/${index}/test`, {});
    return typeof data === 'string' ? JSON.parse(data) : data;
}

export async function reorderEndpoints(names) {
    return apiPost('/endpoints/reorder', { names });
}

export async function switchToEndpoint(name) {
    return apiPost('/endpoints/switch', { name });
}

export async function getCurrentEndpoint() {
    return apiGet('/endpoints/current');
}

// Port API
export async function updatePort(port) {
    return apiPost('/port', { port });
}

// Logs API
export async function getLogs() {
    const data = await apiGet('/logs');
    return typeof data === 'string' ? JSON.parse(data) : data;
}

export async function getLogsByLevel(level) {
    const data = await apiGet(`/logs/level/${level}`);
    return typeof data === 'string' ? JSON.parse(data) : data;
}

export async function setLogLevel(level) {
    return apiPost('/logs/level', { level });
}

export async function getLogLevel() {
    const data = await apiGet('/logs/level');
    return typeof data === 'object' ? data.level : parseInt(data);
}

export async function clearLogs() {
    return apiDelete('/logs');
}

// Language API
export async function getLanguage() {
    return apiGet('/language');
}

export async function setLanguage(language) {
    return apiPost('/language', { language });
}

export async function getSystemLanguage() {
    return apiGet('/language/system');
}

// WebDAV API
export async function updateWebDAVConfig(url, username, password) {
    return apiPost('/webdav/config', { url, username, password });
}

export async function testWebDAVConnection(url, username, password) {
    const data = await apiPost('/webdav/test', { url, username, password });
    return typeof data === 'string' ? JSON.parse(data) : data;
}

export async function listWebDAVBackups() {
    const data = await apiGet('/webdav/backups');
    return typeof data === 'string' ? JSON.parse(data) : data;
}

export async function backupToWebDAV(filename) {
    return apiPost('/webdav/backup', { filename });
}

export async function restoreFromWebDAV(filename, choice) {
    return apiPost('/webdav/restore', { filename, choice });
}
