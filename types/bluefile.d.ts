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
import BitArray from './bitarray';
import { BaseFileReader } from './basefilereader';
export type ExtHeaderType = 'dict' | 'json' | 'list' | 'XMTable' | 'JSON' | 'DICT' | Record<string, never>;
export interface BlueHeaderOptions {
    ext_header_type?: ExtHeaderType;
}
export type BlueTypedArray = BitArray | Int8Array | Uint8Array | Int16Array | Int32Array | Float32Array | Float64Array;
type BlueTypedArrayConstructor = typeof BitArray | typeof Int8Array | typeof Uint8Array | typeof Int16Array | typeof Int32Array | typeof Float32Array | typeof Float64Array | null;
type DataViewMethod = 'getUint8' | 'getInt8' | 'getInt16' | 'getInt32' | 'getFloat32' | 'getFloat64';
type DataViewParser = DataViewMethod | ((dv: DataView, index: number, littleEndian: boolean) => number) | null;
export type ExtHeaderDict = Record<string, string | number>;
export type ExtHeaderList = Array<{
    tag: string;
    value: string | number;
}>;
export type ExtHeader = ExtHeaderDict | ExtHeaderList;
declare class BlueHeader {
    static ARRAY_BUFFER_ENDIANNESS: 'LE' | 'BE';
    static _SPA: Record<string, number>;
    static _BPS: Record<string, number>;
    static _XM_TO_TYPEDARRAY: Record<string, BlueTypedArrayConstructor>;
    static _XM_TO_DATAVIEW: Record<string, DataViewParser>;
    buf: ArrayBuffer;
    options: BlueHeaderOptions;
    version: string;
    headrep: string;
    datarep: string;
    littleEndianData: boolean;
    ext_start: number;
    ext_size: number;
    type: number;
    'class': number;
    format: string;
    timecode: number;
    xstart: number;
    xdelta: number;
    xunits: number;
    yunits: number;
    subsize: number;
    ystart?: number;
    ydelta?: number;
    data_start: number;
    data_size: number;
    ext_header: ExtHeader;
    spa: number;
    bps: number;
    bpa: number;
    ape: number;
    bpe: number;
    size: number;
    dview: BlueTypedArray;
    file?: File | Blob;
    file_name?: string;
    constructor(buf: ArrayBuffer | null, options?: BlueHeaderOptions);
    setHeader(): void;
    setData(buf: ArrayBuffer | null, offset: number, data_end: number, littleEndian?: boolean): void;
    unpack_keywords(buf: ArrayBuffer, lbuf: number, offset: number, littleEndian: boolean): ExtHeader;
    createArray(buf: ArrayBuffer | null, offset?: number, length?: number): BlueTypedArray;
}
declare class BlueFileReader extends BaseFileReader<BlueHeader, BlueHeaderOptions> {
    constructor(options?: BlueHeaderOptions);
}
export { BlueHeader, BlueFileReader };
