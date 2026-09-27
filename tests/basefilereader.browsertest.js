// @vitest-environment jsdom
import { readArrayBuffer, readFile } from './helpers';
import { BlueFileReader, BlueHeader } from '../src/bluefile';
import { MatFileReader } from '../src/matfile';

describe('BaseFileReader._read via BlueFileReader', () => {
  it('should read a full File', async () => {
    const file = await readFile('sin.tmp');

    const bfr = new BlueFileReader();
    const hdr = await new Promise((resolve) => {
      bfr.read(file, resolve);
    });

    expect(hdr).to.not.be.null;
    expect(hdr.file_name).to.equal('sin.tmp');
    expect(hdr.type).to.equal(1000);
    expect(hdr.format).to.equal('SD');
    expect(hdr.size).to.equal(4096);
    expect(hdr.data_start).to.equal(512);
    expect(hdr.data_size).to.equal(32768);
    expect(hdr.file).to.equal(file);
  });

  it('should read only the header from a File', async () => {
    const file = await readFile('sin.tmp');

    const bfr = new BlueFileReader();
    const hdr = await new Promise((resolve) => {
      bfr.readheader(file, resolve);
    });

    expect(hdr).to.not.be.null;
    expect(hdr.file_name).to.equal('sin.tmp');
    expect(hdr.type).to.equal(1000);
    expect(hdr.format).to.equal('SD');
    expect(hdr.size).to.equal(4096);
    expect(hdr.dview).to.be.undefined;
  });

  it('should pass parse errors to onload', async () => {
    const blob = new Blob([new Uint8Array(10)]);
    const [hdr, err] = await new Promise((resolve) => {
      new BlueFileReader().read(blob, (...args) => resolve(args));
    });
    expect(hdr).to.be.null;
    expect(err).to.be.instanceOf(RangeError);
  });

  it('should pass read errors to onload', async () => {
    const readError = new DOMException('read failed', 'NotReadableError');
    vi.stubGlobal(
      'FileReader',
      class {
        readAsArrayBuffer() {
          this.error = readError;
          setTimeout(() => this.onerror());
        }
      },
    );
    try {
      const [hdr, err] = await new Promise((resolve) => {
        new BlueFileReader().read(new Blob([]), (...args) => resolve(args));
      });
      expect(hdr).to.be.null;
      expect(err).to.equal(readError);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('should call onload once and let errors it throws propagate', async () => {
    // jsdom drops errors thrown from FileReader handlers instead of reporting
    // them like browsers do, so drive a stub reader's onload directly.
    const buf = await readArrayBuffer('sin.tmp');
    let reader;
    vi.stubGlobal(
      'FileReader',
      class {
        constructor() {
          reader = this;
        }
        readAsArrayBuffer() {}
      },
    );
    try {
      const onload = vi.fn(() => {
        throw new Error('boom');
      });
      new BlueFileReader().read(new Blob([]), onload);
      reader.result = buf;
      expect(() => reader.onload()).toThrow('boom');
      expect(onload).toHaveBeenCalledTimes(1);
      expect(onload.mock.calls[0][0]).to.not.be.null;
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('should read type 2000 data from a File', async () => {
    const file = await readFile('penny.prm');

    const bfr = new BlueFileReader();
    const hdr = await new Promise((resolve) => {
      bfr.read(file, resolve);
    });

    expect(hdr).to.not.be.null;
    expect(hdr.type).to.equal(2000);
    expect(hdr.format).to.equal('SD');
    expect(hdr.size).to.equal(128);
  });

  it('should store constructor options', () => {
    const opts = { ext_header_type: 'json' };
    const bfr = new BlueFileReader(opts);
    expect(bfr.options).to.eql(opts);
    expect(bfr.header_class).to.equal(BlueHeader);
  });

  it('should read a mat-file via MatFileReader', async () => {
    const file = await readFile('sin.mat');

    const mfr = new MatFileReader();
    const hdr = await new Promise((resolve) => {
      mfr.read(file, resolve);
    });

    expect(hdr).to.not.be.null;
    expect(hdr.file_name).to.equal('sin.mat');
    expect(hdr.versionName).to.equal('MAT-file');
    expect(hdr.dview).to.not.be.undefined;
    expect(hdr.dview.length).to.be.greaterThan(0);
  });
});
