// Tes logika kantor: node scripts/test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const O = (await runnerImport(path.join(root, 'src/office.ts'), { root, configFile: false, cacheDir: path.join(os.tmpdir(), 'kantor-vite'), logLevel: 'error' })).module;

let n = 0;
const t = (name, fn) => {
  fn();
  n++;
};
t('jadwal 24 jam, tiap 3 jam, termasuk akhir pekan', () => {
  assert.equal(O.agentDoing('tara', 1, '00:05').activity, 'kerja');
  assert.equal(O.agentDoing('laila', 3, '09:30').label, 'naskah & cek dalil…');
  assert.equal(O.agentDoing('dika', 6, '13:10', true).activity, 'kerja');
  assert.equal(O.agentDoing('nadia', 7, '21:10', true).activity, 'siaga');
  assert.equal(O.agentDoing('nadia', 7, '23:10', true).activity, 'laporan');
});
t('timelapse tiga babak, berulang', () => {
  assert.equal(O.LAPSE_SECONDS, 30);
  assert.equal(O.lapseAt(0).time, '00:00');
  assert.equal(O.lapseAt(30).time, '00:00');
});
t('agen santai pergi dan kembali', () => {
  const seen = new Set();
  for (let x = 0; x < 48; x += 0.5) seen.add(O.idleAt('tara', x).spot);
  assert.ok(seen.has('meja') && seen.size >= 3);
});
t('meja dan Mission Board', () => {
  const desks = O.officeDesks(1, '10:00');
  assert.equal(desks.length, 9);
});
t('parameter URL', () => {
  assert.deepEqual(O.params(new URLSearchParams('timelapse=1&rekam=1&jam=08.10')), { lapse: true, rec: true, time: '08:10', alwaysWork: true });
});
const G = (await runnerImport(path.join(root, 'src/gaya/daftar.ts'), { root, configFile: false, cacheDir: path.join(os.tmpdir(), 'kantor-vite'), logLevel: 'error' })).module;
t('16 gaya + asli, urutan pilihan gaya', () => {
  assert.equal(G.DAFTAR_GAYA.length, 17);
  assert.equal(new Set(G.DAFTAR_GAYA.map((g) => g.id)).size, 17);
  assert.equal(G.DAFTAR_GAYA.filter((g) => g.jenis === 'paduan').length, 9);
  assert.equal(G.gayaAwal('clay', 'voxel', 'asli'), 'clay');
  assert.equal(G.gayaAwal('ngawur', 'voxel', 'asli'), 'voxel');
  assert.equal(G.gayaAwal(null, null, 'taman'), 'taman');
  assert.equal(G.gayaAwal(null, 'x', 'y'), 'asli');
  assert.equal(G.cariGaya('ngawur').id, 'asli');
});
console.log(`${n} tes lulus`);
