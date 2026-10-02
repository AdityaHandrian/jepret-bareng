// Bilik jarak jauh (F-13 s.d. F-19).
//
// Topologi: data channel berbentuk bintang (tamu ↔ host), video berbentuk mesh
// (tiap pasangan peserta saling terhubung langsung). Foto tidak pernah lewat server:
// server sinyal PeerJS hanya bertukar alamat koneksi.
import { Peer, type DataConnection, type MediaConnection, type PeerError } from 'peerjs';
import { blobToCanvas, limitSize } from '../camera/camera';
import { loadChallenges, pickRandom } from '../camera/challenges';
import { canvasToBlob, type Photo } from '../compose/compose';
import { getLayout } from '../compose/layouts';
import { createStore, type Store } from '../ui/store';
import { estimateOffset, hostToLocal, now, sampleFrom, type ClockSample } from './clock';
import { ICE_SERVERS } from './ice';
import {
  hostPeerId,
  makeCode,
  MAX_PARTICIPANTS,
  type Msg,
  type Participant,
  type Phase,
  type RoomSettings,
} from './protocol';

export type Role = 'host' | 'guest';

export interface ShotCue {
  index: number;
  total: number;
  /** Waktu jepret dalam jam lokal (ms epoch). */
  localAt: number;
  challenge: string | null;
  secret: boolean;
}

export interface RoomState {
  role: Role;
  code: string;
  selfId: string;
  connected: boolean;
  phase: Phase;
  participants: Participant[];
  settings: RoomSettings;
  streams: Record<string, MediaStream>;
  cue: ShotCue | null;
  /** Host: shots[jepretan][peserta] sesuai urutan peserta. */
  shots: Photo[][];
  /** Host: nama peserta yang fotonya belum masuk. */
  waitingFor: string[];
  /** Tamu: pratinjau editan host. */
  previewUrl: string | null;
  finalBlob: Blob | null;
  error: string | null;
  clockReady: boolean;
}

const PHOTO_TIMEOUT_MS = 15000;
const CONNECT_TIMEOUT_MS = 20000;
const PREVIEW_INTERVAL_MS = 900;

function peerErrorMessage(err: PeerError<string>): string {
  switch (err.type) {
    case 'peer-unavailable':
      return 'Bilik tidak ditemukan. Cek lagi kodenya, atau minta host membuat bilik baru.';
    case 'network':
    case 'socket-error':
    case 'socket-closed':
    case 'server-error':
      return 'Tidak bisa terhubung ke server sinyal. Cek internetmu lalu coba lagi.';
    case 'browser-incompatible':
      return 'Browser ini belum mendukung WebRTC. Coba Chrome atau Safari terbaru.';
    default:
      return 'Koneksi bilik bermasalah. Coba lagi sebentar.';
  }
}

export class Room {
  readonly state: Store<RoomState>;
  private peer!: Peer;
  private conns = new Map<string, DataConnection>();
  private calls = new Map<string, MediaConnection>();
  private hostConn: DataConnection | null = null;
  private samples: ClockSample[] = [];
  private offset = 0;
  private syncTimer = 0;
  private captureTimer = 0;
  private capture: (() => HTMLCanvasElement | null) | null = null;
  private pending: { index: number; photos: Map<string, Photo>; done: () => void } | null = null;
  private lastPreview = 0;
  private previewTimer = 0;
  private closed = false;

  private constructor(
    role: Role,
    code: string,
    settings: RoomSettings,
    private localStream: MediaStream | null,
    private name: string,
  ) {
    this.state = createStore<RoomState>({
      role,
      code,
      selfId: '',
      connected: false,
      phase: 'lobby',
      participants: [],
      settings,
      streams: {},
      cue: null,
      shots: [],
      waitingFor: [],
      previewUrl: null,
      finalBlob: null,
      error: null,
      clockReady: role === 'host',
    });
  }

  get value(): RoomState {
    return this.state.value;
  }

  private set(patch: Partial<RoomState>) {
    if (!this.closed) this.state.set(patch);
  }

  /** UI mendaftarkan fungsi jepret lokal (resolusi penuh dari kamera sendiri). */
  setCapture(fn: (() => HTMLCanvasElement | null) | null): void {
    this.capture = fn;
  }

