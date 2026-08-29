<div align="center">

# 🕌 CRS Maslahat — Contract Repository System

**Sistem Repositori & Siklus Hidup Perjanjian Kerja Sama (PKS) Terpusat BSI Maslahat**  
_Kelola siklus hidup PKS dari drafting → telaah legal (dual review) → tanda tangan → verifikasi → pemantauan kedaluwarsa, dilengkapi RBAC ketat 4-role, audit trail append-only, dan ekstraksi auto-fill .docx._

[![Stack](https://img.shields.io/badge/Stack-FastAPI%20%2B%20React%20%2B%20MongoDB-0f766e?style=for-the-badge)](#-tech-stack)
[![Theme](https://img.shields.io/badge/Theme-Maslahat%20Connect%20(%23008A85)-008A85?style=for-the-badge)](#-brand-identity)
[![License](https://img.shields.io/badge/License-Internal%20BSI%20Maslahat-F3A912?style=for-the-badge)](#)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-10b981?style=for-the-badge)](#)

</div>

---

## 📖 Latar Belakang

Sebelumnya, siklus PKS BSI Maslahat dikelola secara manual melalui email, folder shared drive, dan spreadsheet — menimbulkan risiko dokumen tercecer, tidak adanya audit trail terpusat, dan keterlambatan monitoring kontrak kedaluwarsa. 

**CRS Maslahat** mengintegrasikan seluruh alur kerja ke dalam satu platform aman:
- 🏢 **Business Unit (BU)**: Mengajukan draft PKS, upload dokumen, revisi draft.
- ⚖️ **Legal Officer**: Menelaah draft, memberi catatan/revisi (Dual Review), watermark dokumen, dan approval/verifikasi.
- 📊 **Manajemen**: Memantau portofolio kontrak, analitik KPI, dan ekspor laporan secara *Read-Only*.
- 🛡️ **Administrator**: Mengelola user, memantau audit log global dan kebijakan keamanan sistem.

---

## ✨ Fitur Utama

| Modul | Deskripsi & Kemampuan |
|---|---|
| 🏠 **Dasbor Repositori** | 4 KPI cards (Total Aktif, Menunggu Telaah, Segera Berakhir, Kedaluwarsa), tabel repositori dengan filter 9-status, sorting multi-kolom, dan pencarian cepat. |
| 📄 **Pengajuan PKS Pintar** | Form 3-tahap (Upload Draft → Info Mitra → Detail Kerja Sama) dengan **Auto-fill Regex dari `.docx`** (Mammoth.js / python-docx) dan label ✨ AUTO. |
| ⚖️ **Panduan Legal Interaktif** | Matriks syarat dokumen mitra sesuai 7 Jenis Institusi (*Yayasan, PT, Koperasi, Instansi Pemerintah, DKM, Perkumpulan, Perorangan*). |
| 🔍 **Side Sheet Detail Kontrak** | Informasi metadata, riwayat versi dokumen, dan audit trail timeline per kontrak dalam satu panel geser. |
| 🖥️ **Dual Review Mode** | Tampilan split-screen teks draft (.docx) berdampingan dengan dokumen scan (.pdf) serta thread komentar interaktif untuk Legal Officer. |
| 📈 **Analitik Portofolio** | Visualisasi data (Recharts): Nilai kontrak per Business Unit, distribusi status, tren bulanan, dan Top 5 Mitra. |
| 📥 **Ekspor Laporan** | Unduh laporan **Excel 2-sheet** (*Data Kontrak + Rekapitulasi*) dan **PDF Landscape** siap cetak. |
| 🔔 **Reminder Kedaluwarsa** | Notifikasi in-app pada H-60, H-30, dan H-7 sebelum kontrak kedaluwarsa. |
| 🔐 **Keamanan Berlapis (RBAC)** | JWT sliding session (15 menit timeout), Column-Level State Lock pada status kritis, audit log append-only, dan No-DELETE retention policy. |

---

## 🛠️ Tech Stack

```
┌─────────────────────────────────────────┐          ┌─────────────────────────────────────────┐
│           FRONTEND (React 19)           │          │          BACKEND (FastAPI / Py3)        │
│ • React Router 7 + Tailwind CSS 3       │◄────────►│ • Uvicorn + Motor (Async MongoDB)      │
│ • Shadcn/UI + Lucide Icons + Recharts   │  HTTP    │ • PyJWT + Bcrypt + Pydantic v2          │
│ • Mammoth.js (.docx parser) + Sonner    │  REST    │ • python-docx / openpyxl / reportlab    │
│ • Axios (Sliding Token Interceptor)     │          │ • Local Storage + Watermarking Engine   │
└─────────────────────────────────────────┘          └─────────────────────────────────────────┘
                     │                                                    │
                     └────────────────── MongoDB 6+ ──────────────────────┘
```

---

## 🚀 Panduan Instalasi & Menjalankan (Step-by-Step)

Ikuti langkah-langkah berikut untuk meng-clone dan menjalankan program CRS Maslahat di komputer/device baru:

### 1️⃣ Prasyarat Sistem

Pastikan perangkat Anda sudah terinstal:
- **Python**: Versi 3.11 atau lebih baru (`python --version`)
- **Node.js**: Versi 20 atau lebih baru (`node --version`)
- **Yarn / npm**: Disarankan Yarn 1.22+ (`yarn --version` atau `npm --version`)
- **MongoDB**: MongoDB Server lokal berjalan di port `27017` atau koneksi string MongoDB Atlas ([Unduh MongoDB Community](https://www.mongodb.com/try/download/community)).

---

### 2️⃣ Clone Repository

Buka terminal / PowerShell dan clone repository:

```bash
git clone https://github.com/rizkilahi/contract-repository-system-maslahat.git
cd contract-repository-system-maslahat
```

---

### 3️⃣ Konfigurasi Environment File (`.env`)

Salin file contoh konfigurasi `.env.example` ke `.env` pada folder `backend` dan `frontend`:

#### A. Backend Environment:
Buat file `backend/.env` (atau salin dari `backend/.env.example`):
```dotenv
MONGO_URL=mongodb://localhost:27017
DB_NAME=crs_maslahat
JWT_SECRET=crs-dev-jwt-secret-2026-maslahat-local
APP_NAME=crs-maslahat
WEBHOOK_CRON_SECRET=dev-cron-secret-2026
ADMIN_EMAIL=admin@bsimaslahat.co.id
ADMIN_PASSWORD=Admin@2026
ADMIN_NAME=Admin CRS
```
> 💡 *Jika menggunakan MongoDB Atlas, ubah `MONGO_URL` dengan connection string Atlas Anda.*

#### B. Frontend Environment:
Buat file `frontend/.env` (atau salin dari `frontend/.env.example`):
```dotenv
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

### 4️⃣ Install Dependencies

Buka 2 jendela terminal terpisah (satu untuk Backend, satu untuk Frontend):

#### 🔹 Terminal 1 — Backend:
```bash
cd backend

# (Opsional) Buat Virtual Environment:
python -m venv .venv

# Aktivasi Virtual Environment:
# Windows (PowerShell): .\.venv\Scripts\Activate.ps1
# Windows (CMD): .venv\Scripts\activate.bat
# Linux/Mac: source .venv/bin/activate

# Install dependensi:
pip install -r requirements.txt
```

#### 🔹 Terminal 2 — Frontend:
```bash
cd frontend

# Install dependensi via Yarn (direkomendasikan):
yarn install

# Atau jika menggunakan npm:
# npm install
```

---

### 5️⃣ Jalankan Aplikasi

#### 🔹 Menjalankan Backend (`http://localhost:8001`):

**Opsi A — Menggunakan Skrip Praktis (Windows):**
```powershell
.\start_backend.ps1
```

**Opsi B — Perintah Manual:**
```bash
cd backend
python -m uvicorn server:app --reload --host 127.0.0.1 --port 8001
```

Saat backend pertama kali dijalankan, sistem secara otomatis:
1. Membuat akun Admin default.
2. Melakukan seeding 3 akun demo (Business Unit, Legal Officer, Manajemen).
3. Melakukan seeding sampel data PKS dengan beragam variasi status alur.

---

#### 🔹 Menjalankan Frontend (`http://localhost:3000`):

**Opsi A — Menggunakan Skrip Praktis (Windows):**
```powershell
.\start_frontend.ps1
```

**Opsi B — Perintah Manual:**
```bash
cd frontend
yarn start
# atau: npm start
```

---

### 6️⃣ Akses Web & Akun Demo

Buka browser dan akses: **[http://localhost:3000](http://localhost:3000)**

Di halaman Login, tersedia **tombol Quick-Fill Akun Demo** sekali klik:

| Role Pengguna | Email Login | Password Default | Wewenang & Hak Akses |
|---|---|---|---|
| **Administrator** | `admin@bsimaslahat.co.id` | `Admin@2026` | Manajemen User & Audit Log Global (tidak mengubah kontrak) |
| **Business Unit** | `bu@bsimaslahat.co.id` | `Demo@2026` | Mengajukan PKS, upload draft `.docx`/`.pdf`, revisi |
| **Legal Officer** | `legal@bsimaslahat.co.id` | `Demo@2026` | Telaah PKS, review draft & scan, beri komentar, watermark, approval |
| **Manajemen** | `management@bsimaslahat.co.id` | `Demo@2026` | Monitoring seluruh portofolio & analitik *(Read-Only)* |

> 📚 **Dokumentasi API Interaktif (Swagger UI)**: [http://localhost:8001/docs](http://localhost:8001/docs)

---

## 🧪 Menjalankan Automated Test Suite

Untuk memastikan seluruh fungsionalitas backend, otentikasi, transisi status, enkripsi/watermark, dan proteksi RBAC berfungsi 100%:

Pastikan backend sedang berjalan di port `8001`, lalu jalankan:

```bash
python tests/test_api.py
```

*Output yang diharapkan: **66/66 Passed (100% Score)**.*

---

## 🔄 Alur Siklus Hidup Status Kontrak

```
[drafting] ───────────────► [submitted_for_review] ──► [under_legal_review] ──► [ready_for_signature]
    ▲                              │                          │                         │
    │                              │ (Legal reject intake)    │ (Legal minta revisi)    │ (BU upload scan PDF)
    │                              ▼                          ▼                         ▼
    └───────────────────── [revision_required] ◄──────────────┴─────────────── [pending_final_verification]
                                                                                        │
                                                                                        ▼
                                                                                  [signed_active]
                                                                                        │
                                                                          (Auto via Cron / Expiry)
                                                                                        ▼
                                                                          [expiring_soon] ──► [expired]
```

---

## 🔐 Ringkasan Aturan Keamanan & Integritas Data

1. **Strict RBAC**: Administrator tidak memiliki *bypass* untuk memodifikasi nilai kontrak atau menyetujui PKS tanpa keterlibatan Legal Officer dan Business Unit.
2. **Column-Level State Lock**: Pada status `ready_for_signature`, `pending_final_verification`, dan `signed_active`, field finansial & identitas (`contract_value`, `partner_name`, `effective_date`) **terkunci otomatis** dan tidak dapat dimanipulasi.
3. **No-DELETE Data Retention Policy**: Endpoint penghapusan (`DELETE`) pada resource kontrak dan berkas ditolak dengan status HTTP 405 untuk menjaga kepatuhan audit.
4. **Append-Only Audit Trail**: Setiap perubahan status, unggahan berkas, pembaruan metadata, dan unduhan dicatat permanen ke dalam `audit_logs` dan `system_audit`.

---

## 🩺 Panduan Troubleshooting

| Kendala | Penyebab Umum | Solusi |
|---|---|---|
| `MongoDB connection refused` | Layanan MongoDB belum aktif di perangkat | Jalankan MongoDB service di Windows (`net start MongoDB` atau via Services), atau periksa `MONGO_URL` di `backend/.env`. |
| `File ... cannot be loaded because running scripts is disabled` | Kebijakan ExecutionPolicy PowerShell di Windows | Jalankan PowerShell dengan `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` atau gunakan file `.ps1` yang sudah diperbarui / gunakan `CMD`. |
| `Session Timed Out / Login Expired` | Token JWT kedaluwarsa (15 menit inaktivitas) | Login ulang menggunakan akun demo yang tersedia. |
| `Upload File Gagal / Storage Error` | Direktori upload belum memiliki izin tulis | Sistem membuat folder `backend/uploads/` otomatis; pastikan aplikasi memiliki izin read/write pada folder tersebut. |

---

<div align="center">

**CRS Maslahat** · _Amanah, Profesional, dan Akuntabel untuk Pengelolaan Kontrak BSI Maslahat._

</div>
