/**
 * @license
 * File: matfile.js
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
import { endianness, ab2str, getInt64, getUint64, swapBytes } from './util';

/**
 * MAT-files are a binary format directly supported by SigPlot.  A Level 5
 * MAT-file consists of a 128-byte header followed by data elements.
 * The first data element (usually an miMATRIX) is parsed into this header.
 * For more information on MAT-files, please visit https://www.mathworks.com/help/pdf_doc/matlab/matfile_format.pdf
 *
 * | Offset | Name        | Size |    Type    |    Description |
 * |--------|:------------|:-----|:-----------|:---------------|
 * | 0      | header      | 116  |  char[116] |    Header      |
 * | 116    | subsys      |   8  |  char[8]   |                |
 * | 124    | version     |   2  |  int_2     |                |
 * | 126    | endianness  |   2  |  char[2]   |                |
 * | 128    | data_type   |   4  |  int_4     |                |
 * | 132    | byte_count  |   4  |  int_4     |                |
 *
 * Numeric, logical, char, and sparse arrays of any dimension are supported,
 * in either byte order. `dview` always holds the real values, flattened in
 * MATLAB's column-major order; `dims` gives the shape and `dviewImag` the
 * imaginary part of complex arrays. Sparse arrays are expanded to dense.
 * Compressed (-v7, the MATLAB default) and HDF5 (-v7.3) MAT-files are not
 * supported; save with -v6 instead.
 */
class MatHeader {
  /**
   * @memberOf matfile
   * @private
   */
  static ARRAY_BUFFER_ENDIANNESS = endianness();

  /**
   * @memberOf matfile
   * @private
   */
  static versionNames = { 256: 'MAT-file' };

  /**
   * Typed array for each MAT data type. 64-bit integers have no ES5 typed
   * array, so they are read value by value with _MAT_TO_DATAVIEW.
   *
   * @memberOf matfile
   * @private
   */
  static _MAT_TO_TYPEDARRAY = {
    miINT8: Int8Array,
    miUINT8: Uint8Array,
    miINT16: Int16Array,
    miUINT16: Uint16Array,
    miINT32: Int32Array,
    miUINT32: Uint32Array,
    miSINGLE: Float32Array,
    miDOUBLE: Float64Array,
    miUTF8: Uint8Array,
    miUTF16: Uint16Array,
    miUTF32: Uint32Array,
  };

  static _MAT_TO_DATAVIEW = {
    miINT8: 'getInt8',
    miUINT8: 'getUint8',
    miINT16: 'getInt16',
    miUINT16: 'getUint16',
    miINT32: 'getInt32',
    miUINT32: 'getUint32',
    miSINGLE: 'getFloat32',
    miDOUBLE: 'getFloat64',
    miINT64: getInt64,
    miUINT64: getUint64,
    miUTF8: 'getUint8',
    miUTF16: 'getUint16',
    miUTF32: 'getUint32',
  };

  /**
   * Typed array for the values of each numeric MATLAB class. MATLAB may
   * store values in a smaller data type than their class (for example a
   * double array of small integers as miUINT8); they are converted back.
   * 64-bit classes use Float64Array, so values beyond 2^53 become Infinity.
   *
   * @memberOf matfile
   * @private
   */
  static _CLASS_TO_TYPEDARRAY = {
    mxSPARSE_CLASS: Float64Array,
    mxDOUBLE_CLASS: Float64Array,
    mxSINGLE_CLASS: Float32Array,
    mxINT8_CLASS: Int8Array,
    mxUINT8_CLASS: Uint8Array,
    mxINT16_CLASS: Int16Array,
    mxUINT16_CLASS: Uint16Array,
    mxINT32_CLASS: Int32Array,
    mxUINT32_CLASS: Uint32Array,
    mxINT64_CLASS: Float64Array,
    mxUINT64_CLASS: Float64Array,
  };

