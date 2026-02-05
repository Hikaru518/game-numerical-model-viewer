import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages project site is served under:
  //   https://<USERNAME>.github.io/GameNumericalModelViewer/
  // Vite's `base` must match that subpath for production builds.
  base: command === "build" ? "/GameNumericalModelViewer/" : "/",
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
  },
}));
