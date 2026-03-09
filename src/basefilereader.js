import { parseURL } from './util';

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
}

export { BaseFileReader };
