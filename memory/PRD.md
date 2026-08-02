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
