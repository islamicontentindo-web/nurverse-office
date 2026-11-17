/**
 * Satu "denyut" kantor. Dijalankan GitHub Actions tiap 3 jam (atau manual, atau di laptop).
 * Idempoten & bisa dilanjutkan: status tiap video tersimpan di state/antrean.json.
 *   perencanaan (Tara,Bima) -> naskah (Laila) -> dalil (Hasan) -> storyboard (Rafi) -> suara (Salma) -> animasi (Dika) -> unggah (Nadia)
 */
import fs from 'node:fs';
import { cfg, S, readJson, writeJson, catat, isoWeek, fromWib, addDays, wib } from './lib/util.mjs';
import { muat, simpan, tambahPekan, pekanSudahAda, dirItem } from './lib/antrean.mjs';
import { kirim } from './lib/notify.mjs';
import * as yt from './lib/youtube.mjs';
import { riset } from './agen/tara.mjs';
import { rencana, pelajaran } from './agen/bima.mjs';
import { tulisUtama, tulisShorts, revisi } from './agen/laila.mjs';
import { verifikasi, auditBatch } from './agen/hasan.mjs';
import { susun } from './agen/rafi.mjs';
import { bersuara } from './agen/salma.mjs';
import { render, thumbnail } from './agen/dika.mjs';
import { unggah } from './agen/nadia.mjs';
import { tulisLaporan } from './laporan.mjs';
import { analisis } from './agen/fikri.mjs';

const demo = process.argv.includes('--demo');
if (demo) process.env.NURVERSE_RUN = '1';
const mulai = Date.now();
const c = cfg();
const habis = () => Date.now() - mulai > c.tick.maks_menit * 60e3;
const AKTIF = ['rencana', 'naskah', 'lolos_dalil', 'storyboard'];
const peringatan = [];

/** Pekan yang direncanakan: pekan ini bila slot utama masih ≥ 48 jam lagi, jika tidak pekan depan. */
function pekanTarget(sekarang = new Date()) {
  const p = isoWeek(sekarang);
  const u = c.jadwal_tayang_wib.utama;
  const slot = fromWib(addDays(p.senin, u.hari - 1), u.jam);
  return slot - sekarang >= 48 * 3600e3 ? p : isoWeek(new Date(sekarang.getTime() + 7 * 86400e3));
}

const simpanNaskah = (it, n) => writeJson(`${dirItem(it.id)}/naskah.json`, n);
const bacaNaskah = (it) => readJson(`${dirItem(it.id)}/naskah.json`);

function gagal(it, e, tahap) {
  it.percobaan = (it.percobaan ?? 0) + 1;
  it.galat = `${tahap}: ${e.message}`.slice(0, 300);
  if (it.percobaan >= c.tick.maks_percobaan) it.status = 'butuh_manusia';
  catat('tick', `${it.id} gagal di ${tahap} (percobaan ${it.percobaan}): ${e.message}`, 'galat');
  peringatan.push(`${it.id}: ${it.galat}`);
}

