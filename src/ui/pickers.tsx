import { LAYOUTS, type LayoutId } from '../compose/layouts';
import { FRAMES } from '../compose/frames';
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

export function FramePicker(props: { value: string; onChange: (id: string) => void }) {
  const cats = [...new Set(FRAMES.map((f) => f.category))];
  return (
    <div class="frame-picker">
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