  setLocalStream(stream: MediaStream | null): void {
    if (stream === this.localStream) return;
    this.localStream = stream;
    // Panggil ulang semua peserta dengan stream baru (misal setelah ganti kamera).
    this.calls.forEach((c) => c.close());
    this.calls.clear();
    this.set({ streams: {} });
    this.ensureCalls();
  }

  // ---------------------------------------------------------------- pembuatan

  static async host(settings: RoomSettings, name: string, stream: MediaStream | null): Promise<Room> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const room = new Room('host', makeCode(), settings, stream, name);
      try {
        await room.openPeer(hostPeerId(room.value.code));
        room.setupHost();
        return room;
      } catch (err) {
        room.destroyPeer();
        if ((err as PeerError<string>).type !== 'unavailable-id') throw new Error(peerErrorMessage(err as PeerError<string>));
      }
    }
    throw new Error('Gagal membuat kode bilik. Coba lagi.');
  }

  static async join(code: string, name: string, stream: MediaStream | null): Promise<Room> {
    const placeholder: RoomSettings = {
      mode: 'duo',
      layoutId: 'strip4',
      frameId: 'putih',
      filterId: 'normal',
      countdown: 3,
      challenges: true,
      oddOneOut: false,
    };
    const room = new Room('guest', code, placeholder, stream, name);
    try {
      await room.openPeer(undefined);
    } catch (err) {
      room.destroyPeer();
      throw new Error(peerErrorMessage(err as PeerError<string>));
    }
    await room.connectToHost();
    return room;
  }

  private openPeer(id: string | undefined): Promise<void> {
    return new Promise((resolve, reject) => {
      const opts = { config: { iceServers: ICE_SERVERS }, debug: 0 };
      this.peer = id ? new Peer(id, opts) : new Peer(opts);
      const timer = window.setTimeout(
        () => reject({ type: 'network' } as PeerError<string>),
        CONNECT_TIMEOUT_MS,
      );
      this.peer.once('open', (pid) => {
        clearTimeout(timer);
        this.set({ selfId: pid });
        resolve();
      });
      this.peer.once('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
      this.peer.on('call', (call) => this.onIncomingCall(call));
    });
  }

  private destroyPeer() {
    try {
      this.peer?.destroy();
    } catch {
      /* abaikan */
    }
  }

  // ---------------------------------------------------------------- host

  private setupHost() {
    const self: Participant = { id: this.value.selfId, name: this.name || 'Host', ready: true, host: true };
    this.set({ participants: [self], connected: true });
    this.peer.on('connection', (conn) => this.onGuestConnection(conn));
    this.peer.on('error', (err) => {
      // Error "peer-unavailable" dari panggilan video ke tamu yang sudah pergi tidak fatal.
      if (err.type === 'network' || err.type === 'server-error') {
        this.set({ error: 'Koneksi ke server sinyal terputus. Peserta baru tidak bisa bergabung.' });
      }
    });
    this.peer.on('disconnected', () => {
      if (!this.closed) this.peer.reconnect();
    });
  }

  private onGuestConnection(conn: DataConnection) {
    conn.on('data', (raw) => {
      const msg = raw as Msg;
      if (msg.t === 'hello') {
        const s = this.value;
        if (s.participants.length >= MAX_PARTICIPANTS[s.settings.mode]) {
          conn.send({ t: 'reject', reason: 'full' } satisfies Msg);
          setTimeout(() => conn.close(), 500);
          return;
        }
        if (s.phase !== 'lobby') {
          conn.send({ t: 'reject', reason: 'busy' } satisfies Msg);
          setTimeout(() => conn.close(), 500);
          return;
        }
        this.conns.set(conn.peer, conn);
        const p: Participant = { id: conn.peer, name: msg.name.slice(0, 24) || 'Teman', ready: false, host: false };
        this.set({ participants: [...s.participants.filter((x) => x.id !== p.id), p] });
        this.broadcastRoster();
        return;
      }
      if (!this.conns.has(conn.peer)) return;
      this.onHostMessage(conn, msg);
    });
    conn.on('close', () => this.removeGuest(conn.peer));
    conn.on('error', () => this.removeGuest(conn.peer));
  }

  private onHostMessage(conn: DataConnection, msg: Msg) {
    switch (msg.t) {
      case 'ping':
        conn.send({ t: 'pong', c0: msg.c0, h: now() } satisfies Msg);
        break;
      case 'ready':
        this.set({
          participants: this.value.participants.map((p) => (p.id === conn.peer ? { ...p, ready: msg.ready } : p)),
        });
        this.broadcastRoster();
        break;
      case 'photo':
        void this.receivePhoto(conn.peer, msg.index, msg.data);
        break;
    }
  }

  private removeGuest(id: string) {
    if (!this.conns.has(id)) return;
    this.conns.delete(id);
    this.calls.get(id)?.close();
    this.calls.delete(id);
    const streams = { ...this.value.streams };
    delete streams[id];
    this.set({ participants: this.value.participants.filter((p) => p.id !== id), streams });
    this.broadcastRoster();
    this.checkPending();
  }

  private broadcast(msg: Msg) {
    this.conns.forEach((c) => {
      if (c.open) c.send(msg);
    });
  }

  private broadcastRoster() {
    const s = this.value;
    this.broadcast({ t: 'roster', participants: s.participants, settings: s.settings, phase: s.phase });
    this.ensureCalls();
  }

  updateSettings(patch: Partial<RoomSettings>): void {
    if (this.value.role !== 'host') return;
    this.set({ settings: { ...this.value.settings, ...patch } });
    this.broadcastRoster();
  }

  private setPhase(phase: Phase) {
    this.set({ phase });
    if (this.value.role === 'host') this.broadcastRoster();
  }

  /** Host: mulai sesi jepret serentak (F-15). */
  async start(): Promise<void> {
    const layout = getLayout(this.value.settings.layoutId);
    this.set({ shots: Array.from({ length: layout.shots }, () => []), finalBlob: null });
    this.setPhase('shooting');
    const data = await loadChallenges();
    const poses = pickRandom(data.poses, layout.shots);
    for (let i = 0; i < layout.shots; i++) {
      if (this.closed) return;
      await this.shootOne(i, layout.shots, poses[i], data.secret);
    }
    this.setPhase('review');
  }

  /** Host: ulang satu jepretan untuk semua peserta (F-04). */
  async retake(index: number): Promise<void> {
    const layout = getLayout(this.value.settings.layoutId);
    this.setPhase('shooting');
    const data = await loadChallenges();
    await this.shootOne(index, layout.shots, pickRandom(data.poses, 1)[0], data.secret);
    this.setPhase('review');
  }

  private async shootOne(index: number, total: number, pose: string, secrets: string[]) {
    const s = this.value.settings;
    const order = this.value.participants.map((p) => p.id);
    const oddId = s.oddOneOut && order.length >= 2 ? order[Math.floor(Math.random() * order.length)] : null;
    const secretText = pickRandom(secrets, 1)[0];
    const at = now() + s.countdown * 1000 + 600;
    const challengeFor = (id: string) => (id === oddId ? secretText : s.challenges ? pose : null);

    const photos = new Map<string, Photo>();
    const finished = new Promise<void>((resolve) => {
      this.pending = { index, photos, done: resolve };
    });

    this.conns.forEach((c, id) => {
      if (c.open) {
        c.send({ t: 'shoot', index, total, at, challenge: challengeFor(id), secret: id === oddId } satisfies Msg);
      }
    });
    this.scheduleCapture({ index, total, localAt: at, challenge: challengeFor(this.value.selfId), secret: oddId === this.value.selfId }, (canvas) => {
      photos.set(this.value.selfId, canvas);
      this.checkPending();
    });

    const timeout = window.setTimeout(() => this.pending?.done(), at - now() + PHOTO_TIMEOUT_MS);
    this.updateWaiting();
    await finished;
    clearTimeout(timeout);
    this.pending = null;
    // Peserta yang keluar di tengah sesi tanpa mengirim foto tidak diberi sel kosong.
    const current = this.value.participants.map((p) => p.id);
    const shots = [...this.value.shots];
    shots[index] = order.filter((id) => current.includes(id) || photos.has(id)).map((id) => photos.get(id) ?? null);
    this.set({ shots, waitingFor: [] });
  }

  private async receivePhoto(from: string, index: number, data: ArrayBuffer) {
    if (!this.pending || this.pending.index !== index) return;
    const pending = this.pending;
    try {
      const canvas = await blobToCanvas(new Blob([data], { type: 'image/jpeg' }));
      pending.photos.set(from, canvas);
    } catch {
      pending.photos.set(from, null);
    }
    this.checkPending();
  }

  private updateWaiting() {
    if (!this.pending) return;
    const missing = this.value.participants.filter((p) => !this.pending!.photos.has(p.id)).map((p) => p.name);
    this.set({ waitingFor: missing });
  }

  private checkPending() {
    if (!this.pending) return;
    this.updateWaiting();
    if (this.value.participants.every((p) => this.pending!.photos.has(p.id))) this.pending.done();
  }

  /** Host: kirim pratinjau editan ke tamu, dibatasi ± 1 kali per detik. */
  sendPreview(canvas: HTMLCanvasElement): void {
    if (this.value.role !== 'host' || !this.conns.size) return;
    clearTimeout(this.previewTimer);
    const wait = Math.max(0, PREVIEW_INTERVAL_MS - (Date.now() - this.lastPreview));
    this.previewTimer = window.setTimeout(async () => {
      this.lastPreview = Date.now();
      const small = limitSize(canvas, 480);
      const blob = await canvasToBlob(small, 'image/jpeg', 0.7);
      this.broadcast({ t: 'preview', data: await blob.arrayBuffer() });
    }, wait);
  }

  /** Host: pindah antara tahap cek hasil dan menghias. */
  goToPhase(phase: 'review' | 'editing'): void {
    if (this.value.role === 'host') this.setPhase(phase);
  }

  /** Host: kirim strip akhir ke semua peserta (F-17). */
  async sendFinal(blob: Blob): Promise<void> {
    clearTimeout(this.previewTimer);
    this.set({ finalBlob: blob });
    this.setPhase('done');
    this.broadcast({ t: 'final', data: await blob.arrayBuffer() });
  }

  /** Host: kembali ke ruang tunggu untuk sesi baru. */
  backToLobby(): void {
    this.set({
      shots: [],
      finalBlob: null,
      participants: this.value.participants.map((p) => ({ ...p, ready: p.host })),
    });
    this.setPhase('lobby');
  }

  // ---------------------------------------------------------------- tamu

  private connectToHost(): Promise<void> {
    return new Promise((resolve, reject) => {
      const conn = this.peer.connect(hostPeerId(this.value.code), { reliable: true });
      this.hostConn = conn;
      const timer = window.setTimeout(() => {
        reject(new Error('Host tidak merespons. Pastikan host masih membuka bilik, lalu coba lagi.'));
        this.leave();
      }, CONNECT_TIMEOUT_MS);
      this.peer.on('error', (err) => {
        clearTimeout(timer);
        if (!this.value.connected) {
          reject(new Error(peerErrorMessage(err)));
          this.leave();
        }
      });
      conn.on('open', () => {
        clearTimeout(timer);
        conn.send({ t: 'hello', name: this.name } satisfies Msg);
        this.set({ connected: true });
        this.startClockSync();
        resolve();
      });
      conn.on('data', (raw) => this.onGuestMessage(raw as Msg));
      conn.on('close', () => {
        if (!this.closed) this.set({ error: 'Host menutup bilik atau koneksi terputus.', connected: false });
      });
    });
  }

  private onGuestMessage(msg: Msg) {
    switch (msg.t) {
      case 'roster': {
        const prevPhase = this.value.phase;
        this.set({ participants: msg.participants, settings: msg.settings, phase: msg.phase });
        if (msg.phase === 'lobby' && prevPhase !== 'lobby') this.set({ finalBlob: null, previewUrl: null });
        this.ensureCalls();
        break;
      }
      case 'pong': {
        this.samples.push(sampleFrom(msg.c0, msg.h, now()));
        if (this.samples.length > 30) this.samples.shift();
        this.offset = estimateOffset(this.samples) ?? 0;
        if (this.samples.length >= 3) this.set({ clockReady: true });
        break;
      }
      case 'shoot': {
        const localAt = hostToLocal(msg.at, this.offset);
        this.scheduleCapture({ index: msg.index, total: msg.total, localAt, challenge: msg.challenge, secret: msg.secret }, async (canvas) => {
          if (!canvas) return;
          const blob = await canvasToBlob(limitSize(canvas, 1280), 'image/jpeg', 0.85);
          this.hostConn?.send({ t: 'photo', index: msg.index, data: await blob.arrayBuffer() } satisfies Msg);
        });
        break;
      }
      case 'preview': {
        if (this.value.previewUrl) URL.revokeObjectURL(this.value.previewUrl);
        this.set({ previewUrl: URL.createObjectURL(new Blob([msg.data], { type: 'image/jpeg' })) });
        break;
      }
      case 'final':
        this.set({ finalBlob: new Blob([msg.data], { type: 'image/png' }), phase: 'done' });
        break;
      case 'reject':
        this.set({
          error:
            msg.reason === 'full'
              ? 'Bilik sudah penuh.'
              : 'Sesi di bilik ini sedang berjalan. Tunggu sebentar lalu coba gabung lagi.',
        });
        break;
    }
  }

  setReady(ready: boolean): void {
    this.hostConn?.send({ t: 'ready', ready } satisfies Msg);
    this.set({
      participants: this.value.participants.map((p) => (p.id === this.value.selfId ? { ...p, ready } : p)),
    });
  }

  /** Ping beruntun saat awal, lalu berkala agar offset tetap segar. */
  private startClockSync() {
    const ping = () => this.hostConn?.open && this.hostConn.send({ t: 'ping', c0: now() } satisfies Msg);
    for (let i = 0; i < 8; i++) setTimeout(ping, i * 150);
    this.syncTimer = window.setInterval(ping, 3000);
  }

  // ---------------------------------------------------------------- bersama

  private scheduleCapture(cue: ShotCue, onCaptured: (c: HTMLCanvasElement | null) => void) {
    clearTimeout(this.captureTimer);
    this.set({ cue });
    this.captureTimer = window.setTimeout(() => {
      let canvas: HTMLCanvasElement | null = null;
      try {
        canvas = this.capture?.() ?? null;
      } catch {
        canvas = null;
      }
      onCaptured(canvas);
      setTimeout(() => {
        if (this.value.cue === cue) this.set({ cue: null });
      }, 700);
    }, Math.max(0, cue.localAt - now()));
  }

  /** Mesh video: peserta dengan ID lebih kecil yang memanggil, agar tidak dobel. */
  private ensureCalls() {
    if (!this.localStream || this.closed) return;
    const self = this.value.selfId;
    for (const p of this.value.participants) {
      if (p.id === self || this.calls.has(p.id) || self > p.id) continue;
      const call = this.peer.call(p.id, this.localStream);
      if (call) this.wireCall(call);
    }
  }

  private onIncomingCall(call: MediaConnection) {
    if (this.localStream) call.answer(this.localStream);
    else call.answer();
    this.wireCall(call);
  }

  private wireCall(call: MediaConnection) {
    this.calls.get(call.peer)?.close();
    this.calls.set(call.peer, call);
    call.on('stream', (stream) => {
      this.set({ streams: { ...this.value.streams, [call.peer]: stream } });
      void lowerVideoQuality(call);
    });
    const drop = () => {
      if (this.calls.get(call.peer) !== call) return;
      this.calls.delete(call.peer);
      const streams = { ...this.value.streams };
      delete streams[call.peer];
      this.set({ streams });
    };
    call.on('close', drop);
    call.on('error', drop);
  }

  leave(): void {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.syncTimer);
    clearTimeout(this.captureTimer);
    clearTimeout(this.previewTimer);
    this.pending?.done();
    this.calls.forEach((c) => c.close());
    this.conns.forEach((c) => c.close());
    this.hostConn?.close();
    if (this.value.previewUrl) URL.revokeObjectURL(this.value.previewUrl);
    this.destroyPeer();
  }
}

/** Video pratinjau cukup ± 320 px dan bitrate rendah agar hemat kuota. */
async function lowerVideoQuality(call: MediaConnection) {
  const pc = call.peerConnection;
  if (!pc) return;
  for (const sender of pc.getSenders()) {
    if (sender.track?.kind !== 'video') continue;
    try {
      const params = sender.getParameters();
      if (!params.encodings?.length) params.encodings = [{}];
      const width = sender.track.getSettings().width ?? 640;
      params.encodings[0].scaleResolutionDownBy = Math.max(1, width / 320);
      params.encodings[0].maxBitrate = 250_000;
      await sender.setParameters(params);
    } catch {
      /* sebagian browser tidak mendukung; abaikan */
    }
  }
}
