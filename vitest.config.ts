import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx", "src/**/*.test.ts", "src/**/*.test.tsx"],
    fileParallelism: false,
    environmentMatchGlobs: [
      ["tests/components/**", "jsdom"],
      ["src/components/**", "jsdom"],
    ],
    setupFiles: ["tests/setup.env.ts", "tests/components/setup.ts"],
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
