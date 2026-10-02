// Frame placeholder: digambar prosedural (warna + pola) agar tanpa aset.
// Frame desainer bisa ditambahkan lewat `overlays` berupa PNG transparan per layout
// di public/frames/<tema>/<layout>.png (lihat CONTRIBUTING.md). PNG dimuat hanya saat dipakai.

import type { LayoutId } from './layouts';

export type Pattern = 'none' | 'dots' | 'stripes' | 'diamonds' | 'stars' | 'checker';

export interface Frame {
  id: string;
  name: string;
  category: 'Dasar' | 'Musiman' | 'Gaya';
  bg: string;
  /** Warna gradasi kedua (opsional). */
  bg2?: string;
  fg: string;
  accent: string;
  pattern: Pattern;
  overlays?: Partial<Record<LayoutId, string>>;
}

export const FRAMES: Frame[] = [
  { id: 'putih', name: 'Putih Klasik', category: 'Dasar', bg: '#ffffff', fg: '#2b2b2b', accent: '#e5e5e5', pattern: 'none' },
  { id: 'hitam', name: 'Hitam Klasik', category: 'Dasar', bg: '#1d1b1e', fg: '#fafafa', accent: '#3a363c', pattern: 'none' },
  { id: 'jambu', name: 'Pink Jambu', category: 'Dasar', bg: '#ffd6e0', fg: '#8a2846', accent: '#ffb3c6', pattern: 'dots' },
  { id: 'mangga', name: 'Kuning Mangga', category: 'Dasar', bg: '#ffe8a3', fg: '#6b4a00', accent: '#ffd25e', pattern: 'stripes' },
  { id: 'pandan', name: 'Hijau Pandan', category: 'Dasar', bg: '#cdeccf', fg: '#1f5130', accent: '#a5dba9', pattern: 'checker' },
  { id: 'lebaran', name: 'Lebaran', category: 'Musiman', bg: '#e9f5e1', bg2: '#bfe3b4', fg: '#245c2f', accent: '#d4a72c', pattern: 'diamonds' },
  { id: 'agustusan', name: '17-an', category: 'Musiman', bg: '#ffffff', bg2: '#ffe1e1', fg: '#b3121b', accent: '#e8222c', pattern: 'stripes' },
  { id: 'wisuda', name: 'Wisuda', category: 'Musiman', bg: '#1f2a4d', bg2: '#33437a', fg: '#f7d774', accent: '#f7d774', pattern: 'stars' },
  { id: 'ultah', name: 'Ultah', category: 'Musiman', bg: '#fff1f8', bg2: '#e8f4ff', fg: '#5b2a86', accent: '#ff8fc7', pattern: 'dots' },
  { id: 'y2k', name: 'Retro Y2K', category: 'Gaya', bg: '#c9b6ff', bg2: '#9ff0ff', fg: '#2a1260', accent: '#ffffff', pattern: 'stars' },
  { id: 'kawaii', name: 'Kawaii', category: 'Gaya', bg: '#fff5d6', bg2: '#ffe0ef', fg: '#c2457a', accent: '#ffc4dd', pattern: 'dots' },
  { id: 'batik', name: 'Batik', category: 'Gaya', bg: '#6b3b1f', bg2: '#8a5229', fg: '#fbe7c6', accent: '#c8894a', pattern: 'diamonds' },
];

export function getFrame(id: string): Frame {
  return FRAMES.find((f) => f.id === id) ?? FRAMES[0];
}

const overlayCache = new Map<string, Promise<HTMLImageElement | null>>();

export function loadOverlay(frame: Frame, layout: LayoutId): Promise<HTMLImageElement | null> {
  const src = frame.overlays?.[layout];
  if (!src) return Promise.resolve(null);
  let p = overlayCache.get(src);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = import.meta.env.BASE_URL + src;
    });
    overlayCache.set(src, p);
  }
  return p;
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
}

/** Gambar latar frame (di bawah foto). */
export function drawFrameBackground(ctx: CanvasRenderingContext2D, frame: Frame, w: number, h: number): void {
  if (frame.bg2) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, frame.bg);
    g.addColorStop(1, frame.bg2);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = frame.bg;
  }
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.fillStyle = frame.accent;
  ctx.strokeStyle = frame.accent;
  ctx.globalAlpha = 0.55;
  const s = 54;
  switch (frame.pattern) {
    case 'dots':
      for (let y = 0; y < h + s; y += s) {
        for (let x = (y / s) % 2 ? s / 2 : 0; x < w + s; x += s) {
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    case 'stripes':
      ctx.lineWidth = 16;
      for (let x = -h; x < w + h; x += s * 1.2) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + h, h);
        ctx.stroke();
      }
      break;
    case 'checker':
      for (let y = 0; y < h; y += s) {
        for (let x = ((y / s) % 2) * s; x < w; x += s * 2) ctx.fillRect(x, y, s, s);
      }
      break;
    case 'diamonds':
      ctx.lineWidth = 4;
      for (let y = 0; y < h + s; y += s * 1.4) {
        for (let x = 0; x < w + s; x += s * 1.4) {
          ctx.beginPath();
          ctx.moveTo(x, y - s / 2);
          ctx.lineTo(x + s / 2, y);
          ctx.lineTo(x, y + s / 2);
          ctx.lineTo(x - s / 2, y);
          ctx.closePath();
          ctx.stroke();
        }
      }
      break;
    case 'stars': {
      // Pola tetap (deterministik) agar hasil sama setiap render.
      let seed = 7;
      const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const count = Math.round((w * h) / 22000);
      for (let i = 0; i < count; i++) star(ctx, rand() * w, rand() * h, 6 + rand() * 12);
      break;
    }
    case 'none':
      break;
  }
  ctx.restore();
}
