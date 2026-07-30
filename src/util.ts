/**
 * @license apache-2.0
 * @file util.ts
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

export interface ParsedURL {
  source: string;
  protocol: string;
  host: string;
  port: string;
  query: string;
  params: Record<string, string>;
  file: string;
  hash: string;
  path: string;
  relative: string;
  segments: string[];
}

function endianness(): 'LE' | 'BE' {
  const b = new ArrayBuffer(4);
  const a = new Uint32Array(b);
  const c = new Uint8Array(b);
  a[0] = 0xdeadbeef;
  if (c[0] === 0xef) {
    return 'LE';
  } else if (c[0] === 0xde) {
    return 'BE';
  } else {
    throw new Error('unknown endianness');
  }
}

/**
 * @deprecated since v0.1.4 in favor of Object.assign(target, source)
 */
function update(
  dst: Record<string, unknown>,
  src: Record<string, unknown>,
): Record<string, unknown> {
  for (const prop in src) {
    if (Object.hasOwn(src, prop)) {
      const val = src[prop];
      if (typeof val === 'object') {
        if (dst[prop] === undefined) {
          dst[prop] = {};
        }
        update(
          dst[prop] as Record<string, unknown>,
          val as Record<string, unknown>,
        );
      } else {
        dst[prop] = val;
      }
    }
  }
  return dst;
}

function getInt64(
  dataView: DataView,
  index: number,
  littleEndian: boolean,
): number {
  const MAX_INT = 2 ** 53;
  const [highIndex, lowIndex] = littleEndian ? [4, 0] : [0, 4];
  const high = dataView.getInt32(index + highIndex, littleEndian);
  const low = dataView.getInt32(index + lowIndex, littleEndian);
  const rv = low + pow2(32) * high;
  if (rv >= MAX_INT) {
    console.warn('Int is bigger than JS can represent.');
    return Infinity;
  } else {
    return rv;
  }
}

function applySupportsTypedArray(): boolean {
  try {
    const uintbuf = new Uint8Array(new ArrayBuffer(4));
    uintbuf[0] = 66;
    uintbuf[1] = 76;
    uintbuf[2] = 85;
    uintbuf[3] = 69;
    const test = String.fromCharCode.apply(
      null,
      uintbuf as unknown as number[],
    );
    if (test !== 'BLUE') {
      return false;
    }
  } catch {
    return false;
  }
  return true;
}

let _applySupportsTypedArray: boolean | undefined;

function ab2str(buf: ArrayBuffer, apply?: boolean): string {
  const uintbuf = new Uint8Array(buf);
  if (typeof _applySupportsTypedArray === 'undefined') {
    if (apply !== undefined) {
      _applySupportsTypedArray = apply;
    } else {
      _applySupportsTypedArray = applySupportsTypedArray();
    }
  }
  if (_applySupportsTypedArray) {
    return String.fromCharCode.apply(null, uintbuf as unknown as number[]);
  } else {
    return Array.from(uintbuf).reduce((prev, curr) => {
      return prev + String.fromCharCode(curr);
    }, '');
  }
}

// Expose the internal flag for testing
Object.defineProperty(ab2str, '_applySupportsTypedArray', {
  get(): boolean | undefined {
    return _applySupportsTypedArray;
  },
  set(val: boolean | undefined) {
    _applySupportsTypedArray = val;
  },
});

function str2ab(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length * 2);
  const bufView = new Uint16Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

const _pow2Cache: Record<number, number> = {};

function pow2(n: number): number {
  if (n >= 0 && n < 31) {
    return 1 << n;
  }
  if (_pow2Cache[n] === undefined) {
    _pow2Cache[n] = 2 ** n;
  }
  return _pow2Cache[n];
}

function parseURL(url: string): ParsedURL {
  const parsed = new URL(url, 'http://localhost/');
  return {
    source: url,
    protocol: parsed.protocol.replace(':', ''),
    host: parsed.hostname,
    port: parsed.port,
    query: parsed.search,
    params: (() => {
      const ret: Record<string, string> = {};
      for (const [key, value] of parsed.searchParams) {
        ret[key] = value;
      }
      return ret;
    })(),
    file: (parsed.pathname.match(/\/([^/?#]+)$/i) || [null, ''])[1] as string,
    hash: parsed.hash.replace('#', ''),
    path: parsed.pathname.replace(/^([^/])/, '/$1'),
    relative: (parsed.href.match(/tps?:\/\/[^/]+(.+)/) || [
      null,
      '',
    ])[1] as string,
    segments: parsed.pathname.replace(/^\//, '').split('/'),
  };
}

export {
  ab2str,
  applySupportsTypedArray,
  endianness,
  getInt64,
  parseURL,
  pow2,
  str2ab,
  update,
};
