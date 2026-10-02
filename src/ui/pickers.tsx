import { LAYOUTS, type LayoutId } from '../compose/layouts';
import { CUSTOM_FRAME_ID, customFrame, FRAMES, PATTERNS, setCustomFrame, type Frame } from '../compose/frames';
import { useStore } from './store';
import { FILTERS, filterCss } from '../compose/filters';

export function LayoutPicker(props: { value: LayoutId; onChange: (id: LayoutId) => void }) {
  return (
    <div class="scroller" role="radiogroup" aria-label="Pilih layout">
      {LAYOUTS.map((l) => {
        const scale = Math.min(64 / l.width, 96 / l.height);
        return (
          <button
            key={l.id}
            role="radio"
            aria-checked={l.id === props.value}
            class={`pick-card ${l.id === props.value ? 'pick-on' : ''}`}
            onClick={() => props.onChange(l.id)}
          >
            <span class="layout-mini" style={{ width: `${l.width * scale}px`, height: `${l.height * scale}px` }}>
              {l.slots.map((s, i) => (
                <span
                  key={i}
                  style={{
                    left: `${s.x * scale}px`,
                    top: `${s.y * scale}px`,
                    width: `${s.w * scale}px`,
                    height: `${s.h * scale}px`,
                  }}
                />
              ))}
            </span>
            <span class="pick-label">{l.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function swatchStyle(f: Frame) {
  return { background: f.bg2 ? `linear-gradient(135deg, ${f.bg}, ${f.bg2})` : f.bg, borderColor: f.accent, color: f.fg };
}

/** Frame bebas: pilih warna latar/pola/teks dan pola sendiri. */
function CustomFrameEditor() {
  const f = useStore(customFrame);
  const color = (label: string, value: string, onChange: (v: string) => void) => (
    <label class="color-field">
      <input type="color" value={value} onInput={(e) => onChange((e.target as HTMLInputElement).value)} />
      <span>{label}</span>
    </label>
  );
  return (
    <div class="custom-frame card stack-sm">
      <div class="row wrap">
        {color('Latar', f.bg, (bg) => setCustomFrame({ bg }))}
        {f.bg2 !== undefined && color('Latar 2', f.bg2, (bg2) => setCustomFrame({ bg2 }))}
        {color('Pola', f.accent, (accent) => setCustomFrame({ accent }))}
        {color('Teks', f.fg, (fg) => setCustomFrame({ fg }))}
      </div>
      <label class="toggle">
        <input
          type="checkbox"
          checked={f.bg2 !== undefined}
          onChange={(e) => setCustomFrame({ bg2: (e.target as HTMLInputElement).checked ? '#ffd6e0' : undefined })}
        />
        <span class="toggle-track" aria-hidden="true" />
        <span>Gradasi dua warna</span>
      </label>
      <div class="chips" role="radiogroup" aria-label="Pola frame">
        {PATTERNS.map((pt) => (
          <button
            key={pt.id}
            role="radio"
            aria-checked={f.pattern === pt.id}
            class={`chip ${f.pattern === pt.id ? 'chip-on' : ''}`}
            onClick={() => setCustomFrame({ pattern: pt.id })}
          >
            {pt.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FramePicker(props: { value: string; onChange: (id: string) => void }) {
  const cats = [...new Set(FRAMES.map((f) => f.category))];
  const custom = useStore(customFrame);
  const customOn = props.value === CUSTOM_FRAME_ID;
  return (
    <div class="frame-picker">
      <p class="mini-heading">Bebas</p>
      <div class="scroller" role="radiogroup" aria-label="Frame bebas">
        <button role="radio" aria-checked={customOn} class={`pick-card ${customOn ? 'pick-on' : ''}`} onClick={() => props.onChange(CUSTOM_FRAME_ID)}>
          <span class="frame-swatch frame-swatch-custom" style={swatchStyle(custom)}>
            Aa
          </span>
          <span class="pick-label">Warna sendiri</span>
        </button>
      </div>
      {customOn && <CustomFrameEditor />}
      {cats.map((cat) => (
        <div key={cat}>
          <p class="mini-heading">{cat}</p>
          <div class="scroller" role="radiogroup" aria-label={`Frame ${cat}`}>
            {FRAMES.filter((f) => f.category === cat).map((f) => (
              <button
                key={f.id}
                role="radio"
                aria-checked={f.id === props.value}
                class={`pick-card ${f.id === props.value ? 'pick-on' : ''}`}
                onClick={() => props.onChange(f.id)}
              >
                <span
                  class="frame-swatch"
                  style={{
                    background: f.bg2 ? `linear-gradient(135deg, ${f.bg}, ${f.bg2})` : f.bg,
                    borderColor: f.accent,
                    color: f.fg,
                  }}
                >
                  Aa
                </span>
                <span class="pick-label">{f.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FilterPicker(props: { value: string; onChange: (id: string) => void; thumb?: string }) {
  return (
    <div class="scroller" role="radiogroup" aria-label="Pilih filter">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          role="radio"
          aria-checked={f.id === props.value}
          class={`pick-card ${f.id === props.value ? 'pick-on' : ''}`}
          onClick={() => props.onChange(f.id)}
        >
          {props.thumb ? (
            <img class="filter-thumb" src={props.thumb} alt="" style={{ filter: filterCss(f) }} />
          ) : (
            <span class="filter-thumb filter-dot" style={{ filter: filterCss(f) }} />
          )}
          <span class="pick-label">{f.name}</span>
        </button>
      ))}
    </div>
  );
}
