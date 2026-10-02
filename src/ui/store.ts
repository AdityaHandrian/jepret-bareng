import { useEffect, useState } from 'preact/hooks';

export interface Store<T> {
  readonly value: T;
  set(patch: Partial<T>): void;
  subscribe(fn: (v: T) => void): () => void;
}

export function createStore<T extends object>(initial: T, persistKey?: string): Store<T> {
  let value = initial;
  if (persistKey) {
    try {
      const raw = localStorage.getItem(persistKey);
      if (raw) value = { ...initial, ...JSON.parse(raw) };
    } catch {
      /* penyimpanan tidak tersedia; pakai bawaan */
    }
  }
  const subs = new Set<(v: T) => void>();
  return {
    get value() {
      return value;
    },
    set(patch) {
      value = { ...value, ...patch };
      if (persistKey) {
        try {
          localStorage.setItem(persistKey, JSON.stringify(value));
        } catch {
          /* abaikan */
        }
      }
      subs.forEach((fn) => fn(value));
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  const [v, setV] = useState(store.value);
  useEffect(() => store.subscribe(setV), [store]);
  return v;
}