async function main() {
  catat('tick', `denyut dimulai${demo ? ' (DEMO, data palsu)' : ''}`);
  const q = muat();

  /* 1. Perencanaan pekan: Tara (riset) -> Bima (rencana, 1 panggilan LLM) */
  const pekan = pekanTarget();
  if (!pekanSudahAda(q, pekan.id)) {
    try {
      const tren = await riset();
      const r = await rencana(tren, pelajaran());
      tambahPekan(q, pekan, r, c);
      catat('bima', `rencana ${pekan.id}: "${r.utama.topik}" + ${r.short.length} short`);
      await kirim(`📅 NURVERSE: rencana pekan ${pekan.id} siap.\nUtama: ${r.utama.topik}`);
    } catch (e) { catat('bima', `rencana gagal: ${e.message}`, 'galat'); peringatan.push(`rencana: ${e.message}`); }
    simpan(q);
  }

  const urut = q.items.filter((i) => AKTIF.includes(i.status) && (i.percobaan ?? 0) < c.tick.maks_percobaan).sort((a, b) => a.slot.localeCompare(b.slot));
  const kerja = demo ? urut.filter((i) => i.jenis === 'short').slice(0, 1) : urut; // naskah ditulis untuk semua yang direncanakan
  const batas = demo ? 1 : c.tick.maks_item_per_tick;

  /* 2. Naskah (Laila): utama sendiri, short sekaligus dalam satu panggilan */
  try {
    const perlu = kerja.filter((i) => i.status === 'rencana');
    const utama = perlu.find((i) => i.jenis === 'utama');
    if (utama && !demo) { simpanNaskah(utama, await tulisUtama(utama)); utama.status = 'naskah'; catat('laila', `naskah utama: "${bacaNaskah(utama).judul}"`); simpan(q); }
    const shorts = perlu.filter((i) => i.jenis === 'short');
    if (shorts.length) {
      const hasil = await tulisShorts(shorts);
      for (const it of shorts) if (hasil[it.id]) { simpanNaskah(it, hasil[it.id]); it.status = 'naskah'; }
      catat('laila', `${Object.keys(hasil).length}/${shorts.length} naskah short`);
      simpan(q);
    }
  } catch (e) { catat('laila', `menulis gagal: ${e.message}`, 'galat'); peringatan.push(`naskah: ${e.message}`); }

  /* 3. Dalil (Hasan): verifikasi + pindai + audit semantik batch + maks 1 revisi */
  const diaudit = q.items.filter((i) => i.status === 'naskah');
  if (diaudit.length) {
    try {
      const pack = [];
      for (const it of diaudit) { const n = bacaNaskah(it); const v = await verifikasi(n); pack.push({ it, n, v }); }
      const llm = await auditBatch(pack.map(({ it, n, v }) => ({ id: it.id, narasi: n.adegan.filter((a) => !a.dalil).map((a) => a.narasi).join(' '), dalil: v.terverifikasi.map((d) => ({ label: d.label, arti: d.arti.slice(0, 300) })) })));
      for (const { it, n, v } of pack) {
        let masalah = [...v.masalah, ...(llm[it.id]?.masalah ?? [])];
        if (masalah.length && !it.revisi) {
          it.revisi = 1;
          try {
            const n2 = await revisi(it, n, masalah);
            const v2 = await verifikasi(n2);
            masalah = v2.masalah;
            if (!masalah.length) { simpanNaskah(it, n2); catat('hasan', `${it.id} lolos setelah revisi`); }
          } catch (e) { catat('hasan', `revisi gagal: ${e.message}`, 'peringatan'); }
        } else if (!masalah.length) simpanNaskah(it, n);
        if (masalah.length) { it.status = 'butuh_manusia'; it.galat = `dalil/naskah: ${masalah.join('; ')}`.slice(0, 300); catat('hasan', `${it.id} ditahan: ${it.galat}`, 'peringatan'); peringatan.push(`${it.id} ditahan: ${it.galat}`); }
        else { it.status = 'lolos_dalil'; if (v.dibuang.length) catat('hasan', `${it.id}: dalil dibuang (tak terverifikasi): ${v.dibuang.join(', ')}`, 'peringatan'); }
      }
    } catch (e) { catat('hasan', `audit gagal: ${e.message}`, 'galat'); peringatan.push(`audit: ${e.message}`); }
    simpan(q);
  }

  /* 4. Produksi per video: storyboard -> suara -> animasi -> unggah (atomik per video; file besar tidak disimpan di git) */
  let n = 0;
  for (const it of q.items.filter((i) => ['lolos_dalil', 'storyboard'].includes(i.status) && (i.percobaan ?? 0) < c.tick.maks_percobaan).sort((a, b) => a.slot.localeCompare(b.slot))) {
    if (n >= batas || habis()) break;
    n++;
    let tahap = 'storyboard';
    try {
      const naskah = bacaNaskah(it);
      let sb = susun(it, naskah);
      writeJson(`${dirItem(it.id)}/storyboard.json`, sb);
      it.status = 'storyboard';
      tahap = 'suara'; sb = await bersuara(sb, S('tmp', it.id));
      tahap = 'animasi'; catat('dika', `render ${it.id} (${sb.adegan.length} adegan)…`);
      const out = await render(sb, S('tmp', it.id), { onProgress: (a, b) => console.log(`  adegan ${a}/${b}`) });
      let thumb = null;
      if (it.jenis === 'utama') thumb = await thumbnail(sb, S('tmp', it.id, 'thumb.jpg'));
      it.detik = Math.round(out.detik);
      tahap = 'unggah';
      const hasil = process.env.MOCK ? { ytId: 'DEMO', slot: it.slot, status: 'menunggu_persetujuan', judul: naskah.judul } : await unggah(it, naskah, out.berkas, thumb);
      Object.assign(it, { ytId: hasil.ytId, slot: hasil.slot, status: hasil.status, judul: hasil.judul, galat: undefined, percobaan: 0 });
      catat('nadia', `${it.id} terunggah (${hasil.status}), tayang ${hasil.slot}`);
      await kirim(`🎬 NURVERSE: "${hasil.judul}" ${hasil.status === 'menunggu_persetujuan' ? 'menunggu persetujuanmu' : 'dijadwalkan'}.\nTayang: ${hasil.slot}`);
      if (!demo) fs.rmSync(S('tmp', it.id), { recursive: true, force: true });
    } catch (e) { gagal(it, e, tahap); }
    simpan(q);
  }

  /* 5. Pantau: jadwal sudah lewat -> apakah benar publik? (video bisa tertahan private bila proyek API belum diaudit) */
  if (!process.env.MOCK && process.env.YT_API_KEY) {
    const cek = q.items.filter((i) => i.status === 'terjadwal' && i.ytId && Date.parse(i.slot) < Date.now() - 20 * 60e3);
    if (cek.length) try {
      for (const s of await yt.statVideo(cek.map((i) => i.ytId))) {
        const it = cek.find((i) => i.ytId === s.id);
        it.status = s.privasi === 'public' ? 'tayang' : 'terkunci_private';
        if (it.status === 'terkunci_private') { peringatan.push(`${it.id} belum publik padahal jadwal lewat: publikkan dari YouTube Studio di HP`); await kirim(`⚠️ NURVERSE: "${it.judul}" masih PRIVATE padahal jadwal lewat. Buka YouTube Studio di HP & publikkan.`); }
      }
    } catch (e) { catat('nadia', `cek tayang gagal: ${e.message}`, 'peringatan'); }
  }

  await analisis(q.items);
  simpan(q);
  tulisLaporan(q, peringatan);
  catat('tick', `selesai dalam ${Math.round((Date.now() - mulai) / 1000)} detik`);
  if (peringatan.length && !demo) await kirim(`⚠️ NURVERSE butuh perhatian:\n- ${peringatan.slice(0, 5).join('\n- ')}`);
}

main().catch(async (e) => { catat('tick', `FATAL ${e.message}`, 'galat'); try { await kirim(`❌ NURVERSE tick gagal: ${e.message}`); } catch {} process.exitCode = 1; });
