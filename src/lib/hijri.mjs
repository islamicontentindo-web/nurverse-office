/** Musim islami (kalender Hijriah Umm al-Qura, bisa selisih ±1 hari dari Kemenag RI). Nol token. */
const BULAN = ['', 'Muharram', 'Safar', "Rabiul Awal", "Rabiul Akhir", 'Jumadil Awal', 'Jumadil Akhir', 'Rajab', "Sya'ban", 'Ramadan', 'Syawal', "Dzulqa'dah", 'Dzulhijjah'];
const TEMA = {
  1: ['hijrah dan awal tahun baru Hijriah', 'puasa Asyura (10 Muharram)'],
  2: ['tawakal dan menolak sial/tathayyur'],
  3: ['mengenal akhlak Rasulullah ﷺ (Maulid, 12 Rabiul Awal)'],
  4: ['menuntut ilmu'],
  5: ['istiqamah', 'syukur'],
  6: ['sabar dalam ujian'],
  7: ['Isra Mi\'raj (27 Rajab) dan shalat'],
  8: ["menyambut Ramadan, Nisfu Sya'ban"],
  9: ['Ramadan: puasa, Al-Qur\'an, Lailatul Qadar'],
  10: ['Idul Fitri, menjaga amal setelah Ramadan'],
  11: ['persiapan haji, ikhlas'],
  12: ['10 hari pertama Dzulhijjah, Arafah, kurban'],
};
export function hijri(date = new Date()) {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'Asia/Jakarta' });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  const bulan = Number(p.month);
  return { hari: Number(p.day), bulan, namaBulan: BULAN[bulan], tahun: parseInt(p.year, 10) };
}
/** Tema musiman: bulan ini + bulan depan, plus Jumat (pasti relevan). */
export function musim(date = new Date()) {
  const h = hijri(date);
  const next = h.bulan === 12 ? 1 : h.bulan + 1;
  return { hijriah: `${h.hari} ${h.namaBulan} ${h.tahun}`, bulan_ini: TEMA[h.bulan], bulan_depan: TEMA[next], catatan: 'Hari Jumat: tema Jumat/shalawat/sedekah selalu relevan.' };
}
