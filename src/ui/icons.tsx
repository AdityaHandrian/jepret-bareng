// Ikon SVG gambar sendiri (pengganti emoji). Warna mengikuti `currentColor`
// kecuali ilustrasi kartu mode yang punya palet sendiri.
import type { JSX } from 'preact';

type P = { size?: number; class?: string };

function Svg(props: P & { children: JSX.Element | JSX.Element[]; view?: string }) {
  const s = props.size ?? 24;
  return (
    <svg
      class={`icon ${props.class ?? ''}`}
      width={s}
      height={s}
      viewBox={props.view ?? '0 0 24 24'}
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {props.children}
    </svg>
  );
}

export const IconBack = (p: P) => (
  <Svg {...p}>
    <path d="M15 5l-7 7 7 7" stroke-width="2.6" />
  </Svg>
);

export const IconClose = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" stroke-width="2.6" />
  </Svg>
);

export const IconResize = (p: P) => (
  <Svg {...p}>
    <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
  </Svg>
);

export const IconUndo = (p: P) => (
  <Svg {...p}>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </Svg>
);

export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="2.8" />
  </Svg>
);

/** Jam pasir berputar: menandai "belum siap / menunggu". */
export const IconWaiting = (p: P) => (
  <Svg {...p} class={`spin-slow ${p.class ?? ''}`}>
    <path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" />
  </Svg>
);

export const IconSoundOn = (p: P) => (
  <Svg {...p}>
    <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" stroke-width="1.5" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
  </Svg>
);

export const IconSoundOff = (p: P) => (
  <Svg {...p}>
    <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" stroke-width="1.5" />
    <path d="M17 9.5l5 5M22 9.5l-5 5" />
  </Svg>
);

export const IconSun = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4.5" fill="currentColor" />
    <path d="M12 1.5v2.5M12 20v2.5M1.5 12H4M20 12h2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
  </Svg>
);

export const IconMoon = (p: P) => (
  <Svg {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="currentColor" />
  </Svg>
);

export const IconAuto = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
  </Svg>
);

export const IconSwitchCamera = (p: P) => (
  <Svg {...p}>
    <path d="M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M15.5 11.5a3.5 3.5 0 0 0-6.2-1.8M8.5 14.5a3.5 3.5 0 0 0 6.2 1.8" />
    <path d="M9 7.8v2h2M15 18.2v-2h-2" />
  </Svg>
);

export const IconMirror = (p: P) => (
  <Svg {...p}>
    <path d="M12 3v18" stroke-dasharray="2 2.5" />
    <path d="M9 7L4 17h5z" fill="currentColor" />
    <path d="M15 7l5 10h-5z" />
  </Svg>
);

/** Logo: kamera dengan lensa berkedip & lampu kilat. */
export function LogoCamera(p: P) {
  return (
    <svg class={`logo-cam ${p.class ?? ''}`} width={p.size ?? 52} height={p.size ?? 52} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="8" y="10" width="14" height="8" rx="3" fill="#2b1b22" />
      <rect x="4" y="16" width="56" height="40" rx="10" fill="#ff8fb1" stroke="#2b1b22" stroke-width="3" />
      <circle cx="32" cy="36" r="13" fill="#fff" stroke="#2b1b22" stroke-width="3" />
      <circle class="lens" cx="32" cy="36" r="7" fill="#2b1b22" />
      <circle cx="29" cy="33" r="2" fill="#fff" />
      <circle class="flashlight" cx="50" cy="24" r="3.5" fill="#ffd25e" />
    </svg>
  );
}

