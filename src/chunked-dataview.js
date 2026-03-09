/**
 * ChunkedDataView provides lazy, range-based access to large file data
 * without loading the entire file into memory.
 *
 * Instead of holding all data in a single ArrayBuffer, it uses a
 * fetcher function to load data on demand in chunks.
 */
class ChunkedDataView {
  /**
   * @param {object} options
   * @param {function(number, number): Promise<ArrayBuffer>} options.fetcher -
   *   Async function that fetches a byte range: fetcher(byteStart, byteEnd)
   *   Returns an ArrayBuffer for the requested range.
   * @param {number} options.totalByteLength - Total size of the data in bytes
   * @param {number} [options.chunkSize=65536] - Size of each cached chunk in bytes (default 64KB)
   */
  constructor({ fetcher, totalByteLength, chunkSize = 65536 }) {
    this.fetcher = fetcher;
    this.totalByteLength = totalByteLength;
    this.chunkSize = chunkSize;
    /** @type {Map<number, ArrayBuffer>} */
    this._cache = new Map();
  }

  /**
   * Total byte length of the data
   * @returns {number}
   */
  get byteLength() {
    return this.totalByteLength;
  }

  /**
   * Fetch a range of bytes as an ArrayBuffer.
   *
   * @param {number} byteStart - Start byte offset (inclusive)
   * @param {number} byteEnd - End byte offset (exclusive)
   * @returns {Promise<ArrayBuffer>} The requested data
   */
  async getRange(byteStart, byteEnd) {
    byteEnd = Math.min(byteEnd, this.totalByteLength);
    if (byteStart >= byteEnd) {
      return new ArrayBuffer(0);
    }

    const startChunk = Math.floor(byteStart / this.chunkSize);
    const endChunk = Math.floor((byteEnd - 1) / this.chunkSize);

    // Fast path: single chunk
    if (startChunk === endChunk) {
      const chunk = await this._getChunk(startChunk);
      const offsetInChunk = byteStart - startChunk * this.chunkSize;
      const length = byteEnd - byteStart;
      return chunk.slice(offsetInChunk, offsetInChunk + length);
    }

    // Multi-chunk: fetch all needed chunks and assemble
    const result = new Uint8Array(byteEnd - byteStart);
    let destOffset = 0;

    for (let ci = startChunk; ci <= endChunk; ci++) {
      const chunk = await this._getChunk(ci);
      const chunkStart = ci * this.chunkSize;
      const srcStart = Math.max(byteStart, chunkStart) - chunkStart;
      const srcEnd = Math.min(byteEnd, chunkStart + this.chunkSize) - chunkStart;
      const src = new Uint8Array(chunk, srcStart, srcEnd - srcStart);
      result.set(src, destOffset);
      destOffset += src.length;
    }

    return result.buffer;
  }

  /**
   * Fetch a range of data and return it as a typed array.
   *
   * @template {Int8ArrayConstructor|Uint8ArrayConstructor|Int16ArrayConstructor|Uint16ArrayConstructor|Int32ArrayConstructor|Uint32ArrayConstructor|Float32ArrayConstructor|Float64ArrayConstructor} T
   * @param {T} TypedArrayClass - The TypedArray constructor to use
   * @param {number} elementStart - Start element index (inclusive)
   * @param {number} elementEnd - End element index (exclusive)
   * @returns {Promise<InstanceType<T>>} The requested data as a typed array
   */
  async getTypedRange(TypedArrayClass, elementStart, elementEnd) {
    const bytesPerElement = TypedArrayClass.BYTES_PER_ELEMENT;
    const byteStart = elementStart * bytesPerElement;
    const byteEnd = elementEnd * bytesPerElement;
    const buf = await this.getRange(byteStart, byteEnd);
    return new TypedArrayClass(buf);
  }

  /**
   * Clear the chunk cache to free memory.
   */
  clearCache() {
    this._cache.clear();
  }

  /**
   * Get the number of cached chunks.
   * @returns {number}
   */
  get cachedChunks() {
    return this._cache.size;
  }

  /**
   * @private
   * @param {number} chunkIndex
   * @returns {Promise<ArrayBuffer>}
   */
  async _getChunk(chunkIndex) {
    if (this._cache.has(chunkIndex)) {
      return this._cache.get(chunkIndex);
    }

    const byteStart = chunkIndex * this.chunkSize;
    const byteEnd = Math.min(byteStart + this.chunkSize, this.totalByteLength);
    const chunk = await this.fetcher(byteStart, byteEnd);
    this._cache.set(chunkIndex, chunk);
    return chunk;
  }
}

export { ChunkedDataView };
