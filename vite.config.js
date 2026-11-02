import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  envDir: ".",
  plugins: [tailwindcss()],
  
  build: {
    outDir: "dist",
    emptyOutDir: true,
    
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
      output: {
        // Hash pour cache
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    
    chunkSizeWarningLimit: 1000,
  },
  
  server: {
    port: 3003,
    host: "0.0.0.0",
    open: false,
    allowedHosts: ["docmaster.net", "www.docmaster.net"],
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});

