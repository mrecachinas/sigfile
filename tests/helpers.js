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
