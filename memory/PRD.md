# CRS Maslahat — Contract Repository System

## Problem Statement

Build a high-fidelity full-stack Contract Repository System (CRS) for BSI Maslahat with the "Maslahat Connect" brand identity (Deep Teal + Warm Gold). Digitize the full PKS lifecycle: drafting → legal review → offline signing → verification → active monitoring — with role-based access, version control, audit trail, and expiry reminders.

## User Personas (per BRD)

1. **Business Unit** — initiator & facilitator (creates PKS, uploads drafts, uploads signed scans)
2. **Legal Officer / LCG** — reviewer & gatekeeper (approves drafts, verifies scans, requests revisions)
3. **Management (Kadiv/Direksi)** — offline approver, dashboard monitoring only
4. **Admin** — full system access, manages users
5. **System (Scheduler)** — automated reminders (not in MVP UI)

## Core Requirements (static)

- 4 KPI cards: Total Active / Pending Verification / Expiring Soon / Expired
- Contract data grid with search + filters (Institution Type, Owning BU)
- Contract detail side-panel with metadata grid, version history, audit trail timeline
- Drafting/submission form with drag-drop .docx zone + smart-info Legal Guidelines modal
- Real .docx / PDF upload to Emergent object storage
- Role-based UI + endpoints
- Deep Teal (#008A85) + Warm Gold (#F3A912), Manrope + Plus Jakarta Sans typography

## What's Been Implemented (2026-02-02)

- **Backend (FastAPI + MongoDB + Emergent Object Storage)**
  - JWT auth (12h expiry) with bcrypt; 4-role RBAC helper
  - Auto-seed admin (muhamadrizkiilahi03@gmail.com) + 3 demo users
  - 10 seeded sample contracts across all statuses
  - Endpoints: /api/auth/login /me, /api/dashboard/stats, /api/contracts CRUD + status transitions, /api/contracts/{id}/versions multipart upload, /api/files/{id} download (token query auth), /api/guidelines/{itype}, /api/meta/options, /api/users (admin)
  - Derived statuses: signed_active + ≤60d → expiring_soon; past expiry → expired
- **Frontend (React + Tailwind + shadcn)**
  - Login page (brand pane + demo quick-fill buttons)
  - AppShell: sticky teal navbar (logo, quick search, notifications, avatar) + collapsible sidebar + role-filtered nav
  - Dashboard: hero card, 4 KPI cards (accent left-border), searchable/filterable contract table with status badges
  - ContractDetailSheet: 3 tabs (Metadata / Versi Dokumen / Audit Trail) + role-guarded action buttons (approve, revise, upload signed)
  - SubmitContract form with drag-drop .docx zone, Panduan Legal smart-info modal (matrix by institution type)
  - UsersPage (admin)
  - FABs: "LAPORKAN SEKARANG" + "Tanya aku!"
- **Testing (iteration_1)**: backend 100%, frontend 95%. Minor debounce added to search input.

## Backlog / Next Actions

- P1: Version diff / Dual Review Mode (side-by-side .docx viewer + .pdf annotation)
- P1: Email + In-App H-60 / H-30 expiry reminders (scheduled cron job)
- P2: Contract auto-fill from uploaded .docx (metadata extraction)
- P2: Analytics tab (contract value by BU, status distribution)
- P3: Management persona custom dashboard
- P3: E-signature integration (future phase after MVP)

## Credentials

See /app/memory/test_credentials.md

## Update 2026-02-02 (Feature Wave 2)

- **Auto-Fill Metadata (.docx)**: `POST /api/contracts/extract-docx` menggunakan python-docx untuk parsing judul, nama mitra (PT/YAYASAN/KOPERASI), tanggal (efektif+expiry), dan nilai (Rp). Form Pengajuan mengisi otomatis field kosong ketika file dijatuhkan.
- **Analitik Portofolio**: `/analytics` page (recharts) — Total Nilai, Total PKS, Rata-rata; Bar chart nilai per BU, Pie chart sebaran status, Line chart tren bulanan, Top 5 mitra, Grid jenis institusi. Endpoint `GET /api/dashboard/analytics`.
- **Reminder Otomatis H-60/H-30/H-7**: Cron webhook `POST /api/cron/expiry-reminders` (Bearer WEBHOOK_CRON_SECRET) di `.emergent/crons.yml` (daily 01:00 UTC / 08:00 WIB). Idempotent via X-Webhook-Id. Bell dropdown di navbar menampilkan unread count dan navigasi ke halaman Dual Review.
- **Dual Review Mode**: `/review/:id` — side-by-side .docx text vs signed PDF (iframe). Tab section: Komentari Draft / Komentari Scan. Thread komentar per contract (`POST/GET /api/contracts/:id/comments`, `POST /api/comments/:id/resolve`). Legal Officer & Admin bisa mark resolved.
- Endpoint tambahan: `GET /api/files/:id/text` (ekstraksi teks .docx), `POST /api/admin/run-expiry-reminders` (manual trigger admin).

## Update 2026-02-02 (Security Hardening — 5 Rules)

- **Rule 1 — JWT + 15-min inactivity**: token exp shortened to 15 min; payload includes `sub, email, role, businessUnitId, iat, exp`. Sliding refresh: `get_current_user` mints new token via `X-New-Token` response header when < 5 min remaining. Frontend axios interceptor swaps token in localStorage. Verified: near-expiry token → header returned with 900s fresh window. CORS `expose_headers=["X-New-Token"]`.
- **Rule 2 — RBAC (strict, no admin bypass)**: `business_unit` creates drafts, uploads `.docx`/`.pdf` (state-guarded), updates metadata only in `drafting|revision_required`. `legal_officer` reads all, updates only `remarks`, exclusive status transitions (Approve, Request Revision, Verify & Activate). `management` READ-ONLY (POST/PUT/PATCH → 403). `admin` manages users + audit-log only (no contract writes, no uploads — verified 403).
- **Rule 3 — State-based Column-Level Lock**: `LOCKED_STATUSES={ready_for_signature, pending_final_verification, signed_active}`, `LOCKED_FIELDS={contract_value, partner_name, effective_date}`. New `PUT /api/contracts/{id}` endpoint enforces role + state + field allowlist. Verified: BU on `signed_active` → 403 with `error:"State Locked"` payload; Legal editing `contract_value` → 403 with `allowed:["remarks"]`.
- **Rule 4 — Audit Trail (append-only)**: HTTP middleware `security_and_audit_middleware` logs every POST/PUT/PATCH/DELETE + GET `/api/files/*` (including blocked DELETE attempts) to `system_audit`. Fields: `timestamp, user_id, user_email, role, business_unit_id, method, path, query, status_code, ip (x-forwarded-for aware), user_agent`. No UPDATE/DELETE endpoints exist for the collection (append-only guarantee). Admin-only `GET /api/admin/audit-log` (BU → 403).
- **Rule 5 — No DELETE (data retention)**: Middleware short-circuits DELETE on `/api/contracts`, `/api/files`, `/api/comments`, `/api/versions` with 405 `Data Retention Policy...`. Logged in audit trail before responding.
- Discovery endpoint `GET /api/admin/security-policy` exposes the entire RBAC + lock matrix so the frontend can render disabled states / warnings.
- Frontend: `ContractDetailSheet` removes admin from status-action buttons; version upload button gated to `business_unit|legal_officer`. `api.js` handles X-New-Token response header.

## Update 2026-08-30 (Security, Consistency & Performance Alignment)

- **BOLA / IDOR Patch**: `PUT /api/contracts/{id}` dan `GET /api/files/{id}` memverifikasi kepemilikan unit kerja (`owning_bu == user.business_unit_id`). `POST /comments/{id}/resolve` digate untuk `legal_officer` & `admin`.
- **DoS & ReDoS Guard**: Batas maksimum file upload 25 MB (`MAX_FILE_SIZE = 25MB`). Input query pencarian disanitasi menggunakan `re.escape(q)`.
- **Security Headers**: Middleware menyuntikkan `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`, dan `Referrer-Policy: strict-origin-when-cross-origin`.
- **MongoDB Indexing Strategy**: 9 indeks otomatis dibuat pada startup untuk `contracts.id`, `owning_bu`, `status`, `created_at`, `files.id`, `files.contract_id`, `comments.contract_id`, `notifications.(user_id, read)`, dan `system_audit.timestamp`.
- **Async SMTP**: Pengiriman email reminder dibungkus dengan `asyncio.to_thread` agar tidak memblokir event loop.
- **Reporting Consistency**: Kamus `STATUS_LABEL_ID` dilengkapi status `submitted_for_review`. Seluruh 71 unit test di `tests/test_api.py` lulus 100%.
