/**
 * LLM gratis berantai: Gemini -> Groq -> OpenRouter (urutan & model di config/nurverse.json).
 * Hemat token: prompt ringkas, keluaran JSON, batas panggilan per hari, jatuh ke penyedia lain saat 429.
 */
import { cfg, P, readJson, writeJson, sleep, wib, S } from './util.mjs';
import { MOCK_LLM } from './mock.mjs';

const KEYS = { gemini: 'GEMINI_API_KEY', groq: 'GROQ_API_KEY', openrouter: 'OPENROUTER_API_KEY' };

export function pakai() {
  const f = S('state/usage.json');
  const u = readJson(f, {});
  const hari = wib().ymd;
  if (u.hari !== hari) return { hari, n: 0, per: {} };
  return u;
}
function tambah(penyedia) {
  const u = pakai();
  u.hari = wib().ymd;
  u.n = (u.n ?? 0) + 1;
  u.per = { ...u.per, [penyedia]: (u.per?.[penyedia] ?? 0) + 1 };
  writeJson(S('state/usage.json'), u);
}

export function parseJson(t) {
  const s = String(t).replace(/```json|```/g, '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('tidak ada JSON');
  return JSON.parse(s.slice(a, b + 1));
}

async function panggil(penyedia, model, sistem, prompt, { suhu, maks }) {
  const key = process.env[KEYS[penyedia]];
  if (!key) throw new Error(`${KEYS[penyedia]} kosong`);
  let r;
  if (penyedia === 'gemini') {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sistem }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: suhu, maxOutputTokens: maks },
      }),
      signal: AbortSignal.timeout(120000),
    });
  } else {
    const url = penyedia === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
    r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, temperature: suhu, max_tokens: maks, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: sistem }, { role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(120000),
    });
  }
  if (!r.ok) throw Object.assign(new Error(`${penyedia} ${r.status}: ${(await r.text()).slice(0, 200)}`), { status: r.status });
  const j = await r.json();
  const teks = penyedia === 'gemini' ? j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') : j.choices?.[0]?.message?.content;
  if (!teks) throw new Error(`${penyedia}: jawaban kosong`);
  return teks;
}

/** tugas: nama untuk mock & log. kelas: 'ringan' | 'naskah'. Mengembalikan objek JSON. */
export async function tanya(tugas, sistem, prompt, { kelas = 'ringan', suhu = 0.7, maks = 4096 } = {}) {
  if (process.env.MOCK) return MOCK_LLM[tugas](prompt);
  const c = cfg().llm;
  if (pakai().n >= c.maks_panggilan_per_hari) throw new Error(`batas ${c.maks_panggilan_per_hari} panggilan LLM/hari tercapai; lanjut besok`);
  const galat = [];
  for (const p of c.urutan) {
    if (!process.env[KEYS[p]]) continue;
    for (let i = 0; i < 2; i++) {
      try {
        const teks = await panggil(p, c.model[p][kelas], sistem, prompt, { suhu, maks });
        const obj = parseJson(teks);
        tambah(p);
        return obj;
      } catch (e) {
        galat.push(e.message);
        if (e.status === 429 || e.status >= 500) { if (i === 0) await sleep(8000); else break; }
        else if (e.status >= 400) break; // model/kunci salah: ganti penyedia
      }
    }
  }
  throw new Error(`semua penyedia LLM gagal: ${galat.slice(-3).join(' | ') || 'tidak ada API key'}`);
}
