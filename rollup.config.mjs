import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import terser from "@rollup/plugin-terser";

const entries = [
  { input: "src/index.js", name: "sigfile", file: "dist/sigfile.js" },
  { input: "src/bluefile.js", name: "bluefile", file: "dist/bluefile.js" },
  { input: "src/matfile.js", name: "matfile", file: "dist/matfile.js" },
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
  plugins: [resolve(), json(), isProduction && terser()].filter(Boolean),
}));
