// Uji logika murni (tanpa jaringan, tanpa token): node scripts/test.mjs
import assert from 'node:assert/strict';
import { skorHook, pilihHook, lintPaket } from '../src/lib/hook.mjs';
import { hijri, musim } from '../src/lib/hijri.mjs';
import { isoWeek, wib, addDays } from '../src/lib/util.mjs';
import { parseRef, pindaiKlaim } from '../src/lib/dalil.mjs';
import { parseJson } from '../src/lib/llm.mjs';
import { slotPekan } from '../src/lib/antrean.mjs';
import { slotValid } from '../src/agen/nadia.mjs';
import { susun } from '../src/agen/rafi.mjs';
import { teksSuara } from '../src/agen/salma.mjs';
import { cfg } from '../src/lib/util.mjs';

let ok = 0;
const t = (n, f) => { try { f(); ok++; console.log('✓', n); } catch (e) { console.error('✗', n, '\n ', e.message); process.exitCode = 1; } };

t('hook spesifik+menyapa menang atas basa-basi', () => {
  const [a, b] = pilihHook(['Kamu pernah merasa doamu tidak dijawab? Ternyata ada 3 cara Allah menjawabnya.', 'Assalamualaikum halo sobat selamat datang di video kali ini']);
  assert.ok(a.skor > b.skor + 20);
  assert.equal(skorHook('').skor, 0);
});
t('lint paket judul/thumbnail', () => {
  assert.equal(lintPaket('Kenapa Doamu Belum Dijawab? 3 Jawaban', 'TUNDA BUKAN TOLAK').length, 0);
  assert.ok(lintPaket('x'.repeat(70), 'satu dua tiga empat').length >= 2);
  assert.ok(lintPaket('Doa Tidak Ditolak', 'Doa tidak ditolak').some((m) => m.includes('mengulang')));
});
t('hijriah & minggu ISO', () => {
  assert.ok(hijri(new Date('2026-03-20')).bulan >= 1 && hijri(new Date('2026-03-20')).hari >= 1);
  assert.ok(musim(new Date('2026-11-17')).bulan_ini.length > 0);
  assert.equal(isoWeek(new Date('2026-11-17')).id, '2026-W47');
  assert.equal(isoWeek(new Date('2026-11-17')).senin, '2026-11-16');
  assert.equal(wib(new Date('2026-11-17T20:00:00Z')).ymd, '2026-11-18'); // WIB sudah besok
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
});
t('rujukan ayat', () => {
  assert.equal(parseRef('94:5-6').length, 2);
  assert.equal(parseRef('QS. 2:255')[0].a, 255);
  assert.equal(parseRef('115:1'), null);
  assert.equal(parseRef('2:1-9'), null); // > 4 ayat
  assert.equal(parseRef('abc'), null);
});
t('pemindai klaim: dilarang mengutip tanpa dalil terverifikasi', () => {
  assert.ok(pindaiKlaim('Rasulullah bersabda bahwa sabar itu indah.', []).length === 1);
  assert.ok(pindaiKlaim('Allah berfirman dalam surah Al-Baqarah.', []).length === 1);
  assert.ok(pindaiKlaim('Imam Syafi\'i berkata bahwa ilmu itu cahaya.', []).length === 1);
  assert.equal(pindaiKlaim('Rasulullah bersabda bahwa sabar itu indah.', [{ jenis: 'hadis' }]).length, 0);
  assert.equal(pindaiKlaim('Sabar itu menenangkan hati.', []).length, 0);
});
t('JSON LLM yang berantakan tetap terbaca', () => {
  assert.deepEqual(parseJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJson('Berikut: {"a":{"b":2}} selesai'), { a: { b: 2 } });
  assert.throws(() => parseJson('tanpa json'));
});
t('slot tayang sesuai config & tidak di masa lalu', () => {
  const s = slotPekan('2026-11-16', cfg());
  assert.equal(s.utama[0], '2026-11-20T09:00:00.000Z'); // Jumat 16:00 WIB
  assert.equal(s.short.length, 5);
  const lewat = slotValid({ slot: '2020-01-06T05:30:00.000Z' }, Date.parse('2026-11-17T00:00:00Z'));
  assert.ok(Date.parse(lewat) > Date.parse('2026-11-17T18:00:00Z') - 1 && new Date(lewat).getUTCDay() === 1);
});
t('storyboard: ayat tidak dibacakan dalam bahasa Arab, narasi dari dalil terverifikasi', () => {
  const n = { judul: 'J', thumb: 'T', adegan: [
    { jenis: 'renungan', narasi: 'Halo kamu.', teks: ['Halo'], motif: 'bulan' },
    { jenis: 'ayat', ref: '94:5', dalil: { jenis: 'ayat', surah: 'Asy-Syarh', a0: 5, a1: 6, label: 'QS. X: 5-6', arab: 'فَإِنَّ', arti: 'Bersama kesulitan ada kemudahan.' }, teks: [], motif: 'bulan' },
  ] };
  const sb = susun({ id: 'x', jenis: 'short' }, n);
  assert.deepEqual(sb.ukuran, [1080, 1920]);
  assert.ok(sb.adegan[1].narasi.startsWith('Allah berfirman dalam surah Asy-Syarh, ayat 5 sampai 6'));
  assert.equal(sb.adegan[1].caption, false);
  assert.notEqual(sb.adegan[0].motif, sb.adegan[1].motif); // motif beruntun diganti
  assert.ok(!/[\u0600-\u06FF]/.test(teksSuara('Ini فَإِنَّ Arab ﷺ')));
  assert.ok(teksSuara('Nabi ﷺ').includes("shallallahu 'alaihi wasallam"));
});
console.log(`\n${ok} uji lulus`);
