/**
 * @license
 * File: matfile.ts
 * Copyright (c) 2012-2017, LGS Innovations Inc., All rights reserved.
 *
 * This file is part of SigPlot.
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
import { ab2str, endianness, getInt64 } from './util';

export type MatTypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float64Array;

type MatTypedArrayConstructor =
  | typeof Int8Array
  | typeof Uint8Array
  | typeof Int16Array
  | typeof Uint16Array
  | typeof Int32Array
  | typeof Uint32Array
  | typeof Float64Array;

interface DataTypeInfo {
  name: string;
  size: number | null;
}

type DataViewMethod =
  | 'getInt8'
  | 'getUint8'
  | 'getInt16'
  | 'getUint16'
  | 'getInt32'
  | 'getUint32'
  | 'getFloat32'
  | 'getFloat64';

type MatDataViewParser =
  | DataViewMethod
  | ((dv: DataView, index: number, littleEndian: boolean) => number);

class MatHeader {
  static ARRAY_BUFFER_ENDIANNESS: 'LE' | 'BE' = endianness();

  static versionNames: Record<number, string> = { 256: 'MAT-file' };

  static _MAT_TO_TYPEDARRAY: Record<string, MatTypedArrayConstructor> = {
    miINT8: Int8Array,
    miUINT8: Uint8Array,
    miInt16: Int16Array,
    miUINT16: Uint16Array,
    miINT32: Int32Array,
    miUINT32: Uint32Array,
    miDOUBLE: Float64Array,
  };

  static _MAT_TO_DATAVIEW: Record<string, MatDataViewParser> = {
    miINT8: 'getInt8',
    miUINT8: 'getUint8',
    miINT16: 'getInt16',
    miUINT16: 'getUint16',
    miINT32: 'getInt32',
    miUINT32: 'getUint32',
    miSINGLE: 'getFloat32',
    miDOUBLE: 'getFloat64',
    miINT64: getInt64,
  };

  static dataTypeNames: Record<number, DataTypeInfo> = {
    1: { name: 'miINT8', size: 1 },
    2: { name: 'miUINT8', size: 1 },
    3: { name: 'miINT16', size: 2 },
    4: { name: 'miUINT16', size: 2 },
    5: { name: 'miINT32', size: 4 },
    6: { name: 'miUINT32', size: 4 },
    7: { name: 'miSINGLE', size: 4 },
    9: { name: 'miDOUBLE', size: 8 },
    12: { name: 'miINT64', size: 8 },
    13: { name: 'miUINT64', size: 8 },
    14: { name: 'miMATRIX', size: null },
    15: { name: 'miCOMPRESSED', size: null },
    16: { name: 'miUTF8', size: null },
    17: { name: 'miUTF16', size: null },
    18: { name: 'miUTF32', size: null },
  };

  static arrayClassNames: Record<number, string> = {
    1: 'mxCELL_CLASS',
    2: 'mxSTRUCT_CLASS',
    3: 'mxOBJECT_CLASS',
    4: 'mxCHAR_CLASS',
    5: 'mxSPARSE_CLASS',
    6: 'mxDOUBLE_CLASS',
    7: 'mxSINGLE_CLASS',
    8: 'mxINT8_CLASS',
    9: 'mxUINT8_CLASS',
    10: 'mxINT16_CLASS',
    11: 'mxUINT16_CLASS',
    12: 'mxINT32_CLASS',
    13: 'mxUINT32_CLASS',
    14: 'mxINT64_CLASS',
    15: 'mxUINT64_CLASS',
  };

  static headerTextBegin = 1;
  static headerTextEnd = 116;
  static subsysOffsetBegin = 117;
  static subsysOffsetEnd = 124;
  static versionOffsetBegin = 125;
  static versionOffsetEnd = 126;
  static endianCharsBegin = 127;
  static endianCharsEnd = 128;
  static firstDataTypeOffsetBegin = 129;
  static firstDataTypeOffsetEnd = 132;
  static numBytesOffsetBegin = 133;
  static numBytesOffsetEnd = 136;

  buf: ArrayBuffer | null;
  file: File | Blob | null = null;
  file_name: string | null = null;
  headerStr!: string;
  datarep!: string;
  headerList!: string[];
  matfile!: string;
  platform!: string;
  createdOn!: string;
  subsystemOffset!: string;
  version!: number;
  versionName!: string;
  dataType!: number;
  dataTypeName!: string;
  arraySize!: number;
  dview!: MatTypedArray;

  constructor(buf: ArrayBuffer | null) {
    this.buf = buf;
    if (this.buf != null) {
      const dvhdr = new DataView(this.buf);
      this.headerStr = ab2str(
        this.buf.slice(MatHeader.headerTextBegin - 1, MatHeader.headerTextEnd),
      );

      this.datarep = ab2str(
        this.buf.slice(
          MatHeader.endianCharsBegin - 1,
          MatHeader.endianCharsEnd,
        ),
      );
      const littleEndianHdr = this.datarep === 'IM';
      const littleEndianData = this.datarep === 'IM';

      this.headerList = this.headerStr.split(',').map((str) => str.trim());
      this.matfile = this.headerList[0]!;
      this.platform = this.headerList[1]!;
      this.createdOn = this.headerList[2]!;
      this.subsystemOffset = ab2str(
        this.buf.slice(
          MatHeader.subsysOffsetBegin - 1,
          MatHeader.subsysOffsetEnd,
        ),
      );
      this.version = dvhdr.getUint16(
        MatHeader.versionOffsetBegin - 1,
        littleEndianHdr,
      );
      this.versionName = MatHeader.versionNames[this.version]!;

      this.dataType = dvhdr.getUint32(
        MatHeader.firstDataTypeOffsetBegin - 1,
        littleEndianHdr,
      );
      this.dataTypeName = MatHeader.dataTypeNames[this.dataType]!.name;
      this.arraySize = dvhdr.getUint32(
        MatHeader.numBytesOffsetBegin - 1,
        littleEndianHdr,
      );

      const _beginArray = MatHeader.numBytesOffsetEnd + 1;

      let currIndex = MatHeader.numBytesOffsetEnd + 1;
      const typeNum = dvhdr.getUint32(currIndex - 1, littleEndianHdr);
      const typeName = MatHeader.dataTypeNames[typeNum]!.name;
      const typeSize = MatHeader.dataTypeNames[typeNum]!.size!;
      currIndex += 4;

      const _flagLength = this.getDataWithType(
        dvhdr,
        typeName,
        currIndex - 1,
        littleEndianData,
      );
      currIndex += typeSize;

      const arrayFlag = this.getDataWithType(
        dvhdr,
        typeName,
        currIndex - 1,
        littleEndianData,
      );
      currIndex += typeSize;

      const _complexFlag = arrayFlag & 0x80;
      const _globalFlag = arrayFlag & 0x40;
      const _logicalFlag = arrayFlag & 0x20;

      const arrayClassNum = arrayFlag & 0xf;
      const _arrayClassName = MatHeader.arrayClassNames[arrayClassNum];

      currIndex += typeSize;

      const dimTypeNum = dvhdr.getUint32(currIndex - 1, littleEndianData);
      currIndex += 4;

      const dimTypeName = MatHeader.dataTypeNames[dimTypeNum]!.name;
      const dimTypeSize = MatHeader.dataTypeNames[dimTypeNum]!.size!;

      const _arrayDimTotalSize = dvhdr.getUint32(
        currIndex - 1,
        littleEndianData,
      );
      currIndex += 4;

      const rows = this.getDataWithType(
        dvhdr,
        dimTypeName,
        currIndex - 1,
        littleEndianData,
      );
      currIndex += dimTypeSize;

      if (rows > 1) {
        console.warn('Only 1D arrays are currently supported.');
      }

      const _cols = this.getDataWithType(
        dvhdr,
        dimTypeName,
        currIndex - 1,
        littleEndianData,
      );
      currIndex += typeSize;

      let arrayNameTypeNum = dvhdr.getUint32(currIndex - 1, littleEndianData);
      currIndex += 4;

      let nameSize = 0;
      let small = false;
      if (arrayNameTypeNum > 15) {
        arrayNameTypeNum &= 0x00ff;
        small = true;
        nameSize = dvhdr.getUint16(currIndex - 5, littleEndianData);
      }

      const arrayNameTypeName = MatHeader.dataTypeNames[arrayNameTypeNum]!.name;
      const _arrayNameTypeSize =
        MatHeader.dataTypeNames[arrayNameTypeNum]!.size;

      if (!small) {
        nameSize = this.getDataWithType(
          dvhdr,
          arrayNameTypeName,
          currIndex - 1,
          littleEndianData,
        );
        currIndex += 4;
      }

      const rndUp = small ? (4 - (nameSize % 4)) % 4 : (8 - (nameSize % 8)) % 8;

      const jumpTo = nameSize + rndUp;
      currIndex += jumpTo;

      this.setData(this.buf, dvhdr, currIndex, littleEndianData);
    }
  }

  createArray(
    buf: ArrayBuffer | null,
    offset?: number,
    length?: number,
    type?: string,
  ): MatTypedArray {
    const TypedArray = MatHeader._MAT_TO_TYPEDARRAY[type!];
    if (TypedArray === undefined) {
      throw new Error(`unknown type ${type}`);
    }

    if (offset === undefined) {
      offset = 0;
    }

    if (length === undefined) {
      length = (buf as ArrayBuffer & { length?: number })?.length ?? 0;
    }

    return new TypedArray(buf!, offset, length);
  }

  getDataWithType(
    dv: DataView,
    typeName: string,
    offset: number,
    littleEndian: boolean,
  ): number {
    const typeFunc = MatHeader._MAT_TO_DATAVIEW[typeName];
    if (typeFunc === undefined) {
      throw new Error(`Type name ${typeName} is not supported`);
    }
    if (typeof typeFunc === 'string') {
      return (dv[typeFunc] as (offset: number, le: boolean) => number)(
        offset,
        littleEndian,
      );
    }
    return typeFunc(dv, offset, littleEndian);
  }

  setData(
    buf: ArrayBuffer,
    dvhdr: DataView,
    currIndex: number,
    littleEndian: boolean,
  ): void {
    let arrayValSize: number;

    let typeNum = dvhdr.getUint32(currIndex - 1, littleEndian);

    let small = false;
    if (typeNum > 15) {
      typeNum &= 0x00ff;
      small = true;
      arrayValSize = dvhdr.getUint16(currIndex + 1, littleEndian);
    } else {
      currIndex += 4;
      arrayValSize = 0; // will be set below
    }

    const typeName = MatHeader.dataTypeNames[typeNum]!.name;
    const typeSize = MatHeader.dataTypeNames[typeNum]!.size!;

    if (!small) {
      arrayValSize = dvhdr.getUint32(currIndex - 1, littleEndian);
    }

    currIndex += 4;

    this.dview = this.createArray(
      buf,
      currIndex - 1,
      arrayValSize / typeSize,
      typeName,
    );
  }
}

export type MatFileReaderOptions = Record<string, never>;

class MatFileReader extends BaseFileReader<MatHeader, MatFileReaderOptions> {
  constructor(options?: MatFileReaderOptions) {
    super(MatHeader, options);
  }
}

export { MatFileReader, MatHeader };
