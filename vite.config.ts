import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: './',
  server: {
    host: "::",
    port: Number(process.env.VITE_DEV_PORT) || 8080,
    strictPort: Boolean(process.env.VITE_DEV_PORT),
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${process.env.EXPLORER_API_PORT || 8081}`,
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
