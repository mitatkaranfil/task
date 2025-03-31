import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: "client",
  base: "/",
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
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
  }
});
