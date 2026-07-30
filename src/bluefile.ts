/**
 * @license apache-2.0
 * @file bluefile.ts
 * Copyright (c) 2012-2020, LGS Innovations Inc., All rights reserved.
 *
 * This file is part of SigFile.
 *
 * Licensed to the LGS Innovations (LGS) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  LGS licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { BaseFileReader } from './basefilereader';
import BitArray from './bitarray';
import { ab2str, endianness, getInt64 } from './util';

export type ExtHeaderType =
  | 'dict'
  | 'json'
  | 'list'
  | 'XMTable'
  | 'JSON'
  | 'DICT'
  | Record<string, never>;

export interface BlueHeaderOptions {
  ext_header_type?: ExtHeaderType;
}

export type BlueTypedArray =
  | BitArray
  | Int8Array
  | Uint8Array
  | Int16Array
  | Int32Array
  | Float32Array
  | Float64Array;

type BlueTypedArrayConstructor =
  | typeof BitArray
  | typeof Int8Array
  | typeof Uint8Array
  | typeof Int16Array
  | typeof Int32Array
  | typeof Float32Array
  | typeof Float64Array
  | null;

type DataViewMethod =
  | 'getUint8'
  | 'getInt8'
  | 'getInt16'
  | 'getInt32'
  | 'getFloat32'
  | 'getFloat64';

type DataViewParser =
  | DataViewMethod
  | ((dv: DataView, index: number, littleEndian: boolean) => number)
  | null;

export type ExtHeaderDict = Record<string, string | number>;
export type ExtHeaderList = Array<{ tag: string; value: string | number }>;
export type ExtHeader = ExtHeaderDict | ExtHeaderList;

class BlueHeader {
  static ARRAY_BUFFER_ENDIANNESS: 'LE' | 'BE' = endianness();

  static _SPA: Record<string, number> = {
    S: 1,
    C: 2,
    V: 3,
    Q: 4,
    M: 9,
    X: 10,
    T: 16,
    U: 1,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
  };

  static _BPS: Record<string, number> = {
    P: 0.125,
    A: 1,
    O: 1,
    B: 1,
    I: 2,
    L: 4,
    X: 8,
    F: 4,
    D: 8,
  };

  static _XM_TO_TYPEDARRAY: Record<string, BlueTypedArrayConstructor> = {
    P: BitArray,
    A: null,
    O: Uint8Array,
    B: Int8Array,
    I: Int16Array,
    L: Int32Array,
    X: null,
    F: Float32Array,
    D: Float64Array,
  };

  static _XM_TO_DATAVIEW: Record<string, DataViewParser> = {
    P: null,
    A: null,
    O: 'getUint8',
    B: 'getInt8',
    I: 'getInt16',
    L: 'getInt32',
    X: getInt64,
    F: 'getFloat32',
    D: 'getFloat64',
  };

  buf: ArrayBuffer;
  options: BlueHeaderOptions;
  version!: string;
  headrep!: string;
  datarep!: string;
  littleEndianData!: boolean;
  ext_start!: number;
  ext_size!: number;
  type!: number;
  class!: number;
  format!: string;
  timecode!: number;
  xstart!: number;
  xdelta!: number;
  xunits!: number;
  yunits!: number;
  subsize!: number;
  ystart?: number;
  ydelta?: number;
  data_start!: number;
  data_size!: number;
  ext_header!: ExtHeader;
  spa!: number;
  bps!: number;
  bpa!: number;
  ape!: number;
  bpe!: number;
  size!: number;
  dview!: BlueTypedArray;
  file?: File | Blob;
  file_name?: string;

  constructor(buf: ArrayBuffer | null, options?: BlueHeaderOptions) {
    if (options === undefined) {
      options = {};
    }
    this.options = Object.assign({ ext_header_type: 'dict' }, options);
    this.buf = buf!;
    if (this.buf != null) {
      this.setHeader();
      const ds = this.data_start;
      const de = this.data_start + this.data_size;
      this.setData(this.buf, ds, de, this.littleEndianData);
    }
  }

  setHeader(): void {
    const dvhdr = new DataView(this.buf);
    this.version = ab2str(this.buf.slice(0, 4));
    this.headrep = ab2str(this.buf.slice(4, 8));
    this.datarep = ab2str(this.buf.slice(8, 12));
    const littleEndianHdr = this.headrep === 'EEEI';
    this.littleEndianData = this.datarep === 'EEEI';
    this.ext_start = dvhdr.getInt32(24, littleEndianHdr);
    this.ext_size = dvhdr.getInt32(28, littleEndianHdr);
    this.type = dvhdr.getUint32(48, littleEndianHdr);
    this.class = this.type / 1000;
    this.format = ab2str(this.buf.slice(52, 54));
    this.timecode = dvhdr.getFloat64(56, littleEndianHdr);
    if (this.class === 1) {
      this.xstart = dvhdr.getFloat64(0x100, littleEndianHdr);
      this.xdelta = dvhdr.getFloat64(0x100 + 8, littleEndianHdr);
      this.xunits = dvhdr.getInt32(0x100 + 16, littleEndianHdr);
      this.yunits = dvhdr.getInt32(0x100 + 40, littleEndianHdr);
      this.subsize = 1;
    } else if (this.class === 2) {
      this.xstart = dvhdr.getFloat64(0x100, littleEndianHdr);
      this.xdelta = dvhdr.getFloat64(0x100 + 8, littleEndianHdr);
      this.xunits = dvhdr.getInt32(0x100 + 16, littleEndianHdr);
      this.subsize = dvhdr.getInt32(0x100 + 20, littleEndianHdr);
      this.ystart = dvhdr.getFloat64(0x100 + 24, littleEndianHdr);
      this.ydelta = dvhdr.getFloat64(0x100 + 32, littleEndianHdr);
      this.yunits = dvhdr.getInt32(0x100 + 40, littleEndianHdr);
    }
    this.data_start = dvhdr.getFloat64(32, littleEndianHdr);
    this.data_size = dvhdr.getFloat64(40, littleEndianHdr);
    if (this.ext_size) {
      this.ext_header = this.unpack_keywords(
        this.buf,
        this.ext_size,
        this.ext_start * 512,
        littleEndianHdr,
      );
    }
  }

  setData(
    buf: ArrayBuffer | null,
    offset: number,
    data_end: number,
    littleEndian?: boolean,
  ): void {
    if (littleEndian === undefined) {
      littleEndian = BlueHeader.ARRAY_BUFFER_ENDIANNESS === 'LE';
    }

    this.spa = BlueHeader._SPA[this.format[0]!]!;
    this.bps = BlueHeader._BPS[this.format[1]!]!;
    this.bpa = this.spa * this.bps;

    if (this.class === 1) {
      this.ape = 1;
    } else if (this.class === 2) {
      this.ape = this.subsize;
    }

    this.bpe = this.ape * this.bpa;

    const arrayBufferLittleEndian = BlueHeader.ARRAY_BUFFER_ENDIANNESS === 'LE';
    const arrayBufferBigEndian = BlueHeader.ARRAY_BUFFER_ENDIANNESS === 'BE';
    if (
      (arrayBufferLittleEndian && !littleEndian) ||
      (arrayBufferBigEndian && this.littleEndianData)
    ) {
      throw new Error(
        `Not supported ${BlueHeader.ARRAY_BUFFER_ENDIANNESS} ${littleEndian}`,
      );
    }
    if (buf) {
      if (offset && data_end && offset < buf.byteLength) {
        const length = (data_end - offset) / this.bps;
        this.dview = this.createArray(buf, offset, length);
        this.size = this.dview.length / (this.spa * this.ape);
      } else if (!offset) {
        this.dview = this.createArray(buf);
        this.size = this.dview.length / (this.spa * this.ape);
      }
    } else {
      this.dview = this.createArray(null, undefined, this.size);
    }
  }

  unpack_keywords(
    buf: ArrayBuffer,
    lbuf: number,
    offset: number,
    littleEndian: boolean,
  ): ExtHeader {
    let lkey: number,
      lextra: number,
      ltag: number,
      format: string,
      tag: string,
      data: string | number,
      ldata: number,
      itag: number,
      idata: number;
    const keywords: ExtHeaderList = [];
    const dic_index: Record<string, number> = {};
    const dict_keywords: ExtHeaderDict = {};
    let ii = 0;
    const temp_buf = buf.slice(offset, offset + lbuf);
    const dvhdr = new DataView(temp_buf);
    while (ii < lbuf) {
      idata = ii + 8;
      lkey = dvhdr.getUint32(ii, littleEndian);
      lextra = dvhdr.getInt16(ii + 4, littleEndian);
      ltag = dvhdr.getInt8(ii + 6);
      format = ab2str(temp_buf.slice(ii + 7, ii + 8));
      ldata = lkey - lextra;
      itag = idata + ldata;
      tag = ab2str(temp_buf.slice(itag, itag + ltag));
      if (format === 'A') {
        data = ab2str(temp_buf.slice(idata, idata + ldata));
      } else if (BlueHeader._XM_TO_DATAVIEW[format]) {
        const parseFunc = BlueHeader._XM_TO_DATAVIEW[format]!;
        if (typeof parseFunc === 'string') {
          data = (dvhdr[parseFunc] as (offset: number, le: boolean) => number)(
            idata,
            littleEndian,
          );
        } else {
          data = parseFunc(dvhdr, idata, littleEndian);
        }
      } else {
        throw new Error(`Unsupported keyword format ${format} for tag ${tag}`);
      }

      if (typeof dic_index[tag] === 'undefined') {
        dic_index[tag] = 1;
      } else {
        dic_index[tag]!++;
        tag = `${tag}${dic_index[tag]!}`;
      }
      dict_keywords[tag] = data;
      keywords.push({
        tag: tag,
        value: data,
      });
      ii += lkey;
    }
    const dictTypes: ExtHeaderType[] = [
      'dict',
      'json',
      {} as Record<string, never>,
      'XMTable',
      'JSON',
      'DICT',
    ];
    const ext_header_type = this.options.ext_header_type;

    if (
      typeof ext_header_type === 'object' &&
      ext_header_type !== null &&
      Object.keys(ext_header_type).length === 0 &&
      ext_header_type.constructor === Object
    ) {
      return dict_keywords;
    }
    for (const k in dictTypes) {
      if (dictTypes[k] === ext_header_type) {
        return dict_keywords;
      }
    }
    return keywords;
  }

  createArray(
    buf: ArrayBuffer | null,
    offset?: number,
    length?: number,
  ): BlueTypedArray {
    const TypedArray = BlueHeader._XM_TO_TYPEDARRAY[this.format[1]!];
    if (TypedArray === undefined) {
      throw new Error(`unknown format ${this.format[1]}`);
    }
    if (offset === undefined) {
      offset = 0;
    }
    if (length === undefined) {
      length =
        (buf as ArrayBuffer & { length?: number })?.length ||
        buf!.byteLength / BlueHeader._BPS[this.format[1]!]!;
    }
    let result: BlueTypedArray;
    if (buf) {
      if (Array.isArray(buf) && Array.isArray(buf[0])) {
        const flatBuf = ([] as unknown[]).concat.apply([], buf) as number[];
        length = flatBuf.length * (buf[0] as unknown[]).length;
        result = new TypedArray!(
          flatBuf as unknown as ArrayBuffer,
          offset,
          length,
        );
      } else if (Array.isArray(buf) && ArrayBuffer.isView(buf[0] as unknown)) {
        length = buf.length * (buf[0] as unknown as ArrayLike<unknown>).length;
        result = new TypedArray!(length as unknown as ArrayBuffer);
        for (let ii = 0; ii < buf.length; ++ii) {
          (
            result as unknown as { set(arr: unknown, offset: number): void }
          ).set(buf[ii], ii * (buf[0] as unknown as ArrayLike<unknown>).length);
        }
      } else {
        result = new TypedArray!(buf, offset, length);
      }
    } else {
      result = new TypedArray!(length as unknown as ArrayBuffer);
    }
    return result;
  }
}

class BlueFileReader extends BaseFileReader<BlueHeader, BlueHeaderOptions> {
  constructor(options?: BlueHeaderOptions) {
    super(BlueHeader, options);
  }
}

export { BlueFileReader, BlueHeader };
