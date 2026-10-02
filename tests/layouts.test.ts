import { describe, expect, it } from 'vitest';
import { cellAspect, coverCrop, getLayout, LAYOUTS, OUTPUT_WIDTH, splitSlot } from '../src/compose/layouts';

describe('layout strip', () => {
  it('semua layout minimal lebar 1080 px (F-07)', () => {
    for (const l of LAYOUTS) expect(l.width).toBeGreaterThanOrEqual(1080);
  });

  it('jumlah slot sama dengan jumlah jepretan dan 3–4 jepretan untuk strip (F-02, F-03)', () => {
    for (const l of LAYOUTS) expect(l.slots).toHaveLength(l.shots);
    expect(getLayout('strip4').shots).toBe(4);
    expect(getLayout('strip3').shots).toBe(3);
    expect(getLayout('grid2x2').shots).toBe(4);
    expect(getLayout('polaroid').shots).toBe(1);
  });

  it('slot dan footer berada di dalam kanvas dan tidak saling tumpang tindih', () => {
    for (const l of LAYOUTS) {
      const rects = [...l.slots, l.footer];
      for (const r of rects) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(l.width);
        expect(r.y + r.h).toBeLessThanOrEqual(l.height);
      }
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i];
          const b = rects[j];
          const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
          expect(overlap, `${l.id} slot ${i} & ${j}`).toBe(false);
        }
      }
    }
  });

  it('id tak dikenal jatuh ke layout bawaan', () => {
    expect(getLayout('ngawur').id).toBe('strip4');
    expect(getLayout('strip4').width).toBe(OUTPUT_WIDTH);
  });
});

describe('pembagian slot untuk peserta jarak jauh', () => {
  const slot = { x: 0, y: 0, w: 960, h: 720 };

  it('1 peserta memenuhi slot', () => {
    expect(splitSlot(slot, 1)).toEqual([slot]);
  });

  it('2 peserta berdampingan, 4 peserta grid 2×2', () => {
    const two = splitSlot(slot, 2, 0);
    expect(two.map((c) => c.x)).toEqual([0, 480]);
    expect(two.every((c) => c.h === 720)).toBe(true);
    const four = splitSlot(slot, 4, 0);
    expect(four.map((c) => [c.x, c.y])).toEqual([
      [0, 0],
      [480, 0],
      [0, 360],
      [480, 360],
    ]);
  });

  it('rasio sel kamera mengikuti pembagian', () => {
    const l = getLayout('strip4');
    expect(cellAspect(l, 1)).toBeCloseTo(4 / 3, 2);
    expect(cellAspect(l, 2)).toBeLessThan(cellAspect(l, 1) / 2 + 0.01);
  });
});

describe('crop tengah', () => {
  it('sumber lebih lebar dipotong kiri-kanan', () => {
    expect(coverCrop(1600, 900, 100, 100)).toEqual({ x: 350, y: 0, w: 900, h: 900 });
  });
  it('sumber lebih tinggi dipotong atas-bawah', () => {
    expect(coverCrop(900, 1600, 100, 100)).toEqual({ x: 0, y: 350, w: 900, h: 900 });
  });
});
