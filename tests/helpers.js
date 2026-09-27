import { readFile as fsReadFile } from 'fs/promises';

export const DATA_DIR = './tests/dat';

/**
 * Read a test data file into a standalone ArrayBuffer.
 */
export async function readArrayBuffer(name) {
  const data = await fsReadFile(`${DATA_DIR}/${name}`);
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}

/**
 * Read a test data file into a File, as from a browser file input.
 */
export async function readFile(name) {
  return new File([await fsReadFile(`${DATA_DIR}/${name}`)], name);
}

const WIDTHS = { I: 2, L: 4, X: 8, F: 4, D: 8 };

function swapInPlace(bytes, offset, byteLength, width) {
  if (!(width > 1)) return;
  for (let i = offset; i < offset + byteLength; i += width) {
    bytes.subarray(i, i + width).reverse();
  }
}

// Bluefile header numeric fields as [offset, width], from the X-Midas layout
// (see REDHAWK's bluefile.py). The type 1000 and 2000 adjuncts share widths.
const BLUE_HEADER_FIELDS = [
  [12, 4],
  [16, 4],
  [20, 4],
  [24, 4],
  [28, 4],
  [32, 8],
  [40, 8],
  [48, 4],
  [54, 2],
  [56, 8],
  [64, 2],
  [66, 2],
  [68, 4],
  [72, 4],
  [76, 4],
  [80, 8],
  [88, 8],
  [96, 8],
  [104, 8],
  [112, 8],
  [120, 8],
  [128, 8],
  [136, 8],
  [144, 8],
  [152, 8],
  [160, 4],
  [256, 8],
  [264, 8],
  [272, 4],
  [276, 4],
  [280, 8],
  [288, 8],
  [296, 4],
  [300, 4],
];

/**
 * Convert a little-endian (EEEI) bluefile to big-endian (IEEE) byte order:
 * the header and extended header keywords when `header` is set, and the
 * data when `data` is set.
 */
export function bluefileToBigEndian(buf, { header = true, data = true } = {}) {
  const out = buf.slice(0);
  const bytes = new Uint8Array(out);
  const dv = new DataView(buf);
  const ascii = (offset, str) =>
    bytes.set(
      str.split('').map((c) => c.charCodeAt(0)),
      offset,
    );
  if (header) {
    ascii(4, 'IEEE');
    for (const [offset, width] of BLUE_HEADER_FIELDS) {
      swapInPlace(bytes, offset, width, width);
    }
    const extStart = dv.getInt32(24, true) * 512;
    const extSize = dv.getInt32(28, true);
    for (let ii = 0; ii < extSize; ) {
      const lkey = dv.getUint32(extStart + ii, true);
      const lextra = dv.getInt16(extStart + ii + 4, true);
      const format = String.fromCharCode(bytes[extStart + ii + 7]);
      swapInPlace(bytes, extStart + ii, 4, 4);
      swapInPlace(bytes, extStart + ii + 4, 2, 2);
      swapInPlace(bytes, extStart + ii + 8, lkey - lextra, WIDTHS[format]);
      ii += lkey;
    }
  }
  if (data) {
    ascii(8, 'IEEE');
    const format = String.fromCharCode(bytes[53]);
    const start = dv.getFloat64(32, true);
    const size = Math.min(dv.getFloat64(40, true), buf.byteLength - start);
    swapInPlace(bytes, start, size, WIDTHS[format]);
  }
  return out;
}

const MAT_WIDTHS = {
  3: 2,
  4: 2,
  5: 4,
  6: 4,
  7: 4,
  9: 8,
  12: 8,
  13: 8,
  17: 2,
  18: 4,
};

function matElementsToBigEndian(dv, bytes, offset, end) {
  while (offset < end) {
    const word = dv.getUint32(offset, true);
    const smallBytes = word >>> 16;
    const type = smallBytes ? word & 0xffff : word;
    const nbytes = smallBytes || dv.getUint32(offset + 4, true);
    const data = offset + (smallBytes ? 4 : 8);
    swapInPlace(bytes, offset, 4, 4);
    if (!smallBytes) swapInPlace(bytes, offset + 4, 4, 4);
    if (type === 14) {
      matElementsToBigEndian(dv, bytes, data, data + nbytes);
    } else {
      swapInPlace(bytes, data, nbytes, MAT_WIDTHS[type]);
    }
    offset = smallBytes ? offset + 8 : data + Math.ceil(nbytes / 8) * 8;
  }
}

/**
 * Convert a little-endian ('IM') Level 5 MAT-file to big-endian ('MI').
 */
export function matToBigEndian(buf) {
  const out = buf.slice(0);
  const bytes = new Uint8Array(out);
  swapInPlace(bytes, 124, 2, 2);
  bytes.set([77, 73], 126); // 'MI'
  matElementsToBigEndian(new DataView(buf), bytes, 128, buf.byteLength);
  return out;
}
