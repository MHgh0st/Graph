import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
  build: {
    outDir: "dist/main",
    lib: {
      entry: "src/main.ts",
      formats: ["cjs"],
      fileName: "main",
    },
    rollupOptions: {
      external: [
        "electron",
        "electron-squirrel-startup",
        "path",
        "fs",
        "fs/promises",
        "url",
        "child_process",
      ],
    },
  },
});
