import path from "node:path";
import { defineConfig, searchForWorkspaceRoot } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 4173,
    host: "localhost",
    fs: {
      allow: [
        searchForWorkspaceRoot(process.cwd()),
        path.resolve(__dirname, "../moq"),
      ],
    },
  },
  resolve: {
    preserveSymlinks: true,
  },
  optimizeDeps: {
    exclude: ["@kixelated/hang", "@kixelated/moq", "@kixelated/signals"],
  },
});
