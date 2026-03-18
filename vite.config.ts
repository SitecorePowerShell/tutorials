import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import yaml from "@modyfi/vite-plugin-yaml";
import { readFileSync } from "fs";
import { execSync } from "child_process";

import { cloudflare } from "@cloudflare/vite-plugin";

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
const gitHash = execSync("git rev-parse --short HEAD").toString().trim();

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(`${pkg.version}+${gitHash}`),
  },
  plugins: [yaml(), react(), cloudflare()],
  test: {
    globals: true,
  },
});