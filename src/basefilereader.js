import { parseURL } from './util';
import { ChunkedDataView } from './chunked-dataview';

/**
 * Abstract class that should be extended
 */
class BaseFileReader {
  /**
   * Constructs a file reader for specific file types
   *
   * @param {BlueFileHeader|MatFileHeader} header_class
   * @param {object} options
   * @returns {BaseFileReader}
   */
  constructor(header_class, options) {
    this.header_class = header_class;
    this.options = options;
  }

  /**
   * Internal method that will read a file or stop at the header
   *
   * @private
   * @memberof BaseFileReader
   * @param {File|Blob} theFile - a File or Blob object for the Bluefile or Matfile
   * @param {function} onload - callback when the header has been read
   * @param {boolean} justHeader - Whether or not to only read the header
   */
  _read(theFile, onload, justHeader) {
    const that = this;
    const blob = justHeader ? theFile.slice(0, 512) : theFile;

    blob
      .arrayBuffer()
      .then((raw) => {
        const hdr = new that.header_class(raw, that.options);
        hdr.file = theFile;
        hdr.file_name = theFile.name;
        onload(hdr);
      })
      .catch(() => {
        onload(null);
      });
  }

  /**
   * Read only the header from a local {Blue,Mat}file.
   *
   * @memberof BaseFileReader
   * @param {File} theFile - a File object for the Bluefile or Matfile
   * @param {function} onload - callback when the header has been read
   */
  readheader(theFile, onload) {
    this._read(theFile, onload, true);
  }

  /**
   * Read a local Bluefile or Matfile on disk.
   *
   * @memberof BaseFileReader
   * @param {File} theFile - a File object for the Bluefile or Matfile
   * @param {function} onload - callback when the file has been read
   */
  read(theFile, onload) {
    this._read(theFile, onload, false);
  }

  /**
   * Read a Bluefile or Matfile from a URL
   *
   * @memberof BaseFileReader
   * @param {string} href - the URL for the Bluefile or Matfile
   * @param {function} onload - callback when the header has been read
   * @returns {AbortController} controller that can be used to abort the request via .abort()
   */
  read_http(href, onload) {
    const that = this;
    const controller = new AbortController();
    fetch(href, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          onload(null);
          return;
        }
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => {
        if (!arrayBuffer) return;
        const hdr = new that.header_class(arrayBuffer, that.options);
        const fileUrl = parseURL(href);
        hdr.file_name = fileUrl.file;
        onload(hdr);
      })
      .catch(() => {
        onload(null);
      });
    return controller;
  }

  /**
   * Read only the header from a File/Blob without loading the entire file.
   * Returns a header with a `getDataSlice` method for lazy data access.
   *
   * @memberof BaseFileReader
   * @param {File|Blob} theFile - a File or Blob object
   * @param {object} [options] - read options
   * @param {AbortSignal} [options.signal] - AbortSignal for cancellation
   * @returns {Promise<object>} The parsed header with lazy data access
   */
  async read_chunked(theFile, options = {}) {
    const { signal } = options;
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const headerBlob = theFile.slice(0, 512);
    const headerBuf = await headerBlob.arrayBuffer();
    const hdr = new this.header_class(headerBuf, this.options);
    hdr.file = theFile;
    hdr.file_name = theFile.name;

    const dataStart = hdr.data_start || 512;
    const dataSize = hdr.data_size || (theFile.size - dataStart);

    hdr._chunkedView = new ChunkedDataView({
      fetcher: (start, end) => {
        if (signal?.aborted) {
          return Promise.reject(new DOMException('Aborted', 'AbortError'));
        }
        return theFile.slice(dataStart + start, dataStart + end).arrayBuffer();
      },
      totalByteLength: dataSize,
    });

    /**
     * Fetch a slice of the file's data as a typed array.
     *
     * @param {number} elementStart - Start element index (inclusive)
     * @param {number} elementEnd - End element index (exclusive)
     * @returns {Promise<TypedArray>}
     */
    hdr.getDataSlice = async function (elementStart, elementEnd) {
      const bps = this.bps || 4;
      const spa = this.spa || 1;
      const bytesPerElement = bps * spa;
      // Resolve the correct TypedArray class: prefer dview's constructor,
      // then the header class's format mapping, then Float32Array fallback
      const TypedArrayClass =
        this.dview?.constructor ||
        this.constructor._XM_TO_TYPEDARRAY?.[this.format?.[1]] ||
        Float32Array;
      const byteStart = elementStart * bytesPerElement;
      const byteEnd = elementEnd * bytesPerElement;
      const buf = await this._chunkedView.getRange(byteStart, byteEnd);
      return new TypedArrayClass(buf);
    };

    hdr.clearCache = function () {
      this._chunkedView.clearCache();
    };

    return hdr;
  }

  /**
   * Read a file from a URL using HTTP Range requests for lazy data access.
   * Only fetches the header initially; data is loaded on demand via `getDataSlice`.
   *
   * @memberof BaseFileReader
   * @param {string} href - the URL for the file
   * @param {object} [options] - read options
   * @param {AbortSignal} [options.signal] - AbortSignal for cancellation
   * @returns {Promise<object>} The parsed header with lazy data access
   */
  async read_http_streaming(href, options = {}) {
    const { signal } = options;
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    // Fetch just the header (first 512 bytes) using Range request
    const headerResponse = await fetch(href, {
      signal,
      headers: { Range: 'bytes=0-511' },
    });

    if (!headerResponse.ok && headerResponse.status !== 206) {
      throw new Error(`HTTP error: ${headerResponse.status}`);
    }

    const headerBuf = await headerResponse.arrayBuffer();
    const hdr = new this.header_class(headerBuf, this.options);
    const fileUrl = parseURL(href);
    hdr.file_name = fileUrl.file;

    const dataStart = hdr.data_start || 512;
    const dataSize = hdr.data_size || 0;

    hdr._chunkedView = new ChunkedDataView({
      fetcher: (start, end) => {
        if (signal?.aborted) {
          return Promise.reject(new DOMException('Aborted', 'AbortError'));
        }
        const byteStart = dataStart + start;
        const byteEnd = dataStart + end - 1;
        return fetch(href, {
          signal,
          headers: { Range: `bytes=${byteStart}-${byteEnd}` },
        }).then((r) => {
          if (!r.ok && r.status !== 206) {
            throw new Error(`HTTP Range error: ${r.status}`);
          }
          return r.arrayBuffer();
        });
      },
      totalByteLength: dataSize,
    });

    hdr.getDataSlice = async function (elementStart, elementEnd) {
      const bps = this.bps || 4;
      const spa = this.spa || 1;
      const bytesPerElement = bps * spa;
      const TypedArrayClass =
        this.dview?.constructor ||
        this.constructor._XM_TO_TYPEDARRAY?.[this.format?.[1]] ||
        Float32Array;
      const byteStart = elementStart * bytesPerElement;
      const byteEnd = elementEnd * bytesPerElement;
      const buf = await this._chunkedView.getRange(byteStart, byteEnd);
      return new TypedArrayClass(buf);
    };

    hdr.clearCache = function () {
      this._chunkedView.clearCache();
    };

    return hdr;
  }
}

export { BaseFileReader };
