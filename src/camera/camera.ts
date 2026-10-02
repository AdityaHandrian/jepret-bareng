// Akses kamera (F-01) dan pengambilan jepretan.

export type Facing = 'user' | 'environment';

export class CameraError extends Error {
  constructor(
    message: string,
    public readonly kind: 'denied' | 'notfound' | 'insecure' | 'unsupported' | 'busy' | 'other',
  ) {
    super(message);
  }
}

export function isIos(): boolean {
  return /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export async function openCamera(facing: Facing): Promise<MediaStream> {
  if (!window.isSecureContext) {
    throw new CameraError('Kamera hanya bisa dipakai lewat HTTPS.', 'insecure');
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CameraError('Browser ini belum mendukung kamera. Coba Chrome atau Safari terbaru.', 'unsupported');
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } },
    });
  } catch (err) {
    const name = (err as DOMException)?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      throw new CameraError(
        isIos()
          ? 'Izin kamera ditolak. Buka Pengaturan › Safari › Kamera, pilih "Izinkan", lalu muat ulang halaman.'
          : 'Izin kamera ditolak. Ketuk ikon gembok di bilah alamat, izinkan Kamera, lalu muat ulang halaman.',
        'denied',
      );
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      throw new CameraError('Kamera tidak ditemukan di perangkat ini.', 'notfound');
    }
    if (name === 'NotReadableError') {
      throw new CameraError('Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu lalu coba lagi.', 'busy');
    }
    throw new CameraError('Kamera gagal dibuka. Coba muat ulang halaman.', 'other');
  }
}

export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((t) => t.stop());
}

/**
 * Ambil satu frame dari video pada resolusi penuh.
 * Jika `mirror`, hasil dibalik agar sama seperti yang terlihat di layar.
 */
export function captureFrame(video: HTMLVideoElement, mirror: boolean): HTMLCanvasElement {
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, w, h);
  return c;
}

/** Kecilkan kanvas jika sisi terpanjang melebihi `max` (untuk dikirim lewat jaringan). */
export function limitSize(src: HTMLCanvasElement, max: number): HTMLCanvasElement {
  const scale = Math.min(1, max / Math.max(src.width, src.height));
  if (scale === 1) return src;
  const c = document.createElement('canvas');
  c.width = Math.round(src.width * scale);
  c.height = Math.round(src.height * scale);
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

export async function blobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext('2d')!.drawImage(img, 0, 0);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}
