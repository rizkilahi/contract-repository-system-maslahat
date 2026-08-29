# TECHNICAL SPECIFICATIONS & ARCHITECTURE

## Project Name: Contract Repository System (CRS) - Phase 1 MVP

**Document Version:** 6.0  
**Author:** Senior IT Strategy Consultant  
**Date:** 2026-08-27

---

## Revision History

| Version | Date       | Description                                                                                                                                                         |
| :------ | :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **5.0** | 2026-08-26 | Initial consolidated version                                                                                                                                        |
| **6.0** | 2026-08-27 | Alignment update: tech stack, schema, dan API diperbarui sesuai implementasi aktual (Python/FastAPI/MongoDB). Fitur bonus dan watermarking engine didokumentasikan. |

---

## 1. System Architecture Overview (Arsitektur Sistem)

Sistem ini menggunakan arsitektur **Monolith Modern / Decoupled** dengan pemisahan fungsional yang jelas antara antarmuka pengguna (_Frontend_) dan logika bisnis serta data (_Backend_).

- **Frontend Web App:** Dibangun menggunakan **React 18 (Create React App + Craco)** dengan penataan gaya **Tailwind CSS 3** + shadcn/ui component library.
- **Backend RESTful API:** **Python 3.11+ / FastAPI** dengan Uvicorn sebagai ASGI server. Dipilih karena performa async native, type-safety via Pydantic, dan ekosistem library Python yang kaya untuk manipulasi dokumen.
- **Database Engine:** **MongoDB** via Motor (async driver Python). Skema dokumen mempercepat iterasi MVP tanpa rigid schema migrations.
- **Persistent File Storage:** Local filesystem (`backend/uploads/`) untuk MVP. Kode S3-Compatible Cloud Storage sudah tersedia (dicomment) dan dapat diaktifkan.

---

## 2. Tech Stack Specification (Spesifikasi Teknologi)

- **Language:** JavaScript (ES6+) — Frontend; Python 3.11+ — Backend
- **Frontend Framework:** React 18 / Create React App + Craco
- **Styling Engine:** Tailwind CSS 3 + shadcn/ui
- **State Management:** React Context API (AuthContext)
- **Docx Parser Library:** `mammoth` (browser client-side) + `python-docx` (server-side)
- **PDF Manipulation Library:** `reportlab` (watermark overlay) + `pypdf` (PDF page merging)
- **Image Watermarking:** `Pillow (PIL)` untuk watermark diagonal pada JPG/PNG
- **Authentication:** JWT via `PyJWT` + `bcrypt`; sliding session 15 menit inaktivitas
- **Database Driver:** `Motor` (AsyncIOMotorClient)
- **Email Notifications:** `smtplib` (built-in Python) + SMTP config via environment variables

---

## 3. MongoDB Document Schema (Skema Basis Data)

Skema database menggunakan model dokumen MongoDB dengan versi kontrak di-_embed_ sebagai nested array.

```
   users ─────── audit_logs (per contract)
                 system_audit (HTTP-level)
   contracts ─── files (mirrors versions[])
                 notifications (per user)
                 comments (dual review)
```

### 3.1 Collection: `users`

```js
{
  id: UUID,
  email: String,              // unique
  name: String,
  role: String,               // 'admin' | 'business_unit' | 'legal_officer' | 'management'
  business_unit_id: String,   // 'CRG', 'RNG', dll (null untuk legal/management)
  password_hash: String,      // bcrypt
  created_at: ISO8601
}
```

### 3.2 Collection: `contracts`

```js
{
  id: UUID,
  contract_id: String,        // "PKS-2026-XXXXXX"
  reference_number: String,   // "03/001/PKS/BSI MASLAHAT/2026"
  partner_name: String,
  institution_type: String,   // 'Yayasan' | 'Perusahaan (PT)' | 'Koperasi' |
                              // 'Instansi Pemerintah' | 'DKM' | 'Perkumpulan' | 'Perorangan'
  agreement_title: String,
  contract_value: Number,     // IDR float
  owning_bu: String,
  bu_pic_name: String,
  bu_pic_id: UUID,
  partner_pic_name: String,
  partner_pic_phone: String,
  partner_pic_email: String,
  effective_date: DateString,
  expiry_date: DateString,
  status: String,
  remarks: String,
  versions: [                 // Embedded array riwayat berkas
    {
      id: UUID,
      version: String,        // 'v1.0', 'v1.1', 'Final'
      storage_path: String,
      original_filename: String,
      content_type: String,
      size: Number,
      uploader_id: UUID,
      uploader_name: String,
      uploader_role: String,
      uploaded_at: ISO8601,
      remarks: String,
      watermarked: Boolean    // true jika watermark REQ-03 disuntikkan
    }
  ],
  created_at: ISO8601,
  updated_at: ISO8601
}
```

