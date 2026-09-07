---
description: System architecture, 9 contract lifecycle states, dual review conventions, and storage guidelines.
---

# CRS Maslahat Architecture & Contract Lifecycle

## 1. System Topology
- **Backend**: Python 3.11+ / FastAPI running via Uvicorn on `http://localhost:8001`.
- **Frontend**: React SPA running on `http://localhost:3000`.
- **Database**: MongoDB (via Motor async driver). Database name: `crs_maslahat`.
- **Storage**: Local filesystem at `backend/uploads/` with 25 MB max upload limit (`MAX_FILE_SIZE = 25 * 1024 * 1024`).

## 2. Contract Status Transitions
A contract moves through these 9 discrete lifecycle stages:
1. `drafting`: Initial creation by BU; metadata and draft `.docx` editable.
2. `submitted_for_review`: Submitted by BU to Legal.
3. `under_legal_review`: Legal Officer actively reviewing draft and scan.
4. `revision_required`: Sent back by Legal; BU re-uploads revised draft.
5. `ready_for_signature`: Legal approved draft; offline signing phase; commercial fields locked.
6. `pending_final_verification`: Signed PDF uploaded by BU; awaiting Legal verification.
7. `signed_active`: Verified by Legal; active PKS with watermark overlays.
8. `expiring_soon`: Auto-derived when `signed_active` has $\le 60$ days remaining until `expiry_date`.
9. `expired`: Auto-derived when `expiry_date < today`.

## 3. Dual Review System
- `/review/:id` route renders a split-screen view:
  - Left pane: Extracted text of `.docx` draft (`GET /api/files/:id/text`).
  - Right pane: Scanned signed `.pdf` preview.
- Comments are persisted via `POST /api/contracts/:id/comments` and resolved via `POST /api/comments/:id/resolve` (Legal & Admin only).
