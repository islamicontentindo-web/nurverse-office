/**
 * Dalil HANYA dari sumber terverifikasi. LLM cuma boleh menyebut rujukan (mis. "94:5-6");
 * teks Arab & terjemahan diambil dari API, bukan ditulis model. Gagal ambil = dalil dibuang, bukan dikarang.
 */
import { sleep, P, readJson } from './util.mjs';

const SURAH = ['', 'Al-Fatihah', 'Al-Baqarah', "Ali 'Imran", "An-Nisa'", "Al-Ma'idah", "Al-An'am", "Al-A'raf", 'Al-Anfal', 'At-Taubah', 'Yunus', 'Hud', 'Yusuf', "Ar-Ra'd", 'Ibrahim', 'Al-Hijr', 'An-Nahl', "Al-Isra'", 'Al-Kahfi', 'Maryam', 'Taha', "Al-Anbiya'", 'Al-Hajj', "Al-Mu'minun", 'An-Nur', 'Al-Furqan', "Asy-Syu'ara'", 'An-Naml', 'Al-Qasas', "Al-'Ankabut", 'Ar-Rum', 'Luqman', 'As-Sajdah', 'Al-Ahzab', "Saba'", 'Fatir', 'Yasin', 'As-Saffat', 'Sad', 'Az-Zumar', 'Gafir', 'Fussilat', 'Asy-Syura', 'Az-Zukhruf', 'Ad-Dukhan', 'Al-Jasiyah', 'Al-Ahqaf', 'Muhammad', 'Al-Fath', 'Al-Hujurat', 'Qaf', 'Az-Zariyat', 'At-Tur', 'An-Najm', 'Al-Qamar', 'Ar-Rahman', "Al-Waqi'ah", 'Al-Hadid', 'Al-Mujadalah', 'Al-Hasyr', 'Al-Mumtahanah', 'As-Saff', "Al-Jumu'ah", 'Al-Munafiqun', 'At-Tagabun', 'At-Talaq', 'At-Tahrim', 'Al-Mulk', 'Al-Qalam', 'Al-Haqqah', "Al-Ma'arij", 'Nuh', 'Al-Jinn', 'Al-Muzzammil', 'Al-Muddassir', 'Al-Qiyamah', 'Al-Insan', 'Al-Mursalat', "An-Naba'", "An-Nazi'at", "'Abasa", 'At-Takwir', 'Al-Infitar', 'Al-Mutaffifin', 'Al-Insyiqaq', 'Al-Buruj', 'At-Tariq', "Al-A'la", 'Al-Gasyiyah', 'Al-Fajr', 'Al-Balad', 'Asy-Syams', 'Al-Lail', 'Ad-Duha', 'Asy-Syarh (Al-Insyirah)', 'At-Tin', "Al-'Alaq", 'Al-Qadr', 'Al-Bayyinah', 'Az-Zalzalah', "Al-'Adiyat", "Al-Qari'ah", 'At-Takasur', "Al-'Asr", 'Al-Humazah', 'Al-Fil', 'Quraisy', "Al-Ma'un", 'Al-Kausar', 'Al-Kafirun', 'An-Nasr', 'Al-Masad', 'Al-Ikhlas', 'Al-Falaq', 'An-Nas'];

const BUKU_HADIS = { bukhari: 'HR. Bukhari', muslim: 'HR. Muslim', tirmidzi: 'HR. Tirmidzi', nasai: "HR. An-Nasa'i", abudaud: 'HR. Abu Daud', ibnumajah: 'HR. Ibnu Majah' };

async function getJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (r.ok) return await r.json();
    } catch { /* coba lagi */ }
    await sleep(1500 * (i + 1));
  }
  return null;
}

