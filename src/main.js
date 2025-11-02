const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableBlinkFeatures: 'Serial', // Enable Web Serial API
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Handle serial port selection
  mainWindow.webContents.session.on('select-serial-port', (event, portList, webContents, callback) => {
    event.preventDefault();
    
    console.log('Available ports:', portList);
    
    // Find Meshtastic device (CH340, CP2102, or similar)
    const meshtasticPort = portList.find(port => 
      port.displayName?.includes('CH340') || 
      port.displayName?.includes('CP210') ||
      port.displayName?.includes('Silicon Labs') ||
      port.vendorId === '0x10c4' ||
      port.vendorId === '0x1a86'
    );
    
    if (meshtasticPort) {
      callback(meshtasticPort.portId);
    } else if (portList.length > 0) {
      // Default to first available port
      callback(portList[0].portId);
    } else {
      callback('');
    }
  });

  // Grant serial device permissions
  mainWindow.webContents.session.setDevicePermissionHandler(() => true);

  // Load app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile('dist/index.html');
  }
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
