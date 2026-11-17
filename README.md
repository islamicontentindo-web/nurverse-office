# Kantor NURVERSE — karyawan AI untuk channel YouTube islami

Sembilan "karyawan" AI mengurus channel **NURVERSE** dari riset sampai unggah. Semua memakai layanan **gratis**, berjalan di **GitHub Actions** (bukan laptopmu), dan dipantau dari **HP**.

```
Tara (tren) → Bima (rencana pekan) → Laila (naskah) → Hasan (cek dalil) → Rafi (storyboard)
            → Salma (suara) → Dika (animasi motion graphic) → Nadia (jadwal + unggah) → Fikri (statistik)
```

| Karyawan | Kerja | Biaya token |
|---|---|---|
| **Tara** | Musim Hijriah, Google Trends Indonesia, video outlier di niche (kelipatan dari median kanal, metode `yt-viral`) | 0 |
| **Bima** | Rencana pekan: 1 video utama + 4 short dari tema yang sama | 1 panggilan/pekan |
| **Laila** | Naskah + 5 hook + judul + thumbnail + deskripsi (`yt-script`, `yt-package`, `yt-shorts`); hook dinilai kode, bukan model | 1 (utama) + 1 (semua short) |
| **Hasan** | Ayat dari API terverifikasi, pemindai klaim, audit makna (batch) | 1 batch |
| **Rafi** | Storyboard sesuai `brand/NURVERSE.md` | 0 |
| **Salma** | Suara Indonesia (Edge TTS, tanpa kunci), per adegan | 0 |
| **Dika** | Animasi motif Islami (Chromium + ffmpeg), 16:9 dan 9:16, ambient lembut | 0 |
| **Nadia** | Jadwal tayang WIB, unggah (selalu *private* dulu), thumbnail | 0 |
| **Fikri** | Statistik video → "pelajaran" untuk Bima | 0 |

Total sekitar **4–6 panggilan LLM per pekan** (batas harian 30 di `config/nurverse.json`). Penyedia berantai: Gemini → Groq → OpenRouter (semua ada paket gratis; nama model bisa diganti di config karena kuota gratis sering berubah).

## Pasang (±30 menit, sekali saja)

1. **Buat repo GitHub *publik*** dan unggah isi folder ini. (GitHub Pages gratis hanya untuk repo publik; kunci tetap aman di Secrets. Isi repo = naskah & rencana, yang toh akan tayang.)
2. **Settings → Pages → Source: GitHub Actions.**
3. **Kunci Google (gratis)**
   - `GEMINI_API_KEY`: aistudio.google.com/apikey
   - Google Cloud Console → proyek baru → aktifkan **YouTube Data API v3** → buat **API key** (`YT_API_KEY`, untuk riset).
   - Layar persetujuan OAuth → External → isi data dasar → **tekan "Publish app" (status *In production*)**. Jika dibiarkan *Testing*, token unggah **kedaluwarsa tiap 7 hari**.
   - Credentials → OAuth client ID → *Desktop app* → catat `YT_CLIENT_ID` dan `YT_CLIENT_SECRET`.
   - Di laptop: `YT_CLIENT_ID=… YT_CLIENT_SECRET=… npm install && npm run auth` → login dengan akun pemilik channel → salin `YT_REFRESH_TOKEN`. (Layar "app belum diverifikasi" normal untuk pemakaian pribadi.)
4. **Settings → Secrets and variables → Actions**: isi `GEMINI_API_KEY`, `YT_API_KEY`, `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN`. Opsional: `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (notifikasi ke HP lewat @BotFather).
5. **Actions → kantor → Run workflow.** Setelah selesai, buka `https://NAMAMU.github.io/NAMA-REPO/hp/` di HP → menu browser → *Tambahkan ke layar utama*. Kantor 3D ada di alamat tanpa `/hp/`.

## Memantau & menyetujui dari HP

