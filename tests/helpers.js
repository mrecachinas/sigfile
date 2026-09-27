import { readFile } from 'fs/promises';

export const DATA_DIR = './tests/dat';

/**
 * Read a test data file into a standalone ArrayBuffer.
 */
export async function readArrayBuffer(name) {
  const data = await readFile(`${DATA_DIR}/${name}`);
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}

/**
 * Read a test data file into a Blob with a `name`, like a browser File.
 */
export async function readBlob(name) {
  const blob = new Blob([await readFile(`${DATA_DIR}/${name}`)]);
  blob.name = name;
  return blob;
}
