import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/pmo_risk_and_change_app/",
  server: {
    port: 5173,
  },
});
