/* eslint-disable prettier/prettier */
import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      setStoreValue: (key: string, value: string) => void
      getStoreValue: (key: string) => Promise<unknown>
      deleteStoreValue: (key: string) => void
      setLayout: (layout: 'full' | 'standard' | 'split') => void
      closeWindow: () => void
      minimizeWindow: () => void
    }
  }
}
