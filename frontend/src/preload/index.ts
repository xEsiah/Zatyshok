/* eslint-disable prettier/prettier */
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  setStoreValue: (key: string, value: string) => ipcRenderer.send('set-store', key, value),
  getStoreValue: (key: string) => ipcRenderer.invoke('get-store', key),
  deleteStoreValue: (key: string) => ipcRenderer.send('delete-store', key),
  setLayout: (layout: 'full' | 'standard' | 'split') => ipcRenderer.send('set-layout', layout),
  closeWindow: () => ipcRenderer.send('window-close'),
  minimizeWindow: () => ipcRenderer.send('window-minimize')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
