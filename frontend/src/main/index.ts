import { app, shell, BrowserWindow, dialog, ipcMain, screen } from 'electron'
import path, { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'
import Store from 'electron-store'

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto')
}

log.transports.file.level = 'info'
autoUpdater.logger = log

autoUpdater.allowDowngrade = false
autoUpdater.allowPrerelease = false
autoUpdater.forceDevUpdateConfig = true

const StoreClass = (Store as any).default || Store
const store = new StoreClass()

let mainWindow: BrowserWindow

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()

      const url = commandLine.pop()
      if (url?.includes('zatyshok://')) {
        mainWindow.webContents.send('protocol-link', url)
      }
    }
  })
}

function createWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  mainWindow = new BrowserWindow({
    width: Math.floor(width * 0.8),
    height: Math.floor(height * 0.8),
    minWidth: 400,
    minHeight: 400,
    resizable: true,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#faf7f2',
    titleBarStyle: 'hidden',
    ...(process.platform === 'linux' ? { icon } : { icon }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('moved', () => {
    const currentDisplay = screen.getDisplayMatching(mainWindow.getBounds())
    const { width: currentWidth, height: currentHeight } = currentDisplay.workAreaSize
    mainWindow.setMinimumSize(Math.floor(currentWidth * 0.4), Math.floor(currentHeight * 0.4))
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
    if (!is.dev) {
      autoUpdater.checkForUpdatesAndNotify()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

autoUpdater.on('update-available', () => {
  log.info('Update available, starting download...')
})

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded: ', info.version)
  dialog
    .showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: `A new version (${info.version}) is ready. Restart now?`,
      buttons: ['Restart', 'Later']
    })
    .then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall()
      }
    })
})

autoUpdater.on('error', (err) => {
  log.error('Error in auto-updater: ', err)
})

app.whenReady().then(() => {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('zatyshok', process.execPath, [path.resolve(process.argv[1])])
    }
  } else {
    app.setAsDefaultProtocolClient('zatyshok')
  }

  electronApp.setAppUserModelId('com.zatyshok.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('set-store', (_, key, value) => {
    store.set(key, value)
  })

  ipcMain.handle('get-store', (_, key) => {
    return store.get(key)
  })

  ipcMain.on('delete-store', (_, key) => {
    store.delete(key)
  })

  ipcMain.on('window-close', () => mainWindow?.close())
  ipcMain.on('window-minimize', () => mainWindow?.minimize())

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
