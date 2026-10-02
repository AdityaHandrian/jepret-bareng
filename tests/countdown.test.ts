import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('localStorage', undefined);
const { clampCountdown } = await import('../src/ui/settings');

describe('hitung mundur bebas 1–10 detik', () => {
  it('menerima nilai di dalam batas', () => {
    for (let n = 1; n <= 10; n++) expect(clampCountdown(n)).toBe(n);
  });
  it('memotong nilai di luar batas dan membulatkan', () => {
    expect(clampCountdown(0)).toBe(1);
    expect(clampCountdown(-5)).toBe(1);
    expect(clampCountdown(25)).toBe(10);
    expect(clampCountdown(4.6)).toBe(5);
  });
});
