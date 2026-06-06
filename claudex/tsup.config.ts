import { defineConfig } from "tsup";

export default defineConfig({
  entry: { contextis: "collect.ts" },
  outDir: "bin",
  format: ["esm"],
  target: "node16",
  clean: true,
  banner: { js: "#!/usr/bin/env node" },
});