import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    assetsInclude: ['**/*.wasm'],
    optimizeDeps: {
      exclude: ['@electric-sql/pglite']
    },
    build: {
      target: 'esnext'
    },
    worker: {
      format: 'es' as 'es' | 'iife'
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
