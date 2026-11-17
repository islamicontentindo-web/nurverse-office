/** Laila — Penulis Naskah. Naskah + paket judul/deskripsi dalam SATU panggilan (utama) atau satu panggilan untuk semua short. */
import { cfg } from '../lib/util.mjs';
import { tanya } from '../lib/llm.mjs';
import { ringkasBrand } from '../lib/brand.mjs';
import { pilihHook, lintPaket } from '../lib/hook.mjs';
import { daftarPilihan } from '../lib/dalil.mjs';

const SISTEM = () => `Kamu Laila, penulis naskah channel NURVERSE. Keluarkan HANYA JSON.\n${ringkasBrand()}`;

const FORMAT_ADEGAN = `adegan = array objek:
 {"jenis":"renungan|poin|ayat|hadis|penutup","judul":"(opsional, jenis poin)","narasi":"kalimat yang DIBACAKAN (kosongkan utk ayat/hadis)","teks":["maks 3 baris tampil, tiap baris ≤ 45 huruf"],"motif":"bintang|arabesk|cahaya|bulan|kubah|gelombang"}
 ayat: tambahkan "ref":"surah:ayat" atau "surah:ayat-ayat" (maks 3 ayat). hadis: "buku" dan "nomor" (hanya bila yakin) ATAU "ref":"pilihan:kunci".
 Adegan pertama = jenis "renungan" berisi hook (narasi = hook). Adegan terakhir = "penutup" dengan SATU ajakan.`;

function pilihanInfo() {
  const p = daftarPilihan();
  return p.length ? `Dalil pilihan yang boleh dipakai (ref "pilihan:kunci"): ${p.map((x) => `${x.kunci}=${x.label}`).join('; ')}` : '';
}

function rapikanAdegan(arr, maks) {
  const ok = new Set(['renungan', 'poin', 'ayat', 'hadis', 'penutup']);
  return (arr ?? []).filter((a) => ok.has(a?.jenis)).slice(0, maks).map((a) => ({
    jenis: a.jenis, judul: a.judul ? String(a.judul).slice(0, 60) : undefined, narasi: String(a.narasi ?? '').trim(),
    teks: (a.teks ?? []).slice(0, 3).map((t) => String(t).slice(0, 52)), motif: a.motif ?? 'bintang',
    ...(a.jenis === 'ayat' ? { ref: String(a.ref ?? '') } : {}), ...(a.jenis === 'hadis' ? { buku: a.buku, nomor: Number(a.nomor) || undefined, ref: a.ref } : {}),
  }));
}

function paket(r, item, hookTerpilih) {
  const judulOk = (r.judul ?? []).map(String).find((j) => lintPaket(j, r.thumb).length === 0) ?? String(r.judul?.[0] ?? item.topik).slice(0, 60);
  return {
    hook: hookTerpilih, judul: judulOk.slice(0, 100), thumb: String(r.thumb ?? '').split(/\s+/).slice(0, 3).join(' '),
    deskripsi: String(r.deskripsi ?? ''), tag: (r.tag ?? []).map(String).slice(0, 12), kueri: (r.kueri ?? []).map(String).slice(0, 4),
    masalah_paket: lintPaket(judulOk, r.thumb),
  };
}
function pasangHook(adegan, hooks) {
  const urut = pilihHook(hooks.map(String));
  const terbaik = urut[0];
  if (terbaik && adegan[0]) { adegan[0].narasi = terbaik.h; adegan[0].jenis = 'renungan'; }
  return { teks: terbaik?.h ?? '', skor: terbaik?.skor ?? 0, panel: terbaik?.panel ?? {}, semua: urut.map((x) => [x.h, x.skor]) };
}

