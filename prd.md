# Product Requirements Document (PRD) — PreCheck

| Atribut | Isi |
|---|---|
| Versi | 0.3 (DRAFT) |
| Tanggal | 30 Oktober 2026 |
| Dokumen terkait | `docs/brd.md` v0.3 (tujuan dan kebutuhan bisnis), `docs/business-process.md` v0.4 (proses, BR-001 s.d. BR-064, asumsi) |
| Cakupan | Apa yang dibangun dan untuk siapa. Spesifikasi detail (FR-<AKTOR>-NNN, tabel transisi, skema kolom) ada di SRS (Fase 1, setelah "APPROVED") |

Konvensi: PF-nnn = fitur produk, prioritas MoSCoW, R1/R2/R3 = rilis. [ASUMSI] = belum disetujui.

**Riwayat revisi v0.3 (30 Oktober 2026):** (1) fokus produk menjadi **pakaian preloved**; (2) listing **tayang sampai terjual** (masa tayang 60 hari dihapus); (3) harga **direkomendasikan admin sesuai kondisi dan disetujui mitra**. Fitur baru: PF-033 (tanggapan mitra atas rekomendasi harga), PF-034 (revisi harga saat tayang), PF-035 (penanda stagnan), PF-036 (ditunda). PF-031 berubah dari "ditunda" menjadi pemeriksaan indikator keaslian (Must). PF-004, 008, 009, 013, 014, 015 diubah. Revisi v0.3: role ADMIN menyatukan kewenangan QC, katalog/harga, dan keuangan; persona, fitur, matriks akses, RBAC, dan sitemap diselaraskan.

---

## 1. Visi, Masalah, Tujuan

**Visi produk.** Pembeli pakaian preloved dapat membeli dengan yakin karena kondisi, ukuran aktual, dan indikator keaslian sudah diperiksa, difoto dengan standar yang sama, dicocokkan dengan klaim pemiliknya, dan dihargai sesuai kondisinya.

**Masalah** (BRD bagian 3): informasi kondisi hanya dari penjual; dokumentasi dan ukuran tidak standar; proses konsinyasi tidak terintegrasi; harga tidak selaras dengan kondisi.

**Tujuan produk**

| ID | Tujuan | Diukur dengan |
|---|---|---|
| G1 | Setiap pakaian yang tayang memiliki laporan QC (termasuk ukuran aktual) yang lengkap dan dapat dibaca pembeli dalam hitungan detik | KPI-01, KPI-02 |
| G2 | Klaim mitra dan temuan platform selalu dibandingkan dan tercatat | KPI-03 |
| G3 | Mitra dapat menitip tanpa mengurus pemasaran, memahami alasan harga, dan tahu persis berapa yang akan diterima | KPI-07, KPI-10, perkiraan payout tampil pada setiap rekomendasi harga |
| G4 | Tidak pernah ada dua pesanan untuk satu unit barang | 0 kejadian pada uji konkurensi |
| G5 | Pembeli yang menerima barang tidak sesuai QC memperoleh penyelesaian yang jelas | KPI-04, waktu keputusan komplain [ASUMSI] ≤ 2 hari kerja |
| G6 *(baru)* | Harga selaras kondisi: rekomendasi dikirim cepat dan disetujui mitra | KPI-10, KPI-11 |
| G7 *(baru)* | Barang yang tayang sampai terjual tidak menumpuk tanpa tindak lanjut | KPI-09, penanda stagnan 30/60/90 hari |

**Bukan tujuan (non-goals) R1:** tas, sepatu, aksesori, elektronik; pakaian anak dan bayi; sertifikasi keaslian oleh pihak ketiga; penetapan harga otomatis berbasis algoritma; keranjang multi-barang; tawar-menawar pembeli; aplikasi native; pembayaran dan pengiriman sungguhan; WhatsApp.

---

## 2. Pengguna dan Peran

Aplikasi menggunakan tiga role akun: `MITRA`, `PEMBELI`, dan `ADMIN`. Tamu tidak memerlukan akun, sedangkan Sistem otomatis, Kurir, dan Payment Gateway bukan role pengguna.

Persona berikut adalah hipotesis dari proposal dan harus divalidasi lewat riset pengguna (wawancara dan uji kegunaan) sebelum desain final.

