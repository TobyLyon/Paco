import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  server: {
    port: 3001, // Different port from main site
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          phaser: ['phaser'],
          web3: ['wagmi', 'viem', '@rainbow-me/rainbowkit']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['phaser']
  }
})