// Tantangan pose acak (F-09) dari public/data/challenges.json.

export interface ChallengeData {
  poses: string[];
  /** Perintah rahasia untuk mode "Siapa yang beda?". */
  secret: string[];
}

const FALLBACK: ChallengeData = {
  poses: ['Senyum paling manis!', 'Pose ala sinetron!', 'Pura-pura dapat THR!', 'Muka kaget!'],
  secret: ['Tutup mata!', 'Melet!'],
};

let cache: Promise<ChallengeData> | null = null;

export function loadChallenges(): Promise<ChallengeData> {
  cache ??= fetch(import.meta.env.BASE_URL + 'data/challenges.json')
    .then((r) => (r.ok ? (r.json() as Promise<ChallengeData>) : FALLBACK))
    .catch(() => FALLBACK);
  return cache;
}

/** Ambil n tantangan acak tanpa pengulangan (selama daftar cukup). */
export function pickRandom<T>(list: T[], n: number, rand = Math.random): T[] {
  const pool = [...list];
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    if (!pool.length) pool.push(...list);
    out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  return out;
}
