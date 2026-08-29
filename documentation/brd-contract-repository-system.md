# BUSINESS REQUIREMENT DOCUMENT (BRD)
## Project Name: Contract Repository System (CRS) - Phase 1 MVP
**Document Version:** 6.0  
**Author:** Senior IT Business Analyst  
**Date:** 2026-08-27  

---

## 1. Document Control & Revision History
*Tabel ini merekam riwayat perubahan dan evolusi dokumen sebagai bagian dari tata kelola proyek (Governance).*

| Version | Date | Description | Author |
| :--- | :--- | :--- | :--- |
| **1.0** | 2026-08-01 | *Initial Version (Standard Template)* - Pembentukan struktur awal CRS. | Muhamad Rizki Ilahi |
| **2.0** | 2026-08-02 | Pembaruan Alur Kerja - Penyusunan alur *Offline Signing* & *Final Legal Verification*. | Muhamad Rizki Ilahi |
| **3.0** | 2026-08-02 | Penambahan Fitur *Read-Only Legal Guidelines* (Buku Saku Digital) pada form *Drafting*. | Muhamad Rizki Ilahi |
| **4.0** | 2026-08-02 | Penambahan Atribut *Partner PIC* (Nama & Kontak PIC Mitra) pada Metadata *Contract Details*. | Muhamad Rizki Ilahi |
| **5.0** | 2026-08-26 | Konsolidasi Dokumen Final & Penyelarasan Atribut untuk Kebutuhan *Vibe Coding*. | Senior IT Business Analyst |
| **6.0** | 2026-08-27 | Penyelarasan BRD dengan implementasi aktual: tambah DKM & Perkumpulan (REQ-02), perluas tipe file scan (REQ-03), update siklus reminder H-7 (REQ-05), tambah fitur in-scope Analytics/Export/Comments, klarifikasi workflow BU-recall & Legal reject-at-intake, update asumsi SSO. | Senior IT Business Analyst |

---

## 2. Executive Summary (Ringkasan Eksekutif)
### 2.1 Project Overview (Gambaran Umum Proyek)
**Contract Repository System (CRS)** adalah aplikasi pengarsipan digital tersentralisasi (*centralized digital repository*) yang dirancang untuk mengelola seluruh dokumen Perjanjian Kerja Sama (PKS), mengelola versi dokumen secara ketat (*version control*) selama proses reviu, mengakomodasi verifikasi pasca-tanda tangan fisik (*offline signing*), dan memberikan peringatan masa berlaku otomatis (*automated reminder*). 

Sistem ini dikembangkan secara *Agile* dengan memfokuskan pengembangan **Fase 1** sebagai **Minimum Viable Product (MVP)** guna mengamankan fondasi hukum perusahaan dengan cepat (target rilis 1-2 bulan) sebelum bertransformasi menjadi **Partnership Lifecycle Hub (PLH)** di Fase 2.

### 2.2 Business Objectives (Tujuan Bisnis)
*   **Contract Lifecycle Management:** Digitalisasi manajemen draf dari inisiasi awal, reviu hukum, tanda tangan, hingga otomatisasi monitoring masa berlaku kontrak.
*   **Risk Mitigation:** Memitigasi risiko dokumen hukum tercecer, hilang, atau kedaluwarsa tanpa sepengetahuan manajemen eksekutif yang dapat berdampak pada risiko hukum atau finansial.
*   **SLA Ping-Pong Reduction:** Mereduksi tingkat penolakan draf (*backlog review*) antara Unit Bisnis dan Tim Legal akibat ketidaklengkapan dokumen administratif melalui edukasi proaktif (fitur *Smart Legal Guidelines*).
*   **Agile Communication:** Memfasilitasi koordinasi cepat (*agile coordination*) dengan mitra saat masa perpanjangan kontrak melalui perekaman data *Partner PIC* yang terpusat.
*   **Compliance & Audit Trail:** Menyediakan rekam jejak digital (*immutable audit trail*) dari setiap interaksi pengguna di sistem untuk keperluan audit kepatuhan (*compliance audit*).

