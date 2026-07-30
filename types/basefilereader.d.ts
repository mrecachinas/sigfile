export type HeaderConstructor<T, O = undefined> = O extends undefined ? new (buf: ArrayBuffer | null) => T : new (buf: ArrayBuffer | null, options?: O) => T;
export type OnLoadCallback<T> = (hdr: T | null) => void;
interface HeaderBase {
    file?: File | Blob | null;
    file_name?: string | null;
}
declare class BaseFileReader<T extends HeaderBase, O = undefined> {
    header_class: HeaderConstructor<T, O>;
    options: O | undefined;
    constructor(header_class: HeaderConstructor<T, O>, options?: O);
    _read(theFile: File | Blob, onload: OnLoadCallback<T>, justHeader: boolean): void;
    readheader(theFile: File | Blob, onload: OnLoadCallback<T>): void;
    read(theFile: File | Blob, onload: OnLoadCallback<T>): void;
    read_http(href: string, onload: OnLoadCallback<T>): AbortController;
}
export { BaseFileReader };
