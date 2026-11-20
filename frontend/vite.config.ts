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
      },
    },
    plugins: [react(), tailwindcss()],
    server: {
      port: 3000,
      host: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
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
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (/[\\/]node_modules[\\/](three|@react-three)[\\/]/.test(id)) {
                return 'vendor-three';
              }
              if (/[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) {
                return 'vendor-motion';
              }
              if (/[\\/]node_modules[\\/](@tanstack|axios)[\\/]/.test(id)) {
                return 'vendor-query';
              }
              if (/[\\/]node_modules[\\/]lucide-react[\\/]/.test(id)) {
                return 'vendor-icons';
              }
              if (
                /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(
                  id
                )
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
