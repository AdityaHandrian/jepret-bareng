import { useEffect, useRef, useState } from 'preact/hooks';
import { canvasToBlob, composeBase, composeFinal, type Photo } from '../../compose/compose';
import { getFilter } from '../../compose/filters';
import { getFrame } from '../../compose/frames';
import { getLayout } from '../../compose/layouts';
import { drawStrokes, INK_COLORS, STICKERS, type Decorations, type StickerItem } from '../../editor/model';
import { Header, Spinner, Toggle } from '../components';
import { FilterPicker, FramePicker } from '../pickers';
import type { Design } from '../session';

type Tab = 'filter' | 'frame' | 'stiker' | 'coret' | 'teks';
const TABS: { id: Tab; label: string }[] = [
  { id: 'filter', label: 'Filter' },
  { id: 'frame', label: 'Frame' },
  { id: 'stiker', label: 'Stiker' },
  { id: 'coret', label: 'Coret' },
  { id: 'teks', label: 'Teks' },
];

let stickerKey = 1;

/** Editor strip: filter, frame, stiker (geser/perbesar/putar/hapus), coretan, caption (F-05, F-06, F-10). */
export function Editor(props: {
  design: Design;
  shots: Photo[][];
  onChange: (d: Design) => void;
  onDone: (blob: Blob, finalCanvas: HTMLCanvasElement) => void;
  onBack?: () => void;
  backLabel?: string;
  /** Dipanggil saat tampilan berubah; mode bilik memakainya untuk pratinjau tamu. */
  onPreview?: (canvas: HTMLCanvasElement) => void;
}) {
  const d = props.design;
  const layout = getLayout(d.layoutId);
  const W = layout.width;
  const H = layout.height;
  const [tab, setTab] = useState<Tab>('stiker');
  const [base, setBase] = useState<HTMLCanvasElement | null>(null);
  const [history, setHistory] = useState<Decorations[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [ink, setInk] = useState({ color: INK_COLORS[0], width: 14 });
  const [saving, setSaving] = useState(false);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drawing = useRef<{ color: string; width: number; points: [number, number][] } | null>(null);
  const deco = d.deco;

  // Komposisi dasar dihitung ulang (ditunda sejenak) saat filter/frame/teks berubah.
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const c = await composeBase({
        layout,
        frame: getFrame(d.frameId),
        filter: getFilter(d.filterId),
        shots: props.shots,
        caption: d.caption,
        showDate: d.showDate,
      });
      if (alive) setBase(c);
    }, 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [d.layoutId, d.frameId, d.filterId, d.caption, d.showDate, props.shots]);

  useEffect(() => {
    if (!base || !baseRef.current) return;
    baseRef.current.getContext('2d')!.drawImage(base, 0, 0);
  }, [base]);

  useEffect(() => {
    const c = inkRef.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    drawStrokes(ctx, deco.strokes);
  }, [deco.strokes, W, H]);

  useEffect(() => {
    if (!props.onPreview || !base) return;
    void composeFinal(base, deco).then(props.onPreview);
  }, [base, deco]);

  const setDeco = (next: Decorations, record = true) => {
    if (record) setHistory((h) => [...h.slice(-30), deco]);
    props.onChange({ ...d, deco: next });
  };
  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory(history.slice(0, -1));
    setSelected(null);
    props.onChange({ ...d, deco: prev });
  };

  /** Rasio piksel kanvas per piksel layar. */
  const scale = () => W / (stageRef.current?.getBoundingClientRect().width || W);
  const toCanvas = (e: PointerEvent): [number, number] => {
    const r = stageRef.current!.getBoundingClientRect();
    return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height];
  };

  const addSticker = (src: string) => {
    const item: StickerItem = { key: stickerKey++, src, x: W / 2, y: layout.slots[0].y + layout.slots[0].h / 2, size: W * 0.35, rot: 0 };
    setDeco({ ...deco, stickers: [...deco.stickers, item] });
    setSelected(item.key);
  };
  const updateSticker = (key: number, patch: Partial<StickerItem>, record = false) =>
    setDeco({ ...deco, stickers: deco.stickers.map((s) => (s.key === key ? { ...s, ...patch } : s)) }, record);

  // Geser stiker.
  const onStickerDown = (e: PointerEvent, s: StickerItem) => {
    if (tab === 'coret') return;
    e.stopPropagation();
    setSelected(s.key);
    setHistory((h) => [...h.slice(-30), deco]);
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const k = scale();
    const start = { x: e.clientX, y: e.clientY, sx: s.x, sy: s.y };
    const move = (ev: PointerEvent) =>
      updateSticker(s.key, { x: start.sx + (ev.clientX - start.x) * k, y: start.sy + (ev.clientY - start.y) * k });
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };

  // Gagang pojok: perbesar + putar sekaligus.
  const onHandleDown = (e: PointerEvent, s: StickerItem) => {
    e.stopPropagation();
    setHistory((h) => [...h.slice(-30), deco]);
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const r = stageRef.current!.getBoundingClientRect();
    const k = scale();
    const cx = r.left + s.x / k;
    const cy = r.top + s.y / k;
    const d0 = Math.hypot(e.clientX - cx, e.clientY - cy) || 1;
    const a0 = Math.atan2(e.clientY - cy, e.clientX - cx);
    const move = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - cx, ev.clientY - cy);
      const ang = Math.atan2(ev.clientY - cy, ev.clientX - cx);
      updateSticker(s.key, { size: Math.max(60, Math.min(W * 1.5, (s.size * dist) / d0)), rot: s.rot + ang - a0 });
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };

  // Coretan bebas.
  const onInkDown = (e: PointerEvent) => {
    if (tab !== 'coret') {
      setSelected(null);
      return;
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drawing.current = { color: ink.color, width: ink.width * 2, points: [toCanvas(e)] };
  };
  const onInkMove = (e: PointerEvent) => {
    const st = drawing.current;
    if (!st) return;
    st.points.push(toCanvas(e));
    const ctx = inkRef.current!.getContext('2d')!;
    drawStrokes(ctx, [{ ...st, points: st.points.slice(-2) }]);
  };
  const onInkUp = () => {
    const st = drawing.current;
    drawing.current = null;
    if (st) setDeco({ ...deco, strokes: [...deco.strokes, st] });
  };

  const finish = async () => {
    if (!base) return;
    setSaving(true);
    try {
      const final = await composeFinal(base, deco);
      props.onDone(await canvasToBlob(final), final);
    } finally {
      setSaving(false);
    }
  };

  const sel = deco.stickers.find((s) => s.key === selected) ?? null;

  return (
    <main class="screen editor">
      <Header
        title="Hias Strip"
        onBack={props.onBack}
        right={
          <button class="icon-btn" onClick={undo} disabled={!history.length} aria-label="Batalkan (undo)">
            ↶
          </button>
        }
      />
      <div class="editor-stage-wrap">
        <div
          ref={stageRef}
          class={`editor-stage ${tab === 'coret' ? 'is-drawing' : ''}`}
          style={{ aspectRatio: `${W} / ${H}`, width: `min(100%, calc(var(--stage-h) * ${W / H}))` }}
        >
          <canvas ref={baseRef} width={W} height={H} class="layer" aria-label="Pratinjau strip foto" role="img" />
          {!base && <Spinner label="Menyusun strip…" />}
          <canvas
            ref={inkRef}
            width={W}
            height={H}
            class="layer ink-layer"
            onPointerDown={onInkDown}
            onPointerMove={onInkMove}
            onPointerUp={onInkUp}
            onPointerCancel={onInkUp}
            aria-hidden="true"
          />
          {deco.stickers.map((s) => (
            <div
              key={s.key}
              class={`sticker ${s.key === selected ? 'sticker-on' : ''}`}
              style={{
                left: `${(s.x / W) * 100}%`,
                top: `${(s.y / H) * 100}%`,
                width: `${(s.size / W) * 100}%`,
                transform: `translate(-50%, -50%) rotate(${s.rot}rad)`,
                pointerEvents: tab === 'coret' ? 'none' : undefined,
              }}
              onPointerDown={(e) => onStickerDown(e as unknown as PointerEvent, s)}
            >
              <img src={import.meta.env.BASE_URL + s.src} alt="" draggable={false} />
              {s.key === selected && tab !== 'coret' && (
                <>
                  <button
                    class="sticker-del"
                    aria-label="Hapus stiker"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      setDeco({ ...deco, stickers: deco.stickers.filter((x) => x.key !== s.key) });
                      setSelected(null);
                    }}
                  >
                    ×
                  </button>
                  <span class="sticker-handle" aria-hidden="true" onPointerDown={(e) => onHandleDown(e as unknown as PointerEvent, s)}>
                    ⤡
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div class="editor-panel">
        <div class="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} class={`tab ${tab === t.id ? 'tab-on' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div class="tab-body" role="tabpanel">
          {tab === 'filter' && <FilterPicker value={d.filterId} onChange={(filterId) => props.onChange({ ...d, filterId })} />}
          {tab === 'frame' && <FramePicker value={d.frameId} onChange={(frameId) => props.onChange({ ...d, frameId })} />}
          {tab === 'stiker' && (
            <div class="stack-sm">
              <div class="scroller">
                {STICKERS.map((s) => (
                  <button key={s.src} class="sticker-pick" onClick={() => addSticker(s.src)} aria-label={`Tambah stiker ${s.label}`}>
                    <img src={import.meta.env.BASE_URL + s.src} alt="" />
                  </button>
                ))}
              </div>
              {sel && (
                <div class="row wrap">
                  <button class="btn btn-small" onClick={() => updateSticker(sel.key, { size: Math.min(W * 1.5, sel.size * 1.2) }, true)}>
                    Perbesar
                  </button>
                  <button class="btn btn-small" onClick={() => updateSticker(sel.key, { size: Math.max(60, sel.size / 1.2) }, true)}>
                    Perkecil
                  </button>
                  <button class="btn btn-small" onClick={() => updateSticker(sel.key, { rot: sel.rot + Math.PI / 12 }, true)}>
                    Putar
                  </button>
                  <button
                    class="btn btn-small btn-danger"
                    onClick={() => {
                      setDeco({ ...deco, stickers: deco.stickers.filter((x) => x.key !== sel.key) });
                      setSelected(null);
                    }}
                  >
                    Hapus
                  </button>
                </div>
              )}
              {!sel && <p class="muted small">Ketuk stiker untuk menempel. Geser untuk memindah, tarik ⤡ untuk perbesar/putar.</p>}
            </div>
          )}
          {tab === 'coret' && (
            <div class="stack-sm">
              <div class="row wrap" role="radiogroup" aria-label="Warna coretan">
                {INK_COLORS.map((c) => (
                  <button
                    key={c}
                    role="radio"
                    aria-checked={ink.color === c}
                    aria-label={`Warna ${c}`}
                    class={`color-dot ${ink.color === c ? 'color-on' : ''}`}
                    style={{ background: c }}
                    onClick={() => setInk({ ...ink, color: c })}
                  />
                ))}
              </div>
              <label class="row">
                <span>Tebal</span>
                <input
                  type="range"
                  min={4}
                  max={40}
                  value={ink.width}
                  onInput={(e) => setInk({ ...ink, width: Number((e.target as HTMLInputElement).value) })}
                  class="grow"
                />
              </label>
              <button class="btn btn-small" disabled={!deco.strokes.length} onClick={() => setDeco({ ...deco, strokes: [] })}>
                Hapus semua coretan
              </button>
            </div>
          )}
          {tab === 'teks' && (
            <div class="stack-sm">
              <label for="caption">Caption</label>
              <input
                id="caption"
                class="input"
                maxLength={40}
                value={d.caption}
                placeholder="contoh: Anniv ke-2 💞"
                onInput={(e) => props.onChange({ ...d, caption: (e.target as HTMLInputElement).value })}
              />
              <Toggle label="Tampilkan tanggal" checked={d.showDate} onChange={(showDate) => props.onChange({ ...d, showDate })} />
            </div>
          )}
        </div>
        <button class="btn btn-big btn-primary" onClick={() => void finish()} disabled={!base || saving}>
          {saving ? 'Menyimpan…' : 'Selesai'}
        </button>
      </div>
    </main>
  );
}