/** Ilustrasi kartu mode: HP + orang (Satu HP). */
export function ArtSolo() {
  return (
    <svg class="mode-art art-solo" width="56" height="56" viewBox="0 0 64 64" aria-hidden="true">
      <rect class="bob" x="18" y="6" width="28" height="52" rx="6" fill="#fff" stroke="#3a0f20" stroke-width="3" />
      <rect x="22" y="12" width="20" height="34" rx="3" fill="#ffd25e" />
      <circle cx="32" cy="25" r="5" fill="#3a0f20" />
      <path d="M24 42c1-6 15-6 16 0" fill="#3a0f20" />
      <circle cx="32" cy="52" r="2.5" fill="#3a0f20" />
      <path class="twinkle" d="M52 10l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff" />
    </svg>
  );
}

/** Ilustrasi kartu mode: dua hati berdenyut (Berdua Jauh). */
export function ArtDuo() {
  const heart = 'M0 6C0 2 3 0 6 0c2 0 3.5 1 4 2.5C10.5 1 12 0 14 0c3 0 6 2 6 6 0 6-10 12-10 12S0 12 0 6z';
  return (
    <svg class="mode-art art-duo" width="56" height="56" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M14 46q18 14 36-14" fill="none" stroke="#4a3300" stroke-width="2.5" stroke-dasharray="3 4" />
      <g transform="translate(4 30) scale(1.2)">
        <g class="beat">
          <path d={heart} fill="#ff6f9b" stroke="#4a3300" stroke-width="2" />
        </g>
      </g>
      <g transform="translate(36 8) scale(1.2)">
        <g class="beat beat-late">
          <path d={heart} fill="#ff6f9b" stroke="#4a3300" stroke-width="2" />
        </g>
      </g>
    </svg>
  );
}

/** Ilustrasi kartu mode: empat wajah + konfeti (Bareng Geng). */
export function ArtGeng() {
  const faces = [
    [20, 24, '#ff8fb1'],
    [44, 24, '#ffd25e'],
    [20, 46, '#8ec5ff'],
    [44, 46, '#fff'],
  ] as const;
  return (
    <svg class="mode-art art-geng" width="56" height="56" viewBox="0 0 64 64" aria-hidden="true">
      {faces.map(([x, y, c], i) => (
        <g key={i} class={`hop hop-${i}`}>
          <circle cx={x} cy={y} r="9" fill={c} stroke="#123b1d" stroke-width="2.5" />
          <circle cx={x - 3} cy={y - 1} r="1.4" fill="#123b1d" />
          <circle cx={x + 3} cy={y - 1} r="1.4" fill="#123b1d" />
          <path d={`M${x - 3.5} ${y + 3}q3.5 3 7 0`} stroke="#123b1d" stroke-width="1.8" fill="none" stroke-linecap="round" />
        </g>
      ))}
      <rect class="confetti-bit" x="30" y="4" width="4" height="7" rx="1" fill="#ff6f9b" />
      <rect class="confetti-bit c2" x="6" y="6" width="4" height="7" rx="1" fill="#2f80ff" />
      <rect class="confetti-bit c3" x="54" y="6" width="4" height="7" rx="1" fill="#ffb800" />
    </svg>
  );
}

/** Kamera kecil yang memotret (judul layar hasil). */
export function ArtShutter(p: P) {
  return (
    <svg class="art-shutter" width={p.size ?? 28} height={p.size ?? 28} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="4" y="16" width="56" height="40" rx="10" fill="#ffd25e" stroke="#2b1b22" stroke-width="3" />
      <circle cx="32" cy="36" r="12" fill="#fff" stroke="#2b1b22" stroke-width="3" />
      <circle cx="32" cy="36" r="6" fill="#2b1b22" />
      <path class="burst" d="M50 4l2 6M58 10l-6 2M44 6l2 4" stroke="#ff6f9b" stroke-width="3" stroke-linecap="round" />
    </svg>
  );
}

/** Kilau kecil berkedip. */
export function Sparkle(p: P) {
  return (
    <svg class="sparkle" width={p.size ?? 16} height={p.size ?? 16} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 1l2.8 8.2L23 12l-8.2 2.8L12 23l-2.8-8.2L1 12l8.2-2.8z" fill="#ffc83d" />
    </svg>
  );
}
