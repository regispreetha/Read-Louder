const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  processDocument: (filePath) => ipcRenderer.invoke('document:process', filePath),

  // Audio operations
  saveAudio: (data) => ipcRenderer.invoke('audio:save', data),

  // Settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  getAllSettings: () => ipcRenderer.invoke('settings:getAll'),
  exportSettings: () => ipcRenderer.invoke('export:settings'),
  importSettings: () => ipcRenderer.invoke('import:settings'),

  // Bookmarks
  saveBookmarks: (data) => ipcRenderer.invoke('bookmarks:save', data),
  loadBookmarks: (documentPath) => ipcRenderer.invoke('bookmarks:load', documentPath),

  // Progress
  saveProgress: (data) => ipcRenderer.invoke('progress:save', data),
  loadProgress: (documentPath) => ipcRenderer.invoke('progress:load', documentPath),

  // History
  addToHistory: (documentInfo) => ipcRenderer.invoke('history:add', documentInfo),
  getHistory: () => ipcRenderer.invoke('history:get'),
  clearHistory: () => ipcRenderer.invoke('history:clear')
});

console.log('Preload script loaded - electronAPI exposed');
