import { parseURL } from './util';
import { ChunkedDataView } from './chunked-dataview';

/**
 * Attach lazy data access methods to a header object.
 * @private
 */
function _attachLazyAccess(hdr, chunkedView) {
  hdr._chunkedView = chunkedView;

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
}

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
   * When called with `{ lazy: true }`, returns a Promise that resolves to
   * a header with only the 512-byte header loaded. Data is fetched on demand
   * via `hdr.getDataSlice(start, end)`.
   *
   * @memberof BaseFileReader
   * @param {File} theFile - a File object for the Bluefile or Matfile
   * @param {function} onload - callback when the file has been read (ignored when lazy)
   * @param {object} [options] - read options
   * @param {boolean} [options.lazy=false] - if true, only load header; data fetched on demand
   * @param {AbortSignal} [options.signal] - AbortSignal for cancellation (lazy mode only)
   * @returns {AbortController|Promise<object>} When lazy, returns a Promise; otherwise void
   */
  read(theFile, onload, options = {}) {
    if (!options.lazy) {
      this._read(theFile, onload, false);
      return;
    }

    const { signal } = options;
    if (signal?.aborted) {
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    }

    const headerBlob = theFile.slice(0, 512);
    return headerBlob.arrayBuffer().then((headerBuf) => {
      const hdr = new this.header_class(headerBuf, this.options);
      hdr.file = theFile;
      hdr.file_name = theFile.name;

      const dataStart = hdr.data_start || 512;
      const dataSize = hdr.data_size || (theFile.size - dataStart);

      _attachLazyAccess(
        hdr,
        new ChunkedDataView({
          fetcher: (start, end) => {
            if (signal?.aborted) {
              return Promise.reject(
                new DOMException('Aborted', 'AbortError'),
              );
            }
            return theFile
              .slice(dataStart + start, dataStart + end)
              .arrayBuffer();
          },
          totalByteLength: dataSize,
        }),
      );

      return hdr;
    });
  }

  /**
   * Read a Bluefile or Matfile from a URL.
   *
   * When called with `{ lazy: true }`, fetches only the 512-byte header
   * using an HTTP Range request. Data is fetched on demand via
   * `hdr.getDataSlice(start, end)` using subsequent Range requests.
   *
   * @memberof BaseFileReader
   * @param {string} href - the URL for the Bluefile or Matfile
   * @param {function} onload - callback when the header has been read (ignored when lazy)
   * @param {object} [options] - read options
   * @param {boolean} [options.lazy=false] - if true, only load header; data fetched on demand
   * @param {AbortSignal} [options.signal] - AbortSignal for cancellation
   * @returns {AbortController|Promise<object>} When lazy, returns a Promise; otherwise AbortController
   */
  read_http(href, onload, options = {}) {
    if (!options.lazy) {
      const that = this;
      const controller = new AbortController();
      const signal = options.signal || controller.signal;
      fetch(href, { signal })
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

    const { signal } = options;
    if (signal?.aborted) {
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    }

    return fetch(href, {
      signal,
      headers: { Range: 'bytes=0-511' },
    }).then((headerResponse) => {
      if (!headerResponse.ok && headerResponse.status !== 206) {
        throw new Error(`HTTP error: ${headerResponse.status}`);
      }

      return headerResponse.arrayBuffer().then((headerBuf) => {
        const hdr = new this.header_class(headerBuf, this.options);
        const fileUrl = parseURL(href);
        hdr.file_name = fileUrl.file;

        const dataStart = hdr.data_start || 512;
        const dataSize = hdr.data_size || 0;

        _attachLazyAccess(
          hdr,
          new ChunkedDataView({
            fetcher: (start, end) => {
              if (signal?.aborted) {
                return Promise.reject(
                  new DOMException('Aborted', 'AbortError'),
                );
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
          }),
        );

        return hdr;
      });
    });
  }
}

export { BaseFileReader };
