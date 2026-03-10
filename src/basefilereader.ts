import { parseURL } from './util';

export type HeaderConstructor<T, O = undefined> = O extends undefined
  ? new (buf: ArrayBuffer | null) => T
  : new (buf: ArrayBuffer | null, options?: O) => T;

export type OnLoadCallback<T> = (hdr: T | null) => void;

interface HeaderBase {
  file?: File | Blob | null;
  file_name?: string | null;
}

class BaseFileReader<T extends HeaderBase, O = undefined> {
  header_class: HeaderConstructor<T, O>;
  options: O | undefined;

  constructor(header_class: HeaderConstructor<T, O>, options?: O) {
    this.header_class = header_class;
    this.options = options;
  }

  _read(
    theFile: File | Blob,
    onload: OnLoadCallback<T>,
    justHeader: boolean,
  ): void {
    const blob = justHeader ? theFile.slice(0, 512) : theFile;

    blob
      .arrayBuffer()
      .then((raw) => {
        const hdr = new this.header_class(raw, this.options as O);
        hdr.file = theFile;
        hdr.file_name = (theFile as File).name;
        onload(hdr);
      })
      .catch(() => {
        onload(null);
      });
  }

  readheader(theFile: File | Blob, onload: OnLoadCallback<T>): void {
    this._read(theFile, onload, true);
  }

  read(theFile: File | Blob, onload: OnLoadCallback<T>): void {
    this._read(theFile, onload, false);
  }

  read_http(href: string, onload: OnLoadCallback<T>): AbortController {
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
        const hdr = new this.header_class(arrayBuffer, this.options as O);
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