### 3.3 Collection: `audit_logs` (Per-Kontrak)

```js
{
  id: UUID,
  contract_id: UUID,
  user_id: UUID,
  user_name: String,
  user_role: String,
  action: String,   // CONTRACT_CREATED | VERSION_UPLOADED | STATUS_CHANGED |
                    // WATERMARK_INJECTED | METADATA_UPDATED | COMMENT_ADDED
  detail: String,
  created_at: ISO8601
}
```

### 3.4 Collection: `system_audit` (HTTP-Level — BRD REQ-06)

```js
{
  id: UUID,
  timestamp: ISO8601,
  user_id: UUID,
  user_email: String,
  role: String,
  method: String,       // POST | PUT | PATCH | DELETE | GET (file download)
  path: String,
  status_code: Number,
  ip: String,
  user_agent: String
}
```

### 3.5 Status Flow Kontrak

```
drafting
   ↓ (BU submit)
submitted_for_review  ←── BU dapat recall ke drafting
   ↓ (Legal pickup)
under_legal_review
   ↓ (Legal approve)           ↓ (Legal revisi)
ready_for_signature      revision_required
   ↓ (BU upload scan)            ↑ (BU ajukan ulang)
pending_final_verification
   ↓ (Legal final verify)
signed_active
   ↓ (derived — otomatis oleh sistem)
expiring_soon / expired
```

---

## 4. API Specification & Endpoints

Semua request memerlukan `Authorization: Bearer <JWT_TOKEN>` kecuali `/api/auth/login`.  
_Sliding session: token di-refresh via header `X-New-Token` jika sisa kurang dari 5 menit._

### 4.1 Auth

| Method | Endpoint          | Keterangan                           |
| :----- | :---------------- | :----------------------------------- |
| `POST` | `/api/auth/login` | Login, kembalikan JWT + user profile |
| `GET`  | `/api/auth/me`    | Info user saat ini                   |

### 4.2 Meta & Guidelines (REQ-02)

| Method | Endpoint                             | Keterangan                                                                                       |
| :----- | :----------------------------------- | :----------------------------------------------------------------------------------------------- |
| `GET`  | `/api/meta/options`                  | Institution types, Owning BU list                                                                |
| `GET`  | `/api/guidelines`                    | Semua guidelines matrix                                                                          |
| `GET`  | `/api/guidelines/{institution_type}` | Guidelines untuk: Yayasan / PT / Koperasi / Instansi Pemerintah / DKM / Perkumpulan / Perorangan |

### 4.3 Contracts

| Method  | Endpoint                     | Role                         | Keterangan                                             |
| :------ | :--------------------------- | :--------------------------- | :----------------------------------------------------- |
| `GET`   | `/api/contracts`             | Semua                        | List + filter (q, status, institution_type, owning_bu) |
| `POST`  | `/api/contracts`             | business_unit                | Buat kontrak baru (status awal: `drafting`)            |
| `GET`   | `/api/contracts/{id}`        | Semua                        | Detail kontrak                                         |
| `PUT`   | `/api/contracts/{id}`        | business_unit, legal_officer | Update metadata (column + state lock)                  |
| `PATCH` | `/api/contracts/{id}/status` | business_unit, legal_officer | Transisi status (RBAC)                                 |
| `GET`   | `/api/contracts/{id}/audit`  | Semua                        | Audit log kontrak                                      |

### 4.4 File Upload & Dual Review

