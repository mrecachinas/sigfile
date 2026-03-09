import { ChunkedDataView } from '../src/chunked-dataview';

describe('ChunkedDataView', () => {
  // Helper: create a fetcher backed by an ArrayBuffer
  function bufferFetcher(sourceBuf) {
    return (start, end) => {
      return Promise.resolve(sourceBuf.slice(start, end));
    };
  }

  function createTestBuffer(size) {
    const buf = new ArrayBuffer(size);
    const u8 = new Uint8Array(buf);
    for (let i = 0; i < size; i++) {
      u8[i] = i & 0xff;
    }
    return buf;
  }

  it('should report correct byteLength', () => {
    const cdv = new ChunkedDataView({
      fetcher: bufferFetcher(new ArrayBuffer(1000)),
      totalByteLength: 1000,
    });
    expect(cdv.byteLength).to.equal(1000);
  });

  it('should fetch a single-chunk range', async () => {
    const source = createTestBuffer(256);
    const cdv = new ChunkedDataView({
      fetcher: bufferFetcher(source),
      totalByteLength: 256,
      chunkSize: 256,
    });
    const result = await cdv.getRange(0, 10);
    const u8 = new Uint8Array(result);
    expect(u8.length).to.equal(10);
    expect(u8[0]).to.equal(0);
    expect(u8[9]).to.equal(9);
  });

  it('should fetch a multi-chunk range', async () => {
    const source = createTestBuffer(256);
    const cdv = new ChunkedDataView({
      fetcher: bufferFetcher(source),
      totalByteLength: 256,
      chunkSize: 64,
    });
    // This range spans chunks 0 and 1
    const result = await cdv.getRange(60, 70);
    const u8 = new Uint8Array(result);
    expect(u8.length).to.equal(10);
    expect(u8[0]).to.equal(60);
    expect(u8[9]).to.equal(69);
  });

  it('should cache chunks and reuse them', async () => {
    let fetchCount = 0;
    const source = createTestBuffer(256);
    const cdv = new ChunkedDataView({
      fetcher: (start, end) => {
        fetchCount++;
        return Promise.resolve(source.slice(start, end));
      },
      totalByteLength: 256,
      chunkSize: 64,
    });

    await cdv.getRange(0, 10);
    expect(fetchCount).to.equal(1);
    expect(cdv.cachedChunks).to.equal(1);

    // Same chunk — should not re-fetch
    await cdv.getRange(10, 20);
    expect(fetchCount).to.equal(1);
    expect(cdv.cachedChunks).to.equal(1);
  });

  it('should clear cache', async () => {
    const source = createTestBuffer(256);
    const cdv = new ChunkedDataView({
      fetcher: bufferFetcher(source),
      totalByteLength: 256,
      chunkSize: 64,
    });
    await cdv.getRange(0, 10);
    expect(cdv.cachedChunks).to.equal(1);
    cdv.clearCache();
    expect(cdv.cachedChunks).to.equal(0);
  });

  it('should return empty buffer for empty range', async () => {
    const cdv = new ChunkedDataView({
      fetcher: bufferFetcher(new ArrayBuffer(100)),
      totalByteLength: 100,
    });
    const result = await cdv.getRange(50, 50);
    expect(result.byteLength).to.equal(0);
  });

  it('should clamp range to totalByteLength', async () => {
    const source = createTestBuffer(100);
    const cdv = new ChunkedDataView({
      fetcher: bufferFetcher(source),
      totalByteLength: 100,
      chunkSize: 64,
    });
    const result = await cdv.getRange(90, 200);
    expect(new Uint8Array(result).length).to.equal(10);
  });

  it('should return typed array via getTypedRange', async () => {
    const source = new ArrayBuffer(40);
    const f32 = new Float32Array(source);
    for (let i = 0; i < f32.length; i++) {
      f32[i] = i * 1.5;
    }

    const cdv = new ChunkedDataView({
      fetcher: bufferFetcher(source),
      totalByteLength: 40,
      chunkSize: 64,
    });

    const result = await cdv.getTypedRange(Float32Array, 0, 5);
    expect(result.length).to.equal(5);
    expect(result[0]).to.equal(0);
    expect(result[1]).to.be.closeTo(1.5, 0.001);
    expect(result[4]).to.be.closeTo(6.0, 0.001);
  });

  it('should handle range spanning 3+ chunks', async () => {
    const source = createTestBuffer(256);
    const cdv = new ChunkedDataView({
      fetcher: bufferFetcher(source),
      totalByteLength: 256,
      chunkSize: 32,
    });
    // Spans chunks 1, 2, 3 (bytes 32-127)
    const result = await cdv.getRange(40, 110);
    const u8 = new Uint8Array(result);
    expect(u8.length).to.equal(70);
    expect(u8[0]).to.equal(40);
    expect(u8[69]).to.equal(109);
  });
});
