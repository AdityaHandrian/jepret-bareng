import { createStore } from './store';

export type Theme = 'auto' | 'light' | 'dark';

export interface Settings {
  sound: boolean;
  theme: Theme;
  /** Tantangan pose acak sebelum tiap jepretan (F-09). */
  challenges: boolean;
  /** Detik hitung mundur, bebas 1–10. */
  countdown: number;
  mirror: boolean;
  name: string;
}

export const settings = createStore<Settings>(
  { sound: true, theme: 'auto', challenges: true, countdown: 3, mirror: true, name: '' },
  'jepretbareng:settings',
);

export const COUNTDOWN_MIN = 1;
export const COUNTDOWN_MAX = 10;

export function clampCountdown(n: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 3;
  return Math.min(COUNTDOWN_MAX, Math.max(COUNTDOWN_MIN, Math.round(v)));
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}
