import { splitSlot, type Layout } from './layouts';
import { drawFrameBackground, type Frame } from './frames';
import { drawPhoto, ensureFonts, FONT, type Photo } from './compose';
import type { Filter } from './filters';
import type { GifJob } from './gif.worker';

/** Urutan boomerang: 0,1,2,3,2,1 → berulang mulus. */
export function boomerangOrder(n: number): number[] {
  const fwd = Array.from({ length: n }, (_, i) => i);
  if (n < 3) return fwd;
  return [...fwd, ...fwd.slice(1, -1).reverse()];
}

/** Buat GIF/boomerang dari jepretan sesi. Encode berjalan di Web Worker (F-11). */
export async function makeGif(opts: {
  layout: Layout;
  frame: Frame;
  filter: Filter;
  shots: Photo[][];
  width?: number;
}): Promise<Blob> {
  await ensureFonts();
  const slot = opts.layout.slots[0];
  const width = opts.width ?? 480;
  const pad = Math.round(width * 0.05);
  const photoW = width - pad * 2;
  const photoH = Math.round((photoW * slot.h) / slot.w);
  const height = photoH + pad * 2 + 40;

  const frames: ArrayBuffer[] = [];
  for (const i of boomerangOrder(opts.shots.length)) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    drawFrameBackground(ctx, opts.frame, width, height);
    const area = { x: pad, y: pad, w: photoW, h: photoH };
    const photos = opts.shots[i];
    splitSlot(area, photos.length, 4).forEach((cell, j) => drawPhoto(ctx, photos[j], cell, opts.filter, opts.frame));
    ctx.fillStyle = opts.frame.fg;
    ctx.font = `600 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('jepretbareng', width / 2, height - pad - 14);
    frames.push(ctx.getImageData(0, 0, width, height).data.buffer);
  }

  const worker = new Worker(new URL('./gif.worker.ts', import.meta.url), { type: 'module' });
  try {
    const buf = await new Promise<ArrayBuffer>((resolve, reject) => {
      worker.onmessage = (e) => resolve(e.data);
      worker.onerror = (e) => reject(new Error(e.message || 'Gagal membuat GIF'));
      const job: GifJob = { width, height, delay: 450, frames };
      worker.postMessage(job, frames);
    });
    return new Blob([buf], { type: 'image/gif' });
  } finally {
    worker.terminate();
  }
}

