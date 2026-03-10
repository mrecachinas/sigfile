export type HeaderConstructor<T> = new (buf: ArrayBuffer | null, options?: object) => T;
export type OnLoadCallback<T> = (hdr: T | null) => void;
interface HeaderBase {
    file?: File | Blob | null;
    file_name?: string | null;
}
declare class BaseFileReader<T extends HeaderBase> {
    header_class: HeaderConstructor<T>;
    options: object | undefined;
    constructor(header_class: HeaderConstructor<T>, options?: object);
    _read(theFile: File | Blob, onload: OnLoadCallback<T>, justHeader: boolean): void;
    readheader(theFile: File | Blob, onload: OnLoadCallback<T>): void;
    read(theFile: File | Blob, onload: OnLoadCallback<T>): void;
    read_http(href: string, onload: OnLoadCallback<T>): AbortController;
}
export { BaseFileReader };
