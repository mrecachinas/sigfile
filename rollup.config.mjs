import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import esbuild from "rollup-plugin-esbuild";
import terser from "@rollup/plugin-terser";

const entries = [
  { input: "src/index.ts", name: "sigfile", file: "dist/sigfile.js" },
  { input: "src/bluefile.ts", name: "bluefile", file: "dist/bluefile.js" },
  { input: "src/matfile.ts", name: "matfile", file: "dist/matfile.js" },
];

const isProduction = process.env.NODE_ENV === "production";

export default entries.map(({ input, name, file }) => ({
  input,
  output: [
    {
      file,
      format: "umd",
      name,
      sourcemap: true,
    },
    {
      file: file.replace(".js", ".mjs"),
      format: "es",
      sourcemap: true,
    },
  ],
  plugins: [
    esbuild({
      target: "es2022",
    }),
    resolve(),
    json(),
    isProduction && terser(),
  ].filter(Boolean),
}));
