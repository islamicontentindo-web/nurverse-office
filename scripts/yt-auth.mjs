/** Jalankan SEKALI di laptop: npm run auth  -> mencetak YT_REFRESH_TOKEN untuk disimpan sebagai GitHub Secret. */
import http from 'node:http';
import crypto from 'node:crypto';
const id = process.env.YT_CLIENT_ID, secret = process.env.YT_CLIENT_SECRET;
if (!id || !secret) { console.error('Isi YT_CLIENT_ID dan YT_CLIENT_SECRET dulu (lihat README langkah 3).'); process.exit(1); }
const PORT = 53682, redirect = `http://127.0.0.1:${PORT}`, state = crypto.randomUUID();
const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({ client_id: id, redirect_uri: redirect, response_type: 'code', access_type: 'offline', prompt: 'consent', scope: 'https://www.googleapis.com/auth/youtube', state });
console.log('\nBuka tautan ini di browser, login dengan akun pemilik channel NURVERSE:\n\n' + url + '\n');
http.createServer(async (req, res) => {
  const u = new URL(req.url, redirect);
  if (u.searchParams.get('state') !== state || !u.searchParams.get('code')) { res.end('menunggu…'); return; }
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: u.searchParams.get('code'), client_id: id, client_secret: secret, redirect_uri: redirect, grant_type: 'authorization_code' }) });
  const j = await r.json();
  res.end(j.refresh_token ? 'Berhasil. Kembali ke terminal.' : 'Gagal. Lihat terminal.');
  console.log(j.refresh_token ? `\nYT_REFRESH_TOKEN=${j.refresh_token}\n\nSimpan sebagai GitHub Secret bernama YT_REFRESH_TOKEN. Jangan dibagikan.\n` : JSON.stringify(j));
  process.exit(0);
}).listen(PORT);
