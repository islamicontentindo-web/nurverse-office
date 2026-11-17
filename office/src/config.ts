/**
 * ✏️ UBAH DI SINI: nama kantor, ruangan, agen, jadwal, dan data contoh.
 * Semua yang tampil di kantor diambil dari file ini. Nama dan angka di bawah fiktif.
 */

import laporanAgen from './laporan.json';
import type { GayaId } from './gaya/daftar';

export const KANTOR = {
  nama: 'Kantor NURVERSE',
  /** Baris kecil di bawah nama (mis. nama perusahaan). */
  subjudul: 'Channel YouTube Islami',
};

/**
 * Gaya 3D kantor (lihat README, "Ganti gaya 3D"): 'asli' | 'clay' | 'felt' | 'voxel' | 'vinyl' | 'diorama' | 'kayu' |
 * 'stickman' | 'pulau' | 'toko' | 'menara' | 'taman' | 'gedung30' | 'hologram' | 'angkringan' | 'pecellele' | 'bakso'. Bisa ditimpa lewat ?gaya=<id> atau pemilih di layar.
 */
export const GAYA: GayaId = 'asli';
/** Tombol pemilih gaya di pojok kanan bawah. false = sembunyikan (mis. untuk video final). */
export const TAMPIL_PEMILIH_GAYA = true;

/** Tiga ruangan dari kiri ke kanan. Lebarnya ikut `x0`–`x1` (meter), lantainya `warna`, karpetnya `karpet`. */
export const RUANGAN = [
  { key: 'bizdev', label: 'Riset', x0: -7, x1: -1.8, warna: '#d9e4dc', karpet: '#0f766e' },
  { key: 'keuangan', label: 'Naskah & Rilis', x0: -1.8, x1: 2, warna: '#efe6d0', karpet: '#c9a227' },
  { key: 'studio', label: 'Produksi', x0: 2, x1: 7, warna: '#d6dbe8', karpet: '#1e3a8a' },
] as const;
export type RoomKey = (typeof RUANGAN)[number]['key'];

export interface Agen {
  key: string;
  nama: string;
  /** Tugasnya, satu baris. */
  tugas: string;
  ruang: RoomKey;
  /** Warna baju. */
  warna: string;
  /** Posisi meja (x kiri–kanan −7…7, z belakang–depan −3…3). */
  x: number;
  z: number;
}

/** Enam agen. Tambah atau kurangi sesukamu (posisi meja jangan bertumpuk). */
export const AGEN: Agen[] = [
  { key: 'tara', nama: 'Tara', tugas: 'Pemburu tren', ruang: 'bizdev', warna: '#0f766e', x: -5.2, z: -1.4 },
  { key: 'bima', nama: 'Bima', tugas: 'Perencana konten', ruang: 'bizdev', warna: '#e4572e', x: -3.2, z: -1.4 },
  { key: 'fikri', nama: 'Fikri', tugas: 'Analis performa', ruang: 'bizdev', warna: '#8e6bd8', x: -4.2, z: 1.2 },
  { key: 'laila', nama: 'Laila', tugas: 'Penulis naskah', ruang: 'keuangan', warna: '#c9a227', x: -0.9, z: -1.4 },
  { key: 'hasan', nama: 'Hasan', tugas: 'Penjaga dalil', ruang: 'keuangan', warna: '#2a9d8f', x: 1.2, z: -1.0 },
  { key: 'nadia', nama: 'Nadia', tugas: 'Jadwal & unggah', ruang: 'keuangan', warna: '#ff5d8f', x: 0.2, z: 1.3 },
  { key: 'rafi', nama: 'Rafi', tugas: 'Storyboard', ruang: 'studio', warna: '#3a86ff', x: 3.2, z: -1.4 },
  { key: 'salma', nama: 'Salma', tugas: 'Pengisi suara', ruang: 'studio', warna: '#f2b134', x: 5.6, z: -1.2 },
  { key: 'dika', nama: 'Dika', tugas: 'Animasi motion graphic', ruang: 'studio', warna: '#7c3aed', x: 4.4, z: 1.2 },
];

export type Aktivitas = 'kerja' | 'laporan' | 'belajar';

/** Jadwal kerja (WIB). `agen: '*'` = semua agen. `hari` 1 = Senin … 7 = Minggu. `menit` = lama tampil. */
export const JADWAL: { agen: string[] | '*'; mulai: string; menit: number; hari: number[]; aktivitas: Aktivitas; label: string }[] = [
  ...['00:00','03:00','06:00','09:00','12:00','15:00','18:00','21:00'].flatMap((mulai) => [
    { agen: ['tara', 'bima'], mulai, menit: 20, hari: [1, 2, 3, 4, 5, 6, 7], aktivitas: 'kerja' as Aktivitas, label: 'cek tren & rencana pekan…' },
    { agen: ['laila', 'hasan'], mulai: addMin(mulai, 20), menit: 40, hari: [1, 2, 3, 4, 5, 6, 7], aktivitas: 'kerja' as Aktivitas, label: 'naskah & cek dalil…' },
    { agen: ['rafi', 'salma', 'dika'], mulai: addMin(mulai, 60), menit: 60, hari: [1, 2, 3, 4, 5, 6, 7], aktivitas: 'kerja' as Aktivitas, label: 'storyboard, suara, render…' },
    { agen: ['nadia', 'fikri'], mulai: addMin(mulai, 120), menit: 30, hari: [1, 2, 3, 4, 5, 6, 7], aktivitas: 'laporan' as Aktivitas, label: 'unggah, jadwal, laporan…' },
  ]),
];
function addMin(hm: string, m: number) {
  const t = (Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3)) + m) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** Jam kantor: di luar jadwal, agen "siap menerima perintah" (atau ngopi, lihat papan, ngobrol). */
export const JAM_KANTOR = { buka: '00:00', tutup: '23:59' };

export interface Laporan {
  /** Ringkasan hari ini (gelembung di atas kepala). */
  ringkasan?: string;
  /** Butir yang menunggu keputusanmu (tanda "!" dan Mission Board). */
  menunggu?: string[];
  /** Butir mendesak (mejanya berkedip). */
  mendesak?: string[];
  /** Angka hari ini (Mission Board). Jangan isi nominal uang kalau videonya mau dibagikan. */
  angka?: { label: string; nilai: string }[];
}

/**
 * Laporan hari ini per agen. Ini data contoh; untuk data asli, isi dari API/JSON agenmu (lihat README, "Sambungkan agen
 * asli").
 */
export const LAPORAN: Record<string, Laporan> = laporanAgen;

/** Timelapse: satu hari dalam tiga babak (detik = lama tiap babak di video). */
export const BABAK = [
  { dari: '00:00', sampai: '03:00', detik: 10, judul: 'Dini hari · riset' },
  { dari: '09:00', sampai: '12:00', detik: 10, judul: 'Siang · naskah & dalil' },
  { dari: '15:00', sampai: '18:00', detik: 10, judul: 'Sore · render & unggah' },
];
