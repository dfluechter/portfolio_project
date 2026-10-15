/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/static': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            if (id.includes('@tanstack/react-query') || id.includes('axios')) {
              return 'vendor-query';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router-dom')
            ) {
              return 'vendor-react';
            }
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
    pool: 'forks',
    fileParallelism: false,
  },
})
