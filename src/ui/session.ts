import type { Photo } from '../compose/compose';
import type { LayoutId } from '../compose/layouts';
import type { Decorations } from '../editor/model';

/** Pilihan desain strip yang dibawa dari layar ke layar. */
export interface Design {
  layoutId: LayoutId;
  frameId: string;
  filterId: string;
  caption: string;
  showDate: boolean;
  deco: Decorations;
}

export const defaultDesign = (): Design => ({
  layoutId: 'strip4',
  frameId: 'jambu',
  filterId: 'normal',
  caption: '',
  showDate: true,
  deco: { stickers: [], strokes: [] },
});

/** Hasil akhir yang ditampilkan di layar Hasil. */
export interface Outcome {
  blob: Blob;
  design: Design;
  /** Jepretan mentah untuk GIF; kosong bagi tamu bilik (hanya menerima PNG). */
  shots: Photo[][];
}
