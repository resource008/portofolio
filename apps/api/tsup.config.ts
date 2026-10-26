import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node24",
  platform: "node",
  clean: true,
  // packages/shared ships raw .ts, so it must be bundled instead of resolved at runtime.
  noExternal: ["@portofolio/shared"],
});
