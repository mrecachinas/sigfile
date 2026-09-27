import {
  update,
  applySupportsTypedArray,
  getInt64,
  getUint64,
  swapBytes,
  ab2str,
  str2ab,
  pow2,
  parseURL,
} from '../src/util';

describe('update', () => {
  it('should handle empty objects', () => {
    const dst = {};
    const src = {};
    const result = update(dst, src);
    expect(result).to.eql({});
  });

  it('should handle filled and nested objects', () => {
    const dst = {
      c: {
        d: {
          e: {
            f: 5,
          },
        },
      },
    };
    const src = {
      a: 1,
      b: 'foo',
    };
    const result = update(dst, src);
    expect(result).to.eql({
      a: 1,
      b: 'foo',
      c: {
        d: {
          e: {
            f: 5,
          },
        },
      },
    });
  });

  it('should handle nested objects by recursing', () => {
    const dst = {
      c: {
        d: {
          e: {
            f: 5,
          },
        },
      },
    };
    const src = {
      a: 1,
      b: 'foo',
    };
    const result = update(src, dst);
    expect(result).to.eql({
      a: 1,
      b: 'foo',
      c: {
        d: {
          e: {
            f: 5,
          },
        },
      },
    });
  });

  it('should handle the same object', () => {
    const dst = {
      a: 1,
      b: 'foo',
    };
    const src = {
      a: 1,
      b: 'foo',
    };
    const result = update(dst, src);
    expect(result).to.eql(src);
    expect(result).to.eql(dst);
  });
});

describe('getInt64', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  it('should handle empty input', () => {
    const buffer = new ArrayBuffer(8);
    const dv = new DataView(buffer);
    const result = getInt64(dv, 0, true);
    expect(result).to.equal(0);
  });

  it('should handle little endian', () => {
    const buffer = new ArrayBuffer(8);
    const dataView = new DataView(buffer);
    dataView.setInt32(0, 256);
    dataView.setInt32(4, 0);
    const result = getInt64(dataView, 0, true);
    expect(result).to.equal(65536);
  });

  it('should handle big endian', () => {
    const buffer = new ArrayBuffer(8);
    const dataView = new DataView(buffer);
    dataView.setInt32(0, 256);
    dataView.setInt32(4, 0);
    const result = getInt64(dataView, 0, false);
    expect(result).to.equal(1099511627776);
  });

  it('should return Infinity safely', () => {
    const buffer = new ArrayBuffer(8);
    const dataView = new DataView(buffer);
    dataView.setInt32(0, 2);
    dataView.setInt32(4, 1337);
    const result = getInt64(dataView, 0, true);
    expect(result).to.equal(Infinity);
  });
});

describe('64-bit integers', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  const view = (value, littleEndian) => {
    const dv = new DataView(new ArrayBuffer(8));
    dv.setBigInt64(0, BigInt(value), littleEndian);
    return dv;
  };
  for (const littleEndian of [true, false]) {
    it(`getInt64 should read values whose low word has the top bit set (${littleEndian ? 'LE' : 'BE'})`, () => {
      expect(getInt64(view(-1, littleEndian), 0, littleEndian)).to.equal(-1);
      expect(
        getInt64(view(0xffffffff, littleEndian), 0, littleEndian),
      ).to.equal(0xffffffff);
      expect(
        getInt64(view(-(2 ** 40) - 1, littleEndian), 0, littleEndian),
      ).to.equal(-(2 ** 40) - 1);
    });
    it(`getUint64 should read unsigned values (${littleEndian ? 'LE' : 'BE'})`, () => {
      const dv = new DataView(new ArrayBuffer(8));
      dv.setBigUint64(0, 2n ** 32n + 5n, littleEndian);
      expect(getUint64(dv, 0, littleEndian)).to.equal(2 ** 32 + 5);
      dv.setBigUint64(0, 2n ** 63n, littleEndian);
      expect(getUint64(dv, 0, littleEndian)).to.equal(Infinity);
    });
  }
  it('getInt64 should return -Infinity below -2^53', () => {
    expect(getInt64(view(-(2 ** 53), true), 0, true)).to.equal(-Infinity);
  });
});

