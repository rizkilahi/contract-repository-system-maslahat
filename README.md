<div align="center">

# 🕌 CRS Maslahat — Contract Repository System

**Sistem repositori kontrak terpusat untuk BSI Maslahat**
_Kelola siklus hidup Perjanjian Kerja Sama (PKS) dari drafting → legal review → tanda tangan → verifikasi → monitoring, dengan RBAC ketat, audit trail append-only, dan auto-fill .docx berbasis regex._

[![Stack](https://img.shields.io/badge/Stack-FastAPI%20%2B%20React%20%2B%20MongoDB-0f766e?style=for-the-badge)](#-tech-stack)
[![Brand](https://img.shields.io/badge/Theme-Maslahat%20Connect-008A85?style=for-the-badge)](#-brand-identity)
[![License](https://img.shields.io/badge/License-Internal%20BSI%20Maslahat-F3A912?style=for-the-badge)](#)
[![Status](https://img.shields.io/badge/Status-MVP%20Ready-10b981?style=for-the-badge)](#)

</div>

---

## 📖 Latar Belakang

Sebelumnya siklus PKS BSI Maslahat masih dikelola manual via email, folder shared drive, dan spreadsheet — menimbulkan risiko dokumen tercecer, tidak ada trail audit, dan telat mengingat kontrak yang akan kedaluwarsa. **CRS Maslahat** membawa seluruh alur ke satu platform aman berbasis peran: Business Unit mengajukan, Legal Officer menelaah, Manajemen memantau, Admin mengaudit.

## ✨ Fitur Utama

| Modul | Yang Bisa Dilakukan |
|-------|---------------------|
| 🏠 **Dasbor Utama** | 4 KPI (Active / Pending / Expiring Soon / Expired), tabel repositori dengan **filter status 9-opsi** & **sort per kolom** (Contract ID / Effective / Expiry), pencarian instan |
| 📄 **Pengajuan PKS** | Form 3-langkah (Upload → Info Mitra → Detail Kerja Sama), **auto-fill dari `.docx` via mammoth.js** dengan 6 anchor regex, badge ✨ AUTO pada field terisi |
| ⚖️ **Panduan Legal** | Matriks read-only kelengkapan dokumen mitra per Jenis Institusi (Yayasan / PT / Koperasi / Instansi / Perorangan) |
| 🔍 **Detail Kontrak** | Metadata grid + Version History + Audit Trail timeline dalam Side Sheet, dengan tombol aksi role-guarded |
| 🖥️ **Dual Review Mode** | Split view Draft (.docx) vs Scan (PDF) dengan comment thread berdampingan untuk Legal Officer |
| 📈 **Analitik Portofolio** | Bar / Pie / Line chart nilai per BU, sebaran status, tren bulanan, Top 5 mitra (Recharts) |
| 📥 **Ekspor Laporan** | Unduh **Excel 2-sheet** (data + ringkasan) & **PDF landscape** siap cetak, hormati filter aktif |
| 🔔 **Reminder H-60/H-30/H-7** | Cron harian `.emergent/crons.yml` → notifikasi bell in-app + entry `system_audit` |
| 🔐 **Security Hardened** | JWT 15-menit sliding session, RBAC 4-role tanpa admin bypass, Column-Level State Lock, audit trail append-only, No-DELETE policy |

## 🎨 Brand Identity — Maslahat Connect

| Token | Value | Penggunaan |
|-------|-------|-----------|
| Primary | `#008A85` — Deep Teal (teal-700) | Navbar, sidebar aktif, primary button |
| Accent | `#F3A912` — Warm Gold (amber-500) | CTA menonjol, badge ✨ AUTO, chart highlight |
| Background | `#F8FAFC` — Warm slate-50 | Body |
| Surface | `#FFFFFF` + `slate-200` border | Card, modal, sheet |
| Font | Manrope (heading) + Plus Jakarta Sans (body) | — |

## 🛠️ Tech Stack

```
┌─ Frontend ──────────────────────────────────┐    ┌─ Backend ────────────────────────────┐
│ React 19 + React Router 7                   │◄──►│ FastAPI (async) + Uvicorn            │
│ Tailwind CSS 3 + shadcn/ui + Lucide Icons   │    │ Motor (Mongo async) + PyMongo        │
│ Recharts (analytics) + Mammoth.js (.docx)   │    │ PyJWT + bcrypt + Pydantic v2         │
│ Axios (with X-New-Token auto-refresh)       │    │ python-docx / openpyxl / reportlab   │
│ Sonner (toast)                              │    │ Emergent Object Storage integration  │
└─────────────────────────────────────────────┘    └──────────────────────────────────────┘
                            │                                        │
                            └────────  MongoDB (crs_maslahat) ───────┘
```

---

## 🚀 Quick Start

> **TL;DR:** clone → set 2 env files → 2 perintah instalasi → 2 perintah run. Selesai dalam < 5 menit.

### 1️⃣ Prasyarat

| Tool | Versi Minimum | Cek |
|------|---------------|-----|
| Python | 3.11+ | `python --version` |
| Node.js | 20+ | `node --version` |
| Yarn | 1.22+ (**wajib**, bukan npm) | `yarn --version` |
| MongoDB | 6+ (local atau Atlas) | `mongod --version` |

### 2️⃣ Clone & Struktur

```bash
git clone https://github.com/<org>/crs-maslahat.git
cd crs-maslahat

# Struktur
# ├── backend/    ← FastAPI + Mongo
# ├── frontend/   ← React + Tailwind
# ├── .emergent/  ← cron.yml (reminder H-60/H-30)
# └── memory/     ← PRD.md + test_credentials.md
```

### 3️⃣ Konfigurasi Environment (2 file)

#### 📄 `backend/.env`
```dotenv
MONGO_URL="mongodb://localhost:27017"
DB_NAME="crs_maslahat"
CORS_ORIGINS="http://localhost:3000"

# Ganti dengan hasil `python3 -c "import secrets; print(secrets.token_hex(32))"`
JWT_SECRET="<64-hex-chars>"

# Owner default — dipakai saat first startup untuk seed admin
ADMIN_EMAIL="admin@bsimaslahat.co.id"
ADMIN_PASSWORD="Admin@CRS2026"
ADMIN_NAME="Admin CRS"

# Universal LLM key (opsional — hanya jika ingin fitur AI di masa depan)
EMERGENT_LLM_KEY=""

APP_NAME="crs-maslahat"

# Bearer secret untuk cron endpoint /api/cron/expiry-reminders
WEBHOOK_CRON_SECRET="<generate-secrets.token_hex(32)>"
```

#### 📄 `frontend/.env`
```dotenv
REACT_APP_BACKEND_URL=http://localhost:8001
```
> Di lingkungan cloud/Emergent, isi dengan URL preview publik. Jangan sertakan trailing slash.

### 4️⃣ Install Dependencies (paralel — buka 2 terminal)

<table>
<tr>
<td width="50%">

**Terminal A — Backend**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

</td>
<td width="50%">

**Terminal B — Frontend**
```bash
cd frontend
yarn install                    # ⚠️ jangan npm install
```

</td>
</tr>
</table>

### 5️⃣ Jalankan (dua terminal tetap terpisah)

<table>
<tr>
<td width="50%">

**Backend** — `http://localhost:8001`
```bash
cd backend
uvicorn server:app --reload --port 8001
```

</td>
<td width="50%">

**Frontend** — `http://localhost:3000`
```bash
cd frontend
yarn start
```

</td>
</tr>
</table>

Startup pertama otomatis:
- Buat admin dari `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- Seed 3 demo user (Business Unit, Legal Officer, Manajemen)
- Seed 13 sample contracts mencakup 8 status berbeda
- Backfill `reference_number` format `NN/NNN/PKS/BSI MASLAHAT/2026` untuk setiap kontrak

### 6️⃣ Login & Explore 🎉

Buka **http://localhost:3000** → klik salah satu **Akun Demo** di halaman login (auto-fill kredensial):

| Role | Email | Password | Bisa Melakukan |
|------|-------|----------|----------------|
| **Admin** | `admin@bsimaslahat.co.id` | `Admin@CRS2026` | Manajemen user + Audit log (tidak edit kontrak) |
| **Business Unit** | `bu@bsimaslahat.co.id` | `Demo@2026` | Draft, upload `.docx`/`.pdf`, ajukan review |
| **Legal Officer** | `legal@bsimaslahat.co.id` | `Demo@2026` | Review, approve, request revision, verify |
| **Manajemen** | `management@bsimaslahat.co.id` | `Demo@2026` | Monitoring READ-ONLY seluruh portofolio |

> 📋 Tersedia juga di `memory/test_credentials.md` (otomatis diperbarui setiap startup).

---

## 🏗️ Arsitektur Ringkas

```
User Browser
    │
    ├──► React SPA (localhost:3000)
    │        └── Axios ─── X-New-Token interceptor (sliding refresh)
    │
    └──► FastAPI (localhost:8001)
             ├── /api/auth/*         (JWT 15-min)
             ├── /api/contracts/*    (RBAC + state lock)
             ├── /api/files/*        (multipart → Emergent Object Storage)
             ├── /api/dashboard/*    (KPI + analytics)
             ├── /api/reports/*.xlsx / .pdf
             ├── /api/notifications  (bell in-app)
             ├── /api/admin/*        (audit-log, security-policy — admin only)
             └── /api/cron/expiry-reminders (Bearer webhook, .emergent/crons.yml)
                     │
                     ▼
             MongoDB Collections:
             users · contracts · files · audit_logs (per-contract)
             system_audit (global append-only) · notifications
             comments · cron_runs
```

## 🔐 Security Policy (Overview)

| Rule | Implementasi |
|------|--------------|
| **JWT + 15-min inactivity** | Payload `{sub, email, role, businessUnitId, exp, iat}`. Sliding refresh via header `X-New-Token` bila sisa < 5 menit. |
| **RBAC strict** | 4 role, **admin TIDAK punya bypass** untuk kontrak/upload. Enforced di `require_roles()` + `ALLOWED_TRANSITIONS`. |
| **Column-Level State Lock** | Status `ready_for_signature / pending_final_verification / signed_active` mengunci field `contract_value / partner_name / effective_date`. |
| **Audit Trail append-only** | Middleware log semua POST/PUT/PATCH/DELETE + GET `/api/files/*` ke `system_audit` (timestamp, user, role, method, path, ip, status_code). Tidak ada endpoint UPDATE/DELETE untuk koleksi ini. |
| **No-DELETE (retensi data)** | Middleware short-circuit 405 untuk DELETE pada `/api/contracts /api/files /api/comments /api/versions`. Attempt tetap dicatat. |

Ekspos matriks penuh via: `GET /api/admin/security-policy`

## 🔄 Alur Status Kontrak

```
drafting ──► submitted_for_review ──► under_legal_review ──► ready_for_signature
    ▲                │                        │                        │
    │                │ (Legal reject)         │ (revision)             │ (BU upload signed PDF)
    │                ▼                        ▼                        ▼
    └────── revision_required ◄──────────────┴────── pending_final_verification
                                                             │
                                                             ▼
                                                       signed_active ──► (auto) expiring_soon → expired
```

## 🗂️ Cron / Scheduled Job

`.emergent/crons.yml`:
```yaml
crons:
  - name: expiry-reminders
    cron: "0 1 * * *"        # 08:00 WIB harian
    endpoint: "{{BASE_URL}}/api/cron/expiry-reminders"
    method: POST
    enabled: true
```
Cron mengeluarkan notifikasi in-app pada bucket **H-60 (55–65 hari)**, **H-30 (25–35)**, dan **H-7 (3–9)**. Idempotent lewat `X-Webhook-Id`.

## 🧪 Cheat Sheet API

```bash
# Login sebagai BU
curl -X POST $API/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bu@bsimaslahat.co.id","password":"Demo@2026"}'

# List kontrak (pakai token)
curl $API/api/contracts -H "Authorization: Bearer $TOKEN"

# Auto-fill dari .docx (server-side fallback)
curl -X POST $API/api/contracts/extract-docx \
  -H "Authorization: Bearer $TOKEN" -F "file=@draft.docx"

# Unduh laporan Excel dengan filter BU
curl -o portofolio.xlsx \
  "$API/api/reports/portfolio.xlsx?token=$TOKEN&owning_bu=ZISWAF"

# Trigger cron reminder (test manual — admin only)
curl -X POST $API/api/admin/run-expiry-reminders \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## 🩺 Troubleshooting

| Gejala | Solusi |
|--------|--------|
| Backend `ModuleNotFoundError` | Pastikan `source .venv/bin/activate` sebelum `pip install -r requirements.txt` |
| Frontend `mammoth` not found | Wajib `yarn install`, jangan pakai npm |
| Login gagal | Reset password admin: hapus record di collection `users`, restart backend → seed ulang |
| `session_timeout (15 menit)` | Sliding refresh gagal jika CORS memblok `X-New-Token`. Pastikan `CORS_ORIGINS` di backend/.env berisi origin frontend. |
| MongoDB connection refused | Pastikan `mongod` jalan, atau ganti `MONGO_URL` ke MongoDB Atlas SRV string |
| `.env` tidak terbaca | Backend load dari `backend/.env` (bukan root). Frontend memerlukan `REACT_APP_` prefix. |

## 📄 Lisensi & Kontribusi

Repositori internal BSI Maslahat. Kontribusi via feature-branch + PR. Semua perubahan pada auth/security **wajib** melalui review Legal + Compliance sesuai BRD.

<div align="center">

---

**Made with 🕌 for BSI Maslahat** · _Connecting Business Processes._

</div>
