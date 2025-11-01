import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
  build: {
    outDir: "dist/preload",
    lib: {
      entry: "src/preload.ts",
      formats: ["cjs"], // Use CommonJS instead of ES modules
      fileName: "preload",
    },
    rollupOptions: {
      external: [],
    },
  },
});
