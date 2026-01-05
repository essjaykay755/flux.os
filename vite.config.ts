import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    tailwindcss(),
    nodePolyfills({
      // Polyfills required by simple-peer
      include: ['events', 'util', 'process', 'buffer', 'stream'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
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

