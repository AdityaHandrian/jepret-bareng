import { useEffect, useRef } from 'preact/hooks';
import { drawPhoto, type Photo } from '../compose/compose';
import { getFilter } from '../compose/filters';
import { getFrame } from '../compose/frames';
import { splitSlot, type Layout } from '../compose/layouts';

/** Pratinjau satu jepretan (berisi foto semua peserta) sesuai rasio slot layout. */
export function ShotThumb(props: { photos: Photo[] | undefined; layout: Layout; frameId: string; filterId: string; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const slot = props.layout.slots[0];
  const w = 360;
  const h = Math.round((w * slot.h) / slot.w);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const frame = getFrame(props.frameId);
    ctx.fillStyle = frame.accent;
    ctx.fillRect(0, 0, w, h);
    const photos = props.photos;
    if (!photos?.length) return;
    splitSlot({ x: 0, y: 0, w, h }, photos.length, 3).forEach((cell, i) =>
      drawPhoto(ctx, photos[i], cell, getFilter(props.filterId), frame),
    );
  }, [props.photos, props.frameId, props.filterId, h]);
  return <canvas ref={ref} width={w} height={h} class="shot-thumb" role="img" aria-label={props.label} />;
}
