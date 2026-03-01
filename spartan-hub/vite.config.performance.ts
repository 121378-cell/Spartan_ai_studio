/**
 * Vite Configuration with Performance Optimizations
 * Phase A: Video Form Analysis MVP
 * 
 * Optimizations:
 * - Code splitting
 * - Lazy loading
 * - Tree shaking
 * - Compression
 * - Caching
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    // Bundle visualization for analysis
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ],
  
  build: {
    // Enable source maps for debugging
    sourcemap: true,
    
    // Enable minification
    minify: 'terser',
    
    // Terser options for better compression
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log']
      }
    },
    
    // Code splitting configuration
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-mui': ['@mui/material', '@emotion/react', '@emotion/styled'],
          'vendor-mediapipe': ['@mediapipe/tasks-vision'],
          'vendor-tfjs': ['@tensorflow/tfjs'],
          'vendor-utils': ['axios', 'uuid', 'i18next'],
          
          // App chunks
          'app-components': ['./src/components'],
          'app-hooks': ['./src/hooks'],
          'app-services': ['./src/services']
        },
        
        // Chunk naming
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    
    // Chunk size limit warning
    chunkSizeWarningLimit: 500,
    
    // Assets limit
    assetsInlineLimit: 4096 // 4KB
  },
  
  // Lazy loading configuration
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['@mediapipe/tasks-vision', '@tensorflow/tfjs']
  },
  
  // Server configuration
  server: {
    port: 5173,
    open: true
  },
  
  // Resolve aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  
  // CSS configuration
  css: {
    modules: {
      localsConvention: 'camelCase'
    },
    // Enable CSS source maps
    devSourcemap: true
  },
  
  // Define environment variables
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
});
