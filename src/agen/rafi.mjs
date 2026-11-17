/** Rafi — Sutradara Storyboard. Deterministik (nol token): naskah terverifikasi -> daftar adegan siap suara & render sesuai standar brand. */
import { tema } from '../lib/brand.mjs';

export function susun(item, naskah) {
  const motif = tema().motif;
  let prev = '';
  const adegan = naskah.adegan.map((a, i) => {
    let m = motif.includes(a.motif) ? a.motif : motif[i % motif.length];
    if (m === prev) m = motif[(motif.indexOf(m) + 1) % motif.length];
    prev = m;
    const s = { i, tipe: a.jenis, motif: m, judul: a.judul ?? '', teks: a.teks ?? [], caption: true };
    if (a.jenis === 'ayat' || a.jenis === 'hadis') {
      const d = a.dalil;
      s.tipe = d.jenis === 'ayat' ? 'ayat' : 'hadis';
      s.arab = d.arab; s.arti = d.arti; s.label = d.label; s.caption = false; s.teks = [];
      s.narasi = d.jenis === 'ayat' && d.surah
        ? `Allah berfirman dalam surah ${d.surah}, ayat ${d.a0}${d.a1 > d.a0 ? ` sampai ${d.a1}` : ''}. Artinya: ${d.arti}`
        : `Rasulullah ﷺ bersabda: ${d.arti}`;
    } else {
      s.narasi = a.narasi;
      if (!s.teks.length) s.teks = [a.narasi.split(/(?<=[.?!])\s/)[0].slice(0, 52)];
    }
    return s;
  });
  return {
    id: item.id, jenis: item.jenis, ukuran: item.jenis === 'utama' ? [1920, 1080] : [1080, 1920],
    judul: naskah.judul, thumb: naskah.thumb, adegan,
  };
}
