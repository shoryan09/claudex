import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["collect.ts"],
  format: ["esm"],
  outDir: "dist",
  clean: true,
});