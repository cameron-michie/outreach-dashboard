import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';

let isDev;
import('electron-is-dev').then((module) => {
  isDev = module.default;
  app.on('ready', createWindow);  // Ensure this is inside the then() to use the resolved isDev
});

import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));


function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true, // you might want to enable context isolation for security in a real app
    }
  });

  win.loadURL(
    isDev
      ? 'http://localhost:3000' // Where create-react-app runs
      : `file://${path.join(__dirname, '../outreach-dashboard/react-dashboard/build/index.html')}` // Path to React build
  );
  win.webContents.openDevTools();

}

app.on('ready', createWindow);
