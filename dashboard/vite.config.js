import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function manualChunks(id) {
  if (id.includes('node_modules/framer-motion') || id.includes('node_modules/@react-spring')) return 'vendor-motion';
  if (id.includes('node_modules/recharts') || id.includes('node_modules/d3') || id.includes('node_modules/d3-')) return 'vendor-charts';
  if (id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom') || id.includes('node_modules/react/')) return 'vendor-react';
  if (id.includes('/src/views/')) return 'views';
}

export default defineConfig({
  plugins: [react()],

  define: {
    __APP_VERSION__: JSON.stringify('2.0.0'),
    __BUILD_DATE__:  JSON.stringify(new Date().toISOString()),
  },

  optimizeDeps: {
    include: ['framer-motion', '@react-spring/web', 'recharts', 'd3', 'react-router-dom'],
  },

  server: {
    port: 3000,
    hmr: { overlay: false },
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true, secure: false },
      '/health': { target: 'http://localhost:8000', changeOrigin: true, secure: false },
    },
  },

  build: {
    target:               ['es2020', 'chrome89', 'firefox89', 'safari14'],
    cssMinify:            true,
    sourcemap:            false,
    reportCompressedSize: true,
    rollupOptions: {
      output: { manualChunks },
    },
  },
});