| Peran (role Auth.js) | Siapa | Tujuan utama | Kekhawatiran utama (hipotesis) |
|---|---|---|---|
| MITRA | Pemilik pakaian preloved | Pakaian terjual tanpa repot dengan harga yang adil | Berapa yang saya terima? Kenapa harganya segitu? Kenapa ditolak? Berapa ongkirnya? |
| PEMBELI | Calon pembeli pakaian bekas | Pakaian sesuai ekspektasi dan ukuran | Apakah foto dan deskripsi jujur? Muat tidak? Bagaimana kalau tidak sesuai? |
| (Tamu) | Pengunjung tanpa akun | Menjelajah katalog dan melihat laporan QC | Apakah platform ini bisa dipercaya? |
| ADMIN | Pengelola seluruh operasional platform | Menangani verifikasi mitra, pre-screening, QC dan pengukuran pakaian, rekomendasi harga, katalog, pesanan, komplain, komisi, payout, refund, dan rekonsiliasi | Antrean lintas proses menumpuk; konsistensi QC; ketepatan harga dan pencatatan keuangan |

Aktor non-manusia: Sistem otomatis (cron/worker), Kurir (simulasi), Payment Gateway (Midtrans sandbox).

---

## 3. Perjalanan Pengguna Utama

**Mitra:** Daftar → unggah identitas → menunggu verifikasi → ajukan pakaian (data, ukuran label, foto, harga harapan opsional) → menunggu pre-screening → kirim barang dan input resi → terima hasil QC (layak / koreksi / tidak layak, dengan alasan dan foto) → **terima rekomendasi harga beserta alasan dan perkiraan payout → setuju, ajukan satu alternatif, atau tolak** → barang tayang sampai terjual → (bila stagnan, terima usulan revisi harga dan setujui atau tarik) → barang terjual → payout diterima.

**Pembeli:** Jelajah katalog (filter ukuran, subkategori, grade) → buka detail produk, **cek ukuran aktual** dan laporan QC → bandingkan → login → checkout (barang direservasi 24 jam, harga terkunci) → bayar → pantau pengiriman → konfirmasi terima atau komplain → beri review.

**Admin:** Mengelola seluruh alur operasional: verifikasi mitra → pre-screening → penerimaan barang → QC (checklist, grade, **pengukuran aktual**, **indikator keaslian**, foto) → double verification → keputusan → rekomendasi harga dan peninjauan harga alternatif → penayangan dan pengelolaan listing → tindak lanjut listing stagnan → pengemasan pesanan atau retur → penanganan komplain dan moderasi → pengaturan komisi, pemantauan pembayaran, payout, refund, dan rekonsiliasi.

---

## 4. Fitur dan Prioritas

Prioritas MoSCoW. Keterlacakan ke aturan bisnis ada di kolom BR.

### 4.1 Akun dan verifikasi

| ID | Fitur | Prioritas | Rilis | Peran | BR |
|---|---|---|---|---|---|
| PF-001 | Registrasi, login, logout, pemulihan akses (Auth.js), role pengguna yang berbeda | Must | R1 | Semua | BR-001, BR-003 |
| PF-002 | Verifikasi identitas mitra: unggah KTP dan selfie, antrean tinjau, setuju/tolak dengan alasan | Must | R1 | Mitra, Admin | BR-001, BR-002, BR-003, BR-005, BR-048 |
| PF-003 | Suspensi dan pemulihan akun mitra | Should | R2 | Admin | BR-004 |

### 4.2 Pengajuan dan pengiriman

| ID | Fitur | Prioritas | Rilis | Peran | BR |
|---|---|---|---|---|---|
| PF-004 *(diubah)* | Form pengajuan pakaian: subkategori, merek, **ukuran label, bahan, warna**, kondisi, kelengkapan, cacat, **ukuran aktual (opsional)**, **harga harapan (opsional)**, minimal 4 foto (depan, belakang, label, cacat), pernyataan kebenaran; simpan draft; ubah/batal sebelum dikirim | Must | R1 | Mitra | BR-006 s.d. BR-010, BR-013, BR-064 |
| PF-005 | Antrean pre-screening dengan keputusan dan alasan | Must | R1 | Admin | BR-011 |
| PF-006 | Instruksi pengiriman, input resi, penghitung mundur 7 hari, kedaluwarsa otomatis | Must | R1 | Mitra, Sistem | BR-012 |

