import * as esbuild from "esbuild";

const entries = [
  { entryPoint: "src/index.ts", outbase: "sigfile" },
  { entryPoint: "src/bluefile.ts", outbase: "bluefile" },
  { entryPoint: "src/matfile.ts", outbase: "matfile" },
];

const isProduction = process.env.NODE_ENV === "production";

for (const { entryPoint, outbase } of entries) {
  const shared = {
    entryPoints: [entryPoint],
    bundle: true,
    sourcemap: true,
    target: "es2022",
    platform: "neutral",
    minify: isProduction,
  };

  await esbuild.build({
    ...shared,
    format: "cjs",
    outfile: `dist/${outbase}.js`,
  });

  await esbuild.build({
    ...shared,
    format: "esm",
    outfile: `dist/${outbase}.mjs`,
  });
}
