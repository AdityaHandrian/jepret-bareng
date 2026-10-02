// Definisi layout strip. Semua ukuran dalam piksel kanvas akhir (lebar 1080 px, F-07).

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type LayoutId = 'strip4' | 'strip3' | 'grid2x2' | 'polaroid';

export interface Layout {
  id: LayoutId;
  name: string;
  shots: number;
  width: number;
  height: number;
  slots: Rect[];
  /** Area bawah untuk caption, tanggal, dan watermark. */
  footer: Rect;
}

export const OUTPUT_WIDTH = 1080;
const MARGIN = 60;
const GAP = 36;

function vertical(id: LayoutId, name: string, shots: number): Layout {
  const w = OUTPUT_WIDTH - MARGIN * 2;
  const h = Math.round((w * 3) / 4);
  const slots: Rect[] = [];
  for (let i = 0; i < shots; i++) {
    slots.push({ x: MARGIN, y: MARGIN + i * (h + GAP), w, h });
  }
  const top = MARGIN + shots * h + (shots - 1) * GAP;
  const footer = { x: MARGIN, y: top, w, h: 340 };
  return { id, name, shots, width: OUTPUT_WIDTH, height: top + footer.h, slots, footer };
}

function grid(): Layout {
  const w = (OUTPUT_WIDTH - MARGIN * 2 - GAP) / 2;
  const h = Math.round((w * 5) / 4);
  const slots: Rect[] = [];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      slots.push({ x: MARGIN + c * (w + GAP), y: MARGIN + r * (h + GAP), w, h });
    }
  }
  const top = MARGIN + h * 2 + GAP;
  const footer = { x: MARGIN, y: top, w: OUTPUT_WIDTH - MARGIN * 2, h: 260 };
  return { id: 'grid2x2', name: 'Grid 2×2', shots: 4, width: OUTPUT_WIDTH, height: top + footer.h, slots, footer };
}

function polaroid(): Layout {
  const w = OUTPUT_WIDTH - MARGIN * 2;
  const slot = { x: MARGIN, y: MARGIN, w, h: w };
  const footer = { x: MARGIN, y: MARGIN + w, w, h: 320 };
  return { id: 'polaroid', name: 'Polaroid', shots: 1, width: OUTPUT_WIDTH, height: footer.y + footer.h, slots: [slot], footer };
}

export const LAYOUTS: Layout[] = [
  vertical('strip4', 'Strip 4 foto', 4),
  grid(),
  vertical('strip3', 'Strip 3 foto', 3),
  polaroid(),
];

export function getLayout(id: string): Layout {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

/**
 * Membagi satu slot menjadi sel untuk tiap peserta (mode jarak jauh).
 * 1 → penuh, 2 → 2 kolom, 3 → 3 kolom, 4 → 2×2.
 */
export function splitSlot(slot: Rect, count: number, gap = 8): Rect[] {
  const n = Math.max(1, count);
  const cols = n === 4 ? 2 : n;
  const rows = Math.ceil(n / cols);
  const cw = (slot.w - gap * (cols - 1)) / cols;
  const ch = (slot.h - gap * (rows - 1)) / rows;
  const cells: Rect[] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    cells.push({ x: slot.x + c * (cw + gap), y: slot.y + r * (ch + gap), w: cw, h: ch });
  }
  return cells;
}

/** Rasio lebar/tinggi sel kamera untuk peserta, dipakai pratinjau agar crop sesuai hasil. */
export function cellAspect(layout: Layout, count: number): number {
  const cell = splitSlot(layout.slots[0], count)[0];
  return cell.w / cell.h;
}

/** Hitung area crop tengah (object-fit: cover) dari sumber ke target. */
export function coverCrop(sw: number, sh: number, tw: number, th: number): Rect {
  const targetRatio = tw / th;
  const srcRatio = sw / sh;
  if (srcRatio > targetRatio) {
    const w = sh * targetRatio;
    return { x: (sw - w) / 2, y: 0, w, h: sh };
  }
  const h = sw / targetRatio;
  return { x: 0, y: (sh - h) / 2, w: sw, h };
}