### 4.3 Penerimaan, QC, double verification

| ID | Fitur | Prioritas | Rilis | Peran | BR |
|---|---|---|---|---|---|
| PF-007 | Penerimaan barang: cari kode pengajuan, catat kondisi kemasan, tandai anomali | Must | R1 | Admin | BR-014 |
| PF-008 *(diubah)* | QC workspace pakaian: checklist (kondisi kain, noda, bau, lubang, jahitan, ritsleting/kancing, kelengkapan, kebersihan, kesesuaian), grade A/B/C, **input pengukuran aktual dengan panduan titik ukur per subkategori**, foto terstruktur (depan, belakang, label merek, label ukuran/komposisi, foto ukuran, close-up cacat), catatan per cacat, checklist tambahan per subkategori, catatan perlakuan ringan | Must | R1 | Admin | BR-015 s.d. BR-018, BR-022, BR-057, BR-059 |
| PF-009 *(diubah)* | Double verification: matriks klaim mitra vs temuan platform per atribut (merek, ukuran label, bahan, warna, kondisi, cacat, kelengkapan, ukuran aktual, indikator keaslian) | Must | R1 | Admin | BR-019, BR-020 |
| PF-010 | Keputusan QC (layak / layak dengan koreksi / tidak layak) dengan alasan wajib, bukti foto, dan notifikasi ke mitra | Must | R1 | Admin, Mitra | BR-020, BR-021 |
| PF-011 | Persetujuan koreksi oleh mitra (3 hari), setuju atau tolak | Should | R2 | Mitra | BR-024 |
| PF-012 | Pengembalian barang tidak layak dan barang ditarik: kemas, resi retur, pelacakan | Must | R1 | Admin, Mitra | BR-023, BR-028 |
| PF-031 *(diubah)* | Pemeriksaan **indikator keaslian** pada QC: hasil *indikator terpenuhi / tidak dapat dipastikan / terindikasi tidak asli*, catatan dan foto bukti, redaksi lingkup di katalog (bukan sertifikasi) | Must | R1 | Admin | BR-058, BR-047 |

### 4.4 Harga dan katalog

| ID | Fitur | Prioritas | Rilis | Peran | BR |
|---|---|---|---|---|---|
| PF-013 *(diubah)* | **Rekomendasi harga**: form harga baru referensi, rentang pedoman per grade, harga rekomendasi dengan alasan wajib, kalkulator payout (komisi, estimasi ongkir, payout); validasi harga minimum dan payout > 0; tampil harga harapan mitra; SLA 2 hari kerja; riwayat | Must | R1 | Admin | BR-025 s.d. BR-027, BR-052, BR-055, BR-060, BR-064 |
| PF-033 *(baru)* | **Tanggapan mitra atas rekomendasi harga**: lihat alasan dan rincian payout; setuju, ajukan satu harga alternatif, atau tolak; batas 3 hari dengan pengingat; admin menerima alternatif atau mengirim rekomendasi final | Must | R1 | Mitra, Admin | BR-061, BR-026 |
| PF-014 *(diubah)* | Tayang, turunkan (takedown), **tayang sampai terjual**, tarik oleh mitra (saat belum direservasi) | Must | R1 | Admin, Mitra | BR-028, BR-029, BR-031, BR-032 |
| PF-034 *(baru)* | **Revisi harga saat tayang**: usulan admin (perlu persetujuan mitra) atau usulan mitra (perlu persetujuan admin); kedaluwarsa 3 hari = harga lama tetap; harga dikunci saat reservasi | Must | R1 | Admin, Mitra | BR-062 |
| PF-035 *(baru)* | **Penanda stagnan** 30/60/90 hari: antrean tinjau harga bagi Admin dan notifikasi ke mitra; listing tidak diturunkan otomatis | Should | R2 | Sistem, Admin, Mitra | BR-063 |
| PF-015 *(diubah)* | Katalog publik: pencarian, filter **subkategori, ukuran, warna, merek**, grade, kisaran harga, urutan; detail produk dengan galeri foto QC, **ukuran label dan ukuran aktual (cm)**, bahan, ringkasan hasil QC, hasil indikator keaslian, kelengkapan, cacat, penanda "preloved" | Must | R1 | Tamu, Pembeli | BR-029, BR-047, BR-057, BR-058 |

