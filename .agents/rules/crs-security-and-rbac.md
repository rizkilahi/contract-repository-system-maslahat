---
description: Critical security policies, 4-role RBAC invariants, column-level locks, and data retention rules for CRS Maslahat.
---

# CRS Maslahat Security & RBAC Guardrails

All modifications to endpoints, authentication, and contract mutation logic MUST adhere to these strict invariants:

## 1. 4-Role Strict RBAC Matrix (No Admin Bypass)
- **`business_unit`**:
  - Can initiate and draft PKS, upload initial `.docx` and scan `.pdf`.
  - Can ONLY modify contract metadata when status is `drafting` or `revision_required`.
  - Tenancy check: Can only access contracts matching their own `owning_bu` (`business_unit_id`).
- **`legal_officer`**:
  - Read access to all contracts.
  - Can update `remarks`, mark comments as resolved, and execute legal status transitions:
    - `submitted_for_review` -> `under_legal_review`
    - `under_legal_review` -> `ready_for_signature` (or `revision_required`)
    - `pending_final_verification` -> `signed_active` (or `revision_required`)
  - CANNOT modify core commercial fields (`contract_value`, `partner_name`, `effective_date`).
- **`management`**:
  - **READ-ONLY**: Strictly forbidden from mutating contracts, uploading files, or adding reviews (POST/PUT/PATCH/DELETE must return `403 Forbidden`).
- **`admin`**:
  - Manages users, resets passwords, and inspects global audit logs.
  - **CRITICAL**: Admin has **NO BYPASS** to edit contracts, approve workflows, or upload contract documents.

## 2. Column-Level State Lock
- When a contract reaches any of the locked statuses:
  - `ready_for_signature`
  - `pending_final_verification`
  - `signed_active`
- The following sensitive fields are **permanently locked**:
  - `contract_value`
  - `partner_name`
  - `effective_date`
- Any attempt to update these fields must be rejected with HTTP `403 Forbidden` (`State Locked`).

## 3. No-DELETE Retention Policy
- In compliance with sharia/corporate audit governance, contracts, files, comments, and versions are **append-only**.
- Any `DELETE` request against `/api/contracts*`, `/api/files*`, `/api/comments*`, or `/api/versions*` MUST be intercepted and short-circuited with `HTTP 405 Method Not Allowed` (`Data Retention Policy`).
- The rejected deletion attempt must still be logged to `system_audit`.

## 4. Sliding Session JWT (15-Minute Expiry)
- JWT expiration is strictly **15 minutes** of inactivity.
- Middleware / `get_current_user` checks remaining validity: if < 5 minutes remain, it issues a fresh token via response header `X-New-Token`.
- Frontend axios response interceptor automatically picks up `X-New-Token` and updates `localStorage`.
- Always expose `X-New-Token` in CORS headers (`expose_headers=["X-New-Token"]`).

## 5. Append-Only Audit Logging
- Every mutating request (POST, PUT, PATCH, DELETE) and sensitive read (`/api/files/*`) is recorded in `system_audit` with:
  `timestamp`, `user_id`, `user_email`, `role`, `business_unit_id`, `method`, `path`, `query`, `status_code`, `ip`, `user_agent`.
- No update or delete operations are ever allowed on `system_audit` or contract `audit_logs`.
