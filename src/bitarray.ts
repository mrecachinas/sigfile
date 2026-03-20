/**
 * BitArray class implementing a binary array with Proxy-based index access.
 */

type BitValue = 0 | 1;

class BitArray {
  buffer: ArrayBuffer;
  u8: Uint8Array;

  constructor(buf: ArrayBuffer | number) {
    if (!(buf instanceof ArrayBuffer) && typeof buf === 'number') {
      this.buffer = new ArrayBuffer(buf / 8);
      this.u8 = new Uint8Array(this.buffer);
    } else {
      this.buffer = buf as ArrayBuffer;
      this.u8 = new Uint8Array(buf as ArrayBuffer);
    }
    return new Proxy(this, {
      get(obj: BitArray, prop: string | symbol): unknown {
        const value = (obj as unknown as Record<string | symbol, unknown>)[
          prop
        ];
        if (!value) {
          return obj.getBit(Number(prop));
        } else {
          return value;
        }
      },
      set(obj: BitArray, prop: string | symbol, value: unknown): boolean {
        const propInt = parseInt(String(prop), 10);
        if (Number.isNaN(propInt)) {
          return false;
        } else {
          obj.setBit(propInt, value as number);
          return true;
        }
      },
    });
  }

  set(array: ArrayLike<number>): void {
    this.setArray(array);
  }

  getBit(idx: number): BitValue {
    const v = this.u8[idx >> 3]!;
    const off = idx & 0x7;
    return ((v >> (7 - off)) & 1) as BitValue;
  }

  get length(): number {
    return this.u8.byteLength * 8;
  }

  setBit(idx: number, val?: number): void {
    const off = idx & 0x7;
    if (val) {
      this.u8[idx >> 3]! |= 0x80 >> off;
    } else {
      this.u8[idx >> 3]! &= ~(0x80 >> off);
    }
  }

  setArray(array: ArrayLike<number>): void {
    const len = array.length;
    for (let i = 0; i < len; i++) {
      this.setBit(i, array[i]);
    }
  }

  subarray(start?: number, stop?: number): number[] {
    const sub: number[] = [];
    start = start || 0;
    start = start < 0 ? 0 : start;
    stop = stop || this.length;
    stop = stop > this.length ? this.length : stop;
    for (let i = start; i < stop; i++) {
      sub.push(this.getBit(i));
    }
    return sub;
  }

  [index: number]: BitValue;
}

export default BitArray;