Halaman `/hp/` menampilkan peringatan, video yang **menunggu persetujuan**, antrean pekan, dan catatan karyawan. Tombol **Setujui/Tolak** dan **Jalankan denyut** memakai token GitHub yang disimpan hanya di HP (⚙: repo + *fine-grained token* khusus repo ini, izin *Actions: read and write*). Tanpa itu, kamu tetap bisa menyetujui dari aplikasi GitHub: Actions → *approve* → Run workflow (isi id video).

Default `mode_persetujuan: "review"`: video diunggah **private**, dan baru dijadwalkan setelah kamu setuju. Untuk konten berisi dalil, ini sengaja. Setelah yakin, ubah ke `"otomatis"` (video langsung dijadwalkan di slot WIB).

## Mengatur

Semua di `config/nurverse.json`: jadwal (default utama Jumat 16:00 WIB; short Sen 12:30, Sel 05:30, Rab 18:30, Sab 08:00, Min 19:30 — tebakan awal, sesuaikan dengan data channelmu), jumlah short, niche, topik terlarang, suara, model LLM. Standar tampilan & aturan konten: `brand/NURVERSE.md` (kalau kamu sudah punya versimu sendiri, timpa file itu). Dalil hadis yang sudah **kamu periksa sendiri** bisa ditaruh di `data/dalil-pilihan.json` (`[{"kunci","jenis","label","arab","arti"}]`) lalu dirujuk model sebagai `pilihan:kunci`.

## Jaga konten (dicek mesin, bukan sekadar permintaan sopan)

- Teks ayat **tidak pernah ditulis model**: diambil dari api.alquran.cloud; gagal ambil → adegan dalil dibuang.
- Narasi yang menyebut "hadis/bersabda/berfirman/imam X berkata" tanpa dalil terverifikasi → ditahan (`butuh_manusia`), bukan ditayangkan.
- Ayat tidak dibacakan suara sintetis (hanya terjemahannya). Tanpa gambar makhluk bernyawa. Topik terlarang (politik, takfir, fatwa, dll.) ditahan.

## Batasan yang perlu kamu tahu

- **Bukan 24 jam nonstop.** Kantor "berdenyut" tiap 3 jam, mengerjakan yang jatuh tempo, lalu tidur. Hasilnya sama (konten tayang tepat waktu) tanpa menghabiskan kuota gratis. Animasi di kantor 3D mengikuti denyut itu.
- **Unggah via API** dari proyek Google yang belum diaudit pernah dikunci *private* oleh YouTube; sumber yang kutemukan saling bertentangan soal apakah aturan ini masih berlaku. Jika video tertahan, pemantau memberi peringatan dan kamu tinggal menekan *Publikasikan* di YouTube Studio.
- **Monetisasi:** kebijakan "konten tidak otentik" YouTube menyasar konten massal yang berulang-ulang. Variasikan topik, baca naskah sebelum setuju, dan jangan jadikan semua video templat yang sama.
- Hijriah memakai kalender Umm al-Qura (bisa beda 1 hari dari Kemenag). Skor hook adalah heuristik, bukan ramalan viral.
- Dukungan hadis sengaja ketat (terjemahan API sering memuat sanad panjang → dibuang). Pakai `dalil-pilihan.json` bila ingin hadis.
- Saran jadwal belum belajar dari analitik; Fikri baru memakai statistik dasar.

## Pengujian

`npm test` (logika murni, 8 uji) · `npm run demo` (satu short penuh dengan LLM/suara palsu: render sungguhan; butuh Chrome + ffmpeg, set `CHROME_PATH`) · `cd office && npm test`. Yang **belum** teruji karena butuh kuncimu: panggilan Gemini/Groq/OpenRouter, Edge TTS, API YouTube (riset & unggah), Telegram, dan deploy Pages. Kemungkinan salah paling besar ada di sana; lihat tab Actions dan catatan di `/hp/` pada denyut pertama.

## Kredit & lisensi

`office/` = template Kantor AI 3D (lihat `office/LICENSE`; kredit asli dipertahankan di tampilan dan kode). `skills/` = youtube-agent-skill (MIT, `skills/LICENSE-youtube-agent-skill`); prompt dan formula hook diadaptasi, penilai hook ditulis ulang untuk bahasa Indonesia.
