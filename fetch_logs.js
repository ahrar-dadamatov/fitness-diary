const { execSync } = require('child_process');
const https = require('https');
const zlib = require('zlib');

try {
  const stdout = execSync('npx eas-cli build:view 9153a897-024f-4df9-837e-e54e52fbeff0 --json').toString();
  const build = JSON.parse(stdout.split('\n').filter(l => l.startsWith('{') || l.startsWith('  ') || l.startsWith('}')).join('\n'));
  const url = build.logFiles[0];

  https.get(url, (res) => {
    let chunks = [];
    res.on('data', (d) => chunks.push(d));
    res.on('end', () => {
      let buffer = Buffer.concat(chunks);
      let text = '';
      try { text = zlib.unzipSync(buffer).toString('utf8'); } catch(e) {
        try { text = zlib.brotliDecompressSync(buffer).toString('utf8'); } catch(e) { text = buffer.toString('utf8'); }
      }
      
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!lines[i]) continue;
        try {
          const obj = JSON.parse(lines[i]);
          if (obj.phase === 'RUN_GRADLEW' && (obj.msg.toLowerCase().includes('failed') || obj.msg.toLowerCase().includes('error') || obj.msg.toLowerCase().includes('exception') || obj.level >= 40)) {
             console.log(obj.msg);
          }
        } catch(e) {}
      }
    });
  });
} catch (e) {
  console.error(e);
}
