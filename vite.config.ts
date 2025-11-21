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
        target: 'http://backend:8000',  // Use internal Docker network
        changeOrigin: true,
        secure: false,
        timeout: 120000,
      },
      '/hls': {
        target: 'http://mediamtx:8888',  // Use internal Docker network
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hls/, ''),
        timeout: 30000,
        proxyTimeout: 30000,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setTimeout(30000)
          })
          proxy.on('proxyRes', (proxyRes, req, res) => {
            proxyRes.setTimeout(30000)
          })
        }
      },
      '/ws': {
        target: 'ws://backend:8000',  // Use internal Docker network with ws://
        ws: true,
        changeOrigin: true,
        secure: false,
        timeout: 120000,
      }
    }
  }
})

