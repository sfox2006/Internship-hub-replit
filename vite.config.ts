import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist/client", manifest: true },
  test: { include: ["src/tests/**/*.test.ts"] },
});
