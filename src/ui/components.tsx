import { IconBack } from './icons';
import { clampCountdown, COUNTDOWN_MAX, COUNTDOWN_MIN } from './settings';
import type { ComponentChildren, Ref } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { beep, shutter } from '../camera/sound';
import { openCamera, stopStream, CameraError, type Facing } from '../camera/camera';
import { now } from '../room/clock';
import { qrCanvas } from '../compose/qr';

export function Header(props: { title: string; onBack?: () => void; right?: ComponentChildren }) {
  return (
    <header class="topbar">
      {props.onBack ? (
        <button class="icon-btn" onClick={props.onBack} aria-label="Kembali">
          <IconBack />
        </button>
      ) : (
        <span class="icon-spacer" />
      )}
      <h1 class="topbar-title">{props.title}</h1>
      {props.right ?? <span class="icon-spacer" />}
    </header>
  );
}

export function Chips<T extends string | number>(props: {
  label: string;
  value: T;
  options: { value: T; label: string; swatch?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div class="chips" role="radiogroup" aria-label={props.label}>
      {props.options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={o.value === props.value}
          class={`chip ${o.value === props.value ? 'chip-on' : ''}`}
          onClick={() => props.onChange(o.value)}
        >
          {o.swatch && <span class="swatch" style={{ background: o.swatch }} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle(props: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label class="toggle">
      <input type="checkbox" checked={props.checked} onChange={(e) => props.onChange((e.target as HTMLInputElement).checked)} />
      <span class="toggle-track" aria-hidden="true" />
      <span>
        {props.label}
        {props.hint && <small class="muted block">{props.hint}</small>}
      </span>
    </label>
  );
}

export function useCamera(facing: Facing, enabled = true) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<CameraError | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let s: MediaStream | null = null;
    setError(null);
    openCamera(facing)
      .then((st) => {
        if (!alive) return stopStream(st);
        s = st;
        setStream(st);
        // Kamera bisa berhenti sendiri (dicabut, dipakai aplikasi lain, rusak): beri tahu, jangan layar hitam diam-diam.
        st.getVideoTracks()[0]?.addEventListener('ended', () => {
          if (alive) setError(new CameraError('Kamera berhenti mengirim gambar. Pastikan tidak dipakai aplikasi lain, lalu coba lagi.', 'busy'));
        });
      })
      .catch((e: CameraError) => alive && setError(e));
    return () => {
      alive = false;
      stopStream(s);
      setStream(null);
    };
  }, [facing, attempt, enabled]);
  return { stream, error, retry: () => setAttempt((a) => a + 1) };
}

export function VideoView(props: {
  stream: MediaStream | null;
  mirror?: boolean;
  filter?: string;
  aspect: number;
  videoRef?: Ref<HTMLVideoElement>;
  label?: string;
  muted?: boolean;
  children?: ComponentChildren;
  class?: string;
}) {
  const local = useRef<HTMLVideoElement>(null);
  const ref = (props.videoRef as { current: HTMLVideoElement | null }) ?? local;
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (v.srcObject !== props.stream) v.srcObject = props.stream;
    if (props.stream) void v.play().catch(() => undefined);
  }, [props.stream]);
  return (
    <div class={`video-box ${props.class ?? ''}`} style={{ aspectRatio: String(props.aspect) }}>
      <video
        ref={ref}
        playsInline
        autoPlay
        muted={props.muted ?? true}
        style={{ transform: props.mirror ? 'scaleX(-1)' : undefined, filter: props.filter }}
        aria-label={props.label ?? 'Pratinjau kamera'}
      />
      {props.children}
    </div>
  );
}

export function CameraErrorBox(props: { error: CameraError; onRetry: () => void }) {
  return (
    <div class="card error-card" role="alert">
      <p class="error-title">Kamera belum bisa dibuka</p>
      <p>{props.error.message}</p>
      <button class="btn" onClick={props.onRetry}>
        Coba lagi
      </button>
    </div>
  );
}

