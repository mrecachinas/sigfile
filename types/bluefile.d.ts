import BitArray from './bitarray';
import { BaseFileReader } from './basefilereader';

export interface BlueHeaderOptions {
  ext_header_type?: 'dict' | 'json' | 'list';
}

type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Int32Array
  | Float32Array
  | Float64Array;

export declare class BlueHeader {
  buf: ArrayBuffer;
  options: BlueHeaderOptions;
  version: string;
  headrep: string;
  datarep: string;
  littleEndianData: boolean;
  ext_start: number;
  ext_size: number;
  type: number;
  class: number;
  format: string;
  timecode: number;
  xstart: number;
  xdelta: number;
  xunits: number;
  yunits: number;
  subsize: number;
  ystart: number | undefined;
  ydelta: number | undefined;
  data_start: number;
  data_size: number;
  ext_header: Record<string, unknown> | Array<{ tag: string; value: unknown }>;
  spa: number;
  bps: number;
  bpa: number;
  ape: number;
  bpe: number;
  size: number;
  dview: TypedArray | BitArray;
  file: File | Blob | undefined;
  file_name: string | undefined;

  constructor(buf: ArrayBuffer | null, options?: BlueHeaderOptions);

  setHeader(): void;
  setData(
    buf: ArrayBuffer | null,
    offset: number,
    data_end: number,
    littleEndian?: boolean,
  ): void;
  createArray(
    buf: ArrayBuffer | null,
    offset?: number,
    length?: number,
  ): TypedArray | BitArray;
  unpack_keywords(
    buf: ArrayBuffer,
    lbuf: number,
    offset: number,
    littleEndian: boolean,
  ): Record<string, unknown> | Array<{ tag: string; value: unknown }>;
}

export declare class BlueFileReader extends BaseFileReader<BlueHeader> {
  constructor(options?: BlueHeaderOptions);
}
