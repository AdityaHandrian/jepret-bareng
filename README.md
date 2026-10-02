# Jepret Bareng 📸

Photobox berbasis web untuk berdua atau satu geng, di satu HP maupun dari kota berbeda.
Berjalan sepenuhnya di browser, di-hosting gratis di GitHub Pages. Foto tidak pernah dikirim ke server.

## Fitur

| Mode | Isi |
| --- | --- |
| **Sendiri / Satu HP** | Kamera depan/belakang + cermin, 4 layout (strip 4, grid 2×2, strip 3, polaroid), hitung mundur 3/5/10 detik dengan suara & kilat, ulang per jepretan, filter, frame, stiker, coretan, caption + tanggal, unduh PNG 1080 px, bagikan (Web Share API), GIF boomerang. Bisa di-install (PWA) dan jalan offline. |
| **Berdua Jauh** | 2 HP terhubung peer-to-peer (PeerJS/WebRTC). Kode 6 karakter + QR + link WhatsApp, hitung mundur tersinkron, tiap HP memotret resolusi penuh lalu host menyusun strip dan mengirim hasil ke semua. |
| **Bareng Geng** | Sama seperti Berdua Jauh, hingga 4 orang, layout grid otomatis, plus mode "Siapa yang beda?". |

Keseruan: tantangan pose acak (`public/data/challenges.json`), konfeti, tema gelap, watermark `jepretbareng` + QR.

## Menjalankan

```bash
npm ci
npm run dev        # http://localhost:5173 (kamera jalan di localhost)
npm run dev -- --host   # uji di HP lewat jaringan lokal: butuh HTTPS, lihat catatan di bawah
npm test           # tes unit (Vitest)
npm run lint       # cek tipe TypeScript
npm run build      # hasil statis di dist/
npm run preview    # sajikan dist/ secara lokal
```

Browser hanya mengizinkan kamera di HTTPS atau `localhost`. Untuk uji di HP, pakai hasil deploy GitHub Pages,
atau terowongan HTTPS gratis (misal `cloudflared tunnel --url http://localhost:5173`).

## Deploy ke GitHub Pages

1. Buat repo publik (misal `jepret-bareng`) dan push isi folder ini ke cabang `main`.
2. Di GitHub: **Settings › Pages › Build and deployment › Source: GitHub Actions**.
3. Setiap push ke `main` menjalankan lint, tes, build, cek ukuran muat awal, lalu deploy.
   Hasilnya di `https://<username>.github.io/jepret-bareng/`.

Ganti `REPO_URL` di `src/ui/screens/About.tsx` ke URL repo kamu.

### TURN (opsional)

Bawaan memakai STUN Google + TURN Open Relay gratis. Jika ingin kuota TURN sendiri (akun Metered gratis),
isi secret repo lalu teruskan sebagai env di langkah Build: `VITE_TURN_URLS` (dipisah koma),
`VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL`.

## Struktur

```
src/
├── camera/    # akses kamera, jepret, suara, tantangan pose
├── compose/   # layout, filter, frame, komposisi strip, QR, GIF (Web Worker)
├── room/      # PeerJS, sinkron jam, protokol pesan (dimuat hanya di mode jarak jauh)
├── editor/    # model stiker & coretan
├── ui/        # layar & komponen Preact
└── main.tsx
public/
├── frames/    # PNG frame desainer (lihat CONTRIBUTING.md)
├── stickers/  # stiker SVG
└── data/challenges.json
```

## Arsitektur jarak jauh

- Data channel berbentuk bintang (tamu ↔ host); video berbentuk mesh (tiap pasangan langsung), ± 320 px & 250 kbps.
- Sinkron jam: tamu melakukan ping berkala; offset diambil dari sepertiga sampel ber-RTT terkecil.
  Host mengirim `{t: 'shoot', at}` dalam jam host; tiap HP mengubahnya ke jam lokal.
- Tiap HP memotret dari kameranya sendiri (JPEG ≤ 1280 px) dan mengirim ke host; host menyusun strip,
  tamu melihat pratinjau langsung saat host menghias, lalu PNG akhir dikirim ke semua.
- Jika video gagal tersambung (misal TURN habis), sesi tetap jalan: hanya sinkron waktu + kirim foto.

## Belum dikerjakan (Fase 4 & cadangan)

- F-20 stiker AR menempel di wajah, F-21 frame acara via `?frame=`, F-22 bahasa Inggris.
- Fallback tukar sinyal manual lewat QR/teks jika server PeerJS publik tidak tersedia.
- Frame bawaan masih placeholder (warna + pola); desain asli menyusul lewat PR.

Lisensi kode: MIT. Aset bawaan: CC0.
