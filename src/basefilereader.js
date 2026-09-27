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
   * @callback onload
   * @param {BlueHeader|MatHeader|null} hdr - the parsed header, or null on failure
   * @param {*} [err] - the error that caused the failure, when hdr is null
   */

  /**
   * Internal method that parses a buffer and invokes onload exactly once.
   * Errors thrown by onload itself are not caught.
   *
   * @private
   * @memberof BaseFileReader
   * @param {ArrayBuffer} buf - the raw file contents
   * @param {onload} onload - callback when the header has been parsed
   * @param {object} props - extra properties to set on the parsed header
   */
  _parse(buf, onload, props) {
    let hdr;
    try {
      hdr = new this.header_class(buf, this.options);
    } catch (err) {
      onload(null, err);
      return;
    }
    Object.assign(hdr, props);
    onload(hdr);
  }

  /**
   * Internal method that will read a file or stop at the header
   *
   * @private
   * @memberof BaseFileReader
   * @param {File|Blob} theFile - a File or Blob object for the Bluefile or Matfile
   * @param {onload} onload - callback when the header has been read
   * @param {boolean} justHeader - Whether or not to only read the header
   */
  _read(theFile, onload, justHeader) {
    const blob = justHeader ? theFile.slice(0, 512) : theFile;

    blob.arrayBuffer().then(
      (buf) => {
        this._parse(buf, onload, { file: theFile, file_name: theFile.name });
      },
      (err) => {
        onload(null, err);
      },
    );
  }

  /**
   * Read only the header from a local {Blue,Mat}file.
   *
   * @memberof BaseFileReader
   * @param {File} theFile - a File object for the Bluefile or Matfile
   * @param {onload} onload - callback when the header has been read
   */
  readheader(theFile, onload) {
    this._read(theFile, onload, true);
  }

  /**
   * Read a local Bluefile or Matfile on disk.
   *
   * @memberof BaseFileReader
   * @param {File} theFile - a File object for the Bluefile or Matfile
   * @param {onload} onload - callback when the file has been read
   */
  read(theFile, onload) {
    this._read(theFile, onload, false);
  }

  /**
   * Read a Bluefile or Matfile from a URL, including file:// URLs where
   * the environment allows XMLHttpRequest to read them. Calling `abort()`
   * on the returned request calls onload with an error named 'AbortError'.
   *
   * @memberof BaseFileReader
   * @param {string} href - the URL for the Bluefile or Matfile
   * @param {onload} onload - callback when the header has been read
   * @returns {XMLHttpRequest} the in-flight request
   */
  read_http(href, onload) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', href, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = () => {
      // file:// URLs report success with status 0
      if ((xhr.status === 200 || xhr.status === 0) && xhr.response) {
        this._parse(xhr.response, onload, { file_name: parseURL(href).file });
      } else {
        onload(null, new Error(`Failed to load ${href} (HTTP ${xhr.status})`));
      }
    };
    xhr.onerror = () => {
      onload(null, new Error(`Network error loading ${href}`));
    };
    // Callers can set xhr.timeout on the returned request
    xhr.ontimeout = () => {
      const err = new Error(`Timed out loading ${href}`);
      err.name = 'TimeoutError';
      onload(null, err);
    };
    xhr.onabort = () => {
      const err = new Error(`Request aborted: ${href}`);
      err.name = 'AbortError';
      onload(null, err);
    };
    xhr.send();
    return xhr;
  }
}

export { BaseFileReader };