### 4.5 Transaksi

| ID | Fitur | Prioritas | Rilis | Peran | BR |
|---|---|---|---|---|---|
| PF-016 | Checkout satu barang dengan reservasi 24 jam (harga terkunci), pengatur waktu, pembatalan | Must | R1 | Pembeli | BR-030, BR-033 s.d. BR-035 |
| PF-017 | Pembayaran Midtrans sandbox, webhook dengan verifikasi tanda tangan dan idempotensi | Must | R1 | Pembeli, Sistem | BR-036 |
| PF-018 | Pesanan: antrean kemas, input resi, status pengiriman simulasi, konfirmasi terima, selesai otomatis 2x24 jam | Must | R1 | Admin, Pembeli, Sistem | BR-037, BR-038 |
| PF-019 | Komplain dengan bukti foto/video, keputusan Admin berdasar hasil QC (termasuk ukuran aktual), dan eksekusi refund oleh Admin | Must | R1 | Pembeli, Admin | BR-039, BR-045, BR-053 |
| PF-020 | Review per pesanan (rating dan teks), agregasi reputasi mitra, moderasi | Should | R2 | Pembeli, Admin | BR-040 s.d. BR-042 |

### 4.6 Uang

| ID | Fitur | Prioritas | Rilis | Peran | BR |
|---|---|---|---|---|---|
| PF-021 | Ledger tak-ubah, perhitungan komisi, payout setelah COMPLETED + masa tunggu, piutang mitra, refund | Must | R1 | Admin, Sistem | BR-043 s.d. BR-046, BR-052, BR-056 |
| PF-022 | Pengaturan tarif komisi per kategori; dashboard dan rekonsiliasi | Should | R2 | Admin | BR-052 |
| PF-023 | Halaman saldo dan riwayat payout untuk mitra | Should | R2 | Mitra | BR-043 |

### 4.7 Platform

| ID | Fitur | Prioritas | Rilis | Peran | BR |
|---|---|---|---|---|---|
| PF-024 *(diubah)* | Job terjadwal: kedaluwarsa pengajuan (7 hari), reservasi (24 jam), usulan harga (3 hari), selesai otomatis, pengingat. *(Kedaluwarsa masa tayang dihapus.)* | Must | R1 | Sistem | BR-012, BR-033, BR-038, BR-061, BR-062 |
| PF-025 | RBAC tiga peran (MITRA, PEMBELI, ADMIN), pengendalian akses, dan audit log seluruh tindakan Admin | Must | R1 | Admin | BR-050, BR-053, BR-054 |
| PF-026 | Notifikasi email dan dalam aplikasi untuk setiap perubahan status penting (termasuk rekomendasi harga dan revisi) | Should | R1 (inti) / R2 (lengkap) | Semua | — |
| PF-027 | Dashboard per peran: antrean (QC, pre-screening, verifikasi, rekomendasi harga), SLA mendekati batas, listing stagnan, metrik KPI | Should | R2 | Admin | KPI |
| PF-028 *(diubah)* | Halaman kebijakan: syarat dan ketentuan, privasi, kebijakan QC (apa yang diperiksa dan tidak, **batas indikator keaslian**, cara mengukur), **cara rekomendasi harga**, retur dan komplain, kategori terlarang | Must | R1 | Semua | BR-009, BR-047, BR-048, BR-051, BR-058, BR-060 |
| PF-029 | Pelaporan listing oleh pembeli dan moderasi | Could | R3 | Pembeli, Admin | BR-032 |

### 4.8 Ditunda

| ID | Fitur | Prioritas | Alasan |
|---|---|---|---|
| PF-030 | Keranjang multi-barang, wishlist, tawar-menawar pembeli | Won't (R1–R2) | Stok 1 dan lingkup (PQ-011) |
| PF-032 | Notifikasi WhatsApp | Won't | PQ-015 |
| PF-036 *(baru)* | Sertifikasi keaslian oleh pihak ketiga; penetapan harga otomatis berbasis algoritma; pakaian anak dan bayi; kategori non-pakaian | Won't (R1–R2) | A-026, A-027, PQ-009, PQ-024 |

---

## 5. Matriks Akses Ringkas

✓ = dapat melakukan, ◐ = hanya data milik sendiri, — = tidak.

