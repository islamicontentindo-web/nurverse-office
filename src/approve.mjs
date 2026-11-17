/** Persetujuan dari HP: node src/approve.mjs <id> <setuju|tolak>. Menulis satu berkas keputusan (tidak bentrok di git). */
import { S, writeJson, catat } from './lib/util.mjs';
import { muat } from './lib/antrean.mjs';
import { putuskan } from './agen/nadia.mjs';
import { tulisLaporan } from './laporan.mjs';
import { kirim } from './lib/notify.mjs';

const [id, keputusan] = process.argv.slice(2);
if (!id || !['setuju', 'tolak'].includes(keputusan)) { console.error('pakai: node src/approve.mjs <id> <setuju|tolak>'); process.exit(2); }
const q = muat();
const it = q.items.find((i) => i.id === id);
if (!it) { console.error(`id tidak ditemukan: ${id}`); process.exit(1); }
if (it.status !== 'menunggu_persetujuan') { console.error(`status ${it.status}: tidak menunggu persetujuan`); process.exit(1); }
try {
  const h = await putuskan(it, keputusan);
  writeJson(S('state/persetujuan', `${id}.json`), { id, keputusan, hasil: h.hasil, slot: h.slot, t: new Date().toISOString() });
  catat('nadia', `${id}: ${keputusan} -> ${h.hasil}${h.hasil === 'terjadwal' ? ` (tayang ${h.slot})` : ''}`);
  await kirim(`✅ NURVERSE: ${id} ${h.hasil}${h.hasil === 'terjadwal' ? `, tayang ${h.slot}` : ''}`);
  tulisLaporan(muat());
} catch (e) { catat('nadia', `persetujuan gagal: ${e.message}`, 'galat'); console.error(e.message); process.exit(1); }
