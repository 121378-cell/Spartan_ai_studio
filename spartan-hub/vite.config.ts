import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isDev = mode === 'development';
  return {
    root: 'src',
    publicDir: '../public',
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      rollupOptions: {
        external: [],
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined;
            }

            if (id.includes('@mediapipe/tasks-vision')) {
              return 'vendor-mediapipe';
            }

            if (id.includes('three')) {
              return 'vendor-3d';
            }

            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) {
              return 'vendor-react';
            }

            return 'vendor';
          }
        }
      }
    },
    server: {
      port: 3002,
      host: isDev ? 'localhost' : '0.0.0.0',
      proxy: isDev ? {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/auth': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/tokens': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/fitness': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/ollama': {
          target: 'http://localhost:11434',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ollama/, ''),
        },
      } : undefined,
    },
    plugins: [react()],
    define: {
      'process.env': JSON.stringify(env)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    }
  };
});
