/** Notifikasi Telegram (opsional, gratis) supaya HP bunyi saat ada yang perlu dilihat. */
export async function kirim(teks) {
  const t = process.env.TELEGRAM_BOT_TOKEN, c = process.env.TELEGRAM_CHAT_ID;
  if (!t || !c || process.env.MOCK) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${t}/sendMessage`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: c, text: teks.slice(0, 3500), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(15000),
    });
    return r.ok;
  } catch { return false; }
}
