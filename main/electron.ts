import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';

/**
 * Electron event dispatcher
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const async = require('async');
const isDev = process.env['DEV_MODE'] === '1';
let theWindow = null;

app.on('ready', () => {
  theWindow = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: !isDev
    }  
  });
  if (isDev) {
    // Use built-in Chrome DevTools instead of Devtron for better compatibility
    console.log('Development mode enabled - DevTools will be available');
    
    // Optional: Install Redux DevTools extension if available
    try {
      const { default: installExtension, REDUX_DEVTOOLS } = require('electron-devtools-installer');
      installExtension(REDUX_DEVTOOLS)
        .then((name) => console.log(`Added Extension: ${name}`))
        .catch((err) => console.log('Redux DevTools not available:', err.message));
    } catch (err) {
      console.log('DevTools installer not available, using built-in tools');
    }
    theWindow.loadURL(url.format({
      hostname: 'localhost',
      pathname: path.join(),
      port: 4200,
      protocol: 'http:',
      query: {isDev: true},
      slashes: true
    }));
    theWindow.webContents.openDevTools();
  }
  else {
    theWindow.loadURL(url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true
    }));
  }
  theWindow.setMenu(null);
  // event handlers
  const sendBounds = () =>
    theWindow.webContents.send('bounds', theWindow.getBounds());
  theWindow.on('move', sendBounds);
  theWindow.on('resize', sendBounds);
});

app.on('window-all-closed', () => {
  app.quit();
});

ipcMain.on('readdir', (event: any,
                       root: string) => {
  fs.readdir(root, (err, names) => {
    if (err)
      theWindow.webContents.send('dirnotread', root);
    else {
      const children = names.map(name => path.join(root, name));
      async.map(children, fs.lstat, (err, stats) => {
        const contents = names.reduce((acc, name, ix) => {
          const stat = stats[ix];
          // NOTE: this won't be a real stat when it gets piped over
          // IPC as JSON, so we have to help reify it on the other side
          stat['_isDirectory'] = stat.isDirectory();
          stat['_isFile'] = stat.isFile();
          stat['_isSymbolicLink'] = stat.isSymbolicLink();
          acc[name] = stat;
          return acc;
        }, { }); 
        theWindow.webContents.send('dirread', root, contents);
      });
    }
  });
});