---

## 3. Project Scope (Ruang Lingkup Proyek)
### 3.1 In-Scope (Dalam Lingkup Pengerjaan Fase 1 MVP)
*   **Metadata & Storage:** Penyimpanan terstruktur metadata PKS (termasuk *Institution Type* — Yayasan, Perusahaan (PT), Koperasi, Instansi Pemerintah, DKM, Perkumpulan, dan Perorangan — *Owning Business Unit*, Nilai Kontrak, dan *Partner PIC* beserta kontak terpisah nomor telepon dan email) dan berkas digital persisten (.docx dan .pdf).
*   **Smart Legal Guidelines:** Tombol panduan administratif (*Smart Info Button*) di form pembuatan draf yang menampilkan prasyarat dokumen legalitas secara dinamis berdasarkan tipe lembaga mitra (termasuk DKM dan Perkumpulan).
*   **End-to-End Workflow:** Alur status utama: *Drafting* $\rightarrow$ *Submitted for Review* $\rightarrow$ *Under Legal Review* $\rightarrow$ *Ready for Signature* $\rightarrow$ *Pending Final Verification* $\rightarrow$ *Signed & Active*. Ditambah alur alternatif: BU dapat *recall* draft yang sudah disubmit, dan Legal dapat menolak (*reject*) kontrak langsung di tahap *intake* sebelum review penuh.
*   **Dual Review Mode & Watermarking:** Fasilitas bagi Tim Legal untuk meninjau secara digital (.docx) maupun manual (unggah hasil *scan* berkas coretan .pdf, .jpg, atau .png) yang dilengkapi penyematan tanda air (*automated watermarking*) "DRAFT - HASIL REVIU LEGAL" secara diagonal dengan opasitas 30%.
*   **Automated Reminders:** Sistem pengingat otomatis via in-app notification pada H-60, H-30, dan H-7 sebelum PKS kedaluwarsa. Pengiriman email opsional melalui konfigurasi SMTP.
*   **Audit Trail & Dashboard:** Dasbor ringkasan eksekutif (*Summary Cards* & *Data Grid*) yang terintegrasi dengan halaman detail kontrak (*Contract Details Page*) dan mencatat jejak aktivitas pengguna secara permanen.
*   **Analytics & Reporting:** Dasbor analitik visual (distribusi per BU, status, tipe institusi, tren bulanan) dan ekspor laporan portofolio PKS ke format Excel (.xlsx) dan PDF (.pdf).
*   **Dual Review Comment System:** Fasilitas diskusi inline antara Business Unit dan Tim Legal pada viewer dokumen draf dan scan tandatangan.

### 3.2 Out-of-Scope (Di Luar Lingkup Fase 1 MVP - Backlog Fase 2 PLH)
*   **Relational Model PLH:** Pemetaan relasi data kompleks antara entitas Mitra (*Partner Entity*) dan Program Kerja Sama (*Partnership Program*).
*   **Conditions Precedent (CP) Block:** Fitur pemblokiran program (*hard-stop*) otomatis jika dokumen mutlak (seperti SK Pengesahan Kemenkumham) belum terpenuhi di tingkat program.
*   **Financial & Impact Monitoring:** Pencatatan realisasi penghimpunan/penyaluran dana ZISWAF secara riil per PKS.
*   **Integration with E-Meterai & Digital Signature:** Tanda tangan digital langsung di platform (seperti integrasi Peruri/Vida).

---

