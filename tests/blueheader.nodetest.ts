import { readFile } from 'fs/promises';
import { BlueHeader } from '../src/bluefile';

const DATA_DIR = './tests/dat';

describe('BlueHeader', () => {
  it('should load keywords correctly from buffer', async () => {
    const data = await readFile(`${DATA_DIR}/keyword_test_file.tmp`);
    const buf = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    );
    const hdr = new BlueHeader(buf, {});
    expect(hdr.type).to.equal(1000);
    expect(hdr.format).to.equal('SB');
    expect(hdr.size).to.equal(0);
    expect(hdr.ext_start).to.equal(1);
    expect(hdr.ext_size).to.equal(224);
    expect(hdr.data_start).to.equal(512);
    expect(hdr.data_size).to.equal(0);

    const keywords: Record<string, unknown> = {
      B_TEST: 123,
      I_TEST: 1337,
      L_TEST: 113355,
      X_TEST: 987654321,
      F_TEST: 0.12345000356435776,
      D_TEST: 9.87654321,
      O_TEST: 255,
      STRING_TEST: 'Hello World',
      B_TEST2: 99,
      STRING_TEST2: 'Goodbye World',
    };
    for (const prop in keywords) {
      expect((hdr.ext_header as Record<string, unknown>)[prop]).to.equal(
        keywords[prop],
      );
    }
  });
  it('should load type 1000 SD data correctly from buffer', async () => {
    const data = await readFile(`${DATA_DIR}/sin.tmp`);
    const buf = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    );
    const hdr = new BlueHeader(buf);
    expect(hdr.type).to.equal(1000);
    expect(hdr.format).to.equal('SD');
    expect(hdr.size).to.equal(4096);
    expect(hdr.ext_start).to.equal(0);
    expect(hdr.ext_size).to.equal(0);
    expect(hdr.data_start).to.equal(512);
    expect(hdr.data_size).to.equal(32768);
  });
  it('should load type 2000 SD data correctly from buffer', async () => {
    const data = await readFile(`${DATA_DIR}/penny.prm`);
    const buf = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    );
    const hdr = new BlueHeader(buf);
    expect(hdr.type).to.equal(2000);
    expect(hdr.format).to.equal('SD');
    expect(hdr.size).to.equal(128);
    expect(hdr.ext_start).to.equal(257);
    expect(hdr.ext_size).to.equal(320);
    expect(hdr.data_start).to.equal(512);
    expect(hdr.data_size).to.equal(131072);
  });
  it('should parse scalar packed data from buffer', async () => {
    const data = await readFile(`${DATA_DIR}/scalarpacked.tmp`);
    const buf = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    );
    const hdr = new BlueHeader(buf);
    expect(hdr.buf.byteLength).to.eql(1024);
    expect(hdr.dview.length).to.eql(8192);
    expect(hdr.version).to.eql('BLUE');
    expect(hdr.headrep).to.eql('EEEI');
    expect(hdr.datarep).to.eql('EEEI');
    expect(hdr.timecode).to.eql(0);
    expect(hdr.type).to.eql(1000);
    expect(hdr['class']).to.eql(1);
    expect(hdr.format).to.eql('SP');
    expect(hdr.spa).to.eql(1);
    expect(hdr.bps).to.eql(0.125);
    expect(hdr.bpa).to.eql(0.125);
    expect(hdr.ape).to.eql(1);
    expect(hdr.bpe).to.eql(0.125);
    expect(hdr.size).to.eql(8192);
    expect(hdr.xstart).to.eql(0.0);
    expect(hdr.xdelta).to.eql(1.0);
    expect(hdr.xunits).to.eql(1);
    expect(hdr.subsize).to.eql(1);
    expect(hdr.ystart).to.be.undefined;
    expect(hdr.ydelta).to.be.undefined;
    expect(hdr.yunits).to.eql(0);
    expect(hdr.data_start).to.eql(512.0);
    expect(hdr.data_size).to.eql(128);
    expect((hdr.dview as import('../src/bitarray').default).getBit(0)).to.eql(
      0,
    );
    expect((hdr.dview as import('../src/bitarray').default).getBit(1)).to.eql(
      1,
    );
    expect((hdr.dview as import('../src/bitarray').default).getBit(2)).to.eql(
      0,
    );
    expect((hdr.dview as import('../src/bitarray').default).getBit(3)).to.eql(
      0,
    );
    expect((hdr.dview as import('../src/bitarray').default).getBit(4)).to.eql(
      0,
    );
    expect((hdr.dview as import('../src/bitarray').default).getBit(5)).to.eql(
      0,
    );
    expect((hdr.dview as import('../src/bitarray').default).getBit(6)).to.eql(
      1,
    );
    expect((hdr.dview as import('../src/bitarray').default).getBit(7)).to.eql(
      0,
    );
  });
  it('should parse complex float data from buffer', async () => {
    const data = await readFile(`${DATA_DIR}/pulse_cx.tmp`);
    const buf = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    );
    const hdr = new BlueHeader(buf);
    expect(hdr.buf.byteLength).to.equal(131584);
    expect(hdr.dview.length).to.equal(400);
    expect(hdr.version).to.equal('BLUE');
    expect(hdr.headrep).to.equal('EEEI');
    expect(hdr.datarep).to.equal('EEEI');
    expect(hdr.timecode).to.equal(0);
    expect(hdr.type).to.equal(1000);
    expect(hdr['class']).to.equal(1);
    expect(hdr.format).to.equal('CF');
    expect(hdr.spa).to.equal(2);
    expect(hdr.bps).to.equal(4);
    expect(hdr.bpa).to.equal(8);
    expect(hdr.ape).to.equal(1);
    expect(hdr.bpe).to.equal(8);
    expect(hdr.size).to.equal(200);
    expect(hdr.xstart).to.equal(0.0);
    expect(hdr.xdelta).to.equal(1.0);
    expect(hdr.xunits).to.equal(1);
    expect(hdr.subsize).to.equal(1);
    expect(hdr.ystart).to.equal(undefined);
    expect(hdr.ydelta).to.equal(undefined);
    expect(hdr.yunits).to.equal(0);
    expect(hdr.data_start).to.equal(512.0);
    expect(hdr.data_size).to.equal(1600);
  });
  it('should parse bluefile int data from buffer', async () => {
    const data = await readFile(`${DATA_DIR}/ramp.tmp`);
    const buf = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    );
    const hdr = new BlueHeader(buf);
    expect(hdr.buf.byteLength).to.equal(2560);
    expect(hdr.dview.length).to.equal(1024);
    expect(hdr.version).to.equal('BLUE');
    expect(hdr.headrep).to.equal('EEEI');
    expect(hdr.datarep).to.equal('EEEI');
    expect(hdr.timecode).to.equal(0);
    expect(hdr.type).to.equal(1000);
    expect(hdr['class']).to.equal(1);
    expect(hdr.format).to.equal('SI');
    expect(hdr.spa).to.equal(1);
    expect(hdr.bps).to.equal(2);
    expect(hdr.bpa).to.equal(2);
    expect(hdr.ape).to.equal(1);
    expect(hdr.bpe).to.equal(2);
    expect(hdr.size).to.equal(1024);
    expect(hdr.xstart).to.equal(0.0);
    expect(hdr.xdelta).to.equal(1.0);
    expect(hdr.xunits).to.equal(1);
    expect(hdr.subsize).to.equal(1);
    expect(hdr.ystart).to.equal(undefined);
    expect(hdr.ydelta).to.equal(undefined);
    expect(hdr.yunits).to.equal(0);
    expect(hdr.data_start).to.equal(512.0);
    expect(hdr.data_size).to.equal(2048);
    expect((hdr.dview as Int16Array)[0]).to.equal(0);
    expect((hdr.dview as Int16Array)[1]).to.equal(1);
    expect((hdr.dview as Int16Array)[2]).to.equal(2);
    expect((hdr.dview as Int16Array)[1021]).to.equal(1021);
    expect((hdr.dview as Int16Array)[1022]).to.equal(1022);
    expect((hdr.dview as Int16Array)[1023]).to.equal(1023);
  });
});
