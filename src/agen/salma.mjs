/** Salma — Pengisi Suara. Edge TTS (gratis, tanpa API key) per adegan -> durasi tepat tiap adegan. Teks Arab Al-Qur'an TIDAK dibacakan. */
import fs from 'node:fs';
import path from 'node:path';
import { cfg, sh, sleep } from '../lib/util.mjs';

export const teksSuara = (t) => String(t)
  .replace(/ﷺ/g, "shallallahu 'alaihi wasallam").replace(/\bSAW\b/g, "shallallahu 'alaihi wasallam").replace(/\bSWT\b/g, "subhanahu wa ta'ala")
  .replace(/\bQS\.?\s*/g, 'Quran surah ').replace(/\bHR\.?\s*/g, 'diriwayatkan oleh ').replace(/[\u0600-\u06FF\uFD3E\uFD3F]+/g, ' ')
  .replace(/\s+/g, ' ').trim();

export async function durasi(f) {
  return parseFloat((await sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f])).trim());
}

async function edge(teks, keluar) {
  const c = cfg().suara;
  const txt = keluar + '.txt';
  fs.writeFileSync(txt, teks);
  let err;
  for (let i = 0; i < 3; i++) {
    try {
      await sh('python3', ['-m', 'edge_tts', '--voice', c.suara, `--rate=${c.laju}`, `--pitch=${c.nada}`, '--file', txt, '--write-media', keluar + '.mp3']);
      await sh('ffmpeg', ['-y', '-loglevel', 'error', '-i', keluar + '.mp3', '-ar', '44100', '-ac', '2', keluar]);
      return;
    } catch (e) { err = e; await sleep(3000 * (i + 1)); }
  }
  throw new Error(`TTS gagal: ${err.message}`);
}
/** Mode uji: nada sunyi sepanjang perkiraan durasi baca (±2,6 kata/detik). */
async function sunyi(teks, keluar) {
  const d = Math.max(2, teks.split(/\s+/).length / 2.6);
  await sh('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', d.toFixed(2), keluar]);
}

export async function bersuara(sb, dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const a of sb.adegan) {
    const f = path.join(dir, `a${String(a.i).padStart(2, '0')}.wav`);
    if (!fs.existsSync(f)) await (process.env.MOCK ? sunyi : edge)(teksSuara(a.narasi), f);
    a.audio = f;
    a.durasi = +(await durasi(f)).toFixed(2);
  }
  return sb;
}
