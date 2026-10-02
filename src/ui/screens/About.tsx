import { Header } from '../components';

export const REPO_URL = 'https://github.com/AdityaHandrian/jepret-bareng';

export function About(props: { onBack: () => void }) {
  return (
    <main class="screen about">
      <Header title="Tentang & Privasi" onBack={props.onBack} />
      <div class="stack prose">
        <section class="card">
          <h2>Fotomu tetap milikmu</h2>
          <p>
            Semua foto diproses langsung di browser HP-mu. Jepret Bareng <b>tidak punya server foto</b>, tidak ada akun, dan tidak
            ada galeri publik.
          </p>
          <p>
            Di mode <b>Berdua Jauh</b> dan <b>Bareng Geng</b>, video dan foto mengalir <b>langsung antar-HP</b> (peer-to-peer lewat
            WebRTC). Server sinyal PeerJS hanya membantu HP saling menemukan alamat koneksi dan tidak pernah melihat gambar. Jika
            jaringan seluler memblokir koneksi langsung, data bisa diteruskan lewat server relay TURN dalam keadaan terenkripsi.
          </p>
          <p>Tidak ada analitik yang melacak individu.</p>
        </section>
        <section class="card">
          <h2>Hemat kuota</h2>
          <p>
            Video pratinjau di mode jarak jauh dikirim dalam resolusi kecil (± 320 px). Foto resolusi penuh diambil oleh kamera
            masing-masing, jadi hasilnya tetap tajam walau sinyal pas-pasan. Mode Satu Layar tetap jalan tanpa internet setelah
            kunjungan pertama, dan bisa dipasang ke layar utama.
          </p>
        </section>
        <section class="card">
          <h2>Kredit</h2>
          <ul>
            <li>Kode: lisensi MIT.</li>
            <li>Frame dan stiker bawaan: buatan tim Jepret Bareng, CC0.</li>
            <li>Huruf Fredoka (SIL Open Font License) dari Google Fonts.</li>
            <li>PeerJS (MIT), gifenc (MIT), qrcode-generator (MIT), Preact (MIT).</li>
          </ul>
          <p>
            Mau menyumbang frame? Lihat panduan di{' '}
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
