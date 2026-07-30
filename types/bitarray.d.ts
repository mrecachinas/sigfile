/**
 * BitArray class implementing a binary array with Proxy-based index access.
 */
type BitValue = 0 | 1;
declare class BitArray {
    buffer: ArrayBuffer;
    u8: Uint8Array;
    constructor(buf: ArrayBuffer | number);
    set(array: ArrayLike<number>): void;
    getBit(idx: number): BitValue;
    get length(): number;
    setBit(idx: number, val?: number): void;
    setArray(array: ArrayLike<number>): void;
    subarray(start?: number, stop?: number): number[];
    [index: number]: BitValue;
}
export default BitArray;
