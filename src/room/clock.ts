// Sinkronisasi jam sederhana (ping bolak-balik) agar jepretan meleset < 200 ms.
//
// Tamu mengirim ping pada c0 (jam tamu), host membalas dengan h (jam host),
// tamu menerima pada c1. Dengan asumsi jalur pergi ≈ pulang:
//   offset = h − (c0 + c1) / 2   (jam host − jam tamu)

export interface ClockSample {
  offset: number;
  rtt: number;
}

export function now(): number {
  return performance.timeOrigin + performance.now();
}

export function sampleFrom(c0: number, h: number, c1: number): ClockSample {
  return { offset: h - (c0 + c1) / 2, rtt: c1 - c0 };
}

/**
 * Perkiraan offset terbaik: rata-rata dari sampel dengan RTT terkecil
 * (sepertiga terbaik), karena sampel cepat paling sedikit terganggu antrean jaringan.
 */
export function estimateOffset(samples: ClockSample[]): number | null {
  if (!samples.length) return null;
  const sorted = [...samples].sort((a, b) => a.rtt - b.rtt);
  const best = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 3)));
  return best.reduce((s, x) => s + x.offset, 0) / best.length;
}

/** Ubah waktu jam host menjadi waktu jam lokal. */
export function hostToLocal(hostTime: number, offset: number): number {
  return hostTime - offset;
}
