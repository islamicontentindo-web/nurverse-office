/** Jawaban LLM palsu untuk uji offline (MOCK=1). Bentuknya sama dengan jawaban LLM asli. */
const ay = { jenis: 'ayat', ref: '94:5-6' };
const adegan = (hook) => [
  { jenis: 'renungan', narasi: hook, teks: ['Doa yang belum dijawab', 'bukan doa yang ditolak'], motif: 'bulan' },
  { jenis: 'poin', judul: 'Tiga cara Allah menjawab', narasi: 'Allah menjawab doa dengan tiga cara. Pertama, mengabulkannya. Kedua, menggantinya dengan yang lebih baik. Ketiga, menundanya sampai waktu yang tepat.', teks: ['Dikabulkan', 'Diganti yang lebih baik', 'Ditunda sampai tepat waktu'], motif: 'bintang' },
  { ...ay, narasi: '', motif: 'cahaya' },
  { jenis: 'penutup', narasi: 'Kalau tulisan ini menenangkanmu, bagikan ke satu orang yang sedang menunggu jawaban doanya.', teks: ['Bagikan ke satu orang'], motif: 'bulan' },
];
export const MOCK_LLM = {
  plan: () => ({
    tema_pekan: 'Doa yang belum terjawab',
    utama: { topik: 'Kenapa doamu belum dijawab', sudut: 'tiga cara Allah menjawab doa', formula: 'pertanyaan-yang-tak-bisa-ditutup', dalil: { ayat: ['94:5-6'], hadis: [] } },
    short: [1, 2, 3, 4].map((i) => ({ topik: `Hikmah singkat ${i}`, sudut: `satu pelajaran ${i} dari ujian`, formula: 'pernyataan-tegas', dalil: { ayat: i === 1 ? ['94:5-6'] : [], hadis: [] } })),
  }),
  script_main: () => ({
    hooks: ['Kamu pernah merasa doamu tidak dijawab? Ternyata ada tiga cara Allah menjawabnya.', 'Doamu belum ditolak. Ini yang sering terlewat.', 'Halo sobat selamat datang di video kali ini', 'Kenapa doa terasa diam padahal sudah bertahun-tahun?', 'Sebelum kamu menyerah berdoa, dengarkan ini.'],
    judul: ['Kenapa Doamu Belum Dijawab? 3 Jawaban Allah', 'Doa Tidak Ditolak, Ini Buktinya'], thumb: 'TUNDA BUKAN TOLAK',
    adegan: adegan('Kamu pernah merasa doamu tidak dijawab? Ternyata ada tiga cara Allah menjawabnya.'),
    deskripsi: 'Kenapa doa terasa belum dijawab? Tiga cara Allah menjawab doa, dan satu ayat yang menenangkan hati.', tag: ['doa', 'motivasi islami', 'muhasabah', 'NURVERSE'], kueri: ['kenapa doa belum dijawab', 'doa tidak dikabulkan', 'cara Allah menjawab doa'],
  }),
  script_shorts: (p) => ({
    short: Array.from({ length: +(p.match(/jumlah=(\d+)/)?.[1] ?? 4) }, (_, i) => ({
      id: (p.match(/ids=([\w,-]+)/)?.[1] ?? 'S1').split(',')[i] ?? `S${i + 1}`,
      hooks: [`Kamu merasa ujianmu terlalu berat? Tunggu sampai kamu dengar ini ${i + 1}.`],
      judul: `Ujian Bukan Hukuman #${i + 1}`, thumb: 'BUKAN HUKUMAN',
      adegan: [
        { jenis: 'renungan', narasi: 'Kamu merasa ujianmu terlalu berat? Dengarkan ini sampai selesai.', teks: ['Ujian bukan hukuman'], motif: 'bulan' },
        { jenis: 'poin', judul: 'Ingat ini', narasi: 'Ujian datang untuk menaikkan derajat, bukan menjatuhkan. Yang terasa berat hari ini sedang membentukmu.', teks: ['Menaikkan derajat', 'Bukan menjatuhkan'], motif: 'bintang' },
        ...(i === 0 ? [{ ...ay, narasi: '', motif: 'cahaya' }] : []),
        { jenis: 'penutup', narasi: 'Dan ujian itu, ternyata, bukan hukuman.', teks: ['NURVERSE'], motif: 'bulan' },
      ],
      deskripsi: 'Satu pengingat singkat tentang ujian.', tag: ['ujian', 'sabar', 'shorts'],
    })),
  }),
  audit: () => ({ ok: true, masalah: [] }),
};