/** "94:5-6" | "2:255" -> [{s,a}] (maks 4 ayat berurutan). */
export function parseRef(ref) {
  const m = String(ref).replace(/QS\.?\s*/i, '').match(/^\s*(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?\s*$/);
  if (!m) return null;
  const s = +m[1], a = +m[2], b = m[3] ? +m[3] : a;
  if (s < 1 || s > 114 || b < a || b - a > 3) return null;
  return Array.from({ length: b - a + 1 }, (_, i) => ({ s, a: a + i }));
}

export async function ambilAyat(ref) {
  if (process.env.MOCK) return MOCK_AYAT[ref] ?? null;
  const list = parseRef(ref);
  if (!list) return null;
  const arab = [], arti = [];
  for (const { s, a } of list) {
    const j = await getJson(`https://api.alquran.cloud/v1/ayah/${s}:${a}/editions/quran-uthmani,id.indonesian`);
    const d = j?.data;
    if (!Array.isArray(d) || d.length < 2 || !d[0]?.text || !d[1]?.text) return null;
    arab.push(`${d[0].text} ﴿${toArabicDigits(a)}﴾`);
    arti.push(d[1].text);
  }
  const { s, a } = list[0], b = list.at(-1).a;
  return { jenis: 'ayat', ref, label: `QS. ${SURAH[s]}: ${a}${b > a ? '-' + b : ''}`, nomorSurah: s, surah: SURAH[s], a0: a, a1: b, arab: arab.join(' '), arti: arti.join(' '), sumber: 'api.alquran.cloud (quran-uthmani, id.indonesian)' };
}

/** Dalil pilihan manusia: data/dalil-pilihan.json = [{kunci,jenis,label,arab,arti}] (hanya yang sudah KAMU periksa). Ref: "pilihan:kunci". */
export const daftarPilihan = () => readJson(P('data/dalil-pilihan.json'), []);
export function ambilPilihan(ref) {
  const k = String(ref).replace(/^pilihan:/, '');
  const d = daftarPilihan().find((x) => x.kunci === k);
  return d ? { jenis: d.jenis ?? 'hadis', ref: `pilihan:${k}`, label: d.label, arab: d.arab ?? '', arti: d.arti, sumber: 'dalil-pilihan.json (diperiksa manusia)' } : null;
}

export async function ambilHadis(buku, nomor) {
  if (process.env.MOCK) return null;
  if (!BUKU_HADIS[buku] || !Number.isInteger(nomor) || nomor < 1) return null;
  const j = await getJson(`https://api.hadith.gading.dev/books/${buku}/${nomor}`);
  const c = j?.data?.contents;
  if (!c?.arab || !c?.id || c.id.length > 350) return null; // terjemah panjang biasanya memuat sanad: tidak layak ditayangkan
  return { jenis: 'hadis', ref: `${buku}:${nomor}`, label: `${BUKU_HADIS[buku]} no. ${nomor}`, arab: c.arab, arti: c.id, sumber: 'api.hadith.gading.dev' };
}

const toArabicDigits = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

/**
 * Pemeriksa deterministik (tanpa token): narasi tidak boleh MENGUTIP/mengklaim dalil yang tidak terverifikasi.
 */
export function pindaiKlaim(narasi, terverifikasi) {
  const ada = (j) => terverifikasi.some((d) => d.jenis === j);
  const masalah = [];
  if (/\b(hadis|hadits|bersabda|sabda (nabi|rasul))/i.test(narasi) && !ada('hadis')) masalah.push('menyebut hadis/sabda tanpa hadis terverifikasi');
  if (/\b(berfirman|firman allah|dalam (surah|surat)|\bQS\b)/i.test(narasi) && !ada('ayat')) masalah.push('menyebut ayat/firman tanpa ayat terverifikasi');
  if (/\b(imam (syafi'?i|malik|ahmad|hanafi|nawawi|ghazali)|ibnu (katsir|taimiyah|qayyim)) (berkata|mengatakan)/i.test(narasi)) masalah.push('mengutip perkataan ulama tanpa sumber (hapus atau parafrase tanpa atribusi)');
  return masalah;
}

const MOCK_AYAT = {
  '94:5-6': { jenis: 'ayat', ref: '94:5-6', label: 'QS. Asy-Syarh (Al-Insyirah): 5-6', nomorSurah: 94, arab: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ﴿٥﴾ إِنَّ مَعَ الْعُسْرِ يُسْرًا ﴿٦﴾', arti: 'Maka sesungguhnya beserta kesulitan ada kemudahan. Sesungguhnya beserta kesulitan ada kemudahan.', sumber: 'fixture demo' },
};
