/**
 * Penilai hook & paket judul berbahasa Indonesia (heuristik, nol token).
 * Diadaptasi dari hookscore.py / title.py (youtube-agent-skill, MIT) yang dikalibrasi untuk bahasa Inggris.
 * Ini heuristik, bukan peramal: nilai rendah = alasan menulis ulang, nilai tinggi bukan janji viral.
 */
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const words = (t) => t.toLowerCase().match(/[a-z0-9'%]+/g) ?? [];
const VAGUE = new Set(['luar', 'biasa', 'dahsyat', 'hebat', 'terbaik', 'ajaib', 'fantastis', 'menakjubkan', 'rahasia', 'viral']);
const FILLER = new Set(['assalamualaikum', 'halo', 'hai', 'selamat', 'datang', 'video', 'kali', 'ini', 'subscribe', 'channel', 'sobat']);
const KAMU = /\b(kamu|anda|engkau|dirimu|hatimu|kita|kalian)\b/i;
const STAKE = /\b(rugi|hilang|menyesal|terlambat|jangan|sebelum|binasa|celaka|lalai|lupa|gagal|menyesali|tersesat|sia-sia|terlanjur)\b/i;
const CURIOUS = /\b(kenapa|mengapa|bagaimana|apa|siapa|ternyata|tapi|namun|bukan|hanya|sampai|padahal|rahasia)\b/i;
const CONCRETE = /\b\d+([.,]\d+)?\s?(%|detik|menit|jam|hari|malam|tahun|kali|ayat|surah|rakaat)?\b/i;

export function skorHook(t) {
  const w = words(t);
  if (!w.length) return { skor: 0, panel: {} };
  const spes = clamp(34 + (CONCRETE.test(t) ? 22 : 0) - w.filter((x) => VAGUE.has(x)).length * 14 - w.filter((x) => FILLER.has(x)).length * 8
    + Math.min(18, 6 * t.split(/\s+/).slice(1).filter((x) => /^[A-Z]/.test(x)).length));
  const sapa = clamp(26 + (t.match(new RegExp(KAMU, 'gi')) ?? []).length * 20 + (KAMU.test(t.split(/\s+/).slice(0, 6).join(' ')) ? 30 : 0));
  const taruhan = clamp(22 + (t.match(new RegExp(STAKE, 'gi')) ?? []).length * 26 + (CONCRETE.test(t) ? 14 : 0));
  const penasaran = clamp(24 + (t.match(new RegExp(CURIOUS, 'gi')) ?? []).length * 17 + (t.trim().endsWith('?') ? 18 : 0) - (/\b(karena itu|sehingga|artinya)\b/i.test(t) ? 18 : 0));
  const ringkas = clamp(w.length <= 18 ? 90 : w.length <= 26 ? 70 : 100 - (w.length - 18) * 6);
  const panel = { spesifik: spes, menyapa: sapa, taruhan, penasaran, ringkas };
  const v = Object.values(panel);
  return { skor: clamp(0.6 * (v.reduce((a, b) => a + b, 0) / v.length) + 0.4 * Math.min(...v)), panel };
}
export const pilihHook = (hooks) => hooks.map((h) => ({ h, ...skorHook(h) })).sort((a, b) => b.skor - a.skor);

/** Lint judul + teks thumbnail sebagai satu paket. Mengembalikan daftar masalah. */
export function lintPaket(judul, thumb = '') {
  const m = [];
  if (judul.length > 60) m.push(`judul ${judul.length} huruf, terpotong di pencarian desktop (maks 60)`);
  if ((judul.match(/\b[A-Z]{3,}\b/g) ?? []).length > 2) m.push('lebih dari 2 kata KAPITAL: terkesan spam');
  const tw = thumb.trim().split(/\s+/).filter(Boolean);
  if (tw.length > 3) m.push(`thumbnail ${tw.length} kata (maks 3)`);
  const jw = new Set(words(judul));
  if (tw.length && tw.every((x) => jw.has(x.toLowerCase()))) m.push('teks thumbnail hanya mengulang judul');
  return m;
}
