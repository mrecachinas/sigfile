// Parse-only check (no rules) that dist/ uses syntax old toolchains accept:
// ES5 for the UMD and CJS builds, ES2015 modules for the ESM build.
export default [
  {
    files: ["dist/**/*.js", "dist/**/*.cjs"],
    languageOptions: { ecmaVersion: 5, sourceType: "script" },
  },
  {
    files: ["dist/**/*.mjs"],
    languageOptions: { ecmaVersion: 2015, sourceType: "module" },
  },
];
