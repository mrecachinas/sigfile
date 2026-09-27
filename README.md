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
const xhr = reader.read_http('https://example.com/data.tmp', (header, err) => {
    if (!header) {
        if (err.name !== 'AbortError') {
            console.error('Failed to load bluefile', err);
        }
        return;
    }
    console.log(header.type, header.format, header.dview);
});

// xhr.abort() cancels the download; the callback then receives an
// error named 'AbortError', so cleanup code still runs.
```

`read(file, onload)` and `readheader(file, onload)` work the same way for
local `File` or `Blob` objects. `readheader` loads only the first 512 bytes,
so `header.size` is set but `header.dview` is undefined.

The readers use `XMLHttpRequest` and `FileReader`, so they work in browsers,
Electron, and jsdom. `read_http` also loads `file://` URLs where the
environment allows it. The readers aren't available in plain Node.js; there,
read the file yourself and pass the `ArrayBuffer` to `BlueHeader` as shown
above.

Once a read starts, `onload` is called exactly once.

## Supported formats

**Bluefiles** (type 1000 and 2000): headers and data in either byte order
(`EEEI` little-endian or `IEEE` big-endian). Data in the host's byte order is
viewed in place; data in the other order is copied and byte-swapped.

**MAT-files** (Level 5, `save -v6`): the first variable in the file, which may
be a numeric, logical, char, or sparse array of any dimension, in either byte
order. `header.dview` holds the real values in MATLAB's column-major order,
with the shape in `header.dims`; complex arrays add `header.dviewImag`, and
sparse arrays are expanded to dense. Compressed (`-v7`, MATLAB's default) and
HDF5 (`-v7.3`) MAT-files, and cell, struct, and object arrays, throw an error;
save with `-v6` instead.

## Upgrading from 0.1.x

- `package.json` now has an `exports` map. The supported entry points are
  `sigfile`, `sigfile/bluefile`, `sigfile/matfile`, `sigfile/dist/*`, and
  `sigfile/package.json`.
- On failure, `onload` receives `null` plus the error as a second argument.
  This includes parse errors, which 0.1.x threw from inside the load handler,
  aborted requests (`err.name === 'AbortError'`), and timeouts
  (`'TimeoutError'`). 0.1.x never reported aborts or timeouts.
- Packed-bit (`SP`) bluefiles: `dview` now covers only the data. 0.1.x also
  included the bits of the file's header, so `size` didn't match `data_size`.
- MAT-file values use the array's MATLAB class, such as `Float64Array` for
  doubles, even when MATLAB stored them in a smaller type such as `miUINT8`.
