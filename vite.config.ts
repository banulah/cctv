import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all interfaces for Docker
    port: 5173,
    watch: {
      usePolling: true, // Enable polling for Docker file system changes
    },
    hmr: {
      host: 'localhost', // HMR connects via localhost from browser
    },
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://backend:8000',
        changeOrigin: true,
      },
      '/hls': {
        target: process.env.MEDIAMTX_URL || 'http://mediamtx:8888',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hls/, '') // Remove /hls prefix
      },
      '/ws': {
        target: process.env.BACKEND_WS_URL || 'ws://backend:8000',
        ws: true,
        changeOrigin: true,
      }
    }
  }
})

