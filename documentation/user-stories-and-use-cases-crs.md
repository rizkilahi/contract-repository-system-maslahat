# USER STORIES, USE CASES & SOP FLOWCHART
## Project Name: Contract Repository System (CRS) - Phase 1 MVP
**Document Version:** 6.0  
**Author:** Senior IT Business Analyst  
**Date:** 2026-08-27  

---

## 1. SOP Flowchart Table (Alur Kerja Operasional)
*Tabel ini menggabungkan diagram alur visual dengan SOP administratif korporat, memetakan penanggung jawab (PIC), dokumen keluaran, dan SLA.*

| No | Alur Proses (Simbol) | Deskripsi / Aktivitas | PIC / Bagian | Dokumen / Output | Waktu (SLA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | *Terminator* (Mulai) | **Mulai Pengajuan PKS.** Unit Bisnis berencana menginisiasi kerja sama dengan mitra eksternal. | Business Unit (Initiator) | - | - |
| **2** | *Input/Output* | **Drafting & Submission:** BU mengisi form metadata, mengakses tombol *Smart Legal Guidelines* untuk panduan, mengunggah draf awal (.docx), dan memicu fitur *Auto-Fill*. | Business Unit | Draf PKS (Format .docx) | Sesuai kebutuhan BU |
| **3** | *Decision* | **Legal Review:** Tim Legal mengulas draf dari aspek legalitas hukum syariah dan perundang-undangan positif.<br>• *Jika Ya (Disetujui)* $\rightarrow$ Lanjut ke No. 5.<br>• *Jika Tidak (Revisi)* $\rightarrow$ Lanjut ke No. 4. | Legal Officer (LCG) | Catatan Revisi / File Beranotasi | Maks 3 Hari Kerja |
| **4** | *Process* | **Revisi Draf:** BU memperbaiki substansi draf berdasarkan coretan atau draf revisi legal dan mengunggah ulang versi terbaru (otomatis membentuk versi v1.1, v1.2). Kembali ke No. 3. | Business Unit | Draf Revisi (Format .docx) | Sesuai kebutuhan BU |
| **5** | *Process* | **Status: Ready for Signature:** Sistem mengunci redaksional draf final, mengubah status menjadi siap ditandatangani, dan mengirimkan notifikasi. | Sistem | Notifikasi Sistem | Instan (Otomatis) |
| **6** | *Manual Operation* | **Offline Signing:** BU mengunduh draf final disetujui, mencetaknya, dan melakukan sirkulasi tanda tangan fisik (bermeterai) basah dengan manajemen internal dan mitra eksternal. | Business Unit & Management | Dokumen PKS Fisik | Menyesuaikan Ketersediaan Pihak |
| **7** | *Input/Output* | **Upload Final Scan:** BU memindai (*scan*) dokumen fisik yang sudah ditandatangani lengkap dan mengunggah berkas PDF-nya ke dalam sistem beserta mengisi nomor registrasi PKS resmi. | Business Unit | Final Signed PKS (Format .pdf) | Sesuai ketersediaan dokumen |
| **8** | *Decision* | **Final Legal Verification:** Tim Legal memverifikasi keaslian, kelengkapan tanda tangan, keberadaan meterai, dan kejelasan pindaian berkas PDF.<br>• *Jika Ya (Disetujui)* $\rightarrow$ Lanjut ke No. 10.<br>• *Jika Tidak (Ditolak)* $\rightarrow$ Lanjut ke No. 9. | Legal Officer (LCG) | Persetujuan Verifikasi | Maks 1 Hari Kerja |
| **9** | *Process* | **Notifikasi Penolakan:** Tim Legal memberikan catatan penolakan karena berkas buram atau tanda tangan tidak lengkap. BU harus memindai ulang berkas fisik asli dan mengunggah kembali. Kembali ke No. 7. | Legal Officer (LCG) | Catatan Penolakan | - |
| **10** | *Process* | **Status: Signed & Active:** Sistem mengubah status kontrak menjadi aktif dan membuka akses operasional. | Sistem | Notifikasi Aktivasi | Instan (Otomatis) |
| **11** | *Input/Output* | **Automated Monitoring:** Sistem memantau tanggal kedaluwarsa secara otomatis di latar belakang dan memicu alarm pengingat pada periode H-60, H-30, dan H-7. | Sistem (Scheduler) | In-App Alert & Email (jika SMTP dikonfigurasi) | H-60, H-30 & H-7 |
| **12** | *Terminator* (Selesai) | **Selesai.** Dokumen terarsip aman dan terpantau berkala. | - | - | - |

### Alur Alternatif Tambahan

| No | Alur Proses | Deskripsi / Aktivitas | PIC / Bagian | Syarat / Kondisi |
| :--- | :--- | :--- | :--- | :--- |
| **2a** | *BU Recall* | **Penarikan Kembali Draft:** Business Unit menarik kembali draft yang sudah disubmit ke status *Drafting* untuk diperbaiki, selama Tim Legal belum mengambil (pickup) draft tersebut. | Business Unit | Status = `submitted_for_review` & Legal belum pickup |
| **3a** | *Legal Reject at Intake* | **Penolakan di Intake:** Tim Legal menolak kontrak langsung saat pertama kali diterima (sebelum review penuh) karena dokumen jelas tidak lengkap atau tidak layak review. Status kembali ke `revision_required`. | Legal Officer (LCG) | Status = `submitted_for_review` |
| **4b** | *Legal Review Dual Mode* | **Review Ganda:** Legal Officer dapat menggunakan dua mode review: (a) Digital — unggah .docx dengan Track Changes; (b) Manual — unggah scan .pdf/.jpg/.jpeg/.png. Untuk mode manual, sistem otomatis menyuntikkan watermark 'DRAFT - HASIL REVIU LEGAL' sebelum file disimpan. | Legal Officer (LCG) | Status = `under_legal_review` |

---

## 2. Agile User Stories & Acceptance Criteria
*Menjelaskan kebutuhan sistem dari perspektif pengguna dengan format standar industri "As a... I want to... So that..." lengkap dengan skenario pengujian Gherkin (Given-When-Then).*

### US-01: Auto-Fill on Draft Upload (REQ-01)
*   **As a** Business Unit User,
*   **I want to** have the system automatically fill in metadata fields upon uploading a draft `.docx` contract file,
*   **So that** I can save time on data entry and reduce clerical errors.

#### Acceptance Criteria (Gherkin):
*   **GIVEN** a Business Unit User is on the "Add New Draft" page.
*   **WHEN** they drag and drop a standardized PKS draft `.docx` file into the upload zone.
*   **THEN** the system must parse the text inside the `.docx` using anchor-word matching logic.
*   **AND** automatically populate: *Contract ID (if exists)*, *Partner Name*, *Agreement Title*, *Contract Value*, and *Effective Date* in the form fields.
*   **AND** keep the form editable so the user can verify and adjust the data before submission.

---

### US-02: Smart Legal Guidelines Reference (REQ-02)
*   **As a** Business Unit User,
*   **I want to** access a digital pocket guide (*Smart Legal Guidelines*) tailored to the institution type during drafting,
*   **So that** I know exactly which administrative documents the partner must prepare, reducing the draft rejection rate (*SLA ping-pong*).

#### Acceptance Criteria (Gherkin):
*   **GIVEN** a Business Unit User is filling the draft creation form.
*   **WHEN** they select "Yayasan" from the *Institution Type* dropdown and click the "Smart Info" button.
*   **THEN** the system must display a Read-Only pop-up modal showing the specific required documents for Yayasan: *Akta Pendirian (Wajib Mutlak)*, *SK Kemenkumham (Wajib Mutlak)*, *AD/ART (Wajib)*, and *SK Pengurus (Wajib)* along with risk and mitigation summaries.

---

### US-03: Dual Review Upload & Auto-Watermarking (REQ-03)
*   **As a** Legal Officer,
*   **I want to** upload either a digital Word document with Track Changes or a scanned PDF containing manual handwritten remarks,
*   **So that** I can work in my preferred review style while ensuring manual review drafts are safe from accidental signing.

#### Acceptance Criteria (Gherkin):
*   **GIVEN** a Legal Officer is reviewing a contract draft.
*   **WHEN** they request a revision and choose "Manual Review" to upload a scanned PDF.
*   **THEN** the system must automatically inject a diagonal watermark text "DRAFT - HASIL REVIU LEGAL" across all pages with 30% opacity.
*   **AND** save this watermarked file as a *Supporting Attachment* in the Activity Log, preventing it from being used as a final contract.

---

### US-04: Strict Version Control (REQ-04)
*   **As an** Auditor or System User,
*   **I want the system to** automatically manage document versions sequentially (v1.0, v1.1, v1.2) without overwriting files,
*   **So that** we maintain a complete historical paper trail of negotiations for compliance audits.

#### Acceptance Criteria (Gherkin):
*   **GIVEN** a contract is in "Revision Required" status and has an existing file "Draf_PKS_v1.0.docx".
*   **WHEN** the Business Unit User uploads an updated `.docx` file.
*   **THEN** the system must save it with version label "v1.1" and list it below v1.0 in the version history table of the contract detail page.

---

### US-05: Final Legal Gatekeeping (REQ-05)
*   **As a** Legal Officer,
*   **I want the system to** block a contract from becoming "Active" until I manually verify the scanned final signed PDF uploaded by the Business Unit,
*   **So that** we prevent unverified physical signatures, missing stamps, or corrupted scans from being authorized in the company repository.

#### Acceptance Criteria (Gherkin):
*   **GIVEN** a Business Unit has uploaded the final scanned PDF and the status is "Pending Final Verification".
*   **WHEN** the Legal Officer reviews the file and clicks "Approve & Activate".
*   **THEN** the system must transition the status to "Signed & Active" and mark the file as the absolute legally binding document.

---

### US-06: Automated Expiry Alert Notification (REQ-06)
*   **As a** Business Unit PIC / Legal Officer,
*   **I want to** receive automated email and dashboard alerts at H-60 and H-30 before a contract expires,
*   **So that** I can plan addendums or renegotiations proactively.

#### Acceptance Criteria (Gherkin):
*   **GIVEN** a contract is "Signed & Active" and its expiry date is exactly 60 days away.
*   **WHEN** the background scheduler runs (triggered daily via webhook cron).
*   **THEN** the system must automatically trigger an in-app notification to both the owning Business Unit PIC and the Legal Officer.
*   **AND** if SMTP is configured, also send an HTML email reminder to the same recipients.
*   **AND** the system must prevent duplicate notifications for the same contract and same reminder bucket (idempotency guard).

---

### US-07: BU Draft Recall & Legal Reject at Intake
*   **As a** Business Unit User,
*   **I want to** be able to recall a submitted draft back to "Drafting" status if it hasn't been picked up by Legal yet,
*   **So that** I can fix mistakes or add missing information without losing the submission.

#### Acceptance Criteria (Gherkin):
*   **GIVEN** a Business Unit User submitted a contract draft and its status is "Submitted for Review".
*   **WHEN** no Legal Officer has picked up the contract yet (still in submitted_for_review state).
*   **THEN** the BU User can recall the draft, changing its status back to "Drafting" for editing.

*   **As a** Legal Officer,
*   **I want to** reject a contract directly at intake (before doing a full review),
*   **So that** I can promptly notify the Business Unit when a submission is clearly incomplete or invalid.

#### Acceptance Criteria (Gherkin):
*   **GIVEN** a Legal Officer sees a newly submitted contract in "Submitted for Review" status.
*   **WHEN** they determine the submission is clearly not ready (e.g., missing core documents, wrong unit).
*   **THEN** the system must allow transitioning directly from "Submitted for Review" → "Revision Required" with rejection notes.

---

### US-08: Analytics Dashboard & Portfolio Export
*   **As a** Legal Officer or Management User,
*   **I want to** view an analytics dashboard with charts showing contract distribution by Business Unit, status, and institution type,
*   **So that** I can quickly identify risks and make data-driven decisions.

#### Acceptance Criteria (Gherkin):
*   **GIVEN** a Legal Officer or Management User is logged into the system.
*   **WHEN** they navigate to the Analytics page.
*   **THEN** the system must display charts: contracts by status, by owning BU, by institution type, monthly trend, and top 5 partners by value.

*   **As a** Management User,
*   **I want to** export the full contract portfolio as Excel (.xlsx) or PDF report,
*   **So that** I can present it in executive meetings or audit sessions without manual data compilation.

#### Acceptance Criteria (Gherkin):
*   **GIVEN** a Management User is on the Dashboard.
*   **WHEN** they click "Export" and select Excel or PDF format.
*   **THEN** the system must generate and download a formatted portfolio report with contract list, summary sheet, and metadata (generated timestamp, total contracts, total value).

---

## 3. Detailed Use Case Specification (UML Use Case Detail)
### Use Case UC-01: Inisiasi Kontrak & Ekstraksi Metadata Otomatis
*   **Aktor Utama:** Business Unit (Initiator)
*   **Aktor Pendukung:** System Parser (Automated Engine)
*   **Deskripsi:** Mengunggah file draf kontrak PKS (.docx) dan melakukan pengisian field input secara otomatis berbasis teks.
*   **Pre-Condition:** Pengguna telah melakukan login menggunakan SSO dan berada di form pembuatan draf kontrak baru.
*   **Post-Condition:** Data tersimpan di sistem, status kontrak menjadi `Submitted for Review`.

#### Main Flow (Alur Utama):
1.  User mengakses halaman "Buat Draf Kontrak Baru".
2.  User memilih *Institution Type* (Contoh: "Yayasan") dan *Owning Business Unit* (Contoh: "RNG").
3.  User menyeret (*drag*) file draf awal `Draf_Beasiswa_v1.0.docx` ke kotak unggahan.
4.  Sistem membaca berkas, menguraikan teks XML di browser klien, dan melakukan pemetaan kata kunci (*Regex parsing*).
5.  Sistem mengisi otomatis kolom: *Nomor PKS*, *Judul PKS*, *Nama Mitra*, *Nilai Kontrak*, *Nama PIC Mitra*, dan *Tanggal Efektif*.
6.  User memeriksa kecocokan data, mengoreksi *typo* pada kolom yang salah baca, dan menginput kontak *Partner PIC*.
7.  User menekan tombol "Submit for Review".
8.  Sistem menyimpan data, mengunggah file sebagai versi "v1.0", mengubah status menjadi `Submitted for Review`, dan mengirim notifikasi email ke Tim Legal.

#### Alternate Flow (Alur Alternatif - Gagal Ekstraksi):
*   **4a. Format Berkas Tidak Sesuai Standar / Rusak:**
    *   Sistem mendeteksi kegagalan parsing (*parsing error*).
    *   Sistem memunculkan *Toast Notification* peringatan: *"Format draf tidak sesuai templat baku. Silakan isi metadata secara manual."*
    *   Sistem mengosongkan form input dan memberikan hak pengisian manual penuh kepada pengguna.
    *   User mengisi manual seluruh kolom, mengunggah draf, dan menekan "Submit for Review". (Alur kembali ke No. 8).

*   **7a. BU Menarik Kembali Draft (Recall):**
    *   Business Unit menyadari ada kesalahan pada draft yang sudah disubmit sebelum Legal pickup.
    *   BU menekan tombol "Tarik Kembali ke Draft" di halaman detail kontrak.
    *   Sistem memverifikasi bahwa status masih `submitted_for_review` (belum diambil Legal).
    *   Status berubah kembali ke `drafting`. BU dapat mengedit dan re-submit.

---
*Dokumen fungsional ini memberikan panduan pengujian bagi QA Engineer dan struktur penulisan Use Case bagi pengembang aplikasi. Versi 6.0 ini sudah selaras dengan workflow aktual yang diimplementasikan di sistem.*
