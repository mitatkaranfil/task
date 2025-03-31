import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { splitVendorChunkPlugin } from 'vite';
import { compression } from 'vite-plugin-compression2';

export default defineConfig({
  plugins: [
    react(),
    splitVendorChunkPlugin(),
    compression({
      algorithm: 'gzip',
      exclude: [/\.(br)$/, /\.(gz)$/],
      deleteOriginalAssets: false,
    }),
    // Üretimde bundle analizi yapmak isterseniz bu satırı açabilirsiniz
    // visualizer({ open: true }),
  ],
  root: "client",
  base: "/",
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 4096, // 4kb'dan küçük dosyaları inline yaparak HTTP isteklerini azaltır
    minify: 'terser', // Daha agresif minification için Terser kullanılıyor
    terserOptions: {
      compress: {
        drop_console: true, // Konsol loglarını siler
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.warn', 'console.error'] // Bu fonksiyonları kaldırır
      }
    },
    chunkSizeWarningLimit: 800, // Uyarı limitini yükseltiyoruz
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          // Büyük kütüphaneleri ayrı ayrı chunk'lara bölüyoruz
          'react-vendor': ['react', 'react-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/analytics'],
          'ui-components': [
            '@radix-ui/react-avatar',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-toast',
          ],
          'framer-motion': ['framer-motion'],
          'utils': ['class-variance-authority', 'clsx', 'tailwind-merge'],
        },
      },
      input: {
        main: "./client/index.html",
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
    },
  },
  server: {
    port: 3000
  },
  // Modern tarayıcıları hedefleyen daha küçük kod üretmek için
  esbuild: {
    target: 'es2020',
  },
});
