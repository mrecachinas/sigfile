SigFile
======================

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0) [![Node.js CI](https://github.com/spectriclabs/sigfile/actions/workflows/nodejs.yml/badge.svg)](https://github.com/spectriclabs/sigfile/actions/workflows/nodejs.yml) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](.github/CONTRIBUTING.md#pull-requests) [![npm version](https://badge.fury.io/js/sigfile.svg)](https://badge.fury.io/js/sigfile)

SigFile provides MATLAB file parsing and XMIDAS Bluefile parsing in JS.

## Installation

```
npm i sigfile
```

## Example

### ESM

```javascript
import { bluefile } from 'sigfile';
import { readFile } from 'fs/promises';

const buf = await readFile('./tests/dat/ramp.tmp');
const header = new bluefile.BlueHeader(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
console.log(header.type, header.format, header.size);
```

Sub-module imports are also available:

```javascript
import { BlueHeader } from 'sigfile/bluefile';
import { MatHeader } from 'sigfile/matfile';
```

### CommonJS

```javascript
const { bluefile } = require('sigfile');
const fs = require('fs');

fs.readFile('./tests/dat/ramp.tmp', function(err, buf) {
    const header = new bluefile.BlueHeader(buf.buffer);
    console.log(header);
});
```

### Browser (HTTP)

```javascript
import { bluefile } from 'sigfile';

const reader = new bluefile.BlueFileReader();
const request = reader.read_http('https://example.com/data.tmp', (header, err) => {
    if (!header) {
        console.error('Failed to load bluefile', err);
        return;
    }
    console.log(header.type, header.format, header.dview);
});

// request.abort() cancels the download; the callback is then not called.
```

`read(file, onload)` and `readheader(file, onload)` work the same way for
local `File` or `Blob` objects. `readheader` loads only the first 512 bytes,
so `header.size` is set but `header.dview` is undefined.

## Upgrading from 0.1.x

- The builds use modern JavaScript (ES2022: class fields, optional catch
  binding) and are no longer transpiled to ES5. Old browsers and bundlers that
  can't parse ES2022, such as webpack 4, need to transpile `sigfile` themselves.
- `package.json` now has an `exports` map. The supported entry points are
  `sigfile`, `sigfile/bluefile`, `sigfile/matfile`, `sigfile/dist/*`, and
  `sigfile/package.json`.
- `read_http` uses `fetch` instead of `XMLHttpRequest`:
  - It returns an `AbortController` instead of the `XMLHttpRequest`.
  - `file://` URLs are no longer supported.
- On failure, `onload` receives `null` plus the error as a second argument.
  Parse errors are reported this way instead of being thrown.
- The minimum supported Node.js version is 22.
