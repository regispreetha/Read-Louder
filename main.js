const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const Store = require('electron-store');

const store = new Store();

let mainWindow;

// Import processors
const { processPDF } = require('./processors/pdfProcessor');
const { processWord } = require('./processors/wordProcessor');
const { processText } = require('./processors/textFormatter');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icons/icon.png')
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers

// File selection dialog
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Documents', extensions: ['pdf', 'docx', 'doc', 'txt', 'rtf', 'md'] },
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'Word Documents', extensions: ['docx', 'doc'] },
      { name: 'Text Files', extensions: ['txt', 'rtf', 'md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (canceled) {
    return null;
  }

  return filePaths;
});

// Process document
ipcMain.handle('document:process', async (event, filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    let result;

    switch (ext) {
      case '.pdf':
        result = await processPDF(filePath);
        break;
      case '.docx':
      case '.doc':
        result = await processWord(filePath);
        break;
      case '.txt':
      case '.rtf':
      case '.md':
        result = await processText(filePath);
        break;
      default:
        throw new Error(`Unsupported file format: ${ext}`);
    }

    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Save audio file
ipcMain.handle('audio:save', async (event, { fileName, audioData, format }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: fileName,
    filters: [
      { name: 'Audio Files', extensions: [format] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (canceled) {
    return { success: false };
  }

  try {
    await fs.writeFile(filePath, audioData);
    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Settings management
ipcMain.handle('settings:get', async (event, key) => {
  return store.get(key);
});

ipcMain.handle('settings:set', async (event, key, value) => {
  store.set(key, value);
  return { success: true };
});

ipcMain.handle('settings:getAll', async () => {
  return store.store;
});

// Bookmark management
ipcMain.handle('bookmarks:save', async (event, { documentPath, bookmarks }) => {
  const bookmarkKey = `bookmarks.${Buffer.from(documentPath).toString('base64')}`;
  store.set(bookmarkKey, bookmarks);
  return { success: true };
});

ipcMain.handle('bookmarks:load', async (event, documentPath) => {
  const bookmarkKey = `bookmarks.${Buffer.from(documentPath).toString('base64')}`;
  return store.get(bookmarkKey, []);
});

// Reading progress
ipcMain.handle('progress:save', async (event, { documentPath, position, timestamp }) => {
  const progressKey = `progress.${Buffer.from(documentPath).toString('base64')}`;
  store.set(progressKey, { position, timestamp });
  return { success: true };
});

ipcMain.handle('progress:load', async (event, documentPath) => {
  const progressKey = `progress.${Buffer.from(documentPath).toString('base64')}`;
  return store.get(progressKey, null);
});

// Document history
ipcMain.handle('history:add', async (event, documentInfo) => {
  const history = store.get('documentHistory', []);
  const existingIndex = history.findIndex(doc => doc.path === documentInfo.path);

  if (existingIndex !== -1) {
    history.splice(existingIndex, 1);
  }

  history.unshift({
    ...documentInfo,
    lastOpened: new Date().toISOString()
  });

  // Keep only last 50 documents
  if (history.length > 50) {
    history.pop();
  }

  store.set('documentHistory', history);
  return { success: true };
});

ipcMain.handle('history:get', async () => {
  return store.get('documentHistory', []);
});

ipcMain.handle('history:clear', async () => {
  store.set('documentHistory', []);
  return { success: true };
});

// Export settings
ipcMain.handle('export:settings', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'read-louder-settings.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });

  if (canceled) {
    return { success: false };
  }

  try {
    const settings = store.store;
    await fs.writeFile(filePath, JSON.stringify(settings, null, 2));
    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Import settings
ipcMain.handle('import:settings', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });

  if (canceled || !filePaths.length) {
    return { success: false };
  }

  try {
    const data = await fs.readFile(filePaths[0], 'utf-8');
    const settings = JSON.parse(data);

    // Merge with existing settings
    Object.keys(settings).forEach(key => {
      store.set(key, settings[key]);
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

console.log('Read Louder - Electron app initialized');
