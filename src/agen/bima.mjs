/** Bima — Perencana Konten. Satu panggilan LLM per pekan: 1 video utama + N short (yt-plan: short = potongan sudut dari tema yang sama). */
import { cfg, readJson, P, S } from '../lib/util.mjs';
import { tanya } from '../lib/llm.mjs';
import { ringkasBrand } from '../lib/brand.mjs';

const SISTEM = () => `Kamu Bima, perencana konten channel NURVERSE. Keluarkan HANYA JSON.\n${ringkasBrand()}`;

export async function rencana(tren, pelajaran = []) {
  const c = cfg();
  const n = c.ritme.short_per_minggu;
  const prompt = `Rencanakan 1 video utama dan ${n} short untuk pekan ini. Semua short menggali SUDUT berbeda dari tema pekan yang sama dengan video utama (bukan topik acak), dan boleh mengarahkan ke video utama.
niche: ${c.niche.join('; ')}
musim: ${JSON.stringify(tren.musim)}
tren ID: ${(tren.tren_id ?? []).slice(0, 10).join(', ') || '-'}
video outlier niche (kelipatan dari median kanal): ${JSON.stringify((tren.outlier ?? []).slice(0, 5).map((o) => [o.judul, o.kelipatan]))}
pelajaran dari video kita sebelumnya: ${JSON.stringify(pelajaran.slice(0, 5))}
terlarang: ${c.topik_terlarang.join('; ')}
Formula hook yang boleh dipakai: pertanyaan-yang-tak-bisa-ditutup, pernyataan-tegas, kesalahan-umum, taruhan-kehilangan, angka-spesifik.
Dalil: beri rujukan saja. ayat: ["surah:ayat" atau "surah:ayat-ayat"] yang benar-benar kamu yakini ada dan relevan; hadis: [{"buku":"bukhari|muslim|tirmidzi|nasai|abudaud|ibnumajah","nomor":angka}] HANYA bila kamu yakin nomornya, jika ragu kosongkan [].
Format: {"tema_pekan":"","utama":{"topik":"","sudut":"","formula":"","dalil":{"ayat":[],"hadis":[]}},"short":[{"topik":"","sudut":"","formula":"","dalil":{"ayat":[],"hadis":[]}}]} dengan tepat ${n} short.`;
  const r = await tanya('plan', SISTEM(), prompt, { kelas: 'ringan', suhu: 0.8, maks: 2500 });
  if (!r?.utama?.topik || !Array.isArray(r.short) || !r.short.length) throw new Error('rencana Bima tidak valid');
  const rapi = (d = {}) => ({ ayat: (d.ayat ?? []).map(String).slice(0, 3), hadis: (d.hadis ?? []).slice(0, 1) });
  const norm = (x) => ({ topik: String(x.topik), sudut: String(x.sudut ?? ''), formula: String(x.formula ?? ''), dalil: rapi(x.dalil) });
  return { tema: r.tema_pekan ?? r.utama.topik, utama: norm(r.utama), short: r.short.slice(0, n).map(norm) };
}

export const pelajaran = () => readJson(S('state/performa.json'), { pelajaran: [] }).pelajaran;
