import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/app/",
  build: { outDir: "../api/public/app", emptyOutDir: true },
  server: {
    proxy: { "/api": "http://127.0.0.1:8000" },
    port: 5173,
    open: process.env.VITE_OPEN_BROWSER !== "false",
  },
});
