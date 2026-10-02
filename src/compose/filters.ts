// Filter warna. Didefinisikan sekali sebagai daftar operasi, lalu dipakai untuk
// pratinjau langsung (CSS filter pada <video>) dan ekspor (piksel di kanvas).
// Ekspor tidak memakai ctx.filter karena Safari iOS lama belum mendukungnya.

export type FilterOp =
  | { op: 'sepia'; v: number }
  | { op: 'saturate'; v: number }
  | { op: 'grayscale'; v: number }
  | { op: 'brightness'; v: number }
  | { op: 'contrast'; v: number }
  /** Campur dengan warna (0..255) sebesar v. Tidak tampil di pratinjau CSS. */
  | { op: 'tint'; rgb: [number, number, number]; v: number };

export interface Filter {
  id: string;
  name: string;
  ops: FilterOp[];
  /** Jumlah tingkat warna per kanal; efek kartun. */
  posterize?: number;
}

export const FILTERS: Filter[] = [
  { id: 'normal', name: 'Normal', ops: [] },
  {
    id: 'hangat',
    name: 'Hangat',
    ops: [
      { op: 'sepia', v: 0.25 },
      { op: 'saturate', v: 1.2 },
      { op: 'brightness', v: 1.05 },
    ],
  },
  {
    id: 'vintage',
    name: 'Vintage',
    ops: [
      { op: 'sepia', v: 0.55 },
      { op: 'contrast', v: 0.88 },
      { op: 'brightness', v: 1.06 },
      { op: 'saturate', v: 0.8 },
    ],
  },
  {
    id: 'hitamputih',
    name: 'Hitam-Putih',
    ops: [
      { op: 'grayscale', v: 1 },
      { op: 'contrast', v: 1.15 },
    ],
  },
  {
    id: 'korea',
    name: 'Film Korea',
    ops: [
      { op: 'brightness', v: 1.1 },
      { op: 'contrast', v: 0.88 },
      { op: 'saturate', v: 0.85 },
      { op: 'tint', rgb: [255, 200, 215], v: 0.08 },
    ],
  },
  {
    id: 'kartun',
    name: 'Kartun',
    ops: [
      { op: 'saturate', v: 1.7 },
      { op: 'contrast', v: 1.25 },
    ],
    posterize: 6,
  },
];

export function getFilter(id: string): Filter {
  return FILTERS.find((f) => f.id === id) ?? FILTERS[0];
}

export function filterCss(f: Filter): string {
  const parts = f.ops
    .filter((o) => o.op !== 'tint')
    .map((o) => `${o.op}(${(o as { v: number }).v})`);
  return parts.length ? parts.join(' ') : 'none';
}

// Matriks warna 4×5 (baris R,G,B,A; kolom r,g,b,a,offset) dalam skala 0..1.
type Matrix = number[];

const IDENTITY: Matrix = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];

function multiply(a: Matrix, b: Matrix): Matrix {
  // Hasil = a ∘ b (b diterapkan dulu, lalu a).
  const out = new Array(20).fill(0);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      let sum = c === 4 ? a[r * 5 + 4] : 0;
      for (let k = 0; k < 4; k++) sum += a[r * 5 + k] * b[k * 5 + c];
      out[r * 5 + c] = sum;
    }
  }
  return out;
}

// Rumus mengikuti spesifikasi Filter Effects (sama dengan CSS filter).
function opMatrix(o: FilterOp): Matrix {
  switch (o.op) {
    case 'sepia': {
      const a = 1 - Math.min(1, o.v);
      return [
        0.393 + 0.607 * a, 0.769 - 0.769 * a, 0.189 - 0.189 * a, 0, 0,
        0.349 - 0.349 * a, 0.686 + 0.314 * a, 0.168 - 0.168 * a, 0, 0,
        0.272 - 0.272 * a, 0.534 - 0.534 * a, 0.131 + 0.869 * a, 0, 0,
        0, 0, 0, 1, 0,
      ];
    }
    case 'grayscale': {
      const a = 1 - Math.min(1, o.v);
      return [
        0.2126 + 0.7874 * a, 0.7152 - 0.7152 * a, 0.0722 - 0.0722 * a, 0, 0,
        0.2126 - 0.2126 * a, 0.7152 + 0.2848 * a, 0.0722 - 0.0722 * a, 0, 0,
        0.2126 - 0.2126 * a, 0.7152 - 0.7152 * a, 0.0722 + 0.9278 * a, 0, 0,
        0, 0, 0, 1, 0,
      ];
    }
    case 'saturate': {
      const s = o.v;
      return [
        0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0, 0,
        0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0, 0,
        0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s, 0, 0,
        0, 0, 0, 1, 0,
      ];
    }
    case 'brightness':
      return [o.v, 0, 0, 0, 0, 0, o.v, 0, 0, 0, 0, 0, o.v, 0, 0, 0, 0, 0, 1, 0];
    case 'contrast': {
      const off = 0.5 - 0.5 * o.v;
      return [o.v, 0, 0, 0, off, 0, o.v, 0, 0, off, 0, 0, o.v, 0, off, 0, 0, 0, 1, 0];
    }
    case 'tint': {
      const k = 1 - o.v;
      const [r, g, b] = o.rgb.map((x) => (x / 255) * o.v);
      return [k, 0, 0, 0, r, 0, k, 0, 0, g, 0, 0, k, 0, b, 0, 0, 0, 1, 0];
    }
  }
}

export function filterMatrix(f: Filter): Matrix {
  return f.ops.reduce((m, o) => multiply(opMatrix(o), m), IDENTITY);
}

/** Terapkan filter langsung ke buffer RGBA (in-place). */
export function applyFilterPixels(data: Uint8ClampedArray, f: Filter): void {
  if (!f.ops.length && !f.posterize) return;
  const m = filterMatrix(f);
  const o0 = m[4] * 255;
  const o1 = m[9] * 255;
  const o2 = m[14] * 255;
  const levels = f.posterize ?? 0;
  const step = levels > 1 ? 255 / (levels - 1) : 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    let nr = m[0] * r + m[1] * g + m[2] * b + o0;
    let ng = m[5] * r + m[6] * g + m[7] * b + o1;
    let nb = m[10] * r + m[11] * g + m[12] * b + o2;
    if (step) {
      nr = Math.round(nr / step) * step;
      ng = Math.round(ng / step) * step;
      nb = Math.round(nb / step) * step;
    }
    data[i] = nr;
    data[i + 1] = ng;
    data[i + 2] = nb;
  }
}
