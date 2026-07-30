import * as esbuild from 'esbuild';

const entries = [
  { entryPoint: 'src/index.ts', name: 'sigfile' },
  { entryPoint: 'src/bluefile.ts', name: 'bluefile' },
  { entryPoint: 'src/matfile.ts', name: 'matfile' },
];

const isProduction = process.env.NODE_ENV === 'production';

// esbuild doesn't support UMD natively, so we build IIFE and wrap it
function umdWrapper(name) {
  return {
    banner: `(function(root, factory) {
  if (typeof define === 'function' && define.amd) { define([], factory); }
  else if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.${name} = factory(); }
}(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function() {`,
    footer: `return ${name};\n}));`,
  };
}

for (const { entryPoint, name } of entries) {
  const shared = {
    entryPoints: [entryPoint],
    bundle: true,
    sourcemap: true,
    target: 'es2022',
    platform: 'neutral',
    minify: isProduction,
  };

  // UMD (for <script> tags, require(), and AMD)
  const umd = umdWrapper(name);
  await esbuild.build({
    ...shared,
    format: 'iife',
    globalName: name,
    outfile: `dist/${name}.js`,
    banner: { js: umd.banner },
    footer: { js: umd.footer },
  });

  // ESM
  await esbuild.build({
    ...shared,
    format: 'esm',
    outfile: `dist/${name}.mjs`,
  });
}
