import { coverCrop, splitSlot, type Layout, type Rect } from './layouts';
import { applyFilterPixels, type Filter } from './filters';
import { drawFrameBackground, loadOverlay, type Frame } from './frames';
import { appUrl, drawQr } from './qr';
import { drawStickers, drawStrokes, type Decorations } from '../editor/model';

/** Foto hasil jepretan; null jika peserta gagal mengirim. */
export type Photo = HTMLCanvasElement | null;

export interface ComposeOptions {
  layout: Layout;
  frame: Frame;
  filter: Filter;
  /** shots[jepretan][peserta] */
  shots: Photo[][];
  caption: string;
  showDate: boolean;
  date?: Date;
}

export const FONT = "'Fredoka', 'Baloo 2', system-ui, sans-serif";

let fontsReady: Promise<unknown> | null = null;
export function ensureFonts(): Promise<unknown> {
  if (!fontsReady) {
    fontsReady = Promise.all([
      document.fonts?.load(`600 64px Fredoka`),
      document.fonts?.load(`400 32px Fredoka`),
    ]).catch(() => undefined);
  }
  return fontsReady;
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function roundRectPath(ctx: CanvasRenderingContext2D, r: Rect, radius: number) {
  const rr = Math.min(radius, r.w / 2, r.h / 2);
  ctx.beginPath();
  ctx.moveTo(r.x + rr, r.y);
  ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, rr);
  ctx.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, rr);
  ctx.arcTo(r.x, r.y + r.h, r.x, r.y, rr);
  ctx.arcTo(r.x, r.y, r.x + r.w, r.y, rr);
  ctx.closePath();
}

/** Gambar foto ke sel dengan crop tengah dan filter. */
export function drawPhoto(ctx: CanvasRenderingContext2D, photo: Photo, cell: Rect, filter: Filter, frame: Frame): void {
  const w = Math.max(1, Math.round(cell.w));
  const h = Math.max(1, Math.round(cell.h));
  if (!photo) {
    ctx.fillStyle = frame.accent;
    ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
    ctx.fillStyle = frame.fg;
    ctx.font = `500 ${Math.round(Math.min(w, h) / 9)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('foto tidak terkirim', cell.x + cell.w / 2, cell.y + cell.h / 2);
    return;
  }
  const tmp = document.createElement('canvas');
  tmp.width = w;
  tmp.height = h;
  const t = tmp.getContext('2d', { willReadFrequently: true })!;
  const crop = coverCrop(photo.width, photo.height, w, h);
  t.imageSmoothingQuality = 'high';
  t.drawImage(photo, crop.x, crop.y, crop.w, crop.h, 0, 0, w, h);
  if (filter.ops.length || filter.posterize) {
    const img = t.getImageData(0, 0, w, h);
    applyFilterPixels(img.data, filter);
    t.putImageData(img, 0, 0);
  }
  ctx.drawImage(tmp, cell.x, cell.y, cell.w, cell.h);
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, weight: number): number {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (s > 20 && ctx.measureText(text).width > maxW) {
    s -= 4;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
  return s;
}

/** Gambar caption, tanggal, dan watermark + QR di area footer. */
function drawFooter(ctx: CanvasRenderingContext2D, o: ComposeOptions): void {
  const f = o.layout.footer;
  const qrSize = Math.min(120, f.h * 0.42);
  const qrX = f.x + f.w - qrSize;
  const qrY = f.y + f.h - qrSize - 36;
  drawQr(ctx, appUrl(), qrX, qrY, qrSize, '#1d1b1e', '#ffffff');

  ctx.fillStyle = o.frame.fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = f.x + f.w / 2;
  const textW = f.w - qrSize * 2 - 40;
  const hasCaption = o.caption.trim().length > 0;
  const capY = f.y + f.h * (o.showDate ? 0.36 : 0.45);
  if (hasCaption) {
    fitText(ctx, o.caption, textW, 64, 600);
    ctx.fillText(o.caption, cx, capY);
  }
  if (o.showDate) {
    ctx.font = `400 34px ${FONT}`;
    ctx.globalAlpha = 0.85;
    ctx.fillText(formatDate(o.date ?? new Date()), cx, hasCaption ? capY + 72 : f.y + f.h * 0.45);
    ctx.globalAlpha = 1;
  }
  ctx.font = `500 24px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.globalAlpha = 0.7;
  ctx.fillText('jepretbareng', f.x, f.y + f.h - 36 - 12);
  ctx.globalAlpha = 1;
}

/** Susun strip dasar: latar frame, foto berfilter, overlay PNG, caption, watermark. */
export async function composeBase(o: ComposeOptions): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const { layout } = o;
  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext('2d')!;
  drawFrameBackground(ctx, o.frame, canvas.width, canvas.height);

  layout.slots.forEach((slot, i) => {
    const photos = o.shots[i] ?? [null];
    const cells = splitSlot(slot, photos.length);
    ctx.save();
    roundRectPath(ctx, slot, 18);
    ctx.clip();
    ctx.fillStyle = o.frame.accent;
    ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
    photos.forEach((p, j) => drawPhoto(ctx, p, cells[j], o.filter, o.frame));
    ctx.restore();
  });

  const overlay = await loadOverlay(o.frame, layout.id);
  if (overlay) ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
  drawFooter(ctx, o);
  return canvas;
}

/** Gabungkan strip dasar dengan stiker dan coretan menjadi kanvas akhir. */
export async function composeFinal(base: HTMLCanvasElement, deco: Decorations): Promise<HTMLCanvasElement> {
  const out = document.createElement('canvas');
  out.width = base.width;
  out.height = base.height;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(base, 0, 0);
  drawStrokes(ctx, deco.strokes);
  await drawStickers(ctx, deco.stickers);
  return out;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal membuat gambar'))), type, quality),
  );
}

export function scaledCopy(src: HTMLCanvasElement, width: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = Math.round((src.height * width) / src.width);
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

/** Nama file bertanggal ala kapsul waktu. */
export function fileName(ext: string, d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `jepretbareng-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.${ext}`;
}
