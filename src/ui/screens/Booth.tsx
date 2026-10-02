import { IconMirror, IconSwitchCamera } from '../icons';
import { useEffect, useRef, useState } from 'preact/hooks';
import { captureFrame, type Facing } from '../../camera/camera';
import { loadChallenges, pickRandom } from '../../camera/challenges';
import { unlockAudio } from '../../camera/sound';
import type { Photo } from '../../compose/compose';
import { filterCss, getFilter } from '../../compose/filters';
import { getFrame } from '../../compose/frames';
import { getLayout } from '../../compose/layouts';
import { now } from '../../room/clock';
import { CameraErrorBox, CountdownOverlay, Header, sleep, Spinner, useCamera, VideoView, type Cue } from '../components';
import { FilterPicker } from '../pickers';
import { clampCountdown, settings } from '../settings';
import { useStore } from '../store';
import { ShotThumb } from '../ShotThumb';
import type { Design } from '../session';

/** Mode Satu Layar: pratinjau kamera, sesi jepret otomatis, dan ulang per jepretan (F-01, F-03, F-04). */
export function Booth(props: {
  design: Design;
  shots: Photo[][];
  onChangeDesign: (d: Design) => void;
  onDone: (shots: Photo[][]) => void;
  onBack: () => void;
}) {
  const s = useStore(settings);
  const layout = getLayout(props.design.layoutId);
  const frame = getFrame(props.design.frameId);
  const [facing, setFacing] = useState<Facing>('user');
  const cam = useCamera(facing);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mirror = s.mirror && facing === 'user';
  const complete = props.shots.length === layout.shots && props.shots.every((x) => x?.length);
  const [shots, setShots] = useState<Photo[][]>(complete ? props.shots : []);
  const [phase, setPhase] = useState<'preview' | 'shooting' | 'review'>(complete ? 'review' : 'preview');
  const [cue, setCue] = useState<Cue | null>(null);
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  const slot = layout.slots[0];
  const aspect = slot.w / slot.h;

  async function shoot(indices: number[]) {
    unlockAudio();
    setPhase('shooting');
    const poses = s.challenges ? pickRandom((await loadChallenges()).poses, indices.length) : [];
    const result = [...shots];
    for (let k = 0; k < indices.length; k++) {
      const i = indices[k];
      const localAt = now() + clampCountdown(s.countdown) * 1000;
      setCue({ localAt, index: i, total: layout.shots, challenge: poses[k] ?? null });
      await sleep(localAt - now());
      const v = videoRef.current;
      if (!alive.current || !v) return;
      result[i] = [captureFrame(v, mirror)];
      setShots([...result]);
      await sleep(900);
      if (!alive.current) return;
    }
    setCue(null);
    setPhase('review');
  }

  const all = Array.from({ length: layout.shots }, (_, i) => i);

  return (
    <main class="screen">
      <Header title={phase === 'review' ? 'Cek Hasil' : 'Bilik Foto'} onBack={phase === 'shooting' ? undefined : props.onBack} />
      {cam.error ? (
        <CameraErrorBox error={cam.error} onRetry={cam.retry} />
      ) : (
        <div class="booth">
          <div class={`booth-stage ${phase === 'review' ? 'booth-stage-small' : ''}`} style={{ background: frame.bg2 ? `linear-gradient(135deg, ${frame.bg}, ${frame.bg2})` : frame.bg }}>
            <VideoView
              stream={cam.stream}
              mirror={mirror}
              filter={filterCss(getFilter(props.design.filterId))}
              aspect={aspect}
              videoRef={videoRef}
            >
              {!cam.stream && <Spinner label="Menyiapkan kamera…" />}
              <CountdownOverlay cue={cue} />
            </VideoView>
          </div>

          {phase === 'preview' && (
            <>
              <div class="row center">
                <button class="icon-btn" onClick={() => setFacing(facing === 'user' ? 'environment' : 'user')} aria-label="Ganti kamera depan/belakang">
                  <IconSwitchCamera />
                </button>
                <button
                  class="btn btn-big btn-primary grow"
                  disabled={!cam.stream}
                  onClick={() => void shoot(all)}
                >
                  Mulai Jepret ({layout.shots}×)
                </button>
                <button
                  class="icon-btn"
                  aria-pressed={s.mirror}
                  onClick={() => settings.set({ mirror: !s.mirror })}
                  aria-label={s.mirror ? 'Matikan efek cermin' : 'Nyalakan efek cermin'}
                >
                  <IconMirror />
                </button>
              </div>
              <FilterPicker value={props.design.filterId} onChange={(filterId) => props.onChangeDesign({ ...props.design, filterId })} />
            </>
          )}

          {phase === 'shooting' && (
            <div class="shot-strip" aria-label="Jepretan sejauh ini">
              {all.map((i) => (
                <div key={i} class="shot-mini">
                  {shots[i] ? (
                    <ShotThumb photos={shots[i]} layout={layout} frameId={frame.id} filterId={props.design.filterId} label={`Jepretan ${i + 1}`} />
                  ) : (
                    <span class="shot-empty">{i + 1}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {phase === 'review' && (
            <>
              <div class={`review-grid review-${layout.shots}`}>
                {all.map((i) => (
                  <div key={i} class="review-item">
                    <ShotThumb photos={shots[i]} layout={layout} frameId={frame.id} filterId={props.design.filterId} label={`Jepretan ${i + 1}`} />
                    <button class="btn btn-small" onClick={() => void shoot([i])} disabled={!cam.stream}>
                      Ulang #{i + 1}
                    </button>
                  </div>
                ))}
              </div>
              <div class="row">
                <button class="btn grow" onClick={() => void shoot(all)} disabled={!cam.stream}>
                  Ulang semua
                </button>
                <button class="btn btn-primary grow" onClick={() => props.onDone(shots)}>
                  Lanjut Edit
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}
