# AGENTS.md

Guidance for coding agents and contributors working on sigfile.

sigfile parses X-Midas Bluefiles and MATLAB Level 5 MAT-files in JavaScript.
Its main consumer is [SigPlot](https://github.com/spectriclabs/sigplot), which
bundles `dist/` as published. Most of the constraints below exist to keep
SigPlot working.

## Commands

Development needs Node.js 22 or newer (`devEngines` in `package.json`). The
published package has no Node.js requirement of its own.

| Task | Command |
|---|---|
| Install | `npm ci` |
| Test | `npm test` |
| Test one file or test | `npx vitest run tests/util.test.js -t "<test name>"` |
| Coverage | `npm run test:coverage` (lcov in `coverage/`) |
| Format and lint, fixing files | `npm run lint` |
| Format and lint, check only | `npm run lint:check` |
| Check type declarations | `npm run typecheck` |
| Build `dist/` | `npm run build:prod` (minified) or `npm run build:dev` |
| Check `dist/` syntax | `npm run check:dist` (after a build) |
| API docs | `npm run generate-docs` (output in `doc/`) |

CI (`.github/workflows/nodejs.yml`) runs this on Node.js 22 and 24. Run it
before finishing a change:

```sh
npm run lint:check && npm run typecheck && npm run build:prod && npm run check:dist && npm run test:coverage
```

## Layout

- `src/`: the library. `index.js` exports `bluefile`, `matfile`, and
  `version`. `basefilereader.js` holds the readers shared by both formats:
  `read`, `readheader`, and `read_http`.
- `types/`: hand-written TypeScript declarations. The `*.d.ts` files serve
  CommonJS; each `*.d.mts` re-exports its `.d.ts` for ESM.
- `tests/`: Vitest suites, `helpers.js`, the test HTTP server
  (`http-server-setup.js`), type tests (`types.mts`), and fixtures (`dat/`,
  including the MAT fixture generator `dat/make_mat_fixtures.py`).
- `rollup.config.mjs` builds `dist/`. `eslint.dist.config.mjs` is the
  `check:dist` syntax check.
- `dist/`, `doc/`, and `coverage/` are generated and gitignored. Don't commit
  them.

## How SigPlot uses sigfile

Check these call sites in SigPlot before changing anything they touch:

- `require("sigfile")`, then `bluefile` and `matfile` from the result.
- `new bluefile.BlueFileReader()` and `new matfile.MatFileReader()`, then
  `read_http(href, onload)`. SigPlot keeps the returned request so it can
  abort it (`overlay_href_single` in `js/sigplot.js`).
- `BlueFileReader.read(file, onload)` for local files. The callback passes the
  header on without checking for `null` (`load_files` in `js/sigplot.js`).
- `new bluefile.BlueHeader(null)`, then SigPlot assigns header fields itself
  and calls `setData(data)` with a JS array, a 2-D array, a typed array, or an
  `ArrayBuffer` (`m.initialize` in `js/m.js`). This is how SigPlot plots
  in-memory data. In streaming ("pipe") mode it then writes into `dview` and
  expects `dview` to be a view of the same `ArrayBuffer`.
- Header fields such as `dview`, `size`, `bpe`, `ape`, `class`, and
  `file_name`. For MAT-files, SigPlot plots `dview` directly as a flat numeric
  array (`overlay_matfile`).

## Constraints

### Keep `dist/` ES5

SigPlot bundles `dist/` with browserify without transpiling it, then minifies
the bundle with a 2013 Closure Compiler that only parses ES5. Rollup therefore
runs Babel (`preset-env` with `forceAllTransforms`) on every build.
`npm run check:dist` fails if the UMD or CommonJS files contain anything newer
than ES5 syntax; the ESM files may also use ES2015 `import` and `export`.
Don't remove Babel or loosen that check.

Babel converts syntax only: it adds no polyfills, and `check:dist` only
parses. The code already relies on ES2015 built-ins such as `Proxy` and typed
arrays, but avoid newer ones such as `BigInt`.

### Reader behavior

`BaseFileReader` deliberately uses `XMLHttpRequest` and `FileReader`, not
`fetch` or `Blob.arrayBuffer()`:

- `read_http` loads `file://` URLs where the environment allows it; XHR
  reports status 0 for them. `fetch` rejects `file:` URLs.
- `read_http` returns the `XMLHttpRequest`, which callers use to abort.
- If the caller's `onload` throws, the error must surface as an uncaught
  error, not an unhandled promise rejection. Don't call `onload` from a promise
  chain or inside a `try` block.

Once a read starts, `onload` is called exactly once: `onload(header)` on
success, or `onload(null, err)` on failure. Failures include parse errors,
aborts (`err.name === 'AbortError'`), and timeouts (`'TimeoutError'`).

### Public API

- `new BlueHeader(buf)` and `new MatHeader(buf)` are synchronous, and so is
  `setData`. Keep them that way.
- Keep the single-argument `BlueHeader.setData(data)` path working for every
  input type listed above. When `data` is an `ArrayBuffer` in the host's byte
  order, `dview` must be a view of it, not a copy.
- sigfile has no runtime dependencies. The Rollup config has no node-resolve
  plugin, so a new dependency would be left as an external import rather than
  bundled.
- When the public API changes, update `types/*.d.ts` and `tests/types.mts`.
  Record behavior changes in the "Upgrading from 0.1.x" section of
  `README.md`.
- After changing `exports`, `main`, `types`, or `typesVersions` in
  `package.json`, check the packed tarball:
  `npm pack && npx @arethetypeswrong/cli sigfile-*.tgz`.

## File formats

### Bluefiles

- The header (`headrep`) and data (`datarep`) can each be little-endian
  (`EEEI`) or big-endian (`IEEE`).
- `setData` views data in the host's byte order in place, and copies data in
  the other order through `util.swapBytes`. Keep the host-order path
  copy-free: SigPlot's streaming mode depends on it, and
  `tests/blueheader.nodetest.js` checks both paths.
- Packed-bit (`SP`) data is a `BitArray` covering only the data section:
  `new BitArray(buf, byteOffset, length)`, with `length` in bits.

### MAT-files

- `MatHeader` parses the first variable in a Level 5 MAT-file. `_readTag`
  reads a data element tag in either the normal or the small format.
  `_readMatrix` reads an array's flags, dimensions, name, and values.
  `_readSparse` expands sparse arrays to dense. `_readValues` converts stored
  values to the array's MATLAB class, since MATLAB may store them in a
  smaller type.
- `dview` must stay a flat typed array of real values in column-major order,
  because SigPlot plots it directly. Put new information in separate
  properties, as `dims`, `dviewImag`, and the flags are.
- Compressed (`miCOMPRESSED`, `save -v7`, MATLAB's default) and v7.3 (HDF5)
  files throw an error by design. Supporting `-v7` would mean bundling a zlib
  implementation, since the browser's `DecompressionStream` is asynchronous
  and `new MatHeader(buf)` is not; we decided against adding that dependency.
- 64-bit integers are read by `getInt64` and `getUint64` in `util.js` as two
  32-bit halves, without `BigInt`. Values beyond 2^53 become `Infinity` or
  `-Infinity`, with a console warning.

## Testing

- Vitest runs with globals (`describe`, `it`, `expect`, `vi`). Assertions mix
  chai style (`expect(x).to.equal(y)`) and Jest style
  (`expect(fn).toHaveBeenCalledTimes(1)`).
- Tests run in Node.js by default. Suites that need browser APIs
  (`XMLHttpRequest`, `FileReader`, `File`) start with
  `// @vitest-environment jsdom` and are named `*.browsertest.js`. The
  `*.nodetest.js` and `*.test.js` suites run in Node.js.
- A global setup serves the repository root at `http://127.0.0.1:3000` for
  the HTTP reader tests, and jsdom pages use that origin. Only one test run can
  hold the port, so concurrent runs, such as from two worktrees, fail with
  `EADDRINUSE`.
- `tests/helpers.js` loads fixtures: `readArrayBuffer(name)` returns an
  `ArrayBuffer`, and `readFile(name)` returns a `File`, as a file input would.
- MAT fixtures come from `python3 tests/dat/make_mat_fixtures.py`, run from
  the repository root (needs numpy and scipy). Rerunning it rewrites every
  fixture that scipy writes, because scipy puts the creation time in each
  header, so commit only the fixtures you meant to change. `sin.mat` came from
  MATLAB and isn't generated.
- Big-endian fixtures aren't committed. `bluefileToBigEndian` and
  `matToBigEndian` in `tests/helpers.js` convert the little-endian fixtures at
  test time. The parser tests trust these converters, so if you change them,
  check their output independently: `scipy.io.loadmat` must read a converted
  MAT-file identically to the original, and a converted bluefile must match
  the X-Midas header layout (documented in REDHAWK's `bluefile.py`).
- jsdom drops errors thrown from `FileReader` event handlers, unlike browsers.
  To test that such an error propagates, stub `FileReader` with
  `vi.stubGlobal` and call its `onload` yourself (see
  `tests/basefilereader.browsertest.js`).
- `tests/types.mts` is compiled by `npm run typecheck`, never run. It imports
  `sigfile` by package name, so it also checks the `exports` map.
- Tests import from `src/`, so they don't exercise the Babel output. After
  build changes, also run the suites against `dist/`: use a temporary Vitest
  config that aliases `../src/index`, `../src/bluefile`, and `../src/matfile`
  to the matching `dist/*.mjs` files.

## Style

- Prettier formats `.js`, `.mjs`, `.css`, and `.json` files. `.js` files use
  single quotes; the `.mjs` config files keep Prettier's default double
  quotes.
- ESLint uses its recommended rules. Prefix intentionally unused variables and
  arguments with `_`.
- The API docs are generated from the JSDoc comments in `src/`. Keep them
  current.
- New code should throw `Error` objects. Some older code throws strings.

## Releasing

Creating a GitHub release runs `.github/workflows/npmpublish.yml`, which runs
the checks and then `npm publish`. The `prepack` script builds `dist/` and runs
`check:dist` before packing. Bump the version with
`npm version <version> --no-git-tag-version`. Pushes to `master` rebuild the
API docs site (`.github/workflows/docgen.yml`).
