// Mode jarak jauh: Berdua Jauh & Bareng Geng (F-13 s.d. F-19).
// Modul ini (beserta PeerJS) hanya dimuat saat mode jarak jauh dibuka.
import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { captureFrame } from '../../camera/camera';
import { unlockAudio } from '../../camera/sound';
import { filterCss, getFilter } from '../../compose/filters';
import { getFrame } from '../../compose/frames';
import { cellAspect, getLayout } from '../../compose/layouts';
import { Room, type RoomState } from '../../room/room';
import { joinLink, MAX_PARTICIPANTS, normalizeCode, type RoomMode, type RoomSettings } from '../../room/protocol';
import { CameraErrorBox, Chips, CountdownOverlay, Header, QrImage, Spinner, Toggle, useCamera, VideoView } from '../components';
import { FramePicker, LayoutPicker } from '../pickers';
import { settings } from '../settings';
import { useStore } from '../store';
import { ShotThumb } from '../ShotThumb';
import { defaultDesign, type Design } from '../session';
import { Editor } from './Editor';
import { Result } from './Result';

const MODE_TITLE: Record<RoomMode, string> = { duo: 'Berdua Jauh', geng: 'Bareng Geng' };

export function Remote(props: { mode: RoomMode; joinCode?: string; onHome: () => void }) {
  const s = useStore(settings);
  const cam = useCamera('user');
  const [room, setRoom] = useState<Room | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(s.name);
  const [code, setCode] = useState(props.joinCode ?? '');
  const [design, setDesign] = useState<Design>(defaultDesign);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mirror = s.mirror;

  useEffect(() => () => room?.leave(), [room]);
  useEffect(() => room?.setLocalStream(cam.stream), [room, cam.stream]);
  useEffect(() => {
    room?.setCapture(() => (videoRef.current ? captureFrame(videoRef.current, mirror) : null));
  }, [room, mirror]);

  const create = async () => {
    unlockAudio();
    setBusy(true);
    setError(null);
    settings.set({ name });
    const rs: RoomSettings = {
      mode: props.mode,
      layoutId: design.layoutId,
      frameId: design.frameId,
      filterId: design.filterId,
      countdown: s.countdown,
      challenges: s.challenges,
      oddOneOut: false,
    };
    try {
      setRoom(await Room.host(rs, name.trim(), cam.stream));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    const c = normalizeCode(code);
    if (!c) return setError('Kode bilik terdiri dari 6 huruf/angka.');
    unlockAudio();
    setBusy(true);
    setError(null);
    settings.set({ name });
    try {
      setRoom(await Room.join(c, name.trim() || 'Teman', cam.stream));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!room) {
    const joining = !!props.joinCode;
    return (
      <main class="screen">
        <Header title={joining ? 'Gabung Bilik' : MODE_TITLE[props.mode]} onBack={props.onHome} />
        <div class="stack">
          {cam.error ? (
            <CameraErrorBox error={cam.error} onRetry={cam.retry} />
          ) : (
            <VideoView stream={cam.stream} mirror={mirror} aspect={3 / 4} class="intro-video">
              {!cam.stream && <Spinner label="Menyiapkan kamera…" />}
            </VideoView>
          )}
          <div class="card stack-sm">
            <label for="name">Nama kamu</label>
            <input
              id="name"
              class="input"
              maxLength={24}
              value={name}
              placeholder="contoh: Nadia"
              onInput={(e) => setName((e.target as HTMLInputElement).value)}
            />
            {!joining && (
              <button class="btn btn-big btn-primary" disabled={busy || !cam.stream} onClick={() => void create()}>
                {busy ? 'Membuat bilik…' : 'Buat Bilik'}
              </button>
            )}
          </div>
          <div class="card stack-sm">
            <label for="code">{joining ? 'Kode bilik' : 'Atau gabung ke bilik teman'}</label>
            <div class="row">
              <input
                id="code"
                class="input code-input"
                maxLength={7}
                autoCapitalize="characters"
                autoComplete="off"
                value={code}
                placeholder="ABC234"
                onInput={(e) => setCode((e.target as HTMLInputElement).value)}
              />
              <button class={`btn ${joining ? 'btn-primary' : ''}`} disabled={busy || !cam.stream || !normalizeCode(code)} onClick={() => void join()}>
                {busy && joining ? 'Menghubungkan…' : 'Gabung'}
              </button>
            </div>
          </div>
          {error && (
            <p class="note note-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <RoomView
      room={room}
      design={design}
      setDesign={setDesign}
      localStream={cam.stream}
      videoRef={videoRef}
      mirror={mirror}
      onLeave={() => {
        room.leave();
        props.onHome();
      }}
    />
  );
}

function RoomView(props: {
  room: Room;
  design: Design;
  setDesign: (d: Design) => void;
  localStream: MediaStream | null;
  videoRef: { current: HTMLVideoElement | null };
  mirror: boolean;
  onLeave: () => void;
}) {
  const { room, design } = props;
  const st = useStore(room.state);
  const host = st.role === 'host';
  const layout = getLayout(st.settings.layoutId);
  const title = MODE_TITLE[st.settings.mode];

  // Guest: ikuti layout/frame/filter host untuk pratinjau dan hasil.
  useEffect(() => {
    if (!host) props.setDesign({ ...design, layoutId: st.settings.layoutId, frameId: st.settings.frameId, filterId: st.settings.filterId });
  }, [st.settings]);

  const setDesign = (d: Design) => {
    props.setDesign(d);
    if (host && (d.layoutId !== design.layoutId || d.frameId !== design.frameId || d.filterId !== design.filterId)) {
      room.updateSettings({ layoutId: d.layoutId, frameId: d.frameId, filterId: d.filterId });
    }
  };

  if (st.error) {
    return (
      <main class="screen">
        <Header title={title} onBack={props.onLeave} />
        <div class="card error-card" role="alert">
          <p class="error-title">Ups!</p>
          <p>{st.error}</p>
          <button class="btn" onClick={props.onLeave}>
            Kembali ke beranda
          </button>
        </div>
      </main>
    );
  }

  if (st.phase === 'done' && st.finalBlob) {
    return (
      <Result
        outcome={{ blob: st.finalBlob, design, shots: host ? st.shots : [] }}
        onHome={props.onLeave}
        onAgain={host ? () => room.backToLobby() : props.onLeave}
        againLabel={host ? 'Sesi baru di bilik ini' : 'Keluar dari bilik'}
        extra={!host && <p class="muted small center">Tetap di sini kalau host mau mulai sesi baru.</p>}
      />
    );
  }

  if (st.phase === 'editing' && host) {
    return (
      <Editor
        design={design}
        shots={st.shots}
        onChange={setDesign}
        onPreview={(c) => room.sendPreview(c)}
        onBack={() => room.goToPhase('review')}
        onDone={(blob) => void room.sendFinal(blob)}
      />
    );
  }

  const grid = (
    <VideoGrid st={st} localStream={props.localStream} videoRef={props.videoRef} mirror={props.mirror} filterId={design.filterId}>
      <CountdownOverlay cue={st.cue} />
    </VideoGrid>
  );

  return (
    <main class="screen">
      <Header title={title} onBack={st.phase === 'shooting' ? undefined : props.onLeave} />
      <div class="stack">
        {st.phase === 'lobby' && <Lobby room={room} st={st} design={design} setDesign={setDesign} grid={grid} />}

        {st.phase === 'shooting' && (
          <>
            {grid}
            {!st.cue && host && st.waitingFor.length > 0 && (
              <Spinner label={`Menunggu foto dari ${st.waitingFor.join(', ')}…`} />
            )}
            {!st.cue && !host && <Spinner label="Mengirim foto ke host…" />}
          </>
        )}

        {st.phase === 'review' && host && (
          <>
            <p class="muted">Cek hasilnya. Jepretan yang kurang pas bisa diulang bareng-bareng.</p>
            <div class={`review-grid review-${layout.shots}`}>
              {st.shots.map((photos, i) => (
                <div key={i} class="review-item">
                  <ShotThumb photos={photos} layout={layout} frameId={design.frameId} filterId={design.filterId} label={`Jepretan ${i + 1}`} />
                  <button class="btn btn-small" onClick={() => void room.retake(i)}>
                    Ulang #{i + 1}
                  </button>
                </div>
              ))}
            </div>
            <button class="btn btn-big btn-primary" onClick={() => room.goToPhase('editing')}>
              Lanjut Hias
            </button>
          </>
        )}

        {st.phase === 'review' && !host && <Spinner label="Host sedang mengecek hasil jepretan…" />}

        {st.phase === 'editing' && !host && (
          <>
            <p class="muted center">Host sedang menghias strip. Pratinjau langsung:</p>
            {st.previewUrl ? (
              <div class="result-img-wrap">
                <img class="result-img" src={st.previewUrl} alt="Pratinjau strip dari host" />
              </div>
            ) : (
              <Spinner label="Menunggu pratinjau…" />
            )}
          </>
        )}

        {st.phase === 'done' && !st.finalBlob && <Spinner label="Menerima strip akhir…" />}

        <p class="muted small center">{layout.name} · Frame {getFrame(st.settings.frameId).name}</p>
      </div>
    </main>
  );
}

function Lobby(props: { room: Room; st: RoomState; design: Design; setDesign: (d: Design) => void; grid: JSX.Element }) {
  const { room, st, design } = props;
  const host = st.role === 'host';
  const link = joinLink(st.code);
  const [copied, setCopied] = useState(false);
  const max = MAX_PARTICIPANTS[st.settings.mode];
  const me = st.participants.find((p) => p.id === st.selfId);
  const everyoneReady = st.participants.length >= 2 && st.participants.every((p) => p.ready);
  const waText = encodeURIComponent(`Yuk jepret bareng! 📸 Buka link ini lalu izinkan kamera:\n${link}\nKode bilik: ${st.code}`);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('Salin link ini:', link);
    }
  };

  return (
    <>
      <section class="card room-code-card">
        <div class="room-code-text">
          <span class="muted small">Kode bilik</span>
          <span class="room-code" aria-label={`Kode bilik ${st.code.split('').join(' ')}`}>
            {st.code}
          </span>
          {host && (
            <div class="stack-sm">
              <a class="btn btn-wa" href={`https://wa.me/?text=${waText}`} target="_blank" rel="noopener noreferrer">
                Kirim link via WhatsApp
              </a>
              <button class="btn btn-small" onClick={() => void copy()}>
                {copied ? 'Tersalin ✓' : 'Salin link'}
              </button>
            </div>
          )}
        </div>
        {host && <QrImage text={link} size={140} label="Kode QR untuk bergabung ke bilik" />}
      </section>

      {props.grid}

      <section class="card">
        <h2 class="section-title">
          Peserta ({st.participants.length}/{max})
        </h2>
        <ul class="people">
          {st.participants.map((p) => (
            <li key={p.id}>
              <span class={`dot ${st.streams[p.id] || p.id === st.selfId ? 'dot-on' : ''}`} aria-hidden="true" />
              {p.name}
              {p.host && <span class="badge">host</span>}
              {p.id === st.selfId && <span class="muted small"> (kamu)</span>}
              <span class="grow" />
              <span aria-label={p.ready ? 'siap' : 'belum siap'}>{p.ready ? '✅' : '⏳'}</span>
            </li>
          ))}
        </ul>
        {st.participants.length < 2 && <p class="muted small">Menunggu teman bergabung…</p>}
      </section>

      {host ? (
        <>
          <section>
            <h2 class="section-title">Layout</h2>
            <LayoutPicker value={design.layoutId} onChange={(layoutId) => props.setDesign({ ...design, layoutId })} />
          </section>
          <section>
            <h2 class="section-title">Frame</h2>
            <FramePicker value={design.frameId} onChange={(frameId) => props.setDesign({ ...design, frameId })} />
          </section>
          <section class="card stack-sm">
            <Chips
              label="Lama hitung mundur"
              value={st.settings.countdown}
              options={[3, 5, 10].map((n) => ({ value: n, label: `${n} detik` }))}
              onChange={(countdown) => room.updateSettings({ countdown })}
            />
            <Toggle label="Tantangan pose acak" checked={st.settings.challenges} onChange={(challenges) => room.updateSettings({ challenges })} />
            <Toggle
              label="Siapa yang beda?"
              hint="Satu orang acak dapat perintah rahasia berbeda di tiap jepretan"
              checked={st.settings.oddOneOut}
              onChange={(oddOneOut) => room.updateSettings({ oddOneOut })}
            />
          </section>
          <button class="btn btn-big btn-primary sticky-bottom" disabled={!everyoneReady} onClick={() => void room.start()}>
            {everyoneReady ? 'Mulai!' : st.participants.length < 2 ? 'Tunggu teman bergabung' : 'Tunggu semua siap'}
          </button>
        </>
      ) : (
        <button
          class={`btn btn-big sticky-bottom ${me?.ready ? '' : 'btn-primary'}`}
          disabled={!st.clockReady}
          onClick={() => room.setReady(!me?.ready)}
        >
          {!st.clockReady ? 'Menyamakan jam…' : me?.ready ? 'Batal siap' : 'Saya siap!'}
        </button>
      )}
    </>
  );
}

/** Video semua peserta, disusun sama seperti sel di strip agar terasa "satu frame". */
function VideoGrid(props: {
  st: RoomState;
  localStream: MediaStream | null;
  videoRef: { current: HTMLVideoElement | null };
  mirror: boolean;
  filterId: string;
  children?: ComponentChildren;
}) {
  const { st } = props;
  const n = Math.max(1, st.participants.length);
  const layout = getLayout(st.settings.layoutId);
  const aspect = cellAspect(layout, n);
  const cols = n === 4 ? 2 : n;
  const frame = getFrame(st.settings.frameId);
  const css = filterCss(getFilter(props.filterId));
  return (
    <div class="video-grid-wrap" style={{ background: frame.bg }}>
      <div class="video-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {st.participants.map((p) =>
          p.id === st.selfId ? (
            <VideoView key={p.id} stream={props.localStream} mirror={props.mirror} aspect={aspect} videoRef={props.videoRef} filter={css} label="Kamera kamu">
              <span class="tile-name">{p.name} (kamu)</span>
            </VideoView>
          ) : (
            <VideoView key={p.id} stream={st.streams[p.id] ?? null} aspect={aspect} filter={css} label={`Video ${p.name}`}>
              {!st.streams[p.id] && (
                <span class="tile-fallback">
                  <span class="avatar">{p.name.slice(0, 1).toUpperCase()}</span>
                  <small>Video belum tersambung — jepretan tetap jalan</small>
                </span>
              )}
              <span class="tile-name">{p.name}</span>
            </VideoView>
          ),
        )}
      </div>
      {props.children}
    </div>
  );
}
