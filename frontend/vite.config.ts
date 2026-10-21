/// <reference types="vitest" />
import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../', ['VITE_', 'PORTFOLIO_'])
  const ownerName =
    env.PORTFOLIO_OWNER_NAME || env.VITE_PORTFOLIO_OWNER_NAME || 'Dominik Flüchter'

  return {
    envDir: '../',
    envPrefix: ['VITE_', 'PORTFOLIO_'],
    define: {
      'import.meta.env.PORTFOLIO_OWNER_NAME': JSON.stringify(ownerName),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'next/link': path.resolve(__dirname, './src/shims/next-link.tsx'),
      },
    },
    plugins: [react(), tailwindcss()],
    server: {
      port: 3000,
      host: true,
      proxy: {
        '/static': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/media': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (id.includes('framer-motion') || id.includes('motion')) {
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
      maxWorkers: 3,
    },
  }
})