export async function tulisUtama(item, tren) {
  const c = cfg();
  const [k0, k1] = c.durasi.utama_kata;
  const r = await tanya('script_main', SISTEM(), `Tulis naskah video utama (±${k0}-${k1} kata narasi total, 9-13 adegan, ±6-8 menit).
topik: ${item.topik}\nsudut: ${item.sudut}\nformula hook: ${item.formula}\nrujukan dalil yang direncanakan: ${JSON.stringify(item.dalil)}\n${pilihanInfo()}
Setiap adegan narasi ≤ 70 kata. Beri 5 kandidat hook berbeda (hooks), 4 kandidat judul (judul, ≤ 60 huruf, inti di 40 huruf pertama), thumb (≤ 3 kata, tidak mengulang judul), deskripsi (2-3 kalimat, tanpa ayat/hadis yang tidak ada di adegan), tag (8-12), kueri (3 frasa pencarian orang Indonesia).
${FORMAT_ADEGAN}
Format: {"hooks":[],"judul":[],"thumb":"","adegan":[],"deskripsi":"","tag":[],"kueri":[]}`, { kelas: 'naskah', suhu: 0.85, maks: 7000 });
  const adegan = rapikanAdegan(r.adegan, 14);
  if (adegan.length < 4) throw new Error('naskah utama terlalu pendek/tidak valid');
  const hook = pasangHook(adegan, r.hooks ?? []);
  return { adegan, ...paket(r, item, hook.teks), hook_info: hook };
}

export async function tulisShorts(items) {
  const c = cfg();
  const [k0, k1] = c.durasi.short_kata;
  const r = await tanya('script_shorts', SISTEM(), `Tulis ${items.length} naskah short vertikal (tiap short ${k0}-${k1} kata narasi total, 3-5 adegan, ±35-50 detik). Tiap short satu sudut berbeda, berdiri sendiri, hook di kalimat pertama, akhir short menyambung ke awal (loop). jumlah=${items.length} ids=${items.map((i) => i.id).join(',')}
${items.map((i) => `- ${i.id}: topik "${i.topik}", sudut "${i.sudut}", formula ${i.formula}, dalil ${JSON.stringify(i.dalil)}`).join('\n')}
${pilihanInfo()}
${FORMAT_ADEGAN}
Per short: {"id":"","hooks":[3 kandidat],"judul":"≤ 60 huruf","thumb":"","adegan":[],"deskripsi":"1-2 kalimat","tag":[]}
Format: {"short":[...]}`, { kelas: 'naskah', suhu: 0.85, maks: 6000 });
  const out = {};
  for (const it of items) {
    const s = (r.short ?? []).find((x) => x.id === it.id) ?? r.short?.[items.indexOf(it)];
    if (!s) continue;
    const adegan = rapikanAdegan(s.adegan, 6);
    if (adegan.length < 2) continue;
    const hook = pasangHook(adegan, s.hooks ?? []);
    out[it.id] = { adegan, ...paket({ judul: [s.judul], thumb: s.thumb, deskripsi: s.deskripsi, tag: s.tag }, it, hook.teks), hook_info: hook };
  }
  return out;
}

export async function revisi(item, naskah, masalah) {
  const r = await tanya('script_main', SISTEM(), `Revisi naskah ini. Masalah yang HARUS diperbaiki: ${masalah.join('; ')}.
Aturan: tulis ulang hanya adegan yang bermasalah; jangan menyebut hadis/firman/ulama kecuali ada adegan dalil terverifikasi; jangan memvonis hukum.
naskah: ${JSON.stringify(naskah.adegan)}
Format: {"hooks":[naskah.hook],"judul":[judul],"thumb":"","adegan":[...],"deskripsi":"","tag":[],"kueri":[]}\n${FORMAT_ADEGAN}`, { kelas: 'naskah', suhu: 0.5, maks: 7000 });
  const adegan = rapikanAdegan(r.adegan, item.jenis === 'utama' ? 14 : 6);
  if (adegan.length < 2) throw new Error('revisi tidak valid');
  const hook = pasangHook(adegan, r.hooks ?? [naskah.hook]);
  return { adegan, ...paket({ ...r, judul: r.judul ?? [naskah.judul], thumb: r.thumb ?? naskah.thumb, deskripsi: r.deskripsi ?? naskah.deskripsi, tag: r.tag ?? naskah.tag }, item, hook.teks), hook_info: hook };
}
