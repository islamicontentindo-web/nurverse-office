/** Rafi — Sutradara Storyboard. Deterministik (nol token): naskah terverifikasi -> daftar adegan siap suara & render sesuai gaya video. */
import { tema } from '../lib/brand.mjs';
import { cfg } from '../lib/util.mjs';

const LATAR = ['malam', 'masjid', 'cahaya', 'lentera', 'fajar', 'gelap'];
const AKSI = ['berdiri', 'sholat', 'ruku', 'sujud', 'duduk', 'berdoa', 'tunduk', 'kosong'];
const PROP = ['rumah', 'pintu', 'batu', 'saf', 'siluet'];

function dalilAdegan(a) {
  const d = a.dalil;
  return {
    tipe: d.jenis === 'ayat' ? 'ayat' : 'hadis', arab: d.arab, arti: d.arti, label: d.label, caption: false, teks: [],
    narasi: d.jenis === 'ayat' && d.surah
      ? `Allah berfirman dalam surah ${d.surah}, ayat ${d.a0}${d.a1 > d.a0 ? ` sampai ${d.a1}` : ''}. Artinya: ${d.arti}`
      : `Rasulullah ﷺ bersabda: ${d.arti}`,
  };
}

function susunGeometri(naskah) {
  const motif = tema().motif;
  let prev = '';
  return naskah.adegan.map((a, i) => {
    let m = motif.includes(a.motif) ? a.motif : motif[i % motif.length];
    if (m === prev) m = motif[(motif.indexOf(m) + 1) % motif.length];
    prev = m;
    const s = { i, tipe: a.jenis, motif: m, judul: a.judul ?? '', teks: a.teks ?? [], caption: true };
    if (a.jenis === 'ayat' || a.jenis === 'hadis') Object.assign(s, dalilAdegan(a));
    else { s.narasi = a.narasi; if (!s.teks.length) s.teks = [a.narasi.split(/(?<=[.?!])\s/)[0].slice(0, 52)]; }
    return s;
  });
}

function susunIlustrasi(naskah) {
  const handle = cfg().channel.handle ?? '';
  const dalil = naskah.adegan.find((a) => a.dalil)?.dalil;
  let prevLatar = '';
  return naskah.adegan.map((a, i) => {
    const tipe = a.jenis;
    let latar = LATAR.includes(a.latar) ? a.latar : tipe === 'ayat' || tipe === 'hadis' ? 'lentera' : tipe === 'penutup' ? 'malam' : LATAR[i % 5];
    if (latar === prevLatar && tipe !== 'ayat' && tipe !== 'hadis') latar = LATAR[(LATAR.indexOf(latar) + 1) % 5];
    prevLatar = latar;
    const prop = (a.prop ?? []).filter((p) => PROP.includes(p));
    const aksi = AKSI.includes(a.aksi) ? a.aksi : 'berdiri';
    const s = { i, tipe, motif: 'bulan', latar, prop, aktor: aksi === 'kosong' ? [] : [aksi], sorot: a.sorot ?? '', caption: false };
    if (tipe === 'ayat' || tipe === 'hadis') Object.assign(s, dalilAdegan(a), { latar: 'lentera', prop: [], aktor: [], pill: a.dalil.label, pillGaya: 'd' });
    else {
      s.narasi = a.narasi;
      s.teks = (a.teks?.length ? a.teks : [a.narasi.split(/(?<=[.?!,])\s/)[0].slice(0, 40)]).slice(0, 2);
      if (tipe === 'penutup') Object.assign(s, { handle, latar: 'malam', aktor: aksi === 'kosong' ? ['duduk'] : [aksi] });
    }
    if (i === 0) s.hud = { label: naskah.label || String(naskah.judul).split(/\s+/).slice(0, 3).join(' ').toUpperCase(), baris: (dalil?.label ?? naskah.judul).toUpperCase().slice(0, 30) };
    return s;
  });
}

export function susun(item, naskah) {
  const gaya = item.gaya ?? 'geometri';
  return {
    id: item.id, jenis: item.jenis, gaya, ukuran: item.jenis === 'utama' ? [1920, 1080] : [1080, 1920],
    judul: naskah.judul, thumb: naskah.thumb, adegan: gaya === 'ilustrasi' ? susunIlustrasi(naskah) : susunGeometri(naskah),
  };
}
