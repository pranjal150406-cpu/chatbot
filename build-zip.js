const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Custom minimal ZIP builder using Node core modules only
class SimpleZip {
  constructor() {
    this.entries = [];
  }

  addFile(relativePath, content) {
    const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    this.entries.push({ path: relativePath.replace(/\\/g, '/'), data: buf });
  }

  toBuffer() {
    const files = [];
    let localOffset = 0;

    for (const entry of this.entries) {
      const pathBuf = Buffer.from(entry.path, 'utf8');
      const dataBuf = entry.data;
      const crc = crc32(dataBuf);
      
      // Local file header
      const header = Buffer.alloc(30 + pathBuf.length);
      header.writeUInt32LE(0x04034b50, 0); // Signature
      header.writeUInt16LE(20, 4);         // Version needed
      header.writeUInt16LE(0, 6);          // General flag
      header.writeUInt16LE(0, 8);          // Compression method (0 = Store)
      header.writeUInt16LE(0, 10);         // Time
      header.writeUInt16LE(0, 12);         // Date
      header.writeUInt32LE(crc, 14);       // CRC32
      header.writeUInt32LE(dataBuf.length, 18); // Compressed size
      header.writeUInt32LE(dataBuf.length, 22); // Uncompressed size
      header.writeUInt16LE(pathBuf.length, 26); // Filename length
      header.writeUInt16LE(0, 28);         // Extra field length
      pathBuf.copy(header, 30);

      files.push({
        header,
        data: dataBuf,
        pathBuf,
        crc,
        size: dataBuf.length,
        offset: localOffset
      });

      localOffset += header.length + dataBuf.length;
    }

    const cdEntries = [];
    let cdSize = 0;

    for (const file of files) {
      const cdHeader = Buffer.alloc(46 + file.pathBuf.length);
      cdHeader.writeUInt32LE(0x02014b50, 0); // CD Signature
      cdHeader.writeUInt16LE(20, 4);         // Version made by
      cdHeader.writeUInt16LE(20, 6);         // Version needed
      cdHeader.writeUInt16LE(0, 8);          // General flag
      cdHeader.writeUInt16LE(0, 10);         // Compression method
      cdHeader.writeUInt16LE(0, 12);         // Time
      cdHeader.writeUInt16LE(0, 14);         // Date
      cdHeader.writeUInt32LE(file.crc, 16);  // CRC32
      cdHeader.writeUInt32LE(file.size, 20); // Compressed size
      cdHeader.writeUInt32LE(file.size, 24); // Uncompressed size
      cdHeader.writeUInt16LE(file.pathBuf.length, 28);
      cdHeader.writeUInt16LE(0, 30);         // Extra length
      cdHeader.writeUInt16LE(0, 32);         // Comment length
      cdHeader.writeUInt16LE(0, 34);         // Disk start
      cdHeader.writeUInt16LE(0, 36);         // Internal attr
      cdHeader.writeUInt32LE(0, 38);         // External attr
      cdHeader.writeUInt32LE(file.offset, 42); // Relative offset
      file.pathBuf.copy(cdHeader, 46);

      cdEntries.push(cdHeader);
      cdSize += cdHeader.length;
    }

    const endRecord = Buffer.alloc(22);
    endRecord.writeUInt32LE(0x06054b50, 0); // End signature
    endRecord.writeUInt16LE(0, 4);          // Disk num
    endRecord.writeUInt16LE(0, 6);          // Start disk
    endRecord.writeUInt16LE(files.length, 8); // Num entries on disk
    endRecord.writeUInt16LE(files.length, 10); // Total entries
    endRecord.writeUInt32LE(cdSize, 12);    // CD Size
    endRecord.writeUInt32LE(localOffset, 16); // CD Offset
    endRecord.writeUInt16LE(0, 20);         // Comment length

    return Buffer.concat([
      ...files.flatMap(f => [f.header, f.data]),
      ...cdEntries,
      endRecord
    ]);
  }
}

// Simple IEEE CRC32 Implementation
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    let byte = buf[i];
    for (let j = 0; j < 8; j++) {
      let bit = (byte ^ crc) & 1;
      crc = (crc >>> 1) ^ (bit ? 0xEDB88320 : 0);
      byte >>>= 1;
    }
  }
  return (crc ^ -1) >>> 0;
}

const zip = new SimpleZip();
const rootDir = __dirname;
const outputZip = path.join(rootDir, 'ai-chatbot-app.zip');

const ignoreList = [
  'node_modules',
  'venv',
  '.venv',
  '__pycache__',
  '.git',
  '.DS_Store',
  'ai-chatbot-app.zip'
];

function addDirToZip(currentDir, baseDir = '') {
  const items = fs.readdirSync(currentDir);
  for (const item of items) {
    if (ignoreList.includes(item)) continue;
    const fullPath = path.join(currentDir, item);
    const relPath = path.join(baseDir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      addDirToZip(fullPath, relPath);
    } else {
      const content = fs.readFileSync(fullPath);
      zip.addFile(relPath, content);
    }
  }
}

console.log('📦 Bundling application into ai-chatbot-app.zip...');
addDirToZip(rootDir);
const zipBuffer = zip.toBuffer();
fs.writeFileSync(outputZip, zipBuffer);
console.log(`✅ Package built successfully! Saved to: ${outputZip} (${(zipBuffer.length / 1024).toFixed(1)} KB)`);