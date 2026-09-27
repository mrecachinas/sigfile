import { matToBigEndian, readArrayBuffer } from './helpers';
import { MatHeader, MatFileReader } from '../src/matfile';

describe('MatHeader', () => {
  it('should parse the mat-file header from buffer', async () => {
    const buf = await readArrayBuffer('sin.mat');
    const hdr = new MatHeader(buf);

    expect(hdr.buf.byteLength).to.equal(16208);
    expect(hdr.version).to.equal(256);
    expect(hdr.versionName).to.equal('MAT-file');
    expect(hdr.datarep).to.equal('IM');
    expect(hdr.dataTypeName).to.equal('miMATRIX');
    expect(hdr.headerStr).to.be.a('string');
    expect(hdr.headerStr.length).to.be.greaterThan(0);
  });

  it('should extract sine wave data', async () => {
    const buf = await readArrayBuffer('sin.mat');
    const hdr = new MatHeader(buf);

    expect(hdr.dview).to.not.be.undefined;
    expect(hdr.dview.length).to.be.greaterThan(0);
    // Sine wave values should be in [-1, 1]
    for (let i = 0; i < hdr.dview.length; i++) {
      expect(hdr.dview[i]).to.be.at.least(-1.0);
      expect(hdr.dview[i]).to.be.at.most(1.0);
    }
  });

  it('should parse header metadata fields', async () => {
    const buf = await readArrayBuffer('sin.mat');
    const hdr = new MatHeader(buf);

    expect(hdr.headerList).to.be.an('array');
    expect(hdr.headerList.length).to.be.greaterThan(0);
    expect(hdr.arraySize).to.be.greaterThan(0);
    expect(hdr.dataType).to.equal(14); // miMATRIX
  });

  it('should handle null buffer', () => {
    const hdr = new MatHeader(null);
    expect(hdr.buf).to.be.null;
  });
});

describe('MatFileReader', () => {
  it('should store constructor options', () => {
    const opts = { someOption: true };
    const mfr = new MatFileReader(opts);
    expect(mfr.options).to.eql(opts);
    expect(mfr.header_class).to.equal(MatHeader);
  });
});

