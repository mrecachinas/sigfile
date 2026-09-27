import { bluefileToBigEndian, readArrayBuffer } from './helpers';
import { BlueHeader } from '../src/bluefile';

describe('BlueHeader', () => {
  it('should load keywords correctly from buffer', async () => {
    const buf = await readArrayBuffer('keyword_test_file.tmp');
    const hdr = new BlueHeader(buf, {});
    expect(hdr.type).to.equal(1000);
    expect(hdr.format).to.equal('SB');
    expect(hdr.size).to.equal(0);
    expect(hdr.ext_start).to.equal(1);
    expect(hdr.ext_size).to.equal(224);
    expect(hdr.data_start).to.equal(512);
    expect(hdr.data_size).to.equal(0);

    const keywords = {
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
    for (let prop in keywords) {
      expect(hdr.ext_header[prop]).to.equal(keywords[prop]);
    }
  });
  it('should load type 1000 SD data correctly from buffer', async () => {
    const buf = await readArrayBuffer('sin.tmp');
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
    const buf = await readArrayBuffer('penny.prm');
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
    const buf = await readArrayBuffer('scalarpacked.tmp');
    const hdr = new BlueHeader(buf);
    expect(hdr.buf.byteLength).to.eql(1024);
    expect(hdr.dview.length).to.eql(1024);
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
    expect(hdr.size).to.eql(1024);
    expect(hdr.xstart).to.eql(0.0);
    expect(hdr.xdelta).to.eql(1.0);
    expect(hdr.xunits).to.eql(1);
    expect(hdr.subsize).to.eql(1);
    expect(hdr.ystart).to.be.undefined;
    expect(hdr.ydelta).to.be.undefined;
    expect(hdr.yunits).to.eql(0);
    expect(hdr.data_start).to.eql(512.0);
    expect(hdr.data_size).to.eql(128);
    // First data byte (at data_start) is 0b11000111
    expect(hdr.dview.subarray(0, 8)).to.eql([1, 1, 0, 0, 0, 1, 1, 1]);
  });
  it('should parse complex float data from buffer', async () => {
    const buf = await readArrayBuffer('pulse_cx.tmp');
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
    const buf = await readArrayBuffer('ramp.tmp');
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
    expect(hdr.dview[0]).to.equal(0);
    expect(hdr.dview[1]).to.equal(1);
    expect(hdr.dview[2]).to.equal(2);
    expect(hdr.dview[1021]).to.equal(1021);
    expect(hdr.dview[1022]).to.equal(1022);
    expect(hdr.dview[1023]).to.equal(1023);
  });
});

describe('BlueHeader big-endian', () => {
  const FIXTURES = [
    'sin.tmp',
    'ramp.tmp',
    'pulse_cx.tmp',
    'penny.prm',
    'keyword_test_file.tmp',
    'lots_of_keywords.tmp',
    'scalarpacked.tmp',
  ];
  const VARIANTS = [
    { headrep: 'IEEE', datarep: 'EEEI', header: true, data: false },
    { headrep: 'EEEI', datarep: 'IEEE', header: false, data: true },
    { headrep: 'IEEE', datarep: 'IEEE', header: true, data: true },
  ];
  // Everything except the fields that describe byte order
  const fields = (hdr) => {
    // eslint-disable-next-line no-unused-vars
    const { buf, dview, headrep, datarep, littleEndianData, ...rest } = hdr;
    return rest;
  };
  const values = (dview) =>
    dview.getBit ? dview.subarray() : Array.from(dview);

  for (const name of FIXTURES) {
    for (const variant of VARIANTS) {
      it(`should parse ${name} with headrep ${variant.headrep} and datarep ${variant.datarep}`, async () => {
        const buf = await readArrayBuffer(name);
        const expected = new BlueHeader(buf);
        const hdr = new BlueHeader(bluefileToBigEndian(buf, variant));
        expect(hdr.headrep).to.equal(variant.headrep);
        expect(hdr.datarep).to.equal(variant.datarep);
        expect(fields(hdr)).to.eql(fields(expected));
        expect(values(hdr.dview)).to.eql(values(expected.dview));
      });
    }
  }

  it('should view host-order data in place and copy swapped data', async () => {
    const buf = await readArrayBuffer('sin.tmp');
    expect(new BlueHeader(buf).dview.buffer).to.equal(buf);
    const swapped = bluefileToBigEndian(buf);
    expect(new BlueHeader(swapped).dview.buffer).to.not.equal(swapped);
  });

  it('should support big-endian data on header-only reads', async () => {
    const buf = await readArrayBuffer('sin.tmp');
    const hdr = new BlueHeader(bluefileToBigEndian(buf).slice(0, 512));
    expect(hdr.size).to.equal(4096);
    expect(hdr.dview).to.be.undefined;
  });
});
