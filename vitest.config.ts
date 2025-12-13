import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    alias: {
      "~": path.resolve(__dirname, "src"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  esbuild: {
    // Naudojame automatinį JSX runtime, kad testuose nereiktų global React importo.
    jsx: "automatic",
  },
});
