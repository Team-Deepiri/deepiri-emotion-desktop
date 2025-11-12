/**
 * Deepiri Desktop IDE - Main Process
 * Electron main process for the desktop IDE application
 */
import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// API Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

let mainWindow;
let isDev = process.argv.includes('--dev');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      enableRemoteModule: false
    },
    icon: join(__dirname, '../assets/icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173'); // If running with Vite dev server
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, 'renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Task',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-task');
          }
        },
        {
          label: 'New Challenge',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            mainWindow.webContents.send('menu-new-challenge');
          }
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('menu-settings');
          }
        },
        { type: 'separator' },
        {
          role: 'quit'
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Gamification',
      submenu: [
        {
          label: 'Dashboard',
          click: () => {
            mainWindow.webContents.send('menu-gamification-dashboard');
          }
        },
        {
          label: 'Leaderboard',
          click: () => {
            mainWindow.webContents.send('menu-leaderboard');
          }
        },
        {
          label: 'Achievements',
          click: () => {
            mainWindow.webContents.send('menu-achievements');
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            mainWindow.webContents.send('menu-about');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Common headers for desktop IDE identification
const desktopHeaders = {
  'Content-Type': 'application/json',
  'x-desktop-client': 'true',
  'x-api-key': process.env.PYAGENT_API_KEY || 'change-me'
};

// IPC Handlers for API communication
ipcMain.handle('api-request', async (event, { method, endpoint, data, headers = {} }) => {
  try {
    const response = await axios({
      method,
      url: `${API_BASE_URL}${endpoint}`,
      data,
      headers: {
        ...desktopHeaders,
        ...headers
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
});

ipcMain.handle('ai-request', async (event, { endpoint, data, headers = {} }) => {
  try {
    const response = await axios({
      method: 'POST',
      url: `${AI_SERVICE_URL}${endpoint}`,
      data,
      headers: {
        ...desktopHeaders,
        ...headers
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
});

ipcMain.handle('classify-task', async (event, { task, description }) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/agent/task/classify`,
      { task, description },
      {
        headers: desktopHeaders
      }
    );
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
});

ipcMain.handle('generate-challenge', async (event, taskData) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/agent/challenge/generate`,
      { task: taskData },
      {
        headers: desktopHeaders
      }
    );
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
});

// App version
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

