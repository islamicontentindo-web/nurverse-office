/** YouTube Data API v3: baca (API key) dan unggah/atur (OAuth refresh token). Hanya fetch bawaan Node. */
import fs from 'node:fs';
import { Readable } from 'node:stream';
import { sleep } from './util.mjs';

const API = 'https://www.googleapis.com/youtube/v3';

export async function baca(path, params = {}) {
  const key = process.env.YT_API_KEY;
  if (!key) throw new Error('YT_API_KEY kosong');
  const u = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries({ ...params, key })) if (v !== undefined) u.searchParams.set(k, v);
  const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`YouTube ${path} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

export async function cariVideo(q, hari, maks = 15) {
  const after = new Date(Date.now() - hari * 86400e3).toISOString();
  const j = await baca('search', { part: 'snippet', type: 'video', q, order: 'viewCount', regionCode: 'ID', relevanceLanguage: 'id', publishedAfter: after, maxResults: maks });
  return (j.items ?? []).map((i) => ({ id: i.id.videoId, kanal: i.snippet.channelTitle, kanalId: i.snippet.channelId, judul: i.snippet.title }));
}
export async function statVideo(ids) {
  if (!ids.length) return [];
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const j = await baca('videos', { part: 'statistics,snippet,contentDetails,status', id: ids.slice(i, i + 50).join(',') });
    for (const v of j.items ?? []) out.push({ id: v.id, judul: v.snippet.title, kanal: v.snippet.channelTitle, kanalId: v.snippet.channelId, terbit: v.snippet.publishedAt, tayang: +(v.statistics?.viewCount ?? 0), suka: +(v.statistics?.likeCount ?? 0), komentar: +(v.statistics?.commentCount ?? 0), privasi: v.status?.privacyStatus, durasi: v.contentDetails?.duration });
  }
  return out;
}
/** 10 video terbaru sebuah kanal (untuk median kanal, metode yt-viral). */
export async function unggahanKanal(kanalId, n = 10) {
  const c = await baca('channels', { part: 'contentDetails', id: kanalId });
  const up = c.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!up) return [];
  const p = await baca('playlistItems', { part: 'contentDetails', playlistId: up, maxResults: n });
  return statVideo((p.items ?? []).map((i) => i.contentDetails.videoId));
}
export const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0; };

/* ---------- OAuth + unggah ---------- */
let tokenCache = null;
export async function aksesToken() {
  if (tokenCache && tokenCache.exp > Date.now() + 60000) return tokenCache.t;
  const { YT_CLIENT_ID: id, YT_CLIENT_SECRET: sec, YT_REFRESH_TOKEN: rt } = process.env;
  if (!id || !sec || !rt) throw new Error('YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN belum diisi');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: id, client_secret: sec, refresh_token: rt, grant_type: 'refresh_token' }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`OAuth gagal: ${j.error_description ?? j.error} (token kedaluwarsa? lihat README bagian "Token 7 hari")`);
  tokenCache = { t: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return tokenCache.t;
}
const auth = async () => ({ authorization: `Bearer ${await aksesToken()}` });

function statusObj({ privasi, publishAt, sintetis }) {
  const s = { privacyStatus: privasi, selfDeclaredMadeForKids: false, embeddable: true, license: 'youtube' };
  if (publishAt) s.publishAt = publishAt;
  if (sintetis) s.containsSyntheticMedia = true;
  return s;
}

/** Unggah mp4 (resumable). Selalu private; jika publishAt diisi, YouTube menayangkan sendiri pada waktu itu. */
export async function unggah({ berkas, judul, deskripsi, tag, publishAt, sintetis = true }) {
  const ukuran = fs.statSync(berkas).size;
  const meta = (s) => ({
    snippet: { title: judul.slice(0, 100), description: deskripsi.slice(0, 4900), tags: tag.slice(0, 15), categoryId: '27', defaultLanguage: 'id', defaultAudioLanguage: 'id' },
    status: statusObj({ privasi: 'private', publishAt, sintetis: s }),
  });
  for (const sint of sintetis ? [true, false] : [false]) {
    const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: { ...(await auth()), 'content-type': 'application/json; charset=UTF-8', 'x-upload-content-type': 'video/mp4', 'x-upload-content-length': String(ukuran) },
      body: JSON.stringify(meta(sint)),
    });
    if (!init.ok) {
      const t = await init.text();
      if (sint && /containsSyntheticMedia|Unknown name/i.test(t)) continue; // API lama tanpa field itu
      throw new Error(`mulai unggah ${init.status}: ${t.slice(0, 300)}`);
    }
    const lokasi = init.headers.get('location');
    for (let i = 0; i < 4; i++) {
      const put = await fetch(lokasi, { method: 'PUT', headers: { 'content-type': 'video/mp4', 'content-length': String(ukuran) }, body: Readable.toWeb(fs.createReadStream(berkas)), duplex: 'half' });
      if (put.ok) return (await put.json()).id;
      if (put.status < 500) throw new Error(`unggah ${put.status}: ${(await put.text()).slice(0, 300)}`);
      await sleep(5000 * (i + 1));
    }
    throw new Error('unggah gagal berulang');
  }
}

export async function setThumbnail(videoId, berkas) {
  const r = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`, {
    method: 'POST', headers: { ...(await auth()), 'content-type': 'image/jpeg' }, body: fs.readFileSync(berkas),
  });
  if (!r.ok) throw new Error(`thumbnail ${r.status}: ${(await r.text()).slice(0, 200)} (akun harus terverifikasi telepon)`);
}

/** Ubah privasi/jadwal. Mengirim objek status utuh karena API menimpa field yang tidak dikirim. */
export async function aturStatus(videoId, { privasi, publishAt, sintetis = true }) {
  const r = await fetch(`${API}/videos?part=status`, {
    method: 'PUT', headers: { ...(await auth()), 'content-type': 'application/json' },
    body: JSON.stringify({ id: videoId, status: statusObj({ privasi, publishAt, sintetis }) }),
  });
  if (!r.ok) throw new Error(`atur status ${r.status}: ${(await r.text()).slice(0, 300)}`);
}
export const hapusVideo = async (videoId) => {
  const r = await fetch(`${API}/videos?id=${videoId}`, { method: 'DELETE', headers: await auth() });
  if (!r.ok && r.status !== 404) throw new Error(`hapus ${r.status}`);
};
