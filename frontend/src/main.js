import './style.css'
import { setLanguage } from './i18n/index.js'
import { initUI, changeLanguage } from './modules/ui.js'
import { loadConfig } from './modules/config.js'
import { loadStats } from './modules/stats.js'
import { renderEndpoints } from './modules/endpoints.js'
import { loadLogs, toggleLogPanel, changeLogLevel, copyLogs, clearLogs } from './modules/logs.js'
import { showDataSyncDialog } from './modules/webdav.js'
import {
    showAddEndpointModal,
    editEndpoint,
    saveEndpoint,
    deleteEndpoint,
    closeModal,
    handleTransformerChange,
    showEditPortModal,
    savePort,
    closePortModal,
    showWelcomeModal,
    closeWelcomeModal,
    showWelcomeModalIfFirstTime,
    testEndpointHandler,
    closeTestResultModal,
    openGitHub,
    openArticle,
    togglePasswordVisibility,
    acceptConfirm,
    cancelConfirm,
    showCloseActionDialog,
    quitApplication,
    minimizeToTray
} from './modules/modal.js'
import * as api from './utils/api.js'

// Load data on startup
window.addEventListener('DOMContentLoaded', async () => {
    // Initialize language
    const lang = await api.getLanguage();
    setLanguage(lang);

    // Initialize UI
    initUI();

    // Load and display version
    try {
        const version = await api.getVersion();
        document.getElementById('appVersion').textContent = version;
    } catch (error) {
        console.error('Failed to get version:', error);
    }

    // Load initial data
    await loadConfigAndRender();
    loadStats();

    // Restore log level from config
    try {
        const logLevel = await api.getLogLevel();
        document.getElementById('logLevel').value = logLevel;
    } catch (error) {
        console.error('Failed to get log level:', error);
    }

    loadLogs();

    // Refresh stats every 5 seconds
    setInterval(async () => {
        await loadStats();
        const config = await api.getConfig();
        if (config) {
            renderEndpoints(config.endpoints);
        }
    }, 5000);

    // Refresh logs every 2 seconds
    setInterval(loadLogs, 2000);

    // Show welcome modal on first launch
    showWelcomeModalIfFirstTime();

    // Handle Cmd/Ctrl+W to hide window (web version: just a placeholder)
    window.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
            e.preventDefault();
            console.log('Close action - in web version, this would close the browser tab');
        }
    });
});

// Helper function to load config and render endpoints
async function loadConfigAndRender() {
    const config = await loadConfig();
    if (config) {
        renderEndpoints(config.endpoints);
    }
}

// Expose functions to window for onclick handlers
window.loadConfig = loadConfigAndRender;
window.showAddEndpointModal = showAddEndpointModal;
window.editEndpoint = editEndpoint;
window.saveEndpoint = saveEndpoint;
window.deleteEndpoint = deleteEndpoint;
window.closeModal = closeModal;
window.handleTransformerChange = handleTransformerChange;
window.showEditPortModal = showEditPortModal;
window.savePort = savePort;
window.closePortModal = closePortModal;
window.showWelcomeModal = showWelcomeModal;
window.closeWelcomeModal = closeWelcomeModal;
window.testEndpoint = testEndpointHandler;
window.closeTestResultModal = closeTestResultModal;
window.openGitHub = openGitHub;
window.openArticle = openArticle;
window.toggleLogPanel = toggleLogPanel;
window.changeLogLevel = changeLogLevel;
window.copyLogs = copyLogs;
window.clearLogs = clearLogs;
window.changeLanguage = changeLanguage;
window.togglePasswordVisibility = togglePasswordVisibility;
window.acceptConfirm = acceptConfirm;
window.cancelConfirm = cancelConfirm;
window.showCloseActionDialog = showCloseActionDialog;
window.quitApplication = quitApplication;
window.minimizeToTray = minimizeToTray;
window.showDataSyncDialog = showDataSyncDialog;


