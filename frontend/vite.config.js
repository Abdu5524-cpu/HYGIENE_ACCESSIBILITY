import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Expose the dev server on all network interfaces so teammates on the
    // same WiFi can reach it at http://<your-LAN-ip>:5173
    host: true,
    // Proxy /api/* to the local Express server.
    // This means the frontend always uses relative /api/ paths in dev —
    // teammates don't need to know the backend IP or port.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
