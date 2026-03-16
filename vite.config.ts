import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import yaml from "@modyfi/vite-plugin-yaml";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [yaml(), react(), cloudflare()],
  test: {
    globals: true,
  },
});