const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const dataFilePath = path.join(__dirname, 'data.json');

// Crear ventana
function createWindow () {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
});

// Manejar lectura/escritura de datos
ipcMain.handle('load-data', () => {
  try {
    if(!fs.existsSync(dataFilePath)) fs.writeFileSync(dataFilePath, '{}');
    const rawData = fs.readFileSync(dataFilePath);
    return JSON.parse(rawData);
  } catch (err) {
    console.error(err);
    return {};
  }
});

ipcMain.handle('save-data', (event, data) => {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    return true;
  } catch(err) {
    console.error(err);
    return false;
  }
});