## 4. Key Stakeholders & Value Proposition (Pemangku Kepentingan)
| Stakeholder / Role | Business Focus | Value Proposition / Benefits |
| :--- | :--- | :--- |
| **Executive Management (Direksi/Kadiv)** | *Strategic Oversight & Governance* (Pengawasan Strategis & Tata Kelola) | Mendapatkan *Helicopter View* profil kemitraan secara *real-time*, meminimalkan risiko kepatuhan syariah, reputasi, dan hukum. |
| **Legal & Compliance Group (LCG)** | *Risk Mitigation & Compliance* (Mitigasi Risiko & Kepatuhan) | Menghilangkan *backlog* verifikasi manual, menjaga standardisasi klausul via sistem, dan menghentikan dokumen cacat hukum lewat gerbang verifikasi final (*Final Legal Verification*). |
| **Business Unit (PIC RNG, CAG, PGG)** | *Operational Efficiency & Speed* (Efisiensi & Akselerasi Program) | Visibilitas status draf secara transparan (*SLA tracking*), kejelasan dokumen persyaratan sejak awal kemitraan, dan otomatisasi pengingat perpanjangan kontrak. |
| **System Administrator (IT Admin)** | *Security & Configuration* (Keamanan & Konfigurasi) | Menjaga stabilitas infrastruktur, manajemen akun pengguna, dan isolasi data agar tidak terjadi manipulasi log aktivitas. |

---

## 5. Detailed Business Requirements (Kebutuhan Bisnis Rinci)
### 5.1 Submission & Auto-Fill System (REQ-01)
*   Sistem harus memfasilitasi *Business Unit* untuk mengunggah draf awal (.docx) dan mengekstrak metadata secara otomatis (*Auto-Fill*) berdasarkan templat baku BSI Maslahat menggunakan kata kunci jangkar (*anchor words*).
*   Pengguna harus memiliki hak edit (*edit access*) untuk mengoreksi data hasil ekstraksi otomatis sebelum diajukan ke proses peninjauan (*Submit for Review*).

### 5.2 Smart Legal Guidelines (REQ-02)
*   Sistem harus menyediakan tombol informasi dinamis (*Smart Info Button*) di form pendaftaran draf.
*   Ketika tombol diklik, sistem menampilkan *pop-up modal (read-only)* berisi matriks kelengkapan dokumen pendukung yang spesifik untuk tipe lembaga yang dipilih:
    *   **Yayasan**: Akta Pendirian, SK Kemenkumham (AHU), AD/ART, SK Pengurus.
    *   **Perusahaan (PT)**: Akta Pendirian, SK Kemenkumham, NPWP, NIB (OSS).
    *   **Koperasi**: Akta Pendirian Koperasi, SK Menteri Koperasi, AD/ART.
    *   **Instansi Pemerintah**: Surat Kuasa/SK Penunjukan, DIPA/Anggaran.
    *   **DKM (Dewan Kemakmuran Masjid)**: SK Pembentukan DKM, KTP Ketua/PIC, Surat Keterangan Domisili Masjid.
    *   **Perkumpulan**: Akta Pendirian, SK Kemenkumham, AD/ART, SK Pengurus Aktif.
    *   **Perorangan**: KTP, NPWP.
*   Setiap entri matriks dilengkapi keterangan: kategori dokumen (Wajib / Wajib Bisa Disubstitusi), status Conditions Precedent (CP), risiko hukum, dan solusi mitigasi — tanpa membebani pengguna dengan pengisian *checklist* wajib.

### 5.3 Dual Review Mode & Automated Watermarking (REQ-03)
*   Sistem wajib mendukung opsi peninjauan ganda bagi Tim Legal:
    *   **Opsi Digital:** Unggah kembali dokumen revisi berformat `.docx` dengan fitur *Track Changes*.
    *   **Opsi Manual:** Unggah berkas coretan manual hasil pemindaian (*scan*) berformat `.pdf`, `.jpg`, `.jpeg`, atau `.png`.
*   Jika opsi manual dipilih (upload .pdf, .jpg, .jpeg, atau .png oleh Legal Officer), sistem harus menyuntikkan tanda air (*automated watermarking*) bertuliskan **"DRAFT - HASIL REVIU LEGAL"** secara diagonal di tengah halaman berkas dengan opasitas 30% sebagai pengaman visual (*visual safeguard*).
*   Injeksi watermark bersifat *server-side* (dilakukan otomatis oleh backend sebelum file disimpan) sehingga tidak memerlukan aksi manual dari pengguna.
*   Setiap kejadian injeksi watermark dicatat di *Audit Trail* dengan event `WATERMARK_INJECTED`.

