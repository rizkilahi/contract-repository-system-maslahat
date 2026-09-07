---
name: crs-operations
description: Runbooks for running CRS Maslahat locally, executing the test suite, and troubleshooting.
---

# CRS Maslahat Operations & Testing Runbook

## 1. Starting the Services

### Backend (Port 8001)
```powershell
# In project root:
.\start_backend.ps1
# Or manually:
cd backend
python -m uvicorn server:app --reload --host 127.0.0.1 --port 8001
```

### Frontend (Port 3000)
```powershell
# In project root:
.\start_frontend.ps1
# Or manually:
cd frontend
yarn start
```

## 2. Running Automated Tests
The backend test suite verifies authentication, RBAC boundaries, column-level locks, audit logging, and document parsing:

```bash
# Ensure backend is running on port 8001 first:
python tests/test_api.py
```
Expected output: **71/71 Tests Passed (100% Score)**.

## 3. Common Troubleshooting
- **MongoDB Connection Error**: Ensure MongoDB service is running locally (`net start MongoDB` or MongoDB Compass on `27017`).
- **PowerShell Script Execution**: If `.ps1` fails with ExecutionPolicy restriction, run:
  `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`
- **CORS Preflight Error**: Confirm `fastapi-cors-development.md` rule is followed (explicit `CORS_ORIGINS`, `override=True` on `load_dotenv`).
