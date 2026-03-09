import { ChunkedDataView } from '../src/chunked-dataview';

type ReadOptions = {
  lazy?: boolean;
  signal?: AbortSignal;
};

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
   * With `{ lazy: true }`, returns a Promise with header-only and on-demand data access.
   */
  read(theFile: File | Blob, onload: (hdr: T | null) => void): void;
  read(
    theFile: File | Blob,
    onload: null | undefined,
    options: ReadOptions & { lazy: true },
  ): Promise<LazyHeader<T>>;
  read(
    theFile: File | Blob,
    onload: (hdr: T | null) => void,
    options?: ReadOptions,
  ): void;

  /**
   * Read only the header (first 512 bytes) from a local file.
   */
  readheader(theFile: File | Blob, onload: (hdr: T | null) => void): void;

  /**
   * Read a file from a URL via fetch.
   * With `{ lazy: true }`, returns a Promise using HTTP Range requests for on-demand data.
   */
  read_http(
    href: string,
    onload: (hdr: T | null) => void,
  ): AbortController;
  read_http(
    href: string,
    onload: null | undefined,
    options: ReadOptions & { lazy: true },
  ): Promise<LazyHeader<T>>;
  read_http(
    href: string,
    onload: (hdr: T | null) => void,
    options?: ReadOptions,
  ): AbortController;
}