| Kemampuan | Tamu | Pembeli | Mitra | Admin |
|---|---|---|---|---|
| Lihat katalog dan laporan QC | ✓ | ✓ | ✓ | ✓ |
| Checkout, bayar, komplain, review | — | ✓ | — | — |
| Ajukan barang, kirim, setujui koreksi, tarik barang | — | — | ◐ | — |
| **Tanggapi rekomendasi harga (setuju, alternatif, tolak); usulkan revisi harga** | — | — | ◐ | — |
| Verifikasi mitra, pre-screening | — | — | — | ✓ |
| Penerimaan, QC, pengukuran, indikator keaslian, double verification, keputusan QC | — | — | — | ✓ |
| Kemas pesanan, retur fisik | — | — | — | ✓ |
| **Rekomendasikan harga, tinjau alternatif, usulkan revisi, tindak lanjuti stagnan** | — | — | — | ✓ |
| Tayang/turunkan listing | — | — | — | ✓ |
| Putuskan komplain, moderasi | — | — | — | ✓ |
| Atur komisi, payout, refund, ledger | — | — | — | ✓ |
| Lihat data identitas mitra | — | — | ◐ | ✓ |
| Lihat audit log | — | — | — | ✓ |

---

## 6. Struktur Halaman (Sitemap Tingkat Tinggi)

Detail dan komponen untuk Figma akan dibuat sebagai docs/figma-brief.md setelah SRS.

| Area | Halaman utama |
|---|---|
| Publik | Beranda, katalog, detail produk + laporan QC + ukuran aktual, cara kerja PreCheck (termasuk cara rekomendasi harga), panduan ukuran, kebijakan, masuk/daftar |
| Pembeli | Checkout, pembayaran, pesanan saya, detail pesanan, komplain, review |
| Mitra | Dashboard, verifikasi identitas, pengajuan (daftar, buat, detail), hasil QC, persetujuan koreksi, **rekomendasi harga (detail, tanggapan, alternatif)**, **usulan revisi harga**, barang tayang, pesanan terjual, saldo dan payout |
| Admin | Dashboard operasional; verifikasi mitra; pre-screening; antrean penerimaan dan workspace QC (checklist, pengukuran, foto, keaslian); rekomendasi dan revisi harga; manajemen katalog dan listing stagnan; antrean kemas dan retur; komplain dan moderasi; pembayaran, payout, refund, komisi, ledger, rekonsiliasi; audit log |

---

## 7. Prinsip Pengalaman Pengguna dan Aksesibilitas

Target: WCAG 2.1 AA untuk seluruh halaman (NFR dan kriteria uji dirinci di SRS dan brief Figma).

1. **Laporan QC adalah pusat produk.** Pada detail produk, ringkasan (grade, status kelayakan, **ukuran aktual**, cacat utama) tampil di atas lipatan; detail dan galeri di bawahnya.
2. **Ukuran harus mudah dibandingkan.** Tampilkan ukuran label dan ukuran aktual (cm) dalam tabel dengan gambar titik ukur; sediakan panduan "cara mengukur pakaianmu".
3. Cacat tidak boleh hanya ditandai dengan warna (mis. noda, pudar). Gunakan label teks dan ikon; tiap foto cacat memiliki teks alternatif dan keterangan.
4. Galeri foto dapat dioperasikan dengan keyboard dan pembaca layar; urutan sisi konsisten (depan, belakang, label, ukuran, close-up).
5. Formulir panjang (pengajuan, QC) dibagi menjadi langkah dengan penyimpanan draft otomatis, pesan kesalahan spesifik, dan label yang jelas.
6. Target sentuh minimal 44 px, mobile-first (petugas QC kemungkinan memakai ponsel atau tablet untuk memotret dan mengukur).
7. Status dan alasan selalu terlihat: setiap keputusan menunjukkan siapa, kapan, mengapa, dan bukti.
8. **Harga selalu dijelaskan.** Rekomendasi harga menampilkan alasan (grade, cacat, referensi) dan rincian harga, komisi, ongkir, payout, bukan satu angka. Tombol setuju, alternatif, dan tolak setara menonjol agar mitra tidak merasa terdorong menyetujui.
9. **Redaksi keaslian jujur.** Gunakan frasa "indikator keaslian" dengan penjelasan lingkup; hindari kata "terjamin asli".
10. Bahasa antarmuka Bahasa Indonesia, format Rupiah, zona waktu WIB.

