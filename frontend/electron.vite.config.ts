import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    envDir: resolve(__dirname, '..')
  },
  preload: {
    envDir: resolve(__dirname, '..')
  },
  renderer: {
    envDir: resolve(__dirname, '..'),
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
