import fs from 'node:fs';
import { P, readJson, writeJson, fromWib, addDays, S, gayaUntuk } from './util.mjs';

const F = () => S('state/antrean.json');
const DIR_SETUJU = () => S('state/persetujuan');

/** Antrean + tumpang-tindih keputusan persetujuan dari HP (satu berkas per keputusan, bebas konflik git). */
export function muat() {
  const q = readJson(F(), { items: [] });
  if (fs.existsSync(DIR_SETUJU())) {
    for (const f of fs.readdirSync(DIR_SETUJU())) {
      const a = readJson(S('state/persetujuan', f));
      const it = a && q.items.find((i) => i.id === a.id);
      if (it && ['menunggu_persetujuan', 'terjadwal'].includes(it.status) && a.hasil) {
        Object.assign(it, { status: a.hasil, slot: a.slot ?? it.slot, catatan: a.catatan ?? it.catatan });
      }
    }
  }
  return q;
}
export const simpan = (q) => writeJson(F(), q);
export const dirItem = (id) => S('data', id);

export function slotPekan(senin, c) {
  const t = (s) => fromWib(addDays(senin, s.hari - 1), s.jam).toISOString();
  return { utama: [t(c.jadwal_tayang_wib.utama)], short: c.jadwal_tayang_wib.short.map(t).sort() };
}

export function tambahPekan(q, pekan, rencana, c) {
  const slot = slotPekan(pekan.senin, c);
  const maju = (iso) => { let t = Date.parse(iso); while (t < Date.now() + 18 * 3600e3) t += 7 * 86400e3; return new Date(t).toISOString(); };
  slot.utama = slot.utama.map(maju); slot.short = slot.short.map(maju).sort();
  const dasar = { pekan: pekan.id, gaya: gayaUntuk(pekan.id, c), status: 'rencana', percobaan: 0, dibuat: new Date().toISOString() };
  q.items.push({ ...dasar, id: `${pekan.id}-U1`, jenis: 'utama', slot: slot.utama[0], ...rencana.utama });
  rencana.short.slice(0, slot.short.length).forEach((s, i) => q.items.push({ ...dasar, id: `${pekan.id}-S${i + 1}`, jenis: 'short', slot: slot.short[i], ...s }));
  return q;
}
export const pekanSudahAda = (q, id) => q.items.some((i) => i.pekan === id);
