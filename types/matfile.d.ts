import { BaseFileReader } from './basefilereader';

type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

export declare class MatHeader {
  buf: ArrayBuffer;
  file: File | Blob | null;
  file_name: string | null;
  headerStr: string;
  datarep: string;
  headerList: string[];
  matfile: string;
  platform: string;
  createdOn: string;
  subsystemOffset: string;
  version: number;
  versionName: string | undefined;
  dataType: number;
  dataTypeName: string;
  arraySize: number;
  /** Name of the MATLAB variable. */
  arrayName: string;
  /** MATLAB class, e.g. 'mxDOUBLE_CLASS' or 'mxSPARSE_CLASS'. */
  arrayClassName: string;
  /** Array dimensions, e.g. [rows, cols]. */
  dims: number[];
  complex: boolean;
  global: boolean;
  logical: boolean;
  /**
   * Real values in MATLAB's column-major order. Sparse arrays are expanded
   * to dense; char arrays hold character codes.
   */
  dview: TypedArray;
  /** Imaginary values, for complex arrays. */
  dviewImag?: TypedArray;

  /**
   * @throws Error for compressed (-v7) or HDF5 (-v7.3) MAT-files, and for
   *   cell, struct, and object arrays.
   */
  constructor(buf: ArrayBuffer | null);

  createArray(
    buf: ArrayBuffer | null,
    offset?: number,
    length?: number,
    type?: string,
    littleEndian?: boolean,
  ): TypedArray;
  getDataWithType(
    dv: DataView,
    typeName: string,
    offset: number,
    littleEndian: boolean,
  ): number;
  setData(
    buf: ArrayBuffer,
    dvhdr: DataView,
    currIndex: number,
    littleEndian: boolean,
  ): void;
}

export declare class MatFileReader extends BaseFileReader<MatHeader> {
  constructor(options?: object);
}
