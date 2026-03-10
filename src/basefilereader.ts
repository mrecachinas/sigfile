import { parseURL } from './util';

export type HeaderConstructor<T> = new (
  buf: ArrayBuffer | null,
  options?: object,
) => T;

export type OnLoadCallback<T> = (hdr: T | null) => void;

interface HeaderBase {
  file?: File | Blob | null;
  file_name?: string | null;
}

class BaseFileReader<T extends HeaderBase> {
  header_class: HeaderConstructor<T>;
  options: object | undefined;

  constructor(header_class: HeaderConstructor<T>, options?: object) {
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
        const hdr = new this.header_class(raw, this.options);
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
        const hdr = new this.header_class(arrayBuffer, this.options);
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
