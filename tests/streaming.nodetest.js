import { readFile } from 'fs/promises';
import { BlueFileReader } from '../src/bluefile';

const DATA_DIR = './tests/dat';

// Helper to create a Blob-like object from a Node.js Buffer
function bufferToBlob(buffer, name) {
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
  return {
    name,
    size: buffer.byteLength,
    slice(start, end) {
      const sliced = buffer.subarray(start, end);
      return {
        arrayBuffer() {
          return Promise.resolve(
            sliced.buffer.slice(
              sliced.byteOffset,
              sliced.byteOffset + sliced.byteLength,
            ),
          );
        },
      };
    },
    arrayBuffer() {
      return Promise.resolve(arrayBuffer);
    },
  };
}

describe('BaseFileReader.read with { lazy: true }', () => {
  it('should parse header without loading full file', async () => {
    const data = await readFile(`${DATA_DIR}/sin.tmp`);
    const blob = bufferToBlob(data, 'sin.tmp');
    const reader = new BlueFileReader();

    const hdr = await reader.read(blob, null, { lazy: true });
    expect(hdr.type).to.equal(1000);
    expect(hdr.format).to.equal('SD');
    expect(hdr.file_name).to.equal('sin.tmp');
    expect(typeof hdr.getDataSlice).to.equal('function');
    expect(typeof hdr.clearCache).to.equal('function');
  });

  it('should lazily fetch data slices', async () => {
    const data = await readFile(`${DATA_DIR}/sin.tmp`);
    const blob = bufferToBlob(data, 'sin.tmp');
    const reader = new BlueFileReader();

    const hdr = await reader.read(blob, null, { lazy: true });
    const slice = await hdr.getDataSlice(0, 10);

    expect(slice.length).to.equal(10);
    expect(slice instanceof Float64Array).to.be.true;
  });

  it('should support AbortSignal', async () => {
    const data = await readFile(`${DATA_DIR}/sin.tmp`);
    const blob = bufferToBlob(data, 'sin.tmp');
    const reader = new BlueFileReader();

    const controller = new AbortController();
    controller.abort();

    await expect(
      reader.read(blob, null, { lazy: true, signal: controller.signal }),
    ).rejects.toThrow('Aborted');
  });

  it('should clear cache', async () => {
    const data = await readFile(`${DATA_DIR}/sin.tmp`);
    const blob = bufferToBlob(data, 'sin.tmp');
    const reader = new BlueFileReader();

    const hdr = await reader.read(blob, null, { lazy: true });
    await hdr.getDataSlice(0, 10);
    expect(hdr._chunkedView.cachedChunks).to.be.greaterThan(0);
    hdr.clearCache();
    expect(hdr._chunkedView.cachedChunks).to.equal(0);
  });

  it('should still work in non-lazy mode with callback', async () => {
    const data = await readFile(`${DATA_DIR}/sin.tmp`);
    const blob = bufferToBlob(data, 'sin.tmp');
    const reader = new BlueFileReader();

    const hdr = await new Promise((resolve) => {
      reader.read(blob, resolve);
    });
    expect(hdr.type).to.equal(1000);
    expect(hdr.dview).to.not.be.undefined;
    expect(hdr.dview.length).to.be.greaterThan(0);
  });
});