describe('MatHeader data elements', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Column-major order, as MATLAB stores arrays
  const columnMajor = (dims, value) => {
    const out = [];
    const index = new Array(dims.length).fill(0);
    const total = dims.reduce((a, b) => a * b, 1);
    for (let n = 0; n < total; n++) {
      out.push(value(index));
      for (let d = 0; d < dims.length && ++index[d] === dims[d]; d++) {
        index[d] = 0;
      }
    }
    return out;
  };
  const dense = (length, entries) => {
    const out = new Array(length).fill(0);
    for (const [i, v] of Object.entries(entries)) out[i] = v;
    return out;
  };

  // Expected values mirror tests/dat/make_mat_fixtures.py
  const CASES = {
    'sin.mat': {
      arrayName: 'test_array',
      arrayClassName: 'mxDOUBLE_CLASS',
      dims: [1, 2001],
      type: Float64Array,
    },
    'int16.mat': {
      arrayClassName: 'mxINT16_CLASS',
      dims: [1, 10],
      type: Int16Array,
      dview: [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4],
    },
    'single.mat': {
      arrayClassName: 'mxSINGLE_CLASS',
      dims: [1, 5],
      type: Float32Array,
      dview: [0, 0.5, 0.25, -1.5, 3.75],
    },
    'complex.mat': {
      arrayClassName: 'mxDOUBLE_CLASS',
      dims: [1, 3],
      complex: true,
      type: Float64Array,
      dview: [1, 3, -5],
      dviewImag: [2, -4, 0.5],
    },
    'matrix.mat': {
      dims: [3, 4],
      type: Float64Array,
      dview: columnMajor([3, 4], ([r, c]) => r * 4 + c),
    },
    'ndarray.mat': {
      dims: [2, 3, 4],
      type: Float64Array,
      dview: columnMajor([2, 3, 4], ([i, j, k]) => i * 12 + j * 4 + k),
    },
    'sparse.mat': {
      arrayClassName: 'mxSPARSE_CLASS',
      dims: [4, 5],
      type: Float64Array,
      dview: dense(20, { 4: 1.5, 6: -2, 19: 3.25 }),
    },
    'sparse_complex.mat': {
      arrayClassName: 'mxSPARSE_CLASS',
      dims: [2, 3],
      complex: true,
      type: Float64Array,
      dview: dense(6, { 1: 1 }),
      dviewImag: dense(6, { 1: 1, 4: -2 }),
    },
    'logical.mat': {
      arrayClassName: 'mxUINT8_CLASS',
      logical: true,
      type: Uint8Array,
      dview: [1, 0, 1, 1],
    },
    'global.mat': { global: true, dview: [7, 8] },
    'int64.mat': {
      arrayClassName: 'mxINT64_CLASS',
      type: Float64Array,
      dview: [-1, -Math.pow(2, 40), Math.pow(2, 40) + 7],
    },
    'uint64.mat': {
      arrayClassName: 'mxUINT64_CLASS',
      type: Float64Array,
      dview: [1, Math.pow(2, 32) + 5, Infinity],
    },
    'compacted.mat': {
      arrayClassName: 'mxDOUBLE_CLASS',
      dims: [1, 3],
      type: Float64Array,
      dview: [1, 2, 250],
    },
  };

  for (const [name, expected] of Object.entries(CASES)) {
    for (const bigEndian of [false, true]) {
      it(`should read ${name} (${bigEndian ? 'big' : 'little'}-endian)`, async () => {
        let buf = await readArrayBuffer(name);
        if (bigEndian) buf = matToBigEndian(buf);
        const hdr = new MatHeader(buf);

        expect(hdr.datarep).to.equal(bigEndian ? 'MI' : 'IM');
        expect(hdr.arrayName).to.equal(expected.arrayName || 'x');
        if (expected.arrayClassName) {
          expect(hdr.arrayClassName).to.equal(expected.arrayClassName);
        }
        if (expected.dims) expect(hdr.dims).to.eql(expected.dims);
        expect(hdr.complex).to.equal(!!expected.complex);
        expect(hdr.global).to.equal(!!expected.global);
        expect(hdr.logical).to.equal(!!expected.logical);
        if (expected.type) expect(hdr.dview).to.be.instanceOf(expected.type);
        if (expected.dview)
          expect(Array.from(hdr.dview)).to.eql(expected.dview);
        if (expected.dviewImag) {
          expect(Array.from(hdr.dviewImag)).to.eql(expected.dviewImag);
        } else {
          expect(hdr.dviewImag).to.be.undefined;
        }
      });
    }
  }

  it('should read big-endian sin.mat identically', async () => {
    const buf = await readArrayBuffer('sin.mat');
    const le = new MatHeader(buf);
    const be = new MatHeader(matToBigEndian(buf));
    expect(Array.from(be.dview)).to.eql(Array.from(le.dview));
  });

  it('should read char arrays as character codes', async () => {
    const hdr = new MatHeader(await readArrayBuffer('char.mat'));
    expect(hdr.arrayClassName).to.equal('mxCHAR_CLASS');
    expect(String.fromCharCode.apply(null, hdr.dview)).to.equal('hello');
  });

  it('should reject compressed MAT-files with a clear error', async () => {
    const buf = await readArrayBuffer('compressed.mat');
    expect(() => new MatHeader(buf)).to.throw(/miCOMPRESSED.*-v6/);
  });

  it('should reject v7.3 (HDF5) MAT-files with a clear error', () => {
    const buf = new ArrayBuffer(512);
    new Uint8Array(buf).set(
      Array.from('MATLAB 7.3 MAT-file').map((c) => c.charCodeAt(0)),
    );
    new DataView(buf).setUint16(124, 0x0200, true);
    new Uint8Array(buf).set([73, 77], 126); // 'IM'
    expect(() => new MatHeader(buf)).to.throw(/v7\.3.*-v6/);
  });

  it('should reject struct arrays with a clear error', async () => {
    const buf = await readArrayBuffer('struct.mat');
    expect(() => new MatHeader(buf)).to.throw(
      /mxSTRUCT_CLASS arrays are not supported/,
    );
  });

  it('should default createArray to the rest of the buffer', () => {
    const hdr = new MatHeader(null);
    const buf = new Float64Array([1, 2, 3]).buffer;
    expect(Array.from(hdr.createArray(buf, 8, undefined, 'miDOUBLE'))).to.eql([
      2, 3,
    ]);
    expect(
      Array.from(hdr.createArray(buf, undefined, undefined, 'miDOUBLE')),
    ).to.eql([1, 2, 3]);
  });

  it('should copy values that are not aligned to their element size', () => {
    const bytes = new Uint8Array(9);
    new DataView(bytes.buffer).setFloat64(1, Math.PI, true);
    const values = new MatHeader(null).createArray(
      bytes.buffer,
      1,
      1,
      'miDOUBLE',
      true,
    );
    expect(Array.from(values)).to.eql([Math.PI]);
  });

  it('should read a data element with setData', async () => {
    const buf = await readArrayBuffer('compacted.mat');
    const hdr = new MatHeader(buf);
    // The values element is the last 8 bytes; setData takes a 1-based index
    hdr.setData(buf, new DataView(buf), buf.byteLength - 8 + 1, true);
    expect(hdr.dview).to.be.instanceOf(Uint8Array);
    expect(Array.from(hdr.dview)).to.eql([1, 2, 250]);
  });

  it('should reject data that is not an miMATRIX', async () => {
    const buf = (await readArrayBuffer('int16.mat')).slice(0);
    new DataView(buf).setUint32(128, 9, true); // miDOUBLE
    expect(() => new MatHeader(buf)).to.throw(
      /Expected miMATRIX data, found miDOUBLE/,
    );
  });

  it('should reject unknown array classes', async () => {
    const buf = (await readArrayBuffer('int16.mat')).slice(0);
    new DataView(buf).setUint8(144, 42); // array flags class byte
    expect(() => new MatHeader(buf)).to.throw(/Unknown MAT array class 42/);
  });

  it('should reject unknown data types', async () => {
    const buf = (await readArrayBuffer('int16.mat')).slice(0);
    new DataView(buf).setUint32(128, 99, true);
    expect(() => new MatHeader(buf)).to.throw(/Unknown MAT data type 99/);
  });

  it('should not warn about 2-D arrays', async () => {
    new MatHeader(await readArrayBuffer('matrix.mat'));
    expect(console.warn).not.toHaveBeenCalled();
  });
});
