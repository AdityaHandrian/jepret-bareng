import type { FunctionComponent } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { Photo } from '../compose/compose';
import type { RoomMode } from '../room/protocol';
import { normalizeCode } from '../room/protocol';
import { Spinner } from './components';
import { About } from './screens/About';
import { Booth } from './screens/Booth';
import { Editor } from './screens/Editor';
import { Home } from './screens/Home';
import { Result } from './screens/Result';
import { Setup } from './screens/Setup';
import { defaultDesign, type Design, type Outcome } from './session';
import { applyTheme, settings } from './settings';
import { useStore } from './store';

type Screen =
  | { name: 'home' }
  | { name: 'about' }
  | { name: 'setup' }
  | { name: 'booth' }
  | { name: 'editor' }
  | { name: 'result'; outcome: Outcome }
  | { name: 'remote'; mode: RoomMode; joinCode?: string };

type RemoteProps = { mode: RoomMode; joinCode?: string; onHome: () => void };

/** Mode jarak jauh dimuat terpisah agar Mode Satu Layar tetap ringan & offline. */
function LazyRemote(props: RemoteProps) {
  const [Comp, setComp] = useState<FunctionComponent<RemoteProps> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    import('./screens/Remote').then((m) => setComp(() => m.Remote)).catch(() => setFailed(true));
  }, []);
  if (failed) {
    return (
      <main class="screen">
        <div class="card error-card" role="alert">
          <p class="error-title">Mode jarak jauh butuh internet</p>
          <p>Sambungkan ke internet lalu coba lagi. Mode Satu Layar tetap bisa dipakai offline.</p>
          <button class="btn" onClick={props.onHome}>
            Kembali
          </button>
        </div>
      </main>
    );
  }
  return Comp ? <Comp {...props} /> : <Spinner label="Memuat bilik…" />;
}

function initialScreen(): Screen {
  const code = normalizeCode(new URLSearchParams(location.search).get('bilik') ?? '');
  return code ? { name: 'remote', mode: 'geng', joinCode: code } : { name: 'home' };
}

export function App() {
  const s = useStore(settings);
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [design, setDesign] = useState<Design>(defaultDesign);
  const [shots, setShots] = useState<Photo[][]>([]);

  useEffect(() => applyTheme(s.theme), [s.theme]);
  useEffect(() => window.scrollTo(0, 0), [screen.name]);

  const home = () => {
    // Hapus ?bilik= dari URL agar muat ulang tidak bergabung lagi.
    if (location.search) history.replaceState(null, '', location.pathname);
    setScreen({ name: 'home' });
  };

  switch (screen.name) {
    case 'home':
      return (
        <Home
          onSolo={() => {
            setShots([]);
            setDesign((d) => ({ ...d, caption: '', deco: { stickers: [], strokes: [] } }));
            setScreen({ name: 'setup' });
          }}
          onRemote={(mode) => setScreen({ name: 'remote', mode })}
          onJoin={(joinCode) => setScreen({ name: 'remote', mode: 'geng', joinCode })}
          onAbout={() => setScreen({ name: 'about' })}
        />
      );
    case 'about':
      return <About onBack={home} />;
    case 'setup':
      return <Setup design={design} onChange={setDesign} onBack={home} onNext={() => setScreen({ name: 'booth' })} />;
    case 'booth':
      return (
        <Booth
          design={design}
          shots={shots}
          onChangeDesign={setDesign}
          onBack={() => setScreen({ name: 'setup' })}
          onDone={(s) => {
            setShots(s);
            setScreen({ name: 'editor' });
          }}
        />
      );
    case 'editor':
      return (
        <Editor
          design={design}
          shots={shots}
          onChange={setDesign}
          onBack={() => setScreen({ name: 'booth' })}
          onDone={(blob) => setScreen({ name: 'result', outcome: { blob, design, shots } })}
        />
      );
    case 'result':
      return (
        <Result
          outcome={screen.outcome}
          onHome={home}
          onAgain={() => {
            setShots([]);
            setDesign((d) => ({ ...d, caption: '', deco: { stickers: [], strokes: [] } }));
            setScreen({ name: 'booth' });
          }}
        />
      );
    case 'remote':
      return <LazyRemote mode={screen.mode} joinCode={screen.joinCode} onHome={home} />;
  }
}