  /**
   * @memberOf matfile
   * @private
   */
  static dataTypeNames = {
    1: {
      name: 'miINT8',
      size: 1,
    },
    2: {
      name: 'miUINT8',
      size: 1,
    },
    3: {
      name: 'miINT16',
      size: 2,
    },
    4: {
      name: 'miUINT16',
      size: 2,
    },
    5: {
      name: 'miINT32',
      size: 4,
    },
    6: {
      name: 'miUINT32',
      size: 4,
    },
    7: {
      name: 'miSINGLE',
      size: 4,
    },
    // 8 is reserved
    9: {
      name: 'miDOUBLE',
      size: 8,
    },
    // 10 and 11 are reserved
    12: {
      name: 'miINT64',
      size: 8,
    },
    13: {
      name: 'miUINT64',
      size: 8,
    },
    14: {
      name: 'miMATRIX',
      size: null,
    },
    15: {
      name: 'miCOMPRESSED',
      size: null,
    },
    16: {
      name: 'miUTF8',
      size: 1,
    },
    17: {
      name: 'miUTF16',
      size: 2,
    },
    18: {
      name: 'miUTF32',
      size: 4,
    },
  };

  /**
   * @memberOf matfile
   * @private
   */
  static arrayClassNames = {
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

  /**
   * Descriptive text field
   *
   * @memberOf matfile
   * @private
   */
  static headerTextBegin = 1;
  static headerTextEnd = 116;

  /**
   * Subsystem data offset field
   *
   * @memberOf matfile
   * @private
   */
  static subsysOffsetBegin = 117;
  static subsysOffsetEnd = 124;

  /**
   * Version field
   */
  static versionOffsetBegin = 125;
  static versionOffsetEnd = 126;

  // Two character endian indicator. If the value reads "MI" then native computer
  // has written the file in Big Endian, so no byte translation must occur.
  // If value reads "IM" then native computer has written the file in Little Endian
  // so byte-wise translation must be used on all data elements larger than 1 byte.
  static endianCharsBegin = 127;
  static endianCharsEnd = 128;

  /**
   * Outermost data type and number of bytes. For data plottable in SigPlot this will
   * most likely be a 1D array. The associated MATLAB type will most likely be "miMATRIX".
   */
  static firstDataTypeOffsetBegin = 129;
  static firstDataTypeOffsetEnd = 132;

  static numBytesOffsetBegin = 133;
  static numBytesOffsetEnd = 136;

  /**
   * Create matfile header and attach data buffer
   * @memberOf MatHeader
   * @param {ArrayBuffer} buf - Data buffer
   *
   * @property {string} arrayName - name of the MATLAB variable
   * @property {string} arrayClassName - MATLAB class, e.g. 'mxDOUBLE_CLASS'
   * @property {number[]} dims - array dimensions, e.g. [rows, cols]
   * @property {boolean} complex - whether the array has an imaginary part
   * @property {boolean} global - whether the variable is global
   * @property {boolean} logical - whether the array is logical
   * @property {TypedArray} dview - real values in column-major order
   * @property {TypedArray} [dviewImag] - imaginary values of complex arrays
   * @throws {Error} for compressed (-v7) or HDF5 (-v7.3) MAT-files, and
   *   for cell, struct, and object arrays
   */
  constructor(buf) {
    this.file = null;
    this.file_name = null;
    this.buf = buf;
    if (this.buf != null) {
      const dvhdr = new DataView(this.buf);
      this.headerStr = ab2str(
        this.buf.slice(MatHeader.headerTextBegin - 1, MatHeader.headerTextEnd),
      );

      // get endianness
      this.datarep = ab2str(
        this.buf.slice(
          MatHeader.endianCharsBegin - 1,
          MatHeader.endianCharsEnd,
        ),
      );
      const littleEndian = this.datarep === 'IM';

      this.headerList = this.headerStr.split(',').map(function (str) {
        return str.trim();
      });
      this.matfile = this.headerList[0];
      this.platform = this.headerList[1];
      this.createdOn = this.headerList[2];
      this.subsystemOffset = ab2str(
        this.buf.slice(
          MatHeader.subsysOffsetBegin - 1,
          MatHeader.subsysOffsetEnd,
        ),
      );
      this.version = dvhdr.getUint16(
        MatHeader.versionOffsetBegin - 1,
        littleEndian,
      );
      this.versionName = MatHeader.versionNames[this.version];
      if (this.version === 0x0200) {
        throw new Error(
          'MAT-file v7.3 (HDF5) is not supported; save the MAT-file with -v6',
        );
      }

      const element = MatHeader._readTag(
        dvhdr,
        MatHeader.firstDataTypeOffsetBegin - 1,
        littleEndian,
      );
      this.dataType = element.type;
      this.dataTypeName = MatHeader._dataType(element.type).name;
      this.arraySize = element.nbytes;
      if (this.dataTypeName === 'miCOMPRESSED') {
        throw new Error(
          'miCOMPRESSED data (MAT-file v7) is not supported; save the MAT-file with -v6',
        );
      }
      if (this.dataTypeName !== 'miMATRIX') {
        throw new Error(`Expected miMATRIX data, found ${this.dataTypeName}`);
      }
      this._readMatrix(dvhdr, element.data, littleEndian);
    }
  }

  /**
   * Reads the tag of the data element at `offset`. In the small data
   * element format, the byte count and type share one 4-byte word and the
   * data follows in the next 4 bytes.
   *
   * @memberOf MatHeader
   * @private
   * @returns {{type: number, nbytes: number, data: number, next: number}}
   *   the data type, byte count, data offset, and offset of the next element
   */
  static _readTag(dv, offset, littleEndian) {
    const word = dv.getUint32(offset, littleEndian);
    const smallBytes = word >>> 16;
    if (smallBytes) {
      return {
        type: word & 0xffff,
        nbytes: smallBytes,
        data: offset + 4,
        next: offset + 8,
      };
    }
    const nbytes = dv.getUint32(offset + 4, littleEndian);
    return {
      type: word,
      nbytes: nbytes,
      data: offset + 8,
      next: offset + 8 + Math.ceil(nbytes / 8) * 8,
    };
  }

  /**
   * @memberOf MatHeader
   * @private
   */
  static _dataType(type) {
    const dataType = MatHeader.dataTypeNames[type];
    if (dataType === undefined) {
      throw new Error(`Unknown MAT data type ${type}`);
    }
    return dataType;
  }

  /**
   * Parses the subelements of the miMATRIX element whose data starts at
   * `offset`: array flags, dimensions, name, then the values.
   *
   * @memberOf MatHeader
   * @private
   */
  _readMatrix(dv, offset, littleEndian) {
    let tag = MatHeader._readTag(dv, offset, littleEndian);
    const flags = dv.getUint32(tag.data, littleEndian);
    this.arrayClassName = MatHeader.arrayClassNames[flags & 0xff];
    if (this.arrayClassName === undefined) {
      throw new Error(`Unknown MAT array class ${flags & 0xff}`);
    }
    this.complex = (flags & 0x0800) !== 0;
    this.global = (flags & 0x0400) !== 0;
    this.logical = (flags & 0x0200) !== 0;

    tag = MatHeader._readTag(dv, tag.next, littleEndian);
    this.dims = Array.prototype.slice.call(
      this._readValues(dv, tag, littleEndian, Int32Array),
    );

    tag = MatHeader._readTag(dv, tag.next, littleEndian);
    this.arrayName = ab2str(this.buf.slice(tag.data, tag.data + tag.nbytes));

    if (this.arrayClassName === 'mxSPARSE_CLASS') {
      this._readSparse(dv, tag.next, littleEndian);
      return;
    }

    const Values = MatHeader._CLASS_TO_TYPEDARRAY[this.arrayClassName];
    if (Values === undefined && this.arrayClassName !== 'mxCHAR_CLASS') {
      throw new Error(`${this.arrayClassName} arrays are not supported`);
    }
    tag = MatHeader._readTag(dv, tag.next, littleEndian);
    this.dview = this._readValues(dv, tag, littleEndian, Values);
    if (this.complex) {
      tag = MatHeader._readTag(dv, tag.next, littleEndian);
      this.dviewImag = this._readValues(dv, tag, littleEndian, Values);
    }
  }

  /**
   * Reads a sparse array (row indices, column offsets, then values) and
   * expands it into dense column-major arrays.
   *
   * @memberOf MatHeader
   * @private
   */
  _readSparse(dv, offset, littleEndian) {
    const rows = this.dims[0];
    const cols = this.dims[1];
    const Values = this.logical ? Uint8Array : Float64Array;

    let tag = MatHeader._readTag(dv, offset, littleEndian);
    const ir = this._readValues(dv, tag, littleEndian, Int32Array);
    tag = MatHeader._readTag(dv, tag.next, littleEndian);
    const jc = this._readValues(dv, tag, littleEndian, Int32Array);
    // Column `col` holds values jc[col] .. jc[col + 1] - 1, at rows ir[k]
    const densify = (values) => {
      const dense = new Values(rows * cols);
      for (let col = 0; col < cols; col++) {
        for (let k = jc[col]; k < jc[col + 1]; k++) {
          dense[ir[k] + col * rows] = values[k];
        }
      }
      return dense;
    };

    tag = MatHeader._readTag(dv, tag.next, littleEndian);
    this.dview = densify(this._readValues(dv, tag, littleEndian, Values));
    if (this.complex) {
      tag = MatHeader._readTag(dv, tag.next, littleEndian);
      this.dviewImag = densify(this._readValues(dv, tag, littleEndian, Values));
    }
  }

  /**
   * Reads the values of a numeric data element, converting them to
   * `Values` when given and MATLAB stored them in a different type.
   *
   * @memberOf MatHeader
   * @private
   */
  _readValues(dv, tag, littleEndian, Values) {
    const dataType = MatHeader._dataType(tag.type);
    if (dataType.size === null) {
      throw new Error(`Expected numeric data, found ${dataType.name}`);
    }
    const count = tag.nbytes / dataType.size;
    if (MatHeader._MAT_TO_TYPEDARRAY[dataType.name] === undefined) {
      // 64-bit integers
      const values = new (Values || Float64Array)(count);
      for (let i = 0; i < count; i++) {
        values[i] = this.getDataWithType(
          dv,
          dataType.name,
          tag.data + i * dataType.size,
          littleEndian,
        );
      }
      return values;
    }
    const values = this.createArray(
      dv.buffer,
      tag.data,
      count,
      dataType.name,
      littleEndian,
    );
    if (Values === undefined || values instanceof Values) {
      return values;
    }
    const converted = new Values(count);
    converted.set(values);
    return converted;
  }

  /**
   * Get a JS array from MATLAB array
   *
   * @memberOf MatHeader
   * @private
   * @param {ArrayBuffer | Array} buf -
   * @param {number} offset - byte offset of the first value
   * @param {number} length - number of values; defaults to the rest of buf
   * @param {string} type - MAT data type name, e.g. 'miDOUBLE'
   * @param {boolean} [littleEndian] - byte order of the data; defaults to the host's
   */
  createArray(buf, offset, length, type, littleEndian) {
    const TypedArray = MatHeader._MAT_TO_TYPEDARRAY[type];
    if (TypedArray === undefined) {
      throw `unknown type ${type}`;
    }
    const size = TypedArray.BYTES_PER_ELEMENT;

    if (offset === undefined) {
      offset = 0;
    }

    if (length === undefined) {
      length =
        buf.byteLength !== undefined
          ? (buf.byteLength - offset) / size
          : buf.length;
    }

    const hostLittleEndian = MatHeader.ARRAY_BUFFER_ENDIANNESS === 'LE';
    if (
      littleEndian !== undefined &&
      littleEndian !== hostLittleEndian &&
      size > 1
    ) {
      return new TypedArray(swapBytes(buf, offset, length, size));
    }
    if (offset % size !== 0) {
      // Typed array views must be aligned to their element size
      return new TypedArray(buf.slice(offset, offset + length * size));
    }
    return new TypedArray(buf, offset, length);
  }

  /**
   *
   * @memberOf MatHeader
   * @param dv
   * @param typeName
   * @param offset
   * @param littleEndian
   * @returns {*}
   */
  getDataWithType(dv, typeName, offset, littleEndian) {
    const typeFunc = MatHeader._MAT_TO_DATAVIEW[typeName];
    if (typeFunc === undefined) {
      throw `Type name ${typeName} is not supported`;
    }
    if (typeof typeFunc === 'function') {
      return typeFunc(dv, offset, littleEndian);
    }
    return dv[typeFunc](offset, littleEndian);
  }

  /**
   * Reads the numeric data element at the 1-based `currIndex` into dview.
   *
   * @memberOf MatHeader
   * @param   buf
   * @param   dvhdr
   * @param   currIndex
   * @param   littleEndian
   */
  setData(buf, dvhdr, currIndex, littleEndian) {
    const tag = MatHeader._readTag(dvhdr, currIndex - 1, littleEndian);
    this.dview = this._readValues(dvhdr, tag, littleEndian);
  }
}

class MatFileReader extends BaseFileReader {
  constructor(options) {
    super(MatHeader, options);
  }
}

export { MatHeader, MatFileReader };