export interface Cue {
  localAt: number;
  index: number;
  total: number;
  challenge: string | null;
  secret?: boolean;
}

/** Hitung mundur besar + teks tantangan + kilat layar (F-03). Waktu dalam jam lokal. */
export function CountdownOverlay(props: { cue: Cue | null }) {
  const [, tick] = useState(0);
  const lastSec = useRef(-1);
  const flashed = useRef(false);
  useEffect(() => {
    lastSec.current = -1;
    flashed.current = false;
    if (!props.cue) return;
    let raf = 0;
    const loop = () => {
      tick((x) => x + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [props.cue]);

  const cue = props.cue;
  if (!cue) return null;
  const remaining = cue.localAt - now();
  const sec = Math.ceil(remaining / 1000);
  if (sec > 0 && sec !== lastSec.current) {
    lastSec.current = sec;
    if (sec <= 3) beep(sec === 1);
  }
  const flash = remaining <= 0;
  if (flash && !flashed.current) {
    flashed.current = true;
    shutter();
  }
  return (
    <div class="countdown" aria-live="assertive">
      {flash && <div class="flash" />}
      <div class="countdown-top">
        <span class="badge">
          Jepretan {cue.index + 1}/{cue.total}
        </span>
      </div>
      {!flash && sec > 0 && (
        <div class="countdown-num" key={sec}>
          {sec}
        </div>
      )}
      {cue.challenge && !flash && <div class={`challenge ${cue.secret ? 'challenge-secret' : ''}`}>{cue.challenge}</div>}
    </div>
  );
}

export function QrImage(props: { text: string; size?: number; label: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    setSrc(qrCanvas(props.text, (props.size ?? 180) * 2).toDataURL());
  }, [props.text]);
  return src ? <img class="qr" src={src} width={props.size ?? 180} height={props.size ?? 180} alt={props.label} /> : null;
}

/** Konfeti kecil saat strip jadi. */
export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    c.width = innerWidth;
    c.height = innerHeight;
    const colors = ['#ff8fb1', '#ffd25e', '#7ed492', '#8ec5ff', '#c9b6ff'];
    const parts = Array.from({ length: 120 }, () => ({
      x: Math.random() * c.width,
      y: -20 - Math.random() * c.height * 0.5,
      vx: (Math.random() - 0.5) * 2,
      vy: 2 + Math.random() * 3,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.color;
        ctx.fillRect(-5, -3, 10, 6);
        ctx.restore();
      }
      if (t - start < 3500) raf = requestAnimationFrame(loop);
      else ctx.clearRect(0, 0, c.width, c.height);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} class="confetti" aria-hidden="true" />;
}

export function Spinner(props: { label: string }) {
  return (
    <div class="spinner-wrap" role="status">
      <div class="spinner" aria-hidden="true" />
      <span>{props.label}</span>
    </div>
  );
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Pengatur hitung mundur bebas 1–10 detik. */
export function CountdownPicker(props: { value: number; onChange: (n: number) => void }) {
  const v = clampCountdown(props.value);
  const set = (n: number) => props.onChange(clampCountdown(n));
  return (
    <div class="countdown-picker">
      <div class="row">
        <span class="grow">Hitung mundur</span>
        <output class="countdown-value" aria-live="polite">
          {v} detik
        </output>
      </div>
      <div class="row">
        <button class="icon-btn" onClick={() => set(v - 1)} disabled={v <= COUNTDOWN_MIN} aria-label="Kurangi satu detik">
          −
        </button>
        <input
          class="grow"
          type="range"
          min={COUNTDOWN_MIN}
          max={COUNTDOWN_MAX}
          step={1}
          value={v}
          aria-label="Lama hitung mundur dalam detik"
          onInput={(e) => set(Number((e.target as HTMLInputElement).value))}
        />
        <button class="icon-btn" onClick={() => set(v + 1)} disabled={v >= COUNTDOWN_MAX} aria-label="Tambah satu detik">
          +
        </button>
      </div>
    </div>
  );
}
