import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: {}, // Polyfill for browser environment
  },
  resolve: {
    alias: {
      stream: 'stream-browserify',  // ✅ Polyfill if needed (npm install stream-browserify)
    },
  },
})
