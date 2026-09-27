import { readArrayBuffer } from './helpers';
import { MatHeader, MatFileReader } from '../src/matfile';

describe('MatHeader', () => {
  it('should parse the mat-file header from buffer', async () => {
    const buf = await readArrayBuffer('sin.mat');
    const hdr = new MatHeader(buf);

    expect(hdr.buf.byteLength).to.equal(16208);
    expect(hdr.version).to.equal(256);
    expect(hdr.versionName).to.equal('MAT-file');
    expect(hdr.datarep).to.equal('IM');
    expect(hdr.dataTypeName).to.equal('miMATRIX');
    expect(hdr.headerStr).to.be.a('string');
    expect(hdr.headerStr.length).to.be.greaterThan(0);
  });

  it('should extract sine wave data', async () => {
    const buf = await readArrayBuffer('sin.mat');
    const hdr = new MatHeader(buf);

    expect(hdr.dview).to.not.be.undefined;
    expect(hdr.dview.length).to.be.greaterThan(0);
    // Sine wave values should be in [-1, 1]
    for (let i = 0; i < hdr.dview.length; i++) {
      expect(hdr.dview[i]).to.be.at.least(-1.0);
      expect(hdr.dview[i]).to.be.at.most(1.0);
    }
  });

  it('should parse header metadata fields', async () => {
    const buf = await readArrayBuffer('sin.mat');
    const hdr = new MatHeader(buf);

    expect(hdr.headerList).to.be.an('array');
    expect(hdr.headerList.length).to.be.greaterThan(0);
    expect(hdr.arraySize).to.be.greaterThan(0);
    expect(hdr.dataType).to.equal(14); // miMATRIX
  });

  it('should handle null buffer', () => {
    const hdr = new MatHeader(null);
    expect(hdr.buf).to.be.null;
  });
});

describe('MatFileReader', () => {
  it('should store constructor options', () => {
    const opts = { someOption: true };
    const mfr = new MatFileReader(opts);
    expect(mfr.options).to.eql(opts);
    expect(mfr.header_class).to.equal(MatHeader);
  });
});
