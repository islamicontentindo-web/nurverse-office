import fs from 'node:fs';
import { P, readJson } from './util.mjs';
export const tema = () => readJson(P('brand/tema.json'));
/** Ringkasan standar brand untuk prompt (singkat = hemat token). */
export const ringkasBrand = () => `NURVERSE: channel islami animasi motion graphic berbahasa Indonesia, nada tenang-hangat-menguatkan.
ATURAN: (1) tanpa makhluk bernyawa/wajah/penggambaran Nabi-malaikat-sahabat; (2) JANGAN menulis teks ayat/hadis sendiri: cukup beri rujukan, sistem mengambil teks dari sumber terverifikasi; (3) jangan menyebut "hadis/bersabda/berfirman" kecuali adegan dalil terkait ada; (4) tanpa fatwa/vonis halal-haram, politik, takfir, mazhab, tafsir mimpi, klaim penyembuhan; (5) jangan kutip ulama; (6) tanpa angka/fakta tanpa sumber; (7) satu ajakan saja di penutup. Hook: sapa "kamu", spesifik, ada taruhan/teka-teki, tanpa salam pembuka panjang. Kalimat pendek, bahasa lisan.`;
