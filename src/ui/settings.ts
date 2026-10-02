import { createStore } from './store';

export type Theme = 'auto' | 'light' | 'dark';

export interface Settings {
  sound: boolean;
  theme: Theme;
  /** Tantangan pose acak sebelum tiap jepretan (F-09). */
  challenges: boolean;
  countdown: 3 | 5 | 10;
  mirror: boolean;
  name: string;
}

export const settings = createStore<Settings>(
  { sound: true, theme: 'auto', challenges: true, countdown: 3, mirror: true, name: '' },
  'jepretbareng:settings',
);

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}
