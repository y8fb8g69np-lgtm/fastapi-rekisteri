import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxy /api -> FastAPI (localhost:8000), jotta frontend voi kutsua backendiä
// kehityksessä ilman CORS-ongelmia.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
