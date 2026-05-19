import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import { readdirSync } from "fs";

const getHtmlEntries = () => {
  const pagesDir = resolve(__dirname, "src");
  const entries = {};

  try {
    readdirSync(pagesDir).forEach((file) => {
      if (file.endsWith(".html")) {
        const name = file.replace(".html", "");
        entries[name] = resolve(pagesDir, file);
      }
    });
  } catch (e) {
    console.error("Dossier src introuvable");
  }

  return entries;
};

export default defineConfig({
  root: "src",
  envDir: "../",
  plugins: [tailwindcss()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: getHtmlEntries(),
    },
  },
  server: {
    port: 3003, 
    host: "0.0.0.0",
    open: false,
    allowedHosts: ["docmaster.net", "www.docmaster.net"],
    proxy: {
      "/api": {
        target: "http://localhost:5000", // DEV: local backend
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});