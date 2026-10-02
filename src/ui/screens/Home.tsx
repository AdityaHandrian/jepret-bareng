import { useState } from 'preact/hooks';
import { normalizeCode } from '../../room/protocol';
import { settings, type Theme } from '../settings';
import { useStore } from '../store';

export function Home(props: {
  onSolo: () => void;
  onRemote: (mode: 'duo' | 'geng') => void;
  onJoin: (code: string) => void;
  onAbout: () => void;
}) {
  const s = useStore(settings);
  const [code, setCode] = useState('');
  const valid = normalizeCode(code);
  const nextTheme: Record<Theme, Theme> = { auto: 'dark', dark: 'light', light: 'auto' };
  const themeLabel: Record<Theme, string> = { auto: 'Tema: otomatis', dark: 'Tema: gelap', light: 'Tema: terang' };

  return (
    <main class="screen home">
      <div class="home-tools">
        <button
          class="icon-btn"
          onClick={() => settings.set({ sound: !s.sound })}
          aria-label={s.sound ? 'Matikan suara' : 'Nyalakan suara'}
          aria-pressed={s.sound}
        >
          {s.sound ? '🔊' : '🔇'}
        </button>
        <button class="icon-btn" onClick={() => settings.set({ theme: nextTheme[s.theme] })} aria-label={themeLabel[s.theme]}>
          {s.theme === 'dark' ? '🌙' : s.theme === 'light' ? '☀️' : '🌗'}
        </button>
      </div>

      <div class="logo" aria-label="Jepret Bareng">
        <span class="logo-cam" aria-hidden="true">
          📸
        </span>
        <span class="logo-text">
          Jepret <b>Bareng</b>
        </span>
      </div>
      <p class="tagline">Bilik foto yang kamu bawa ke mana saja. Gratis, tanpa daftar, foto tetap di HP-mu.</p>

      <div class="mode-cards">
        <button class="mode-card mode-solo" onClick={props.onSolo}>
          <span class="mode-emoji" aria-hidden="true">
            🤳
          </span>
          <span class="mode-title">Sendiri / Satu HP</span>
          <span class="mode-desc">Rame-rame di satu layar. Jalan juga tanpa internet.</span>
        </button>
        <button class="mode-card mode-duo" onClick={() => props.onRemote('duo')}>
          <span class="mode-emoji" aria-hidden="true">
            💞
          </span>
          <span class="mode-title">Berdua Jauh</span>
          <span class="mode-desc">Dua HP beda kota, satu strip bareng.</span>
        </button>
        <button class="mode-card mode-geng" onClick={() => props.onRemote('geng')}>
          <span class="mode-emoji" aria-hidden="true">
            🎉
          </span>
          <span class="mode-title">Bareng Geng</span>
          <span class="mode-desc">Sampai 4 orang dari mana saja, gabung pakai kode.</span>
        </button>
      </div>

      <form
        class="join-form card"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) props.onJoin(valid);
        }}
      >
        <label for="join-code">Punya kode bilik?</label>
        <div class="row">
          <input
            id="join-code"
            class="input code-input"
            value={code}
            maxLength={7}
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="ABC234"
            onInput={(e) => setCode((e.target as HTMLInputElement).value)}
          />
          <button class="btn" type="submit" disabled={!valid}>
            Gabung
          </button>
        </div>
      </form>

      <button class="link-btn" onClick={props.onAbout}>
        Tentang &amp; Privasi
      </button>
    </main>
  );
}
