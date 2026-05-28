import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const webPort = Number(process.env.SYSTEM_ATLAS_WEB_PORT ?? 5173);
const apiPort = Number(process.env.SYSTEM_ATLAS_API_PORT ?? 5174);

export default defineConfig({
  plugins: [react()],
  server: {
    port: webPort,
    strictPort: true,
    host: "127.0.0.1",
    hmr: {
      host: "localhost",
      port: webPort,
      protocol: "ws"
    },
    proxy: {
      "/api": `http://127.0.0.1:${apiPort}`
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          xyflow: ["@xyflow/react"],
          icons: ["lucide-react"]
        }
      }
    }
  }
});
