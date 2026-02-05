import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode`
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],

    // Different output directories for DEV and PROD
    build: {
      outDir: mode === 'development' ? 'dist-dev' : 'dist'
    },

    // Dev server proxy - ONLY affects `npm run dev`, NOT production builds
    // In production, Nginx handles /api proxying to the appropriate backend
    server: {
      proxy: {
        '/api': {
          target: mode === 'development' ? 'http://localhost:5001' : 'http://localhost:5000',
          changeOrigin: true
        }
      }
    }
  }
})
