import path from "node:path";
import { defineConfig, searchForWorkspaceRoot } from "vite";
import solid from "vite-plugin-solid";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [solid()],
  server: {
    port: 4173,
    host: "localhost",
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), path.resolve(__dirname, "../moq")],
    },
  },
  resolve: {
    preserveSymlinks: true,
  },
  optimizeDeps: {
    exclude: ["@kixelated/hang", "@kixelated/moq", "@kixelated/signals"],
  },
});
