import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    tailwindcss(),
  ],
  define: {
    // Fix for simple-peer and other Node.js libraries
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      // Fix for Node.js global
      define: {
        global: 'globalThis',
      },
    },
  },
})

