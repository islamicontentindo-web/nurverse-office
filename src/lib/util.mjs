import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const P = (...a) => path.join(ROOT, ...a);
/** Folder yang DITULIS (state/data/tmp). Mode demo menulis ke tmp/demo agar repo tidak tercemar. */
export const S = (...a) => path.join(process.env.NURVERSE_RUN ? path.join(ROOT, 'tmp', 'demo') : ROOT, ...a);

export const readJson = (f, def = null) => {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return def; }
};
export const writeJson = (f, v) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(v, null, 2) + '\n');
};
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const sha = (s) => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 10);
export const cfg = () => readJson(P('config/nurverse.json'));

/** Waktu WIB (UTC+7) sebagai komponen; tanpa bergantung pada zona server. */
export function wib(d = new Date()) {
  const x = new Date(d.getTime() + 7 * 3600e3);
  return {
    y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate(),
    h: x.getUTCHours(), mi: x.getUTCMinutes(),
    iso: x.getUTCDay() === 0 ? 7 : x.getUTCDay(),
    ymd: x.toISOString().slice(0, 10),
  };
}
/** Tanggal ISO dari 'YYYY-MM-DD' + 'HH:MM' WIB menjadi Date (UTC). */
export const fromWib = (ymd, hm) => new Date(`${ymd}T${hm}:00+07:00`);

/** Minggu ISO: { tahun, minggu, senin:'YYYY-MM-DD' } untuk sebuah tanggal WIB. */
export function isoWeek(date = new Date()) {
  const w = wib(date);
  const t = new Date(Date.UTC(w.y, w.m - 1, w.d));
  const senin = new Date(t.getTime() - (w.iso - 1) * 86400e3);
  const th = new Date(t.getTime() + (4 - w.iso) * 86400e3);
  const yStart = new Date(Date.UTC(th.getUTCFullYear(), 0, 1));
  const minggu = Math.ceil(((th - yStart) / 86400e3 + 1) / 7);
  return { tahun: th.getUTCFullYear(), minggu, senin: senin.toISOString().slice(0, 10), id: `${th.getUTCFullYear()}-W${String(minggu).padStart(2, '0')}` };
}
export const addDays = (ymd, n) => new Date(new Date(`${ymd}T00:00:00Z`).getTime() + n * 86400e3).toISOString().slice(0, 10);

export function sh(cmd, args, { input, cwd, quiet = true } = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', rej);
    p.on('close', (c) => (c === 0 ? res(out) : rej(new Error(`${cmd} keluar ${c}: ${err.slice(-600)}`))));
    if (input) p.stdin.end(input); else p.stdin.end();
  });
}

/** Catat kejadian (dipakai laporan & monitor HP). Ring buffer 80 baris. */
export function catat(agen, teks, tingkat = 'info') {
  const f = S('state/log.json');
  const log = readJson(f, []);
  log.push({ t: new Date().toISOString(), agen, teks, tingkat });
  writeJson(f, log.slice(-80));
  console.log(`[${agen}] ${teks}`);
}
