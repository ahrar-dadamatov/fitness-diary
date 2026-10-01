const fs = require('fs');
const zlib = require('zlib');
try {
  const buffer = fs.readFileSync('eas_logs.txt');
  const unzipped = zlib.unzipSync(buffer);
  fs.writeFileSync('eas_logs_decoded.txt', unzipped);
  console.log('Unzipped successfully');
} catch (e) {
  console.error(e);
}
