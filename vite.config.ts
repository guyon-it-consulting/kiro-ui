import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'src/client',
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-diff': ['react-diff-viewer-continued'],
          'vendor-markdown': ['marked', 'dompurify'],
        },
      },
    },
  },
  server: { proxy: { '/api': 'http://localhost:3000' } }
});