---

## 8. Data Utama (Pratinjau, Bukan Skema)

Skema kolom, tipe, FK, dan ENUM dirinci di SRS. Entitas calon:

`users`, `partner_profiles`, `partner_verifications`, `categories` (subkategori pakaian), `items` (pengajuan dan barang, termasuk ukuran label, bahan, warna, harga harapan), `item_photos`, **`item_measurements`** (ukuran aktual per titik ukur: klaim mitra dan hasil QC), `qc_inspections`, `qc_checklist_results`, `qc_claim_comparisons`, **`authenticity_checks`**, `listings`, **`price_guidelines`** (rentang persen per grade), **`price_proposals`** (rekomendasi dan revisi: pengusul, harga, alasan, status, ronde), `price_history`, `orders` (menyimpan harga saat reservasi), `payments`, `shipments`, `complaints`, `reviews`, `ledger_entries`, `payouts`, `commission_rates`, `notifications`, `audit_logs`.

Status penting mengikuti state diagram pada business-process.md bagian 4 (barang termasuk `PRICING`, usulan harga, pesanan, akun mitra). `LISTING_EXPIRED` tidak ada lagi.

---

## 9. Integrasi

| Integrasi | Penggunaan | Mode R1 |
|---|---|---|
| Midtrans | Pembayaran pembeli; payout disimulasikan di ledger | Sandbox |
| Kurir | Resi dan status pengiriman | Simulasi (input manual dan simulator) |
| Vercel Blob | Foto pengajuan, foto QC, bukti komplain; berkas identitas pada akses privat | Aktif |
| Email transaksional | Notifikasi | Penyedia belum dipilih (Resend atau setara) [ASUMSI] |
| Vercel Cron | Job terjadwal | Aktif; cek batas paket |

Pembayaran dan kurir dirancang sebagai adapter sehingga simulasi dapat diganti layanan nyata tanpa mengubah logika bisnis.

---

## 10. Kebutuhan Non-Fungsional (Ringkas)

| Area | Kebutuhan awal | Catatan |
|---|---|---|
| Aksesibilitas | WCAG 2.1 AA | Audit pada Sprint 7 |
| Performa | Halaman katalog dan detail produk: LCP ≤ 2,5 detik pada jaringan seluler yang wajar [ASUMSI]; foto dioptimasi dan dimuat bertahap; filter ukuran dan warna tetap responsif | Gunakan RSC dan optimasi gambar Next.js |
| Konkurensi | Tidak ada dua pesanan aktif untuk satu barang; tidak ada dua usulan harga terbuka untuk satu barang | Lihat bagian 13 |
| Keamanan | RBAC server-side, validasi Zod pada setiap Server Action, berkas identitas privat, verifikasi tanda tangan webhook, rate limiting pada login dan unggah | OWASP ASVS sebagai acuan [ASUMSI] |
| Privasi | Minimasi data, akses terbatas, retensi 2 tahun (A-016), hak penghapusan sesuai ketentuan | BR-048, BR-049 |
| Keandalan | Job idempoten; webhook dapat diproses ulang tanpa efek ganda | |
| Keterlacakan | Audit log tak-ubah untuk tindakan admin (termasuk rekomendasi dan revisi harga); ledger tak-ubah | BR-050, BR-056 |
| Kepatuhan | Informasi barang jujur; klaim keaslian tidak menyesatkan; identitas pelaku usaha; syarat dan ketentuan | BR-047, BR-051, BR-058 |

---

## 11. Metrik dan Instrumentasi

KPI pada BRD bagian 3.3 diturunkan dari data produk. Peristiwa minimal yang dicatat:

| Peristiwa | Dipakai untuk |
|---|---|
| `item_submitted`, `item_prescreen_decided`, `item_received`, `qc_started`, `qc_decided` | KPI-01, KPI-03, alur antrean |
| `price_recommended`, `price_responded` (setuju/alternatif/tolak/kedaluwarsa), `price_revision_proposed`, `price_revision_decided` | KPI-10, KPI-11, RSK-15 |
| `listing_published`, `listing_viewed`, `qc_report_expanded`, `size_table_viewed`, `listing_stagnant_flagged` | KPI-02, KPI-09, minat pada laporan QC dan ukuran |
| `checkout_started`, `payment_succeeded`, `reservation_expired` | Konversi dan RSK-08 |
| `complaint_filed`, `complaint_decided` (dengan alasan: noda, ukuran, bau, keaslian, lainnya) | KPI-04, RSK-16 |
| `order_completed`, `payout_executed` | KPI-06, KPI-07 |
| Survei kepercayaan (pasca selesai) | KPI-05 |

