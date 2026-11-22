/** Dika — Animator Motion Graphic. Chromium headless menggambar tiap frame dari render/scene.html -> ffmpeg. Tanpa API, tanpa biaya. */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { P, cfg, sh } from '../lib/util.mjs';
import { tema } from '../lib/brand.mjs';

function cariChrome() {
  const k = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
  const f = k.find((x) => fs.existsSync(x));
  if (!f) throw new Error('Chrome/Chromium tidak ditemukan. Set CHROME_PATH atau pasang google-chrome.');
  return f;
}
const buka = async () => chromium.launch({ executablePath: cariChrome(), args: ['--no-sandbox', '--font-render-hinting=none', '--disable-gpu', '--force-color-profile=srgb'] });

/** Satu berkas HTML per gaya (config.gaya). Gaya tak dikenal -> geometri, jadi video lama tidak pernah rusak. */
export const BERKAS_GAYA = { geometri: 'scene.html', ilustrasi: 'gaya-ilustrasi.html' };
async function halaman(browser, w, h, gaya = 'geometri') {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.goto('file://' + P('render', BERKAS_GAYA[gaya] ?? BERKAS_GAYA.geometri));
  return page;
}

async function renderAdegan(page, a, sb, fps, keluar) {
  const [w, h] = sb.ukuran;
  const dur = a.durasi + 0.6, n = Math.ceil(dur * fps);
  await page.evaluate(([o]) => window.setup(o), [{ w, h, scene: { ...a, thumb: sb.thumb, judul: a.judul }, tema: tema(), mode: 'video' }]);
  await page.evaluate(() => document.fonts.ready);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-i', a.audio,
    '-af', 'adelay=250:all=1,apad', '-t', dur.toFixed(3), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(fps), '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-ac', '2', keluar]);
  let err = ''; ff.stderr.on('data', (d) => (err += d));
  const selesai = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg: ' + err.slice(-400))))));
  for (let k = 0; k < n; k++) {
    await page.evaluate(([t, d]) => window.frame(t, d), [k / fps, dur]);
    const buf = await page.screenshot({ type: 'jpeg', quality: 90 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await selesai;
  return dur;
}

async function ambient(total, db, keluar) {
  const sin = (f) => ['-f', 'lavfi', '-t', total.toFixed(2), '-i', `sine=frequency=${f}:sample_rate=44100`];
  await sh('ffmpeg', ['-y', '-loglevel', 'error', ...sin(130.81), ...sin(196), ...sin(261.63),
    '-filter_complex', `[0][1][2]amix=inputs=3:normalize=0,lowpass=f=700,tremolo=f=0.12:d=0.5,volume=${db}dB,afade=t=in:d=3,afade=t=out:st=${Math.max(0, total - 4).toFixed(2)}:d=4,aformat=channel_layouts=stereo[a]`, '-map', '[a]', keluar]);
}

/** sb: storyboard dengan audio+durasi per adegan. Mengembalikan jalur mp4 akhir. */
export async function render(sb, dir, { onProgress } = {}) {
  const c = cfg().render, fps = sb.jenis === 'utama' ? c.fps_utama : c.fps_short;
  fs.mkdirSync(dir, { recursive: true });
  const browser = await buka();
  try {
    const page = await halaman(browser, ...sb.ukuran, sb.gaya);
    const seg = [];
    let total = 0;
    for (const a of sb.adegan) {
      const f = path.join(dir, `seg${String(a.i).padStart(2, '0')}.mp4`);
      if (!fs.existsSync(f)) await renderAdegan(page, a, sb, fps, f);
      seg.push(f); total += a.durasi + 0.6;
      onProgress?.(a.i + 1, sb.adegan.length);
    }
    const daftar = path.join(dir, 'daftar.txt');
    fs.writeFileSync(daftar, seg.map((f) => `file '${f}'`).join('\n'));
    const gabung = path.join(dir, 'gabung.mp4'), amb = path.join(dir, 'ambient.wav'), akhir = path.join(dir, 'final.mp4');
    await sh('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', daftar, '-c', 'copy', gabung]);
    await ambient(total, c.ambient_db, amb);
    await sh('ffmpeg', ['-y', '-loglevel', 'error', '-i', gabung, '-i', amb, '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=first:normalize=0[a]', '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', akhir]);
    return { berkas: akhir, detik: total };
  } finally { await browser.close(); }
}

/** Thumbnail 1280x720 (video utama). */
export async function thumbnail(sb, keluar) {
  const browser = await buka();
  try {
    const page = await halaman(browser, 1280, 720, sb.gaya);
    await page.evaluate(([o]) => window.setup(o), [{ w: 1280, h: 720, scene: { i: 3, motif: 'bintang', latar: 'malam', aktor: ['berdiri'], thumb: sb.thumb, judul: sb.judul, tipe: 'renungan', teks: String(sb.thumb || '').split(/\s+/).filter(Boolean).slice(0, 3) }, tema: tema(), mode: 'thumb' }]);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.frame(4, 10));
    await page.screenshot({ path: keluar, type: 'jpeg', quality: 92 });
    return keluar;
  } finally { await browser.close(); }
}

/** Pratinjau satu frame per adegan (untuk uji visual). */
export async function pratinjau(sb, dir, pecahan = 0.6) {
  const browser = await buka();
  try {
    const page = await halaman(browser, ...sb.ukuran, sb.gaya);
    fs.mkdirSync(dir, { recursive: true });
    for (const a of sb.adegan) {
      const dur = (a.durasi ?? 6) + 0.6;
      await page.evaluate(([o]) => window.setup(o), [{ w: sb.ukuran[0], h: sb.ukuran[1], scene: { ...a, thumb: sb.thumb }, tema: tema(), mode: 'video' }]);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(([t, d]) => window.frame(t, d), [dur * pecahan, dur]);
      await page.screenshot({ path: path.join(dir, `p${String(a.i).padStart(2, '0')}-${a.tipe}-${a.motif}.png`) });
    }
  } finally { await browser.close(); }
}
