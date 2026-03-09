import { BaseFileReader } from './basefilereader';

type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Int32Array
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
  dview: TypedArray;

  constructor(buf: ArrayBuffer | null);

  createArray(
    buf: ArrayBuffer | null,
    offset?: number,
    length?: number,
    type?: string,
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
