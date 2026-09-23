import { build } from "esbuild";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
await mkdir(".test-build", { recursive: true });
try {
  await build({
    entryPoints: ["tests/tenant-ai.test.ts"],
    outfile: ".test-build/tenant-ai.test.cjs",
    bundle: true,
    platform: "node",
    format: "cjs",
    packages: "external",
    alias: {
      "@/lib/db/neon": resolve("tests/helpers/db.ts"),
      "@/services/ai/openai-client": resolve("tests/helpers/openai.ts"),
    },
    plugins: [
      {
        name: "mock-openai",
        setup(b) {
          b.onResolve({ filter: /^\.\/openai-client$/ }, () => ({
            path: resolve("tests/helpers/openai.ts"),
          }));
        },
      },
    ],
  });
  const result = spawnSync(
    process.execPath,
    ["--test", ".test-build/tenant-ai.test.cjs"],
    { stdio: "inherit" },
  );
  process.exitCode = result.status || 0;
} finally {
  await rm(".test-build", { recursive: true, force: true });
}
