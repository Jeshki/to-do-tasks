import { defineConfig } from "cypress";
import fs from "node:fs";
import path from "node:path";

const envPaths = [".env.local", ".env", ".env.e2e"];

const loadEnvWithFallback = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dotenv = require("dotenv");
    envPaths.forEach((envPath) => dotenv.config({ path: envPath }));
    return;
  } catch {
    // Fall back to a minimal parser when dotenv is not installed.
  }

  for (const envPath of envPaths) {
    const fullPath = path.resolve(process.cwd(), envPath);
    if (!fs.existsSync(fullPath)) continue;
    const contents = fs.readFileSync(fullPath, "utf8");
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eqIndex = line.indexOf("=");
      if (eqIndex <= 0) continue;
      const key = line.slice(0, eqIndex).trim();
      if (process.env[key] !== undefined) continue;
      let value = line.slice(eqIndex + 1).trim();
      if (
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
};

loadEnvWithFallback();

const baseUrl =
  process.env.CYPRESS_BASE_URL ??
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.NEXTAUTH_URL ??
  "http://localhost:3000";

export default defineConfig({
  e2e: {
    baseUrl,
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.{ts,tsx}",
  },
});
