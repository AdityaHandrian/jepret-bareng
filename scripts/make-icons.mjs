// Membuat ikon PWA (PNG) tanpa dependensi: gambar bentuk sederhana lalu encode PNG dengan zlib.
// Jalankan: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const PINK = [255, 143, 177];
const WHITE = [255, 255, 255];
const DARK = [43, 27, 34];
const MANGGA = [255, 210, 94];

function crcTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
}
const CRC = crcTable();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const inRoundRect = (x, y, cx, cy, w, h, r) => {
  const dx = Math.max(Math.abs(x - cx) - (w / 2 - r), 0);
  const dy = Math.max(Math.abs(y - cy) - (h / 2 - r), 0);
  return dx * dx + dy * dy <= r * r;
};
const inCircle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

/** Warna pada koordinat ternormalisasi (0..1). `maskable` memberi zona aman lebih besar. */
function shade(u, v, maskable) {
  const s = maskable ? 0.72 : 1; // skala kamera
  const bgRadius = maskable ? 0 : 0.22;
  if (!maskable && !inRoundRect(u, v, 0.5, 0.5, 1, 1, bgRadius)) return null;
  const k = (x) => 0.5 + (x - 0.5) * s;
  // badan kamera
  if (inCircle(u, v, k(0.5), k(0.55), 0.17 * s)) return inCircle(u, v, k(0.5), k(0.55), 0.11 * s) ? DARK : WHITE;
  if (inCircle(u, v, k(0.5), k(0.55), 0.2 * s)) return DARK;
  if (inRoundRect(u, v, k(0.5), k(0.55), 0.68 * s, 0.46 * s, 0.08 * s)) return WHITE;
  if (inRoundRect(u, v, k(0.36), k(0.31), 0.18 * s, 0.1 * s, 0.03 * s)) return WHITE;
  if (inCircle(u, v, k(0.72), k(0.42), 0.035 * s)) return MANGGA;
  return PINK;
}

function render(size, maskable) {
  const buf = Buffer.alloc(size * size * 4);
  const ss = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = shade((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size, maskable);
          if (c) {
            r += c[0];
            g += c[1];
            b += c[2];
            a += 255;
          }
        }
      }
      const n = ss * ss;
      const i = (y * size + x) * 4;
      const cov = a / 255;
      buf[i] = cov ? r / cov : 0;
      buf[i + 1] = cov ? g / cov : 0;
      buf[i + 2] = cov ? b / cov : 0;
      buf[i + 3] = a / n;
    }
  }
  return png(size, buf);
}

const out = new URL('../public/icons/', import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(new URL('icon-192.png', out), render(192, false));
writeFileSync(new URL('icon-512.png', out), render(512, false));
writeFileSync(new URL('icon-maskable-512.png', out), render(512, true));
writeFileSync(new URL('apple-touch-icon.png', out), render(180, true));
console.log('Ikon dibuat di public/icons/');
