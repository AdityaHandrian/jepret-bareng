// Server ICE untuk WebRTC. STUN Google cukup untuk sebagian besar jaringan;
// TURN Open Relay (Metered, tingkat gratis) sebagai cadangan untuk jaringan seluler ketat.
// Jika kuota TURN habis, koneksi tetap dicoba lewat STUN; video bisa gagal tetapi
// jepretan tetap jalan lewat data channel (F-18).
//
// Ganti kredensial TURN lewat variabel build VITE_TURN_URLS / VITE_TURN_USERNAME /
// VITE_TURN_CREDENTIAL (misal dari akun Metered gratis milikmu sendiri).

const env = import.meta.env;

const turnUrls = (env.VITE_TURN_URLS as string | undefined)?.split(',').map((s) => s.trim()).filter(Boolean) ?? [
  'turn:openrelay.metered.ca:80',
  'turn:openrelay.metered.ca:443',
  'turns:openrelay.metered.ca:443?transport=tcp',
];

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  {
    urls: turnUrls,
    username: (env.VITE_TURN_USERNAME as string | undefined) ?? 'openrelayproject',
    credential: (env.VITE_TURN_CREDENTIAL as string | undefined) ?? 'openrelayproject',
  },
];
