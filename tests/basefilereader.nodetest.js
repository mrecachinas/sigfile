import { readBlob } from './helpers';
import { BlueFileReader, BlueHeader } from '../src/bluefile';

// Vitest fails the run on unhandled rejections, so detach its listeners
// while waiting for the one we expect.
async function captureUnhandledRejection(fn) {
  const saved = process.listeners('unhandledRejection');
  process.removeAllListeners('unhandledRejection');
  try {
    return await new Promise((resolve) => {
      process.once('unhandledRejection', resolve);
      fn();
    });
  } finally {
    saved.forEach((listener) => process.on('unhandledRejection', listener));
  }
}

describe('BaseFileReader._read via BlueFileReader', () => {
  it('should read a full file from a Blob', async () => {
    const blob = await readBlob('sin.tmp');

    const bfr = new BlueFileReader();
    const hdr = await new Promise((resolve) => {
      bfr.read(blob, resolve);
    });

    expect(hdr).to.not.be.null;
    expect(hdr.file_name).to.equal('sin.tmp');
    expect(hdr.type).to.equal(1000);
    expect(hdr.format).to.equal('SD');
    expect(hdr.size).to.equal(4096);
    expect(hdr.data_start).to.equal(512);
    expect(hdr.data_size).to.equal(32768);
    expect(hdr.file).to.equal(blob);
  });

  it('should read only the header from a Blob', async () => {
    const blob = await readBlob('sin.tmp');

    const bfr = new BlueFileReader();
    const hdr = await new Promise((resolve) => {
      bfr.readheader(blob, resolve);
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
    const readError = new Error('read failed');
    const blob = { arrayBuffer: () => Promise.reject(readError) };
    const [hdr, err] = await new Promise((resolve) => {
      new BlueFileReader().read(blob, (...args) => resolve(args));
    });
    expect(hdr).to.be.null;
    expect(err).to.equal(readError);
  });

  it('should call onload once and not swallow errors it throws', async () => {
    const blob = await readBlob('sin.tmp');
    const onload = vi.fn(() => {
      throw new Error('boom');
    });
    const reason = await captureUnhandledRejection(() => {
      new BlueFileReader().read(blob, onload);
    });
    expect(reason.message).to.equal('boom');
    expect(onload).toHaveBeenCalledTimes(1);
    expect(onload.mock.calls[0][0]).to.not.be.null;
  });

  it('should read type 2000 data from a Blob', async () => {
    const blob = await readBlob('penny.prm');

    const bfr = new BlueFileReader();
    const hdr = await new Promise((resolve) => {
      bfr.read(blob, resolve);
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
});