describe('swapBytes', () => {
  it('should reverse the bytes of each element into a new buffer', () => {
    const src = new Uint8Array([9, 1, 2, 3, 4, 5, 6, 7, 8]).buffer;
    expect(Array.from(new Uint8Array(swapBytes(src, 1, 2, 4)))).to.eql([
      4, 3, 2, 1, 8, 7, 6, 5,
    ]);
    expect(Array.from(new Uint8Array(swapBytes(src, 1, 4, 2)))).to.eql([
      2, 1, 4, 3, 6, 5, 8, 7,
    ]);
    expect(Array.from(new Uint8Array(src))).to.eql([9, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it('should reject unsupported widths', () => {
    expect(() => swapBytes(new ArrayBuffer(3), 0, 1, 3)).to.throw(/3-byte/);
  });
  it('should round-trip doubles', () => {
    const values = new Float64Array([Math.PI, -0.5, 1e300]);
    const dv = new DataView(swapBytes(values.buffer, 0, 3, 8));
    expect([0, 8, 16].map((i) => dv.getFloat64(i, false))).to.eql(
      Array.from(values),
    );
  });
});

describe('applySupportsTypedArray', () => {
  it("should return false if doesn't support", () => {
    vi.spyOn(String.fromCharCode, 'apply').mockImplementation(() => false);
    const result = applySupportsTypedArray();
    expect(result).to.be.false;
  });
  it('should return false if error thrown', () => {
    vi.spyOn(String.fromCharCode, 'apply').mockImplementation(() => {
      throw 'test';
    });
    const result = applySupportsTypedArray();
    expect(result).to.be.false;
  });
});

describe('ab2str', () => {
  it('should handle an empty buffer', () => {
    expect(ab2str(new ArrayBuffer(0))).to.eql('');
  });

  it('should be the somewhat the inverse of str2ab', () => {
    expect(ab2str(str2ab('abcd'))).to.eql('a\u0000b\u0000c\u0000d\u0000');
  });

  it('should convert with apply', () => {
    const buf = new ArrayBuffer(3);
    const arr = new Uint8Array(buf);
    arr[0] = 97;
    arr[1] = 98;
    arr[2] = 99;
    const result = ab2str(buf);
    expect(result).to.eql('abc');
  });

  it('should convert with apply with true', () => {
    const buf = new ArrayBuffer(3);
    const arr = new Uint8Array(buf);
    arr[0] = 97;
    arr[1] = 98;
    arr[2] = 99;
    const result = ab2str(buf, true);
    expect(result).to.eql('abc');
  });

  it('should convert with apply as false', () => {
    const buf = new ArrayBuffer(3);
    const arr = new Uint8Array(buf);
    arr[0] = 97;
    arr[1] = 98;
    arr[2] = 99;
    ab2str._applySupportsTypedArray = false;
    const result = ab2str(buf, false);
    expect(result).to.eql('abc');
  });

  it('should convert with undefined _applySupportsTypedArray', () => {
    const buf = new ArrayBuffer(3);
    const arr = new Uint8Array(buf);
    arr[0] = 97;
    arr[1] = 98;
    arr[2] = 99;
    ab2str._applySupportsTypedArray = undefined;
    const result = ab2str(buf, false);
    expect(result).to.eql('abc');
  });
});

describe('str2ab', () => {
  it('should handle the empty string', () => {
    const result = str2ab('');
    const expected = new ArrayBuffer(0);
    expect(result).to.be.empty;
    expect(result).to.eql(expected);
  });

  it('should correctly parse a string', () => {
    const result = str2ab('abc');
    const expected = new ArrayBuffer(6);
    const arr = new Uint16Array(expected);
    arr[0] = 97;
    arr[1] = 98;
    arr[2] = 99;
    expect(result).to.eql(expected);
  });
});

describe('pow2', () => {
  it('should handle negative numbers', () => {
    const result = pow2(-2);
    expect(result).to.equal(0.25);
  });

  it('should handle positive numbers within 0 <= n < 31', () => {
    const result = pow2(30);
    expect(result).to.equal(1073741824);
  });

  it('should handle n > 31', () => {
    const result = pow2(32);
    expect(result).to.equal(4294967296);
  });
});

describe('parseURL', () => {
  it('should handle the empty string', () => {
    const result = parseURL('');
    expect(result.source).to.equal('');
    expect(result.protocol).to.equal('http');
    expect(result.host).to.equal('localhost');
    expect(result.port).to.equal('');
    expect(result.query).to.equal('');
    expect(result.params).to.eql({});
    expect(result.file).to.equal('');
    expect(result.hash).to.equal('');
    expect(result.path).to.equal('/');
    expect(result.relative).to.equal('/');
    expect(result.segments).to.eql(['']);
  });

  it('should handle a normal URL without query params', () => {
    const result = parseURL('https://google.com');
    expect(result.source).to.equal('https://google.com');
    expect(result.protocol).to.equal('https');
    expect(result.host).to.equal('google.com');
    expect(result.port).to.equal('');
    expect(result.query).to.equal('');
    expect(result.params).to.eql({});
    expect(result.file).to.equal('');
    expect(result.hash).to.equal('');
    expect(result.path).to.equal('/');
    expect(result.relative).to.equal('/');
    expect(result.segments).to.eql(['']);
  });

  it('should handle different protocols and ports', () => {
    const result = parseURL('ws://google.com:1337');
    expect(result.source).to.equal('ws://google.com:1337');
    expect(result.protocol).to.equal('ws');
    expect(result.host).to.equal('google.com');
    expect(result.port).to.equal('1337');
    expect(result.query).to.equal('');
    expect(result.params).to.eql({});
    expect(result.file).to.equal('');
    expect(result.hash).to.equal('');
    expect(result.path).to.equal('/');
    expect(result.relative).to.equal('');
    expect(result.segments).to.eql(['']);
  });

  it('should handle query parameters', () => {
    const result = parseURL('https://google.com?q=foo&bar=baz');
    expect(result.source).to.equal('https://google.com?q=foo&bar=baz');
    expect(result.protocol).to.equal('https');
    expect(result.host).to.equal('google.com');
    expect(result.port).to.equal('');
    expect(result.query).to.equal('?q=foo&bar=baz');
    expect(result.params).to.eql({
      q: 'foo',
      bar: 'baz',
    });
    expect(result.file).to.equal('');
    expect(result.hash).to.equal('');
    expect(result.path).to.equal('/');
    expect(result.relative).to.equal('/?q=foo&bar=baz');
    expect(result.segments).to.eql(['']);
  });

  it('should handle hashes', () => {
    const result = parseURL('https://google.com#foo');
    expect(result.source).to.equal('https://google.com#foo');
    expect(result.protocol).to.equal('https');
    expect(result.host).to.equal('google.com');
    expect(result.port).to.equal('');
    expect(result.query).to.equal('');
    expect(result.params).to.eql({});
    expect(result.file).to.equal('');
    expect(result.hash).to.equal('foo');
    expect(result.path).to.equal('/');
    expect(result.relative).to.equal('/#foo');
    expect(result.segments).to.eql(['']);
  });

  it('should handle segments', () => {
    const result = parseURL('https://google.com/foo/bar');
    expect(result.source).to.equal('https://google.com/foo/bar');
    expect(result.protocol).to.equal('https');
    expect(result.host).to.equal('google.com');
    expect(result.port).to.equal('');
    expect(result.query).to.equal('');
    expect(result.params).to.eql({});
    expect(result.file).to.equal('bar');
    expect(result.hash).to.equal('');
    expect(result.path).to.equal('/foo/bar');
    expect(result.relative).to.equal('/foo/bar');
    expect(result.segments).to.eql(['foo', 'bar']);
  });
});
