import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@gmv\/(.+)$/,
        replacement: path.join(rootDir, "packages/$1/src/index.ts")
      }
    ]
  },
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: [".aiox-core/**", "node_modules/**"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"]
    }
  }
});
