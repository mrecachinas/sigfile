export default class BitArray {
  buffer: ArrayBuffer;
  u8: Uint8Array;
  readonly length: number;

  constructor(buf: ArrayBuffer | number);

  getBit(idx: number): 0 | 1;
  setBit(idx: number, val: number): void;
  set(array: ArrayLike<number>): void;
  setArray(array: ArrayLike<number>): void;
  subarray(start?: number, stop?: number): number[];

  [index: number]: 0 | 1;
}
