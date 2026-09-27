import json from "@rollup/plugin-json";
import terser from "@rollup/plugin-terser";

const entries = {
  sigfile: "src/index.js",
  bluefile: "src/bluefile.js",
  matfile: "src/matfile.js",
};

const plugins = [
  json(),
  process.env.NODE_ENV === "production" && terser(),
].filter(Boolean);

const chunked = (format, ext) => ({
  dir: "dist",
  format,
  entryFileNames: `[name].${ext}`,
  chunkFileNames: `chunks/[name]-[hash].${ext}`,
  sourcemap: true,
});

export default [
  // ESM and CJS builds share chunks, so `sigfile` and `sigfile/bluefile`
  // expose the same class instances.
  {
    input: entries,
    output: [chunked("es", "mjs"), chunked("cjs", "cjs")],
    plugins,
  },
  // Standalone UMD bundles for <script> tags and legacy `main` consumers.
  ...Object.entries(entries).map(([name, input]) => ({
    input,
    output: { file: `dist/${name}.js`, format: "umd", name, sourcemap: true },
    plugins,
  })),
];
