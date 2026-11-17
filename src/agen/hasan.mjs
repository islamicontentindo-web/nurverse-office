/** Hasan — Penjaga Dalil. Ambil dalil dari sumber terverifikasi, pindai klaim (tanpa token), lalu audit semantik batch (1 panggilan). */
import { cfg } from '../lib/util.mjs';
import { tanya } from '../lib/llm.mjs';
import { ambilAyat, ambilHadis, ambilPilihan, pindaiKlaim } from '../lib/dalil.mjs';

/** Mengubah naskah di tempat: adegan dalil yang tidak bisa diverifikasi DIBUANG. Mengembalikan {terverifikasi, masalah, dibuang}. */
export async function verifikasi(naskah) {
  const ter = [], dibuang = [], keep = [];
  for (const a of naskah.adegan) {
    if (a.jenis !== 'ayat' && a.jenis !== 'hadis') { keep.push(a); continue; }
    let d = null;
    if (a.ref?.startsWith('pilihan:')) d = ambilPilihan(a.ref);
    else if (a.jenis === 'ayat') d = await ambilAyat(a.ref);
    else d = await ambilHadis(String(a.buku ?? ''), a.nomor);
    if (d) { a.dalil = d; ter.push(d); keep.push(a); }
    else dibuang.push(a.ref ?? `${a.buku}:${a.nomor}`);
  }
  naskah.adegan = keep;
  const narasi = keep.filter((a) => a.jenis !== 'ayat' && a.jenis !== 'hadis').map((a) => a.narasi).join(' ');
  const masalah = pindaiKlaim(narasi, ter);
  const gelap = cfg().topik_terlarang.filter((k) => narasi.toLowerCase().includes(k.toLowerCase()));
  if (gelap.length) masalah.push(`menyentuh topik terlarang: ${gelap.join(', ')}`);
  return { terverifikasi: ter, masalah, dibuang };
}

/** Audit makna oleh LLM untuk semua item sekaligus (hemat token). daftar: [{id, narasi, dalil:[{label,arti}]}] */
export async function auditBatch(daftar) {
  if (!daftar.length) return {};
  const r = await tanya('audit', `Kamu Hasan, penjaga akurasi dalil NURVERSE. Keluarkan HANYA JSON. Bersikap ketat tapi tidak mengada-ada.`,
    `Periksa tiap naskah. Laporkan masalah HANYA jika nyata: (a) narasi memutarbalikkan atau melebihi makna terjemah dalil yang disertakan; (b) memberi vonis hukum/fatwa; (c) klaim fakta/angka/sejarah tanpa sumber yang bisa menyesatkan; (d) mengisyaratkan jaminan duniawi pasti dari doa/amal; (e) menakut-nakuti berlebihan atau mengkafirkan.
${JSON.stringify(daftar)}
Format: {"hasil":[{"id":"","ok":true,"masalah":["..."]}]}`, { kelas: 'ringan', suhu: 0.1, maks: 1500 });
  const out = {};
  for (const h of r.hasil ?? r.hasil_audit ?? []) out[h.id] = { ok: h.ok !== false && !(h.masalah?.length), masalah: h.masalah ?? [] };
  if (process.env.MOCK) for (const d of daftar) out[d.id] ??= { ok: true, masalah: [] };
  return out;
}
