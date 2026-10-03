import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
// [Urmee · dev fix] "/app/" is where Laravel serves the built SPA in production (outDir below). The dev
// server has no such prefix, and the router is mounted at "/", so the base only applies to `vite build`.
// Before this, localhost:5173/community showed "configured with a public base URL of /app/".
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/app/" : "/",
  build: { outDir: "../api/public/app", emptyOutDir: true },
  server: {
    proxy: { "/api": "http://127.0.0.1:8000" },
    port: 5173,
    open: process.env.VITE_OPEN_BROWSER !== "false",
  },
}));
