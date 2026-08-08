import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Capacitor loads the app from a local file:// / http://localhost scheme on
  // Android, so relative asset paths are required.
  base: "./",
  build: {
    outDir: "dist",
  },
});
