import { ArtShutter, Sparkle } from '../icons';
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { fileName } from '../../compose/compose';
import { getFilter } from '../../compose/filters';
import { getFrame } from '../../compose/frames';
import { getLayout } from '../../compose/layouts';
import { Confetti, Header } from '../components';
import type { Outcome } from '../session';

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Bagikan lewat Web Share API (F-08); kembalikan false jika tidak didukung. */
async function shareBlob(blob: Blob, name: string): Promise<'shared' | 'cancelled' | 'unsupported'> {
  const file = new File([blob], name, { type: blob.type });
  if (!navigator.canShare?.({ files: [file] })) return 'unsupported';
  try {
    await navigator.share({ files: [file], title: 'Jepret Bareng', text: 'Strip foto dari #jepretbareng' });
    return 'shared';
  } catch (e) {
    return (e as DOMException).name === 'AbortError' ? 'cancelled' : 'unsupported';
  }
}

/** Layar hasil: bagikan, unduh PNG, unduh GIF (F-07, F-08, F-11). */
export function Result(props: { outcome: Outcome; onAgain: () => void; againLabel?: string; onHome?: () => void; extra?: ComponentChildren }) {
  const { blob, design, shots } = props.outcome;
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const [msg, setMsg] = useState('');
  const [gifBusy, setGifBusy] = useState(false);
  const name = useMemo(() => fileName('png'), [blob]);
  const canGif = shots.length > 1 && shots.every((s) => s?.length);

  const share = async () => {
    const r = await shareBlob(blob, name);
    if (r === 'unsupported') {
      downloadBlob(blob, name);
      setMsg('Browser ini belum bisa berbagi langsung, jadi strip diunduh. Kirim dari galeri ya!');
    }
  };

  const gif = async () => {
    setGifBusy(true);
    setMsg('');
    try {
      const { makeGif } = await import('../../compose/gif');
      const g = await makeGif({ layout: getLayout(design.layoutId), frame: getFrame(design.frameId), filter: getFilter(design.filterId), shots });
      downloadBlob(g, fileName('gif'));
    } catch {
      setMsg('GIF gagal dibuat. Coba lagi.');
    } finally {
      setGifBusy(false);
    }
  };

  return (
    <main class="screen result">
      <Confetti />
      <Header title="Strip Jadi!" onBack={props.onHome} right={<ArtShutter size={40} />} />
      <div class="result-img-wrap">
        <img class="result-img" src={url} alt="Strip foto hasil sesi" />
      </div>
      <div class="stack-sm">
        <button class="btn btn-big btn-primary" onClick={() => void share()}>
          Bagikan
        </button>
        <div class="row">
          <button class="btn grow" onClick={() => downloadBlob(blob, name)}>
            Unduh PNG
          </button>
          {canGif && (
            <button class="btn grow" onClick={() => void gif()} disabled={gifBusy}>
              {gifBusy ? 'Membuat GIF…' : 'Unduh GIF'}
            </button>
          )}
        </div>
        {msg && (
          <p class="note" role="status">
            {msg}
          </p>
        )}
        {props.extra}
        <button class="btn" onClick={props.onAgain}>
          {props.againLabel ?? 'Jepret Lagi'}
        </button>
        <p class="muted small center">Kapsul waktu: simpan strip ini, buka lagi tahun depan <Sparkle /></p>
      </div>
    </main>
  );
}
