import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/*
  Vite's default splitting gave this app 118 asset files, 55 of them under 2 KB
  — mostly one chunk per lucide icon. Each is a separate request, and a 300-byte
  file compresses badly and still costs a full round trip. Grouping the
  dependencies that always travel together trades dozens of tiny requests for a
  handful of well-compressing ones, and gives them stable names that stay in the
  browser cache across deploys of app code.

  Route chunks are untouched: React.lazy() in App.jsx still splits every page.
*/
function manualChunks(id) {
  if (!id.includes("node_modules")) return undefined;

  if (/[\/]node_modules[\/](react|react-dom|scheduler)[\/]/.test(id)) return "react";
  if (/[\/]node_modules[\/]lucide-react[\/]/.test(id)) return "icons";
  if (/[\/]node_modules[\/](i18next|react-i18next|i18next-browser-languagedetector)[\/]/.test(id)) return "i18n";

  /*
    Recharts and @react-google-maps are deliberately NOT grouped. Only part of
    each is reachable from the entry (the Maps script loader; nothing of
    recharts), and forcing either into one chunk makes the entry preload the
    whole library — 527 kB of charts for pages that never draw one. Left alone,
    the splitter keeps the unreachable parts in the lazy route chunks.
  */
  return undefined;
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/app/",
  build: {
    outDir: "../api/public/app",
    emptyOutDir: true,
    rollupOptions: { output: { manualChunks } },
  },
  server: {
    proxy: { "/api": "http://127.0.0.1:8000" },
    port: 5173,
    open: process.env.VITE_OPEN_BROWSER !== "false",
  },
});
