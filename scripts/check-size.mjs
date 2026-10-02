// NF-03: ukuran muat awal (HTML + JS/CSS yang dirujuk index.html) harus < 300 KB gzip.
// Chunk yang dimuat belakangan (mode jarak jauh, GIF) tidak dihitung.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const LIMIT = 300 * 1024;
const html = readFileSync('dist/index.html', 'utf8');
const files = ['index.html', ...[...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((m) => m[1].replace(/^.*?assets\//, 'assets/'))];
let total = 0;
for (const f of new Set(files)) {
  const size = gzipSync(readFileSync(`dist/${f}`)).length;
  total += size;
  console.log(`${f.padEnd(40)} ${(size / 1024).toFixed(1)} KB`);
}
console.log(`Total muat awal: ${(total / 1024).toFixed(1)} KB gzip (batas ${LIMIT / 1024} KB)`);
if (total > LIMIT) process.exit(1);
