import { describe, expect, it } from 'vitest';
import { estimateOffset, hostToLocal, sampleFrom } from '../src/room/clock';

/** Simulasikan ping: jam host = jam tamu + trueOffset, dengan latensi pergi/pulang. */
function simulate(trueOffset: number, c0: number, up: number, down: number) {
  const h = c0 + up + trueOffset;
  const c1 = c0 + up + down;
  return sampleFrom(c0, h, c1);
}

describe('sinkron jam', () => {
  it('latensi simetris menghasilkan offset tepat', () => {
    const s = simulate(5000, 1000, 40, 40);
    expect(s.offset).toBe(5000);
    expect(s.rtt).toBe(80);
  });

  it('memilih sampel ber-RTT kecil sehingga meleset < 200 ms walau ada lonjakan jaringan', () => {
    const trueOffset = -123456;
    const samples = [
      simulate(trueOffset, 0, 30, 35),
      simulate(trueOffset, 200, 900, 50), // antrean panjang saat pergi
      simulate(trueOffset, 400, 25, 30),
      simulate(trueOffset, 600, 60, 700), // antrean panjang saat pulang
      simulate(trueOffset, 800, 28, 33),
      simulate(trueOffset, 1000, 400, 400),
    ];
    const est = estimateOffset(samples)!;
    expect(Math.abs(est - trueOffset)).toBeLessThan(200);
    expect(Math.abs(est - trueOffset)).toBeLessThan(10);
  });

  it('mengonversi waktu jepret host ke jam lokal', () => {
    const offset = 2500; // jam host lebih cepat 2,5 detik
    expect(hostToLocal(12500, offset)).toBe(10000);
  });

  it('tanpa sampel mengembalikan null', () => {
    expect(estimateOffset([])).toBeNull();
  });
});
