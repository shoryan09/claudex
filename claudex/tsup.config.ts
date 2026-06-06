import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["collect.ts"],
  format: ["esm"],
  target: "node16",
  clean: true,
  banner: { js: "#!/usr/bin/env node" },
});