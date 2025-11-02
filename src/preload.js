// Preload script for Electron
// Currently empty as we're using Web Serial API directly from renderer
// This file is included for future IPC communication if needed

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Add any IPC methods here if needed in the future
});
