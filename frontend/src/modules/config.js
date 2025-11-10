// Configuration management
import * as api from '../utils/api.js';

export async function loadConfig() {
    try {
        const config = await api.getConfig();

        document.getElementById('proxyPort').textContent = config.port;
        document.getElementById('totalEndpoints').textContent = config.endpoints.length;

        const activeCount = config.endpoints.filter(ep => ep.enabled !== false).length;
        document.getElementById('activeEndpoints').textContent = activeCount;

        return config;
    } catch (error) {
        console.error('Failed to load config:', error);
        return null;
    }
}

export async function updatePort(port) {
    return api.updatePort(port);
}

export async function addEndpoint(name, url, key, transformer, model, remark) {
    return api.addEndpoint(name, url, key, transformer, model, remark || '');
}

export async function updateEndpoint(index, name, url, key, transformer, model, remark) {
    return api.updateEndpoint(index, name, url, key, transformer, model, remark || '');
}

export async function removeEndpoint(index) {
    return api.removeEndpoint(index);
}

export async function toggleEndpoint(index, enabled) {
    return api.toggleEndpoint(index, enabled);
}

export async function testEndpoint(index) {
    return api.testEndpoint(index);
}
