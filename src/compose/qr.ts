import qrcode from 'qrcode-generator';

/** Gambar kode QR ke kanvas pada posisi (x, y) dengan ukuran sisi `size`. */
export function drawQr(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  dark = '#000',
  light = '#fff',
): void {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 2;
  const cell = size / (n + quiet * 2);
  ctx.save();
  ctx.fillStyle = light;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = dark;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) {
        // +0.5 menghindari garis tipis antar-modul karena antialias.
        ctx.fillRect(x + (c + quiet) * cell, y + (r + quiet) * cell, cell + 0.5, cell + 0.5);
      }
    }
  }
  ctx.restore();
}

export function qrCanvas(text: string, size: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  drawQr(c.getContext('2d')!, text, 0, 0, size);
  return c;
}

export function appUrl(): string {
  return new URL(import.meta.env.BASE_URL, location.origin).href;
}
