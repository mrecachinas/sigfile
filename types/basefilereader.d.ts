import { ChunkedDataView } from '../src/chunked-dataview';

type LazyHeader<T> = T & {
  _chunkedView: ChunkedDataView;
  getDataSlice(elementStart: number, elementEnd: number): Promise<ArrayBufferView>;
  clearCache(): void;
};

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

  /**
   * Read only the header from a File/Blob without loading the entire file.
   * Returns a header with a `getDataSlice` method for lazy, chunked data access.
   * @param theFile - a File or Blob object
   * @param options - optional read options
   * @returns Promise resolving to the parsed header with lazy data access
   */
  read_chunked(
    theFile: File | Blob,
    options?: { signal?: AbortSignal },
  ): Promise<LazyHeader<T>>;

  /**
   * Read a file from a URL using HTTP Range requests for lazy data access.
   * Only fetches the header initially; data is loaded on demand via `getDataSlice`.
   * @param href - the URL for the file
   * @param options - optional read options
   * @returns Promise resolving to the parsed header with lazy data access
   */
  read_http_streaming(
    href: string,
    options?: { signal?: AbortSignal },
  ): Promise<LazyHeader<T>>;
}
