import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// https://vitejs.dev/config
export default defineConfig({
  build: {
    outDir: "dist/renderer",
  },
  base: "./",
  plugins: [react(), tailwindcss()],
});