---

## 12. Rencana Rilis

| Rilis | Isi | Kriteria selesai |
|---|---|---|
| **R1 (MVP)** | Seluruh fitur Must: PF-001, 002, 004–010, 012–019, 021, 024, 025, 028, **031, 033, 034**; PF-026 inti | Alur penuh berjalan: daftar → ajukan → QC (ukur) → rekomendasi harga → mitra setuju → tayang → beli → bayar (sandbox) → kirim (simulasi) → selesai → payout; uji konkurensi dan uji peran lulus |
| **R2** | Fitur Should: PF-003, 011, 020, 022, 023, 026 lengkap, 027, **035** | Review, koreksi, dashboard, penanda stagnan, tarif komisi per kategori |
| **R3** | Could dan lanjutan: PF-029; evaluasi PF-030 dan PF-036 | Berdasarkan hasil UAT dan umpan balik |

Catatan: karena tayang sampai terjual, revisi harga (PF-034) masuk R1 agar barang yang lambat laku tetap dapat dikelola walaupun penanda stagnan otomatis (PF-035) baru di R2; di R1 Admin dapat memantau umur tayang secara manual.

Jadwal sprint tingkat tinggi ada di BRD bagian 12.

---

## 13. Pendekatan Teknis (Ringkas)

Mengikuti pola proyek Nokoribite: aturan bisnis kritis ditegakkan pada **tiga lapis**.

| Lapis | Mekanisme | Contoh PreCheck |
|---|---|---|
| Database (Postgres, Drizzle) | ENUM status, CHECK constraint, FK, unique index | Indeks unik parsial: maksimal satu pesanan aktif per barang; **indeks unik parsial: maksimal satu usulan harga terbuka per barang**; CHECK `harga_jual >= 50000` dan payout > 0 (BR-055); perubahan status lewat `UPDATE ... WHERE status = <status_asal>` agar transisi atomik |
| Server Action | Validasi Zod dan RBAC | Transisi status hanya lewat fungsi yang memeriksa role ADMIN, status asal, dan aturan bisnis; keputusan QC menolak penyimpanan tanpa alasan dan bukti (BR-021); rekomendasi harga menolak penyimpanan tanpa alasan serta memvalidasi harga minimum dan payout; seluruh tindakan penting dicatat pada audit log (BR-050, BR-053, BR-054) |
| Job terjadwal (Vercel Cron) | Transisi berbasis waktu, idempoten | Kedaluwarsa pengajuan 7 hari, reservasi 24 jam, **usulan harga 3 hari**, selesai otomatis 2x24 jam, **penanda stagnan 30/60/90 hari** (hanya menandai, tidak mengubah status) |

Catatan penting:

- **Konkurensi reservasi.** Checkout memakai transaksi dengan penguncian baris barang (`SELECT ... FOR UPDATE`) atau pembaruan bersyarat, dilindungi indeks unik parsial sebagai pengaman terakhir. Harga pesanan disalin dari harga listing saat reservasi (snapshot), sehingga revisi harga tidak memengaruhi pesanan berjalan.
- **Persetujuan harga.** Perubahan harga listing hanya terjadi saat usulan berstatus ACCEPTED, dalam satu transaksi yang memperbarui harga, mencatat `price_history`, dan menulis audit log.
- **Midtrans.** Verifikasi tanda tangan notifikasi, kunci idempotensi per pesanan, dan penanganan notifikasi ganda atau terlambat.
- **Uang.** Nominal disimpan sebagai bilangan bulat Rupiah; ledger bersifat append-only; koreksi lewat entri baru.
- **Berkas.** Foto identitas disimpan privat dan diakses lewat tautan bertanda tangan berumur pendek; foto katalog publik terpisah.
- **Runtime.** Bun untuk instalasi dan skrip lokal/CI; fungsi produksi di Vercel berjalan pada runtime Node.js.
- **Cron.** Verifikasi batas frekuensi Vercel Cron pada paket yang dipakai sebelum mengandalkan interval pendek.

