import { defineConfig } from 'vite';
import react            from '@vitejs/plugin-react';
import path             from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host:   '0.0.0.0',
    port:   5173,
    proxy: {
      '/api': {
        target:       'http://backend:3001',
        changeOrigin: true,
        rewrite:      (p) => p.replace(/^\/api/, ''),
      },
      '/ws': {
        target:  'http://backend:3001',
        ws:      true,
        rewrite: (p) => p.replace(/^\/ws/, ''),
      },
    },
  },
});
