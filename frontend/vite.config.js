import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild', // Changed from 'terser' to 'esbuild' (faster and built-in)
    // esbuild minification options
    target: 'es2015',
    // Drop console in production
    drop: ['console', 'debugger'],
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Mapbox GL in its own chunk for lazy loading
          if (id.includes('mapbox-gl')) {
            return 'mapbox-gl';
          }
          // React core
          if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
            return 'react-vendor';
          }
          // Axios
          if (id.includes('axios')) {
            return 'axios';
          }
          // Icons
          if (id.includes('lucide-react') || id.includes('react-icons')) {
            return 'icons';
          }
          // Other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'axios']
  }
})
