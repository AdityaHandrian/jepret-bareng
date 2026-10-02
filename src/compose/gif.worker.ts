/// <reference lib="webworker" />
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

export interface GifJob {
  width: number;
  height: number;
  delay: number;
  frames: ArrayBuffer[];
}

self.onmessage = (e: MessageEvent<GifJob>) => {
  const { width, height, delay, frames } = e.data;
  const gif = GIFEncoder();
  for (const buf of frames) {
    const rgba = new Uint8ClampedArray(buf);
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);
    gif.writeFrame(index, width, height, { palette, delay });
  }
  gif.finish();
  const bytes = gif.bytes();
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(bytes.buffer, [bytes.buffer]);
};
