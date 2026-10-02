# Berkontribusi ke Jepret Bareng

Terima kasih sudah mau ikut! Semua kontribusi lewat pull request ke cabang `main`.

## Alur kerja

1. Fork repo, buat cabang baru (`frame/lebaran-ketupat`, `fitur/xxx`, `bug/xxx`).
2. `npm ci` lalu `npm run dev`. Buka `https://localhost:5173` (kamera butuh HTTPS atau localhost).
3. Sebelum PR: `npm run lint && npm test && npm run build`.
4. Label issue: `frame`, `bug`, `fitur`, `good first issue`.

## Menambah frame

Frame bawaan saat ini masih **placeholder** yang digambar kode (warna + pola) di
[`src/compose/frames.ts`](src/compose/frames.ts). Desainer bisa menambah frame bergambar berupa PNG transparan.

1. Buat satu PNG transparan **per layout** dengan ukuran persis:

   | Layout     | File            | Ukuran (px)  |
   | ---------- | --------------- | ------------ |
   | Strip 4    | `strip4.png`    | 1080 × 3388  |
   | Grid 2×2   | `grid2x2.png`   | 1080 × 1512  |
   | Strip 3    | `strip3.png`    | 1080 × 2632  |
   | Polaroid   | `polaroid.png`  | 1080 × 1340  |

   Ukuran persis bisa dicek dengan `npm test` atau melihat `getLayout(id).width/height` di `src/compose/layouts.ts`.
   Bagian foto (slot) harus transparan; area bawah (footer) dipakai untuk caption, tanggal, dan watermark.

2. Simpan di `public/frames/<id-tema>/`, misal `public/frames/dies-natalis-its/strip4.png`.
   Usahakan tiap PNG < 200 KB (kompres dengan [Squoosh](https://squoosh.app)). Frame hanya dimuat saat dipilih.

3. Daftarkan di `FRAMES` (`src/compose/frames.ts`):

   ```ts
   {
     id: 'dies-natalis-its',
     name: 'Dies Natalis ITS',
     category: 'Musiman',
     bg: '#ffffff', fg: '#1d3557', accent: '#a8dadc', pattern: 'none',
     overlays: {
       strip4: 'frames/dies-natalis-its/strip4.png',
       grid2x2: 'frames/dies-natalis-its/grid2x2.png',
     },
   },
   ```

   Layout tanpa PNG tetap memakai warna `bg` + `pattern`.

## Lisensi aset

- Hanya aset **buatan sendiri** atau berlisensi **CC0 / CC BY**.
- Cantumkan sumber dan lisensi di deskripsi PR, dan untuk CC BY tambahkan kredit di halaman Tentang
  (`src/ui/screens/About.tsx`).
- Tidak menerima logo/merek pihak lain tanpa izin tertulis.

## Menambah stiker atau tantangan pose

- Stiker: SVG di `public/stickers/` (beri atribut `width` dan `height`), lalu daftarkan di `STICKERS`
  (`src/editor/model.ts`).
- Tantangan pose: tambahkan kalimat di `public/data/challenges.json` (`poses` untuk semua, `secret` untuk mode "Siapa yang beda?").