| Method | Endpoint                       | Role                         | Keterangan                                                              |
| :----- | :----------------------------- | :--------------------------- | :---------------------------------------------------------------------- |
| `POST` | `/api/contracts/{id}/versions` | business_unit, legal_officer | Upload versi. **Auto-watermark** bila Legal upload .pdf/.jpg/.jpeg/.png |
| `POST` | `/api/contracts/extract-docx`  | Semua                        | Parse .docx ekstrak metadata (REQ-01)                                   |
| `GET`  | `/api/files/{file_id}`         | Auth                         | Download file                                                           |
| `GET`  | `/api/files/{file_id}/text`    | Semua                        | Ekstrak teks dari .docx                                                 |
| `GET`  | `/api/contracts/{id}/comments` | Semua                        | Komentar dual review                                                    |
| `POST` | `/api/contracts/{id}/comments` | Semua                        | Tambah komentar                                                         |
| `POST` | `/api/comments/{id}/resolve`   | legal_officer, admin         | Resolve komentar                                                        |

### 4.5 Dashboard, Analytics & Reports

| Method | Endpoint                      | Keterangan                                          |
| :----- | :---------------------------- | :-------------------------------------------------- |
| `GET`  | `/api/dashboard/stats`        | KPI: active, expiring, expired, pending             |
| `GET`  | `/api/dashboard/analytics`    | Analitik: by BU, by status, by institution, monthly |
| `GET`  | `/api/reports/portfolio.xlsx` | Export Excel portofolio PKS                         |
| `GET`  | `/api/reports/portfolio.pdf`  | Export PDF portofolio PKS                           |

### 4.6 Notifications & Cron

| Method | Endpoint                          | Keterangan                                              |
| :----- | :-------------------------------- | :------------------------------------------------------ |
| `GET`  | `/api/notifications`              | In-app notifications + unread count                     |
| `POST` | `/api/notifications/{id}/read`    | Tandai dibaca                                           |
| `POST` | `/api/notifications/read-all`     | Tandai semua dibaca                                     |
| `POST` | `/api/cron/expiry-reminders`      | Webhook cron H-60/H-30/H-7 (Bearer WEBHOOK_CRON_SECRET) |
| `POST` | `/api/admin/run-expiry-reminders` | Manual trigger (admin only)                             |

---

## 5. Security & Middleware Authorization Rules

### 5.1 RBAC Matrix

| Role              | Kontrak              | Upload                                          | Status                     | Laporan   |
| :---------------- | :------------------- | :---------------------------------------------- | :------------------------- | :-------- |
| **business_unit** | Milik owning BU      | .docx + .pdf (state-gated)                      | drafting/submitted/pending | Read-only |
| **legal_officer** | Semua                | .docx/.pdf/.jpg/.jpeg/.png + **auto-watermark** | Review transitions         | Read-only |
| **management**    | Semua (read-only)    | —                                               | —                          | Download  |
| **admin**         | — (no contract edit) | —                                               | —                          | Audit log |

### 5.2 State & Column Lock

- `BU_EDITABLE_STATES`: `drafting`, `revision_required`
- `LOCKED_FIELDS`: `contract_value`, `partner_name`, `effective_date`
- `LOCKED_STATUSES`: `ready_for_signature`, `pending_final_verification`, `signed_active`

### 5.3 Data Retention (REQ-06)

- Middleware memblokir `DELETE` pada `/api/contracts`, `/api/files`, `/api/comments`, `/api/versions` dengan HTTP 405.
- Semua mutating ops + file downloads dicatat ke `system_audit` (append-only).

### 5.4 Watermarking Engine (REQ-03)

- **PDF:** `reportlab` membuat overlay "DRAFT - HASIL REVIU LEGAL" Helvetica-Bold 52pt, diagonal 45°, gray 30% opacity. `pypdf` merge ke setiap halaman.
- **JPG/PNG:** `Pillow` overlay teks diagonal, alpha ~30% (77/255).
- **Failsafe:** Jika gagal, file disimpan as-is + warning log. Tidak pernah error 500.
- **Audit:** Event `WATERMARK_INJECTED` dicatat di `audit_logs`.

### 5.5 Email Config (REQ-05)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=user@domain.com
SMTP_PASS=app_password
SMTP_FROM=noreply@bsimaslahat.co.id
```

Jika `SMTP_HOST` kosong, email di-skip gracefully. In-app notification tetap terkirim.

---

_Dokumen teknis v6.0 ini sudah selaras dengan implementasi aktual kode di repository._
