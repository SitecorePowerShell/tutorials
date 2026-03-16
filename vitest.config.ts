import { defineConfig } from "vitest/config";
import yaml from "@modyfi/vite-plugin-yaml";

export default defineConfig({
  plugins: [yaml()],
  test: {
    globals: true,
    exclude: [
      "node_modules/**",
      "src/integration/**",
    ],
  },
});
