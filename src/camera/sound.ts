// Suara hitung mundur dan "cekrek" disintesis dengan Web Audio (tanpa file aset).
import { settings } from '../ui/settings';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (!settings.value.sound) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Panggil dari handler sentuhan agar iOS mengizinkan audio. */
export function unlockAudio(): void {
  audio();
}

export function beep(high = false): void {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = 'sine';
  osc.frequency.value = high ? 1320 : 880;
  gain.gain.setValueAtTime(0.0001, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.25, a.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.15);
  osc.connect(gain).connect(a.destination);
  osc.start();
  osc.stop(a.currentTime + 0.16);
}

export function shutter(): void {
  const a = audio();
  if (!a) return;
  const len = Math.floor(a.sampleRate * 0.12);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    // Dua klik pendek: "cek" + "rek".
    const t = i / len;
    const env = t < 0.35 ? Math.exp(-t * 40) : Math.exp(-(t - 0.35) * 30) * 0.8;
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const src = a.createBufferSource();
  src.buffer = buf;
  const gain = a.createGain();
  gain.gain.value = 0.5;
  src.connect(gain).connect(a.destination);
  src.start();
}
