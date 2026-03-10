export declare class ChunkedDataView {
  constructor(options: {
    fetcher: (byteStart: number, byteEnd: number) => Promise<ArrayBuffer>;
    totalByteLength: number;
    chunkSize?: number;
  });

  readonly byteLength: number;
  readonly cachedChunks: number;

  getRange(byteStart: number, byteEnd: number): Promise<ArrayBuffer>;
  getTypedRange<T extends ArrayBufferView>(
    TypedArrayClass: new (buf: ArrayBuffer) => T,
    elementStart: number,
    elementEnd: number,
  ): Promise<T>;
  clearCache(): void;
}
