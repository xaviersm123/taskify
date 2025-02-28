import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'], // Explicitly include .jsx for clarity
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    target: 'esnext', // Ensure modern JavaScript support
  },
  server: {
    //open: true, // Optional: Opens the app in the browser on start
    host: true, // Allow external access
    port: 3000
  },
});