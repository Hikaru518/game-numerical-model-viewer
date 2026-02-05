import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // For GitHub Pages project sites, the app is served under:
  //   https://<USERNAME>.github.io/<REPO>/
  // We derive <REPO> from GitHub Actions' GITHUB_REPOSITORY to avoid hardcoding.
  // You can override with VITE_BASE (e.g. "/some-subpath/") if needed.
  base:
    command === "build"
      ? (() => {
          const explicit = process.env.VITE_BASE;
          if (explicit) return explicit;

          const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
          // User/Org pages repo is "<username>.github.io" and should be served at "/"
          if (!repo || repo.endsWith(".github.io")) return "/";

          return `/${repo}/`;
        })()
      : "/",
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
  },
}));
