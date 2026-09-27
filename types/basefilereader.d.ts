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
   * @param onload - callback receiving the parsed header, or null and the error on failure
   */
  read(theFile: File | Blob, onload: (hdr: T | null, err?: unknown) => void): void;

  /**
   * Read only the header (first 512 bytes) from a local file.
   * @param theFile - a File or Blob object
   * @param onload - callback receiving the parsed header, or null and the error on failure
   */
  readheader(theFile: File | Blob, onload: (hdr: T | null, err?: unknown) => void): void;

  /**
   * Read a file from a URL via fetch.
   * @param href - the URL to fetch
   * @param onload - callback receiving the parsed header, or null and the error on failure
   * @returns an AbortController; after abort(), onload is not called
   */
  read_http(href: string, onload: (hdr: T | null, err?: unknown) => void): AbortController;
}
