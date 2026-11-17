/** Menulis dua berkas yang dibaca layar: laporan.json (kantor 3D) dan hp/status.json (pemantau HP). */
import { P, S, readJson, writeJson, wib, cfg } from './lib/util.mjs';
import { muat } from './lib/antrean.mjs';
import { pakai } from './lib/llm.mjs';

const LABEL = { rencana: 'direncanakan', naskah: 'naskah ditulis', lolos_dalil: 'dalil lolos', storyboard: 'sedang diproduksi', menunggu_persetujuan: 'menunggu persetujuanmu', terjadwal: 'terjadwal', tayang: 'tayang', terkunci_private: 'tertahan private', ditolak: 'ditolak', butuh_manusia: 'butuh bantuanmu' };
const hitung = (items, f) => items.filter(f).length;

export function tulisLaporan(q = muat(), peringatan = []) {
  const items = q.items;
  const c = cfg();
  const tren = readJson(S('state/tren.json'), {});
  const kini = items.filter((i) => !['tayang', 'ditolak'].includes(i.status));
  const tunggu = items.filter((i) => i.status === 'menunggu_persetujuan');
  const tahan = items.filter((i) => ['butuh_manusia', 'terkunci_private'].includes(i.status));
  const dekat = (i) => Date.parse(i.slot) - Date.now() < 24 * 3600e3;
  const punya = (...st) => items.filter((i) => st.includes(i.status));
  const n = (a, kata) => `${a} ${kata}`;
  const L = {
    tara: { ringkasan: tren.musim ? `Musim: ${tren.musim.hijriah}. ${tren.outlier?.length ?? 0} video outlier di niche, ${tren.tren_id?.length ?? 0} tren Indonesia dipantau.` : 'Belum ada riset pekan ini.', angka: [{ label: 'Outlier niche', nilai: n(tren.outlier?.length ?? 0, 'video') }] },
    bima: { ringkasan: items.length ? `Pekan ${items.at(-1).pekan}: ${hitung(items.filter((i) => i.pekan === items.at(-1).pekan), (i) => i.jenis === 'utama')} utama + ${hitung(items.filter((i) => i.pekan === items.at(-1).pekan), (i) => i.jenis === 'short')} short direncanakan.` : 'Menunggu denyut pertama.', angka: [{ label: 'Dalam antrean', nilai: n(kini.length, 'video') }] },
    laila: { ringkasan: `${hitung(items, (i) => i.status !== 'rencana' && i.status !== 'butuh_manusia')} naskah selesai.`, angka: [{ label: 'Panggilan LLM hari ini', nilai: `${pakai().n ?? 0}/${c.llm.maks_panggilan_per_hari}` }] },
    hasan: { ringkasan: tahan.some((i) => String(i.galat).startsWith('dalil')) ? 'Ada naskah ditahan karena dalil/klaim bermasalah.' : 'Semua dalil yang tayang berasal dari sumber terverifikasi.', mendesak: tahan.filter((i) => String(i.galat).startsWith('dalil')).map((i) => `Periksa naskah ${i.id}`) },
    nadia: { ringkasan: tunggu.length ? `${tunggu.length} video menunggu persetujuanmu.` : `${punya('terjadwal').length} terjadwal, ${punya('tayang').length} tayang.`, menunggu: tunggu.map((i) => `Setujui: ${i.judul ?? i.topik}`), mendesak: [...tunggu.filter(dekat).map((i) => `Jadwal tayang <24 jam: ${i.judul ?? i.topik}`), ...punya('terkunci_private').map((i) => `Publikkan manual: ${i.judul}`)], angka: [{ label: 'Menunggu', nilai: n(tunggu.length, 'video') }] },
    rafi: { ringkasan: `${hitung(items, (i) => ['storyboard', 'menunggu_persetujuan', 'terjadwal', 'tayang'].includes(i.status))} storyboard dibuat sesuai standar NURVERSE.` },
    salma: { ringkasan: `Suara: ${c.suara.suara}. Ayat tidak dibacakan suara sintetis, hanya terjemahannya.` },
    dika: { ringkasan: `${hitung(items, (i) => i.detik)} video sudah dirender.`, angka: [{ label: 'Total render', nilai: `${Math.round(items.reduce((a, i) => a + (i.detik ?? 0), 0) / 60)} menit` }] },
    fikri: { ringkasan: 'Memantau statistik video yang sudah tayang.', angka: [{ label: 'Tayang', nilai: n(punya('tayang').length, 'video') }] },
  };
  for (const k of Object.keys(L)) { if (!L[k].menunggu?.length) delete L[k].menunggu; if (!L[k].mendesak?.length) delete L[k].mendesak; }
  writeJson(S('office/src/laporan.json'), L);

  const w = wib();
  const log = readJson(S('state/log.json'), []);
  writeJson(S('office/public/hp/status.json'), {
    diperbarui: new Date().toISOString(), mode: c.mode_persetujuan, repo: process.env.GITHUB_REPOSITORY ?? '',
    penggunaan: { llm: pakai().n ?? 0, batas: c.llm.maks_panggilan_per_hari },
    peringatan: [...new Set([...peringatan, ...tahan.map((i) => `${i.id}: ${i.galat ?? LABEL[i.status]}`)])].slice(0, 8),
    antrean: items.slice(-14).reverse().map((i) => ({ id: i.id, jenis: i.jenis, judul: i.judul ?? i.topik, status: i.status, label: LABEL[i.status] ?? i.status, slot: i.slot, ytId: i.ytId && i.ytId !== 'DEMO' ? i.ytId : null, galat: i.galat })),
    log: log.slice(-25).reverse(),
  });
}

if (process.argv[1]?.endsWith('laporan.mjs')) tulisLaporan();
