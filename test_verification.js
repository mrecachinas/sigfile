
const { getInt64, pow2 } = require('./src/util');
const BitArray = require('./src/bitarray').default; // It is export default

// Mock DataView
const buf = new ArrayBuffer(8);
const dv = new DataView(buf);

// Test getInt64 with 0x00000000FFFFFFFF (should be 4294967295)
// Big Endian
dv.setInt32(0, 0); // High
dv.setInt32(4, -1); // Low (0xFFFFFFFF)

// We need to export getInt64 and pow2 from util.js to test them or just copy code. 
// util.js uses ES modules export. I will just reimplement the logic to verify the math.

function testGetInt64() {
    const littleEndian = false;
    const index = 0;
    const [highIndex, lowIndex] = littleEndian ? [4, 0] : [0, 4];
    // This is what the code does:
    const high = dv.getInt32(index + highIndex, littleEndian); // 0
    const low = dv.getInt32(index + lowIndex, littleEndian);   // -1
    
    // logic from src/util.js
    const rv = low + Math.pow(2, 32) * high;
    
    console.log(`High: ${high}, Low: ${low}`);
    console.log(`Result: ${rv}`);
    console.log(`Expected: 4294967295`);
}

function testBitArray() {
    const b = new BitArray(8); // 1 byte
    console.log(`b.foo: ${b.foo}`);
    console.log(`b.slice: ${b.slice}`);
}

testGetInt64();
testBitArray();
