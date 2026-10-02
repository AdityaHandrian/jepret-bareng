// Protokol pesan data channel antara host dan tamu.
import type { LayoutId } from '../compose/layouts';

export type RoomMode = 'duo' | 'geng';

/** Batas peserta (host + tamu). Geng dibatasi 4 agar ringan di HP kelas menengah. */
export const MAX_PARTICIPANTS: Record<RoomMode, number> = { duo: 2, geng: 4 };

export type Phase = 'lobby' | 'shooting' | 'review' | 'editing' | 'done';

export interface Participant {
  id: string;
  name: string;
  ready: boolean;
  host: boolean;
}

export interface RoomSettings {
  mode: RoomMode;
  layoutId: LayoutId;
  frameId: string;
  filterId: string;
  countdown: number;
  challenges: boolean;
  /** Mode "Siapa yang beda?": satu orang acak dapat perintah rahasia. */
  oddOneOut: boolean;
}

export type Msg =
  | { t: 'hello'; name: string }
  | { t: 'ready'; ready: boolean }
  | { t: 'roster'; participants: Participant[]; settings: RoomSettings; phase: Phase }
  | { t: 'ping'; c0: number }
  | { t: 'pong'; c0: number; h: number }
  | { t: 'shoot'; index: number; total: number; at: number; challenge: string | null; secret: boolean }
  | { t: 'photo'; index: number; data: ArrayBuffer }
  | { t: 'preview'; data: ArrayBuffer }
  | { t: 'final'; data: ArrayBuffer }
  | { t: 'reject'; reason: 'full' | 'busy' };

export const PEER_PREFIX = 'jepretbareng-v1-';
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Kode bilik 6 karakter tanpa huruf yang mirip (0/O, 1/I/L). */
export function makeCode(rand = Math.random): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  return s;
}

export function normalizeCode(input: string): string | null {
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length !== 6) return null;
  return [...s].every((ch) => ALPHABET.includes(ch)) ? s : null;
}

export function hostPeerId(code: string): string {
  return PEER_PREFIX + code.toLowerCase();
}

export function joinLink(code: string): string {
  const url = new URL(import.meta.env.BASE_URL, location.origin);
  url.searchParams.set('bilik', code);
  return url.href;
}
