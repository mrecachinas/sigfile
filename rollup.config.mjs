import { babel } from "@rollup/plugin-babel";
import json from "@rollup/plugin-json";
import terser from "@rollup/plugin-terser";

const entries = {
  sigfile: "src/index.js",
  bluefile: "src/bluefile.js",
  matfile: "src/matfile.js",
};

const plugins = [
  json(),
  // Emit ES5 syntax, as 0.1.x did. Consumers such as SigPlot bundle dist/
  // without transpiling it and minify with ES5-only tools (Closure Compiler).
  babel({
    babelHelpers: "bundled",
    babelrc: false,
    configFile: false,
    presets: [
      [
        "@babel/preset-env",
        { forceAllTransforms: true, ignoreBrowserslistConfig: true },
      ],
    ],
  }),
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
