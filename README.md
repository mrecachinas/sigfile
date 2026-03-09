SigFile
======================

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0) [![Node.js CI](https://github.com/mrecachinas/sigfile/actions/workflows/nodejs.yml/badge.svg)](https://github.com/mrecachinas/sigfile/actions/workflows/nodejs.yml) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](.github/CONTRIBUTING.md#pull-requests) [![npm version](https://badge.fury.io/js/sigfile.svg)](https://badge.fury.io/js/sigfile)

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
reader.read_http('https://example.com/data.tmp', (header) => {
    console.log(header.type, header.format, header.dview);
});
```