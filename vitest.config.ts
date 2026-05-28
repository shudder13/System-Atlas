import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: false,
    environmentMatchGlobs: [
      ["src/__tests__/**", "jsdom"],
      ["src/**/*.dom.test.{ts,tsx}", "jsdom"]
    ],
    setupFiles: ["src/__tests__/setup.ts"]
  }
});
