// Model data editor: semua koordinat dalam piksel kanvas strip (resolusi penuh).

export interface StickerItem {
  key: number;
  src: string;
  x: number;
  y: number;
  /** Lebar stiker dalam piksel kanvas. */
  size: number;
  /** Rotasi dalam radian. */
  rot: number;
}

export interface Stroke {
  color: string;
  width: number;
  points: [number, number][];
}

export interface Decorations {
  stickers: StickerItem[];
  strokes: Stroke[];
}

export const STICKERS: { src: string; label: string }[] = [
  { src: 'stickers/hati.svg', label: 'Hati' },
  { src: 'stickers/bintang.svg', label: 'Bintang' },
  { src: 'stickers/kacamata.svg', label: 'Kacamata' },
  { src: 'stickers/kumis.svg', label: 'Kumis' },
  { src: 'stickers/telinga-kucing.svg', label: 'Telinga kucing' },
  { src: 'stickers/mahkota.svg', label: 'Mahkota' },
  { src: 'stickers/kilau.svg', label: 'Kilau' },
  { src: 'stickers/wkwk.svg', label: 'Balon teks WKWK' },
  { src: 'stickers/pipi.svg', label: 'Pipi merona' },
  { src: 'stickers/pita.svg', label: 'Pita' },
];

export const INK_COLORS = ['#ff4d8d', '#ffb800', '#2fbf71', '#2f80ff', '#ffffff', '#222222'];

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = imageCache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = import.meta.env.BASE_URL + src;
    });
    imageCache.set(src, p);
  }
  return p;
}

export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[]): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of strokes) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.beginPath();
    s.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (s.points.length === 1) ctx.lineTo(s.points[0][0] + 0.1, s.points[0][1]);
    ctx.stroke();
  }
  ctx.restore();
}

export async function drawStickers(ctx: CanvasRenderingContext2D, stickers: StickerItem[]): Promise<void> {
  for (const s of stickers) {
    const img = await loadImage(s.src).catch(() => null);
    if (!img) continue;
    const h = (s.size * (img.naturalHeight || 1)) / (img.naturalWidth || 1);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.drawImage(img, -s.size / 2, -h / 2, s.size, h);
    ctx.restore();
  }
}
