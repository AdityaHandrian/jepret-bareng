import { CountdownPicker, Header, Toggle } from '../components';
import { FramePicker, LayoutPicker } from '../pickers';
import { settings } from '../settings';
import { useStore } from '../store';
import type { Design } from '../session';

/** Pemilih layout & frame (F-02, F-05). Semua punya nilai bawaan, jadi bisa langsung lanjut. */
export function Setup(props: { design: Design; onChange: (d: Design) => void; onNext: () => void; onBack: () => void }) {
  const s = useStore(settings);
  const d = props.design;
  return (
    <main class="screen">
      <Header title="Atur Bilik" onBack={props.onBack} />
      <div class="stack">
        <button class="btn btn-big btn-primary" onClick={props.onNext}>
          Buka Kamera
        </button>
        <section>
          <h2 class="section-title">Layout</h2>
          <LayoutPicker value={d.layoutId} onChange={(layoutId) => props.onChange({ ...d, layoutId })} />
        </section>
        <section>
          <h2 class="section-title">Frame</h2>
          <FramePicker value={d.frameId} onChange={(frameId) => props.onChange({ ...d, frameId })} />
        </section>
        <section class="card stack-sm">
          <CountdownPicker value={s.countdown} onChange={(countdown) => settings.set({ countdown })} />
          <Toggle
            label="Tantangan pose acak"
            hint="Perintah lucu muncul sebelum tiap jepretan"
            checked={s.challenges}
            onChange={(challenges) => settings.set({ challenges })}
          />
          <Toggle label="Suara cekrek" checked={s.sound} onChange={(sound) => settings.set({ sound })} />
        </section>
      </div>
    </main>
  );
}
