import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/pmo_risk_and_change_app/",
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Recharts + d3 deps account for most of the 814 kB main chunk; split
          // them so the shell loads faster on first paint.
          recharts: ["recharts"],
        },
      },
    },
  },
});
