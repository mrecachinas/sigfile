import { Blob } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { BlueFileReader, BlueHeader } from '../src/bluefile';

const DATA_DIR = './tests/dat';

describe('BaseFileReader._read via BlueFileReader', () => {
  it('should read a full file from a Blob', async () => {
    const data = await readFile(`${DATA_DIR}/sin.tmp`);
    const blob = new Blob([data]) as Blob & { name: string };
    blob.name = 'sin.tmp';

    const bfr = new BlueFileReader();
    const hdr = await new Promise<BlueHeader | null>((resolve) => {
      bfr.read(blob, resolve);
    });

    expect(hdr).to.not.be.null;
    expect(hdr!.file_name).to.equal('sin.tmp');
    expect(hdr!.type).to.equal(1000);
    expect(hdr!.format).to.equal('SD');
    expect(hdr!.size).to.equal(4096);
    expect(hdr!.data_start).to.equal(512);
    expect(hdr!.data_size).to.equal(32768);
    expect(hdr!.file).to.equal(blob);
  });

  it('should read only the header from a Blob', async () => {
    const data = await readFile(`${DATA_DIR}/sin.tmp`);
    const blob = new Blob([data]) as Blob & { name: string };
    blob.name = 'sin.tmp';

    const bfr = new BlueFileReader();
    const hdr = await new Promise<BlueHeader | null>((resolve) => {
      bfr.readheader(blob, resolve);
    });

    expect(hdr).to.not.be.null;
    expect(hdr!.file_name).to.equal('sin.tmp');
    expect(hdr!.type).to.equal(1000);
    expect(hdr!.format).to.equal('SD');
  });

  it('should read type 2000 data from a Blob', async () => {
    const data = await readFile(`${DATA_DIR}/penny.prm`);
    const blob = new Blob([data]) as Blob & { name: string };
    blob.name = 'penny.prm';

    const bfr = new BlueFileReader();
    const hdr = await new Promise<BlueHeader | null>((resolve) => {
      bfr.read(blob, resolve);
    });

    expect(hdr).to.not.be.null;
    expect(hdr!.type).to.equal(2000);
    expect(hdr!.format).to.equal('SD');
    expect(hdr!.size).to.equal(128);
  });

  it('should store constructor options', () => {
    const opts = { ext_header_type: 'json' };
    const bfr = new BlueFileReader(opts);
    expect(bfr.options).to.eql(opts);
    expect(bfr.header_class).to.equal(BlueHeader);
  });
});
