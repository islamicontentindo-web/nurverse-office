/** Nadia — Penjadwal & Pengunggah. Selalu unggah sebagai PRIVATE. Mode "review": tunggu persetujuan dari HP. Mode "otomatis": langsung dijadwalkan. */
import { cfg, catat } from '../lib/util.mjs';
import * as yt from '../lib/youtube.mjs';

const SATU_HARI = 86400e3;

/** Slot tayang yang akan dipakai: slot rencana jika masih ≥ 18 jam lagi, kalau tidak slot yang sama pada pekan berikutnya. */
export function slotValid(item, sekarang = Date.now()) {
  let t = Date.parse(item.slot);
  while (t < sekarang + 18 * 3600e3) t += 7 * SATU_HARI;
  return new Date(t).toISOString();
}

function deskripsi(item, naskah, c = cfg()) {
  const dalil = (naskah.adegan ?? []).filter((a) => a.dalil).map((a) => `• ${a.dalil.label}`);
  const bagian = [naskah.deskripsi, dalil.length ? `Dalil yang dipakai:\n${dalil.join('\n')}\n(Teks dari api.alquran.cloud / sumber terverifikasi)` : '',
    naskah.kueri?.length ? naskah.kueri.map((k) => `#${k.replace(/\s+/g, '')}`).join(' ') : '',
    item.jenis === 'short' ? '#Shorts' : '', 'NURVERSE — cahaya untuk hati.' + (c.catatan_ai_di_deskripsi ? '\nKonten dibuat dengan bantuan AI (naskah, suara sintetis, animasi); dalil diambil dari sumber terverifikasi.' : '')];
  return bagian.filter(Boolean).join('\n\n');
}

export async function unggah(item, naskah, berkas, thumb) {
  const c = cfg();
  const review = c.mode_persetujuan !== 'otomatis';
  const slot = slotValid(item);
  const judul = item.jenis === 'short' && !/#shorts/i.test(naskah.judul) ? `${naskah.judul} #Shorts`.slice(0, 100) : naskah.judul;
  const id = await yt.unggah({ berkas, judul, deskripsi: deskripsi(item, naskah), tag: naskah.tag, publishAt: review ? undefined : slot, sintetis: c.ungkap_sintetis });
  if (thumb) { try { await yt.setThumbnail(id, thumb); } catch (e) { catat('nadia', `thumbnail gagal: ${e.message}`, 'peringatan'); } }
  return { ytId: id, slot, status: review ? 'menunggu_persetujuan' : 'terjadwal', judul };
}

/** Dipanggil dari approve.mjs. */
export async function putuskan(item, keputusan) {
  const c = cfg();
  if (keputusan === 'tolak') {
    return { hasil: 'ditolak', slot: item.slot };
  }
  const slot = slotValid(item);
  const lewat = Date.parse(item.slot) < Date.now() + 15 * 60e3;
  if (lewat && item.jenis === 'short') { // slot sudah lewat: tayang sekarang lebih baik daripada menunggu pekan depan
    await yt.aturStatus(item.ytId, { privasi: 'public', sintetis: c.ungkap_sintetis });
    return { hasil: 'tayang', slot: new Date().toISOString() };
  }
  await yt.aturStatus(item.ytId, { privasi: 'private', publishAt: slot, sintetis: c.ungkap_sintetis });
  return { hasil: 'terjadwal', slot };
}