### 5.4 Strict Version Control & Hard-Stop Governance (REQ-04)
*   Sistem harus menghasilkan nomor versi otomatis secara berurutan (v1.0 $\rightarrow$ v1.1 $\rightarrow$ v1.2) setiap kali draf diperbaiki oleh Unit Bisnis tanpa menimpa atau menghapus file versi sebelumnya.
*   Sistem menerapkan mekanisme gerbang verifikasi (*Final Legal Verification*). Status PKS tidak boleh berubah menjadi *Signed & Active* dan penggunaan operasional dilarang (*hard-stop*) sebelum berkas PDF hasil tanda tangan fisik (*offline signing*) diunggah dan diverifikasi keasliannya secara manual oleh Tim Legal.

### 5.5 Automated Expiry Alerts (REQ-05)
*   Sistem wajib memiliki penjadwal latar belakang (*background scheduler*) yang memantau tanggal kedaluwarsa secara otomatis setiap hari.
*   Sistem harus mengirimkan notifikasi internal (*in-app notification*) secara berkala kepada PIC Unit Bisnis dan Tim Legal pada periode:
    *   **H-60:** 55–65 hari sebelum kontrak berakhir.
    *   **H-30:** 25–35 hari sebelum kontrak berakhir.
    *   **H-7:** 3–9 hari sebelum kontrak berakhir (early warning tambahan).
*   Jika konfigurasi SMTP dikonfigurasi di environment, sistem juga mengirimkan **email HTML** berdesain ke alamat email PIC Business Unit dan Legal Officer untuk setiap periode pengingat. Email bersifat opsional — sistem tetap berfungsi penuh tanpa konfigurasi SMTP.
*   Mekanisme idempotency diterapkan untuk mencegah duplikasi notifikasi pada periode yang sama.

### 5.6 Immutable Audit Trail (REQ-06)
*   Setiap aktivitas pengguna yang memicu perubahan data (*write operations*) atau pengunduhan dokumen harus dicatat secara permanen (*immutable*) di basis data dengan parameter: *Timestamp*, *Actor ID*, *Role*, *Action Event*, dan *IP Address*. Log ini bersifat *append-only* dan tidak dapat diubah/dihapus oleh siapa pun.

---

## 6. Key Business & Technical Assumptions
1.  **Standardized Template Compliance:** Asumsi bahwa semua unit bisnis disiplin menggunakan struktur templat baku dokumen PKS yang diterbitkan LCG agar keakuratan fitur *Auto-Fill* tetap terjaga tinggi. Jika template tidak sesuai, sistem memfasilitasi pengisian manual.
2.  **Role-Based Access Control (RBAC):** Hak akses diatur ketat. Unit Bisnis hanya dapat membuat/mengubah draf miliknya dan unit kerjanya (*Owning Business Unit*). Tim Legal bertindak sebagai verifikator tunggal untuk memajukan status kontrak, sementara Manajemen memiliki hak akses *Read-Only* penuh. Business Unit dapat *menarik kembali (recall)* draft yang sudah disubmit selama Tim Legal belum mengambil untuk direview.
3.  **Audit Security:** Log aktivitas (*Audit Trail*) disimpan secara permanen di database tanpa fitur penghapusan (No DELETE API endpoint) untuk mematuhi standar audit TI.
4.  **No Direct Document Signatures:** Pada Fase 1 MVP, proses penandatanganan dilakukan secara basah/fisik di luar sistem (*offline signing*), sistem hanya memfasilitasi pengunggahan hasil pemindaian (*scan*) dokumen final.
5.  **SSO (Single Sign-On):** Integrasi SSO internal *out-of-scope* pada Fase 1 MVP. Autentikasi menggunakan JWT standalone dengan mekanisme *sliding session* 15 menit inaktivitas. SSO dijadwalkan pada Fase 2 PLH.

---
*Dokumen ini merupakan properti rahasia dan dijadikan acuan mutlak bagi tim pengembang untuk penyusunan kode program.*
