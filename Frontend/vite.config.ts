import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    open: true,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    manifest: true,
    // Security: Minify and obfuscate in production
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'vendor-query': ['@tanstack/react-query', '@reduxjs/toolkit', 'react-redux'],
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          'vendor-media': ['html-to-image', 'qrcode'],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
  },
  clearScreen: false,
  logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'info',
  // Security: Disable source maps in production
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
});