---

## 14. Risiko Produk dan Pertanyaan Terbuka

Risiko bisnis lengkap ada di BRD bagian 10. Risiko khusus produk:

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Form QC terlalu panjang (kini ditambah pengukuran) sehingga petugas mengabaikan detail | Kualitas QC turun (RSK-03) | Uji kegunaan dengan petugas; default cerdas; titik ukur ditampilkan sesuai subkategori; simpan draft |
| Foto dan ukuran tidak konsisten antar petugas | Laporan QC tidak seragam; komplain ukuran (RSK-16) | Panduan sisi foto dan titik ukur dengan gambar, pratinjau, validasi jumlah dan sisi minimum, alat ukur standar |
| Pembeli mengabaikan laporan QC dan tabel ukuran | Nilai produk tidak terasa | Ringkasan di atas lipatan; lencana grade; ringkasan ukuran; uji A/B pada UAT |
| Perhitungan payout membingungkan mitra | Mitra enggan menitip | Rincian eksplisit pada setiap rekomendasi harga |
| Rekomendasi harga terasa sepihak atau tidak transparan | Mitra menolak, barang dikembalikan (RSK-15) | Alasan wajib, pedoman publik, satu putaran alternatif, harga harapan mitra sebagai masukan |
| Listing menumpuk karena tayang sampai terjual | Katalog dan gudang penuh (RSK-14) | Penanda stagnan, antrean tinjau harga, kemudahan menarik barang; keputusan batas penyimpanan (PQ-021) |
| Redaksi keaslian dipahami sebagai jaminan | Sengketa dan risiko kepatuhan (RSK-10) | Frasa "indikator keaslian", opsi "tidak dapat dipastikan", halaman kebijakan QC |

Pertanyaan yang masih menentukan PRD (lengkap di business-process.md bagian 8):

- **A-008:** konfirmasi bahwa mitra menanggung seluruh ongkir, termasuk ke pembeli.
- **A-027:** konfirmasi bahwa Pre-check mencakup indikator keaslian visual (bukan sertifikasi).
- **A-030 dan A-031:** angka pedoman harga per grade dan hak mitra menolak atau mengajukan alternatif.
- **PQ-021 s.d. PQ-025:** batas atau biaya penyimpanan, harga minimum dan komisi untuk pakaian, titik ukur dan toleransi, ruang lingkup subkategori, ongkir retur saat harga ditolak.
- **PQ-008 s.d. PQ-020:** ketatnya verifikasi identitas, review, keranjang, barang retur tidak diambil, gudang dan wilayah, tingkat realisme simulasi, notifikasi, skala demo, penyimpanan foto, ongkir retur komplain, tenggat dan ukuran tim, target KPI.

---

## 15. Lampiran: Keterlacakan BR → Fitur

| Kelompok BR | Fitur |
|---|---|
| BR-001 s.d. BR-005 (akun dan verifikasi) | PF-001, PF-002, PF-003 |
| BR-006 s.d. BR-013, BR-064 (pengajuan) | PF-004, PF-005, PF-006 |
| BR-014 s.d. BR-024, BR-057 s.d. BR-059 (penerimaan, QC, ukuran, keaslian, double verification) | PF-007 s.d. PF-012, PF-031 |
| BR-025 s.d. BR-028, BR-060 s.d. BR-062 (harga: rekomendasi, persetujuan, revisi) | PF-013, PF-014, PF-033, PF-034 |
| BR-029 s.d. BR-032, BR-063 (katalog, stok, tayang sampai terjual, stagnan) | PF-014, PF-015, PF-029, PF-035 |
| BR-033 s.d. BR-039 (transaksi) | PF-016 s.d. PF-019 |
| BR-040 s.d. BR-042 (review) | PF-020 |
| BR-043 s.d. BR-046, BR-052, BR-055, BR-056 (uang) | PF-013, PF-021, PF-022, PF-023 |
| BR-047 s.d. BR-051 (kepatuhan dan audit) | PF-025, PF-028, PF-002 |
| BR-053, BR-054 (satu role Admin dan cakupan kewenangan) | PF-025 |

Seluruh BR akan dipetakan ke FR/NFR pada SRS (Fase 1).
