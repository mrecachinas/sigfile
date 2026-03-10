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
export type MatTypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float64Array;
type MatTypedArrayConstructor = typeof Int8Array | typeof Uint8Array | typeof Int16Array | typeof Uint16Array | typeof Int32Array | typeof Uint32Array | typeof Float64Array;
interface DataTypeInfo {
    name: string;
    size: number | null;
}
type DataViewMethod = 'getInt8' | 'getUint8' | 'getInt16' | 'getUint16' | 'getInt32' | 'getUint32' | 'getFloat32' | 'getFloat64';
type MatDataViewParser = DataViewMethod | ((dv: DataView, index: number, littleEndian: boolean) => number);
declare class MatHeader {
    static ARRAY_BUFFER_ENDIANNESS: 'LE' | 'BE';
    static versionNames: Record<number, string>;
    static _MAT_TO_TYPEDARRAY: Record<string, MatTypedArrayConstructor>;
    static _MAT_TO_DATAVIEW: Record<string, MatDataViewParser>;
    static dataTypeNames: Record<number, DataTypeInfo>;
    static arrayClassNames: Record<number, string>;
    static headerTextBegin: number;
    static headerTextEnd: number;
    static subsysOffsetBegin: number;
    static subsysOffsetEnd: number;
    static versionOffsetBegin: number;
    static versionOffsetEnd: number;
    static endianCharsBegin: number;
    static endianCharsEnd: number;
    static firstDataTypeOffsetBegin: number;
    static firstDataTypeOffsetEnd: number;
    static numBytesOffsetBegin: number;
    static numBytesOffsetEnd: number;
    buf: ArrayBuffer | null;
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
    versionName: string;
    dataType: number;
    dataTypeName: string;
    arraySize: number;
    dview: MatTypedArray;
    constructor(buf: ArrayBuffer | null);
    createArray(buf: ArrayBuffer | null, offset?: number, length?: number, type?: string): MatTypedArray;
    getDataWithType(dv: DataView, typeName: string, offset: number, littleEndian: boolean): number;
    setData(buf: ArrayBuffer, dvhdr: DataView, currIndex: number, littleEndian: boolean): void;
}
export interface MatFileReaderOptions {
}
declare class MatFileReader extends BaseFileReader<MatHeader, MatFileReaderOptions> {
    constructor(options?: MatFileReaderOptions);
}
export { MatHeader, MatFileReader };
