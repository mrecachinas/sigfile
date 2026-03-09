export declare class BaseFileReader<T> {
  header_class: new (buf: ArrayBuffer | null, options?: object) => T;
  options: object | undefined;

  constructor(
    header_class: new (buf: ArrayBuffer | null, options?: object) => T,
    options?: object,
  );

  /**
   * Read a full local file.
   * @param theFile - a File or Blob object
   * @param onload - callback receiving the parsed header, or null on error
   */
  read(theFile: File | Blob, onload: (hdr: T | null) => void): void;

  /**
   * Read only the header (first 512 bytes) from a local file.
   * @param theFile - a File or Blob object
   * @param onload - callback receiving the parsed header, or null on error
   */
  readheader(theFile: File | Blob, onload: (hdr: T | null) => void): void;

  /**
   * Read a file from a URL via fetch.
   * @param href - the URL to fetch
   * @param onload - callback receiving the parsed header, or null on error
   * @returns an AbortController that can cancel the request
   */
  read_http(href: string, onload: (hdr: T | null) => void): AbortController;
}
