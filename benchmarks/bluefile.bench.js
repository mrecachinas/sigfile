import { bench, describe } from 'vitest';
import { BlueHeader } from '../src/bluefile';

/**
 * Generate a synthetic Bluefile ArrayBuffer with the given data size.
 *
 * Creates a valid type-1000 SF (scalar float) bluefile with:
 * - 512-byte header (little-endian)
 * - `dataBytes` of float32 data
 */
function generateBluefile(dataBytes) {
  const totalBytes = 512 + dataBytes;
  const buf = new ArrayBuffer(totalBytes);
  const view = new DataView(buf);
  const u8 = new Uint8Array(buf);

  // Version: "BLUE"
  u8[0] = 66; u8[1] = 76; u8[2] = 85; u8[3] = 69;
  // headrep: "EEEI" (little-endian)
  u8[4] = 69; u8[5] = 69; u8[6] = 69; u8[7] = 73;
  // datarep: "EEEI" (little-endian)
  u8[8] = 69; u8[9] = 69; u8[10] = 69; u8[11] = 73;

  const LE = true;
  // ext_start = 0, ext_size = 0
  view.setInt32(24, 0, LE);
  view.setInt32(28, 0, LE);

  // data_start = 512.0
  view.setFloat64(32, 512.0, LE);
  // data_size
  view.setFloat64(40, dataBytes, LE);

  // type = 1000
  view.setUint32(48, 1000, LE);
  // format = "SF" (scalar float)
  u8[52] = 83; u8[53] = 70;

  // Adjunct area (offset 0x100 = 256)
  view.setFloat64(0x100, 0.0, LE);       // xstart
  view.setFloat64(0x100 + 8, 1.0, LE);   // xdelta
  view.setInt32(0x100 + 16, 1, LE);       // xunits
  view.setInt32(0x100 + 40, 0, LE);       // yunits

  // Fill data with a simple ramp
  const dataView = new Float32Array(buf, 512, dataBytes / 4);
  for (let i = 0; i < dataView.length; i++) {
    dataView[i] = i * 0.001;
  }

  return buf;
}

// Pre-generate buffers to exclude generation time from benchmarks
const sizes = {
  '1KB':   generateBluefile(1024),
  '100KB': generateBluefile(100 * 1024),
  '1MB':   generateBluefile(1024 * 1024),
  '10MB':  generateBluefile(10 * 1024 * 1024),
  '50MB':  generateBluefile(50 * 1024 * 1024),
};

describe('BlueHeader parse (full load)', () => {
  bench('1KB file', () => {
    new BlueHeader(sizes['1KB']);
  });

  bench('100KB file', () => {
    new BlueHeader(sizes['100KB']);
  });

  bench('1MB file', () => {
    new BlueHeader(sizes['1MB']);
  });

  bench('10MB file', () => {
    new BlueHeader(sizes['10MB']);
  });

  bench('50MB file', () => {
    new BlueHeader(sizes['50MB']);
  });
});

describe('BlueHeader parse (header only)', () => {
  bench('header from 50MB buffer', () => {
    // Simulate reading just the header portion
    const headerBuf = sizes['50MB'].slice(0, 512);
    new BlueHeader(headerBuf);
  });
});
