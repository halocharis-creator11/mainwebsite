# Foto utama website

Taruh foto di folder ini, lalu isi `PHOTOS` di `assets/js/config.js`, misalnya:

```js
hero: { src: *assets/img/foto/posyandu.jpg*, alt: *Kader posyandu menimbang balita*,
        credit: *CDC/Jenny Milucky*, credit_url: *https://wwwn.cdc.gov/phil/Details.aspx?pid=22778* },
```

| Slot | Tampil di | Ukuran yang disarankan |
|---|---|---|
| `hero` | Slide pertama beranda (teks di kiri, jadi subjek foto sebaiknya di kanan) | lebar min. 2000 px, landscape |
| `highlight` | Bagian *Pembiayaan kesehatan* di beranda | min. 1400 × 1050 px |
| `about` | Banner halaman Tentang Kami | min. 2000 × 760 px |
| `services` | Banner halaman Layanan Kami | min. 2000 × 760 px |
| `vision` | Latar samar di belakang pita visi dan misi (beranda dan Tentang Kami), tampil hitam putih | lebar min. 2000 px |
| `svc_a` | Latar bidang Analisis Kesehatan di halaman Layanan | lebar min. 2000 px, landscape |
| `svc_r` | Latar bidang Penelitian dan Pengembangan | lebar min. 2000 px, landscape |
| `svc_s` | Latar bidang Layanan Kesehatan Terintegrasi | lebar min. 2000 px, landscape |

Kosongkan `src` untuk memakai motif balok CHARIS. Foto latar bidang (`svc_a`, `svc_r`, `svc_s`) diberi warna bidangnya dan dibuat transparan, jadi foto kegiatan biasa pun tetap tampak rapi. Bila bagian penting foto bukan di tengah, tambahkan `pos`, misalnya `pos: "center 30%"` (geser fokus ke atas).

Foto juga bisa dipasang per layanan, tampil samar di kepala kartu layanan tersebut. Tambahkan di `config.js`, di luar `PHOTOS`:

```js
SERVICE_PHOTOS: {
  financing: { src: "assets/img/foto/lokakarya-biaya-satuan.jpg", pos: "center" },
  training:  { src: "assets/img/foto/pelatihan-nakes.jpg" }
},
```

Kode layanan: analytics, financing, policy, resources, epidemiology, resilience, digital (Analisis Kesehatan); public_health, hpsr, evaluation, innovation, standards, grants (Penelitian dan Pengembangan); planning, management, quality, integration, facility_tools, training, programs (Layanan Kesehatan Terintegrasi). Simpan sebagai JPG berkualitas 80 sampai 85%, idealnya di bawah 400 KB per foto.

## Sumber foto yang aman dipakai

**Jangan mengambil foto dari Pinterest.** Pinterest hanya tempat orang menyimpan ulang gambar dari situs lain. Hak cipta tetap milik fotografer asli, dan Pinterest tidak memberi izin pakai. Pinterest boleh dipakai untuk mencari ide, lalu buka sumber aslinya dan periksa lisensinya.

Sumber dengan lisensi jelas:

1. **Dokumentasi kegiatan sendiri.** Ini pilihan terbaik untuk kredibilitas, misalnya foto lokakarya, kunjungan lapangan, atau pelatihan. Minta izin orang yang wajahnya terlihat.
2. **CDC Public Health Image Library** (phil.cdc.gov). Sebagian besar foto berstatus domain publik, termasuk foto posyandu di Indonesia (ID 22778). Wajib mencantumkan kredit, misalnya *CDC/nama fotografer*.
3. **Unsplash** (unsplash.com) dan **Pexels** (pexels.com). Gratis, boleh untuk website organisasi, dan kredit tidak wajib tetapi dianjurkan. Kata kunci yang berguna: *Indonesia village*, *Bali rice field*, *Indonesian nurse*, *puskesmas*, *posyandu*, *Indonesian doctor*, *Jakarta hospital*.
4. **Wikimedia Commons** (commons.wikimedia.org). Periksa lisensi tiap foto (CC BY atau CC BY-SA) dan cantumkan kredit sesuai lisensinya.

Untuk foto pasien, anak, atau fasilitas kesehatan, pastikan subjek tidak dalam kondisi yang merendahkan martabat. Hindari foto yang memperlihatkan data pasien.
