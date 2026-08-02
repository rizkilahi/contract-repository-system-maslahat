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
