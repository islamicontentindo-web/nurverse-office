/** Fikri — Analis Performa. Tanpa LLM: ambil statistik video tayang, simpan "pelajaran" ringkas untuk Bima. */
import { P, readJson, writeJson, catat, S } from '../lib/util.mjs';
import * as yt from '../lib/youtube.mjs';

export async function analisis(items) {
  const f = S('state/performa.json');
  const lama = readJson(f, { video: {}, pelajaran: [] });
  const tayang = items.filter((i) => i.ytId && ['tayang', 'terjadwal'].includes(i.status));
  if (!tayang.length || !process.env.YT_API_KEY || process.env.MOCK) return lama;
  try {
    const st = await yt.statVideo(tayang.map((i) => i.ytId));
    for (const s of st) {
      const it = tayang.find((i) => i.ytId === s.id);
      lama.video[it.id] = { tayang: s.tayang, suka: s.suka, komentar: s.komentar, privasi: s.privasi, formula: it.formula, jenis: it.jenis, judul: it.judul ?? it.topik, cek: new Date().toISOString() };
    }
    lama.pelajaran = Object.values(lama.video).filter((v) => v.privasi === 'public').sort((a, b) => b.tayang - a.tayang).slice(0, 5).map((v) => `${v.jenis}/${v.formula}: ${v.tayang} tayang`);
    writeJson(f, lama);
    catat('fikri', `statistik ${st.length} video diperbarui`);
  } catch (e) { catat('fikri', `statistik gagal: ${e.message}`, 'peringatan'); }
  return lama;
}
