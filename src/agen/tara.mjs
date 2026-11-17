/** Tara — Pemburu Tren. Kumpulkan sinyal tanpa LLM: musim Hijriah, Google Trends ID, video outlier di niche (median kanal, metode yt-viral). */
import { cfg, P, writeJson, catat, isoWeek, S } from '../lib/util.mjs';
import { musim } from '../lib/hijri.mjs';
import * as yt from '../lib/youtube.mjs';

async function trendsID() {
  try {
    const r = await fetch('https://trends.google.com/trending/rss?geo=ID', { signal: AbortSignal.timeout(15000) });
    const x = await r.text();
    return [...x.matchAll(/<title>([^<]{2,80})<\/title>/g)].map((m) => m[1]).slice(1, 21);
  } catch { return []; }
}

export async function riset() {
  const c = cfg();
  const hasil = { dibuat: new Date().toISOString(), pekan: isoWeek().id, musim: musim(), tren_id: [], outlier: [], catatan: [] };
  if (process.env.MOCK) {
    hasil.outlier = [{ judul: 'Doa yang tertunda (contoh)', kanal: 'Kanal Contoh', tayang: 120000, kelipatan: 6.1, umur_hari: 9 }];
    writeJson(S('state/tren.json'), hasil);
    return hasil;
  }
  hasil.tren_id = await trendsID();
  if (!process.env.YT_API_KEY) {
    hasil.catatan.push('YT_API_KEY kosong: riset hanya memakai musim Hijriah & Google Trends');
  } else {
    try {
      const r = c.riset;
      const kand = [];
      for (const q of r.kata_kunci) kand.push(...(await yt.cariVideo(q, r.hari_terakhir, 10)));
      const stat = await yt.statVideo([...new Set(kand.map((k) => k.id))]);
      const perKanal = new Map();
      for (const v of stat.sort((a, b) => b.tayang - a.tayang)) if (!perKanal.has(v.kanalId)) perKanal.set(v.kanalId, v);
      for (const v of [...perKanal.values()].slice(0, r.maks_kanal_dianalisis)) {
        const u = (await yt.unggahanKanal(v.kanalId, 10)).filter((x) => x.id !== v.id);
        const med = yt.median(u.map((x) => x.tayang));
        if (u.length < 4 || med <= 0) continue; // butuh ≥4 video pembanding agar median bermakna
        hasil.outlier.push({ judul: v.judul, kanal: v.kanal, tayang: v.tayang, median_kanal: med, kelipatan: +(v.tayang / med).toFixed(1), umur_hari: Math.max(1, Math.round((Date.now() - Date.parse(v.terbit)) / 86400e3)) });
      }
      hasil.outlier.sort((a, b) => b.kelipatan - a.kelipatan);
    } catch (e) { hasil.catatan.push(`riset YouTube gagal: ${e.message}`); }
  }
  writeJson(S('state/tren.json'), hasil);
  catat('tara', `riset selesai: ${hasil.outlier.length} outlier, ${hasil.tren_id.length} tren ID`);
  return hasil;
}
