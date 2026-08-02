from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import io
import re
import uuid
import hmac
import logging
import asyncio
import requests
from datetime import datetime, timezone, timedelta
from collections import Counter
from typing import List, Optional, Literal

import bcrypt
import jwt
from docx import Document
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Form, Response, Query, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---------- Config ----------
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
JWT_EXP_HOURS = 12
APP_NAME = os.environ.get('APP_NAME', 'crs-maslahat')
EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY')
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
WEBHOOK_CRON_SECRET = os.environ.get('WEBHOOK_CRON_SECRET', '')

# ---------- Roles ----------
Role = Literal["admin", "business_unit", "legal_officer", "management"]
INSTITUTION_TYPES = ["Yayasan", "Perusahaan (PT)", "Koperasi", "Instansi Pemerintah", "Perorangan"]
OWNING_BUS = ["ZISWAF", "Community Development", "Corporate Partnership", "Program Sosial", "Pendidikan"]

STATUS_FLOW = [
    "drafting",
    "under_legal_review",
    "revision_required",
    "ready_for_signature",
    "pending_final_verification",
    "signed_active",
    "expired",
]

# ---------- App ----------
app = FastAPI(title="CRS Maslahat API")
api = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("crs")

# ---------- Storage helpers ----------
_storage_key: Optional[str] = None

def init_storage() -> Optional[str]:
    global _storage_key
    if _storage_key:
        return _storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        return _storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(500, "Storage unavailable")
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key, "Content-Type": content_type},
                        data=data, timeout=120)
    if resp.status_code == 403:
        # refresh key
        globals()['_storage_key'] = None
        key = init_storage()
        resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": key, "Content-Type": content_type},
                            data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(500, "Storage unavailable")
    resp = requests.get(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 403:
        globals()['_storage_key'] = None
        key = init_storage()
        resp = requests.get(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ---------- Password + JWT ----------
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not creds or not creds.credentials:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user

def require_roles(*roles: str):
    async def _check(user: dict = Depends(get_current_user)):
        if user["role"] not in roles and user["role"] != "admin":
            raise HTTPException(403, f"Requires role: {roles}")
        return user
    return _check

# ---------- Models ----------
class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str

class ContractIn(BaseModel):
    partner_name: str
    partner_pic_name: str
    partner_pic_phone: str
    partner_pic_email: EmailStr
    institution_type: str
    agreement_title: str
    contract_value: float = 0.0
    effective_date: str  # YYYY-MM-DD
    expiry_date: str
    owning_bu: str
    bu_pic_name: str
    remarks: Optional[str] = ""

class StatusUpdate(BaseModel):
    status: str
    remarks: Optional[str] = ""

# ---------- Utils ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def gen_contract_id() -> str:
    yr = datetime.now(timezone.utc).year
    return f"PKS-{yr}-{uuid.uuid4().hex[:6].upper()}"

async def add_audit(contract_id: str, user: dict, action: str, detail: str = ""):
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "contract_id": contract_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "user_role": user["role"],
        "action": action,
        "detail": detail,
        "created_at": now_iso(),
    })

def compute_derived_status(c: dict) -> str:
    base = c.get("status", "drafting")
    if base == "signed_active":
        try:
            exp = datetime.fromisoformat(c["expiry_date"])
            days = (exp.date() - datetime.now(timezone.utc).date()).days
            if days < 0:
                return "expired"
            if days <= 60:
                return "expiring_soon"
        except Exception:
            pass
    return base

def strip_id(doc):
    doc.pop("_id", None)
    return doc

# ---------- Seed ----------
DEMO_USERS = [
    {"email": "bu@bsimaslahat.co.id", "name": "Ahmad Faizal (Business Unit)", "role": "business_unit", "password": "Demo@2026"},
    {"email": "legal@bsimaslahat.co.id", "name": "Siti Rahmawati (Legal Officer)", "role": "legal_officer", "password": "Demo@2026"},
    {"email": "management@bsimaslahat.co.id", "name": "Budi Santoso (Manajemen)", "role": "management", "password": "Demo@2026"},
]

async def seed_users():
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_pw = os.environ["ADMIN_PASSWORD"]
    admin_name = os.environ.get("ADMIN_NAME", "Admin CRS")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email, "name": admin_name, "role": "admin",
            "password_hash": hash_password(admin_pw), "created_at": now_iso(),
        })
    else:
        if not verify_password(admin_pw, existing["password_hash"]):
            await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})
    for u in DEMO_USERS:
        e = u["email"].lower()
        if not await db.users.find_one({"email": e}):
            await db.users.insert_one({
                "id": str(uuid.uuid4()),
                "email": e, "name": u["name"], "role": u["role"],
                "password_hash": hash_password(u["password"]), "created_at": now_iso(),
            })

async def seed_sample_contracts():
    if await db.contracts.count_documents({}) > 0:
        return
    bu = await db.users.find_one({"role": "business_unit"})
    if not bu:
        return
    samples = [
        ("Yayasan Rumah Zakat", "Yayasan", "PKS Program ZISWAF - Distribusi Bantuan Sosial", "signed_active", "ZISWAF", 250_000_000, 45),
        ("PT Berkah Sejahtera", "Perusahaan (PT)", "Kerjasama Corporate CSR Pendidikan", "signed_active", "Pendidikan", 500_000_000, 200),
        ("Koperasi Mitra Ummat", "Koperasi", "Pembiayaan Mikro Anggota Koperasi", "pending_final_verification", "Community Development", 750_000_000, 300),
        ("Yayasan Pendidikan Al-Amanah", "Yayasan", "Beasiswa Santri Berprestasi 2026", "under_legal_review", "Pendidikan", 180_000_000, 365),
        ("PT Halal Logistik Indonesia", "Perusahaan (PT)", "Distribusi Logistik Bantuan Kemanusiaan", "signed_active", "Program Sosial", 320_000_000, 25),
        ("Dinas Sosial Provinsi Jabar", "Instansi Pemerintah", "Sinergi Program Pengentasan Kemiskinan", "drafting", "Program Sosial", 0, 400),
        ("Yayasan Panti Asuhan Nurul Iman", "Yayasan", "Program Ramadhan Berbagi 2026", "signed_active", "ZISWAF", 95_000_000, -10),
        ("PT Fintech Syariah Nusantara", "Perusahaan (PT)", "Integrasi Pembayaran Zakat Digital", "revision_required", "Corporate Partnership", 420_000_000, 500),
        ("Ustadz Ahmad Hidayat", "Perorangan", "Program Dai Ambassador BSI Maslahat", "ready_for_signature", "Pendidikan", 60_000_000, 730),
        ("Yayasan Rumah Yatim Indonesia", "Yayasan", "Program Ekonomi Keluarga Yatim", "signed_active", "Community Development", 275_000_000, 90),
    ]
    for i, (partner, itype, title, status, obu, val, days_to_exp) in enumerate(samples):
        eff = datetime.now(timezone.utc).date()
        exp = eff + timedelta(days=days_to_exp)
        cid = gen_contract_id()
        doc = {
            "id": str(uuid.uuid4()),
            "contract_id": cid,
            "partner_name": partner,
            "partner_pic_name": f"PIC Mitra {i+1}",
            "partner_pic_phone": f"+62812{1000000+i*137}",
            "partner_pic_email": f"pic{i+1}@partner.id",
            "institution_type": itype,
            "agreement_title": title,
            "contract_value": val,
            "effective_date": eff.isoformat(),
            "expiry_date": exp.isoformat(),
            "owning_bu": obu,
            "bu_pic_name": bu["name"],
            "bu_pic_id": bu["id"],
            "remarks": "",
            "status": status,
            "versions": [],
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.contracts.insert_one(doc)
        await db.audit_logs.insert_one({
            "id": str(uuid.uuid4()), "contract_id": doc["id"],
            "user_id": bu["id"], "user_name": bu["name"], "user_role": "business_unit",
            "action": "CONTRACT_CREATED", "detail": f"Kontrak {cid} dibuat", "created_at": now_iso(),
        })

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.contracts.create_index("contract_id", unique=True)
    await db.audit_logs.create_index("contract_id")
    await seed_users()
    await seed_sample_contracts()
    init_storage()
    # Write test_credentials
    try:
        os.makedirs("/app/memory", exist_ok=True)
        with open("/app/memory/test_credentials.md", "w") as f:
            f.write("# CRS Maslahat Test Credentials\n\n")
            f.write("## Admin (Real Owner)\n")
            f.write(f"- Email: `{os.environ['ADMIN_EMAIL']}`\n")
            f.write(f"- Password: `{os.environ['ADMIN_PASSWORD']}`\n")
            f.write(f"- Role: `admin` (full access)\n\n")
            f.write("## Demo Users (all password: `Demo@2026`)\n")
            for u in DEMO_USERS:
                f.write(f"- **{u['role']}** — `{u['email']}` / `Demo@2026` — {u['name']}\n")
            f.write("\n## Endpoints\n- POST /api/auth/login\n- GET /api/auth/me\n- GET /api/contracts\n- POST /api/contracts (business_unit)\n- GET /api/contracts/{id}\n- PATCH /api/contracts/{id}/status\n- POST /api/contracts/{id}/versions (multipart)\n- GET /api/files/{file_id} (auth via ?token=)\n- GET /api/dashboard/stats\n- GET /api/guidelines/{institution_type}\n")
    except Exception as e:
        logger.warning(f"Could not write test_credentials: {e}")

# ---------- Auth endpoints ----------
@api.get("/")
async def root():
    return {"app": "CRS Maslahat", "status": "ok"}

@api.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Email atau password salah")
    token = create_access_token(user["id"], user["email"], user["role"])
    return {
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]},
    }

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

# ---------- Legal Guidelines ----------
GUIDELINES = {
    "Yayasan": [
        {"doc": "Akta Pendirian", "kategori": "Wajib", "cp": "YA",
         "risiko": "PKS batal demi hukum jika yayasan bukan entitas berbadan hukum.",
         "solusi": "Tunda PKS hingga akta terbit dan diverifikasi notaris."},
        {"doc": "SK Pengesahan Kemenkumham (AHU)", "kategori": "Wajib", "cp": "YA",
         "risiko": "Yayasan tidak memiliki legal standing di depan hukum.",
         "solusi": "Cek registrasi resmi via AHU Online sebelum lanjut."},
        {"doc": "AD/ART", "kategori": "Wajib", "cp": "TIDAK",
         "risiko": "Ruang lingkup kewenangan pengurus tidak jelas.",
         "solusi": "Sertakan salinan AD/ART terbaru yang telah disahkan."},
        {"doc": "SK Pengurus", "kategori": "Wajib (Bisa Disubstitusi)", "cp": "YA",
         "risiko": "Penandatangan tidak berwenang mewakili yayasan.",
         "solusi": "Substitusi dengan Berita Acara Rapat Pengurus yang sah."},
    ],
    "Perusahaan (PT)": [
        {"doc": "Akta Pendirian PT", "kategori": "Wajib", "cp": "YA",
         "risiko": "PT tidak sah sebagai badan hukum.", "solusi": "Verifikasi via AHU Online."},
        {"doc": "SK Kemenkumham", "kategori": "Wajib", "cp": "YA",
         "risiko": "PT belum berstatus badan hukum resmi.", "solusi": "Minta salinan SK terbaru."},
        {"doc": "NPWP Perusahaan", "kategori": "Wajib", "cp": "TIDAK",
         "risiko": "Kewajiban pajak tidak jelas.", "solusi": "Minta NPWP + SKT."},
        {"doc": "NIB (OSS)", "kategori": "Wajib", "cp": "YA",
         "risiko": "Kegiatan usaha tidak terdaftar resmi.", "solusi": "Verifikasi NIB via OSS."},
    ],
    "Koperasi": [
        {"doc": "Akta Pendirian Koperasi", "kategori": "Wajib", "cp": "YA",
         "risiko": "Koperasi belum sah secara hukum.", "solusi": "Verifikasi ke Kemenkop UKM."},
        {"doc": "SK Menteri Koperasi", "kategori": "Wajib", "cp": "YA",
         "risiko": "Legal standing koperasi meragukan.", "solusi": "Cek registri resmi."},
        {"doc": "AD/ART Koperasi", "kategori": "Wajib", "cp": "TIDAK",
         "risiko": "Struktur & kewenangan tidak jelas.", "solusi": "Sertakan salinan lengkap."},
    ],
    "Instansi Pemerintah": [
        {"doc": "Surat Kuasa/SK Penunjukan", "kategori": "Wajib", "cp": "YA",
         "risiko": "Pejabat tidak berwenang menandatangani.", "solusi": "Verifikasi SK & jabatan."},
        {"doc": "DIPA/Anggaran", "kategori": "Wajib", "cp": "TIDAK",
         "risiko": "Kewajiban pembayaran tidak dijamin.", "solusi": "Minta salinan alokasi anggaran."},
    ],
    "Perorangan": [
        {"doc": "KTP", "kategori": "Wajib", "cp": "YA",
         "risiko": "Identitas pihak tidak terverifikasi.", "solusi": "Verifikasi via Dukcapil bila perlu."},
        {"doc": "NPWP", "kategori": "Wajib (Bisa Disubstitusi)", "cp": "TIDAK",
         "risiko": "Kewajiban pajak tidak jelas.", "solusi": "Substitusi dengan surat pernyataan."},
    ],
}

@api.get("/guidelines")
async def all_guidelines():
    return GUIDELINES

@api.get("/guidelines/{itype}")
async def get_guidelines(itype: str):
    return {"institution_type": itype, "items": GUIDELINES.get(itype, [])}

@api.get("/meta/options")
async def meta_options():
    return {
        "institution_types": INSTITUTION_TYPES,
        "owning_bus": OWNING_BUS,
        "statuses": STATUS_FLOW,
    }

# ---------- Contracts ----------
@api.get("/contracts")
async def list_contracts(
    q: Optional[str] = None,
    institution_type: Optional[str] = None,
    owning_bu: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    query = {}
    if institution_type and institution_type != "all":
        query["institution_type"] = institution_type
    if owning_bu and owning_bu != "all":
        query["owning_bu"] = owning_bu
    if status and status != "all":
        query["status"] = status
    if q:
        query["$or"] = [
            {"contract_id": {"$regex": q, "$options": "i"}},
            {"partner_name": {"$regex": q, "$options": "i"}},
            {"agreement_title": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.contracts.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    for d in docs:
        d["derived_status"] = compute_derived_status(d)
    return docs

@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    docs = await db.contracts.find({}, {"_id": 0}).to_list(1000)
    total_active = 0
    pending = 0
    expiring = 0
    expired = 0
    for d in docs:
        ds = compute_derived_status(d)
        if ds == "signed_active":
            total_active += 1
        elif ds == "expiring_soon":
            expiring += 1
            total_active += 1
        elif ds == "expired":
            expired += 1
        if ds == "pending_final_verification":
            pending += 1
    return {"total_active": total_active, "pending_verification": pending, "expiring_soon": expiring, "expired": expired}

@api.post("/contracts")
async def create_contract(body: ContractIn, user: dict = Depends(require_roles("business_unit"))):
    cid = gen_contract_id()
    doc = body.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "contract_id": cid,
        "bu_pic_id": user["id"],
        "status": "drafting",
        "versions": [],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })
    await db.contracts.insert_one(doc)
    await add_audit(doc["id"], user, "CONTRACT_CREATED", f"Kontrak {cid} dibuat")
    return strip_id(doc)

@api.get("/contracts/{cid}")
async def get_contract(cid: str, user: dict = Depends(get_current_user)):
    doc = await db.contracts.find_one({"id": cid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Kontrak tidak ditemukan")
    doc["derived_status"] = compute_derived_status(doc)
    return doc

@api.get("/contracts/{cid}/audit")
async def get_audit(cid: str, user: dict = Depends(get_current_user)):
    logs = await db.audit_logs.find({"contract_id": cid}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return logs

@api.patch("/contracts/{cid}/status")
async def update_status(cid: str, body: StatusUpdate, user: dict = Depends(get_current_user)):
    doc = await db.contracts.find_one({"id": cid})
    if not doc:
        raise HTTPException(404, "Kontrak tidak ditemukan")
    new_status = body.status
    # role guard
    if user["role"] not in ("admin", "legal_officer", "business_unit"):
        raise HTTPException(403, "Tidak diperbolehkan mengubah status")
    if new_status not in STATUS_FLOW:
        raise HTTPException(400, "Status tidak valid")
    await db.contracts.update_one({"id": cid}, {"$set": {"status": new_status, "updated_at": now_iso()}})
    await add_audit(cid, user, "STATUS_CHANGED", f"Status diubah menjadi {new_status}. {body.remarks or ''}")
    return {"ok": True, "status": new_status}

# ---------- File upload / versions ----------
@api.post("/contracts/{cid}/versions")
async def upload_version(
    cid: str,
    file: UploadFile = File(...),
    remarks: str = Form(""),
    version_label: str = Form(""),
    user: dict = Depends(get_current_user),
):
    doc = await db.contracts.find_one({"id": cid})
    if not doc:
        raise HTTPException(404, "Kontrak tidak ditemukan")
    ext = (file.filename.split(".")[-1] if "." in file.filename else "bin").lower()
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/contracts/{cid}/{file_id}.{ext}"
    data = await file.read()
    ct = file.content_type or "application/octet-stream"
    put_object(path, data, ct)
    # Version numbering: v1.0, v1.1 ...
    existing = doc.get("versions", [])
    next_ver = version_label or f"v1.{len(existing)}"
    file_record = {
        "id": file_id,
        "version": next_ver,
        "storage_path": path,
        "original_filename": file.filename,
        "content_type": ct,
        "size": len(data),
        "uploader_id": user["id"],
        "uploader_name": user["name"],
        "uploaded_at": now_iso(),
        "remarks": remarks,
    }
    await db.files.insert_one({**file_record, "contract_id": cid, "is_deleted": False})
    await db.contracts.update_one({"id": cid}, {"$push": {"versions": file_record}, "$set": {"updated_at": now_iso()}})
    await add_audit(cid, user, "VERSION_UPLOADED", f"Upload {next_ver}: {file.filename}")
    return file_record

@api.get("/files/{file_id}")
async def download_file(file_id: str, token: Optional[str] = Query(None), authorization: Optional[str] = Header(None)):
    # Manual auth (support ?token= for direct browser download links)
    raw = None
    if authorization and authorization.startswith("Bearer "):
        raw = authorization[7:]
    elif token:
        raw = token
    if not raw:
        raise HTTPException(401, "Auth required")
    try:
        jwt.decode(raw, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        raise HTTPException(401, "Invalid token")
    rec = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "File tidak ditemukan")
    data, ct = get_object(rec["storage_path"])
    from starlette.responses import Response as StarletteResponse
    return StarletteResponse(
        content=data,
        media_type=rec.get("content_type") or ct,
        headers={"Content-Disposition": f'attachment; filename="{rec["original_filename"]}"'}
    )

# ---------- Users (admin) ----------
@api.get("/users")
async def list_users(user: dict = Depends(require_roles("admin"))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    return users

# ---------- DOCX Auto-Fill ----------
ID_MONTHS = {"januari":1,"februari":2,"maret":3,"april":4,"mei":5,"juni":6,"juli":7,
             "agustus":8,"september":9,"oktober":10,"november":11,"desember":12}

def _find_date(text: str) -> Optional[str]:
    m = re.search(r"(\d{1,2})[\-/](\d{1,2})[\-/](\d{4})", text)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        try:
            return datetime(y, mo, d).date().isoformat()
        except Exception:
            pass
    m2 = re.search(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", text)
    if m2:
        d = int(m2.group(1)); mon = ID_MONTHS.get(m2.group(2).lower()); y = int(m2.group(3))
        if mon:
            try:
                return datetime(y, mon, d).date().isoformat()
            except Exception:
                pass
    return None

def extract_docx_metadata(data: bytes) -> dict:
    result = {"partner_name": "", "agreement_title": "", "effective_date": "",
              "expiry_date": "", "contract_value": 0, "raw_text": ""}
    try:
        doc = Document(io.BytesIO(data))
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        raw = "\n".join(paragraphs)
        for p in paragraphs[:20]:
            up = p.upper()
            if any(k in up for k in ["PERJANJIAN KERJA SAMA", "PERJANJIAN KERJASAMA", "PKS", "MEMORANDUM OF UNDERSTANDING", "MOU"]):
                result["agreement_title"] = p[:200]
                break
        if not result["agreement_title"] and paragraphs:
            result["agreement_title"] = paragraphs[0][:200]
        m = re.search(r"(PT\.?\s+[A-Z][A-Za-z0-9\.\-\s&,]{2,80}|YAYASAN\s+[A-Z][A-Za-z0-9\.\-\s&,]{2,80}|KOPERASI\s+[A-Z][A-Za-z0-9\.\-\s&,]{2,80})", raw)
        if m:
            result["partner_name"] = m.group(1).strip().rstrip(",.").strip()[:120]
        dates = []
        for line in paragraphs:
            d = _find_date(line)
            if d and d not in dates:
                dates.append(d)
            if len(dates) >= 2:
                break
        if len(dates) >= 1:
            result["effective_date"] = dates[0]
        if len(dates) >= 2:
            result["expiry_date"] = dates[1]
        m3 = re.search(r"Rp\.?\s*([\d\.,]+)", raw)
        if m3:
            try:
                num = m3.group(1).replace(".", "").replace(",", "")
                result["contract_value"] = int(num)
            except Exception:
                pass
        result["raw_text"] = raw[:12000]
    except Exception as e:
        logger.warning(f"docx parse error: {e}")
    return result

@api.post("/contracts/extract-docx")
async def extract_docx_endpoint(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if not (file.filename or "").lower().endswith(".docx"):
        raise HTTPException(400, "Hanya file .docx yang didukung")
    data = await file.read()
    return extract_docx_metadata(data)

@api.get("/files/{file_id}/text")
async def file_text(file_id: str, user: dict = Depends(get_current_user)):
    rec = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "Tidak ditemukan")
    data, _ = get_object(rec["storage_path"])
    if rec["original_filename"].lower().endswith(".docx"):
        meta = extract_docx_metadata(data)
        return {"kind": "docx", "text": meta.get("raw_text", ""), "meta": meta, "filename": rec["original_filename"]}
    return {"kind": "binary", "filename": rec["original_filename"], "text": ""}

# ---------- Analytics ----------
@api.get("/dashboard/analytics")
async def analytics(user: dict = Depends(get_current_user)):
    docs = await db.contracts.find({}, {"_id": 0}).to_list(1000)
    by_bu = {}
    by_status = {}
    by_inst = {}
    total_value = 0
    for d in docs:
        ds = compute_derived_status(d)
        by_bu.setdefault(d["owning_bu"], {"count": 0, "value": 0})
        by_bu[d["owning_bu"]]["count"] += 1
        by_bu[d["owning_bu"]]["value"] += d.get("contract_value") or 0
        by_status[ds] = by_status.get(ds, 0) + 1
        by_inst[d["institution_type"]] = by_inst.get(d["institution_type"], 0) + 1
        total_value += d.get("contract_value") or 0
    monthly = Counter()
    for d in docs:
        try:
            dt = datetime.fromisoformat(d["created_at"])
            monthly[dt.strftime("%Y-%m")] += 1
        except Exception:
            pass
    top = sorted(docs, key=lambda x: x.get("contract_value") or 0, reverse=True)[:5]
    return {
        "by_bu": [{"bu": k, **v} for k, v in by_bu.items()],
        "by_status": [{"status": k, "count": v} for k, v in by_status.items()],
        "by_institution": [{"institution_type": k, "count": v} for k, v in by_inst.items()],
        "monthly_new": sorted([{"month": k, "count": v} for k, v in monthly.items()], key=lambda x: x["month"]),
        "top_partners": [{"partner_name": p["partner_name"], "contract_id": p["contract_id"],
                          "value": p.get("contract_value") or 0, "owning_bu": p["owning_bu"]} for p in top],
        "total_value": total_value,
        "total_contracts": len(docs),
    }

# ---------- Notifications ----------
async def create_notification(user_id: str, kind: str, title: str, body: str, contract_id: Optional[str] = None):
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id, "kind": kind, "title": title, "body": body,
        "contract_id": contract_id, "read": False, "created_at": now_iso(),
    })

@api.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    q = {"user_id": user["id"]}
    items = await db.notifications.find(q, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    unread = await db.notifications.count_documents({**q, "read": False})
    return {"items": items, "unread": unread}

@api.post("/notifications/{nid}/read")
async def mark_read(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}

@api.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}

# ---------- Comments (Dual Review) ----------
class CommentIn(BaseModel):
    text: str
    version_id: Optional[str] = None
    section: Optional[str] = "draft"

@api.get("/contracts/{cid}/comments")
async def list_comments(cid: str, user: dict = Depends(get_current_user)):
    return await db.comments.find({"contract_id": cid}, {"_id": 0}).sort("created_at", 1).to_list(500)

@api.post("/contracts/{cid}/comments")
async def add_comment(cid: str, body: CommentIn, user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()), "contract_id": cid,
        "user_id": user["id"], "user_name": user["name"], "user_role": user["role"],
        "text": body.text, "version_id": body.version_id, "section": body.section or "draft",
        "resolved": False, "created_at": now_iso(),
    }
    await db.comments.insert_one(doc)
    await add_audit(cid, user, "COMMENT_ADDED", f"[{doc['section']}] {body.text[:80]}")
    return {k: v for k, v in doc.items() if k != "_id"}

@api.post("/comments/{comment_id}/resolve")
async def resolve_comment(comment_id: str, user: dict = Depends(get_current_user)):
    await db.comments.update_one({"id": comment_id},
                                  {"$set": {"resolved": True, "resolved_by": user["name"], "resolved_at": now_iso()}})
    return {"ok": True}

# ---------- Cron webhook: expiry reminders ----------
async def _run_expiry_reminders():
    docs = await db.contracts.find({"status": "signed_active"}, {"_id": 0}).to_list(1000)
    today = datetime.now(timezone.utc).date()
    legal = await db.users.find({"role": {"$in": ["legal_officer", "admin"]}}, {"_id": 0}).to_list(100)
    created = 0
    for d in docs:
        try:
            exp = datetime.fromisoformat(d["expiry_date"]).date()
        except Exception:
            continue
        days = (exp - today).days
        # Bucket into H-60 / H-30 / H-7 windows for realistic reminders
        if 55 <= days <= 65:
            bucket = 60
        elif 25 <= days <= 35:
            bucket = 30
        elif 3 <= days <= 9:
            bucket = 7
        else:
            continue
        title = f"PKS {d['contract_id']} berakhir dalam {days} hari"
        body = f"{d['partner_name']} — {d['agreement_title'][:80]} berakhir pada {d['expiry_date']}"
        recipients = set()
        if d.get("bu_pic_id"):
            recipients.add(d["bu_pic_id"])
        for u in legal:
            recipients.add(u["id"])
        for uid in recipients:
            existing = await db.notifications.find_one({
                "user_id": uid, "contract_id": d["id"], "kind": f"expiry_h{bucket}"
            })
            if existing:
                continue
            await create_notification(uid, f"expiry_h{bucket}", title, body, contract_id=d["id"])
            created += 1
    logger.info(f"expiry-reminders: {created} notifications created")

@api.post("/cron/expiry-reminders")
async def cron_expiry(
    x_webhook_id: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None),
):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Auth required")
    token = authorization[7:]
    if not WEBHOOK_CRON_SECRET or not hmac.compare_digest(token, WEBHOOK_CRON_SECRET):
        raise HTTPException(401, "Invalid webhook secret")
    run_id = x_webhook_id or str(uuid.uuid4())
    if await db.cron_runs.find_one({"run_id": run_id}):
        return {"ok": True, "duplicate": True}
    await db.cron_runs.insert_one({"run_id": run_id, "job": "expiry-reminders", "created_at": now_iso()})
    asyncio.create_task(_run_expiry_reminders())
    return {"ok": True, "run_id": run_id}

# Manual trigger for testing (admin only)
@api.post("/admin/run-expiry-reminders")
async def admin_run_expiry(user: dict = Depends(require_roles("admin"))):
    await _run_expiry_reminders()
    return {"ok": True}

# ---------- Reports (Excel + PDF) ----------
from starlette.responses import StreamingResponse
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors as rl_colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

STATUS_LABEL_ID = {
    "drafting": "Drafting",
    "under_legal_review": "Under Legal Review",
    "revision_required": "Revision Required",
    "ready_for_signature": "Ready for Signature",
    "pending_final_verification": "Pending Final Verification",
    "signed_active": "Signed & Active",
    "expiring_soon": "Expiring Soon",
    "expired": "Expired",
}

async def _build_report_query(institution_type: Optional[str], owning_bu: Optional[str], status: Optional[str]):
    q = {}
    if institution_type and institution_type != "all":
        q["institution_type"] = institution_type
    if owning_bu and owning_bu != "all":
        q["owning_bu"] = owning_bu
    if status and status != "all":
        q["status"] = status
    return q

@api.get("/reports/portfolio.xlsx")
async def export_xlsx(
    token: Optional[str] = Query(None),
    institution_type: Optional[str] = None,
    owning_bu: Optional[str] = None,
    status: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    raw = None
    if authorization and authorization.startswith("Bearer "):
        raw = authorization[7:]
    elif token:
        raw = token
    if not raw:
        raise HTTPException(401, "Auth required")
    try:
        jwt.decode(raw, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        raise HTTPException(401, "Invalid token")

    q = await _build_report_query(institution_type, owning_bu, status)
    docs = await db.contracts.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)

    wb = Workbook()
    ws = wb.active
    ws.title = "Portofolio PKS"

    # Header title row
    ws.merge_cells("A1:M1")
    ws["A1"] = "BSI MASLAHAT — LAPORAN PORTOFOLIO PERJANJIAN KERJA SAMA"
    ws["A1"].font = Font(bold=True, size=14, color="FFFFFF")
    ws["A1"].fill = PatternFill("solid", fgColor="0F766E")
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 28

    ws.merge_cells("A2:M2")
    ws["A2"] = f"Dicetak: {datetime.now(timezone.utc).strftime('%d %B %Y %H:%M UTC')}   ·   Total kontrak: {len(docs)}"
    ws["A2"].font = Font(italic=True, size=10, color="475569")
    ws["A2"].alignment = Alignment(horizontal="center")

    headers = [
        "No. PKS", "Mitra", "Jenis Institusi", "Judul PKS",
        "PIC Mitra", "Telp PIC", "Email PIC",
        "Owning BU", "PIC Business Unit",
        "Nilai (Rp)", "Tanggal Efektif", "Tanggal Berakhir", "Status"
    ]
    header_fill = PatternFill("solid", fgColor="F1F5F9")
    header_font = Font(bold=True, size=10, color="0F172A")
    thin = Side(border_style="thin", color="CBD5E1")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=4, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = border
    ws.row_dimensions[4].height = 34

    for i, d in enumerate(docs, start=5):
        ds = compute_derived_status(d)
        row = [
            d["contract_id"], d["partner_name"], d["institution_type"], d["agreement_title"],
            d.get("partner_pic_name", ""), d.get("partner_pic_phone", ""), d.get("partner_pic_email", ""),
            d["owning_bu"], d.get("bu_pic_name", ""),
            d.get("contract_value") or 0, d.get("effective_date", ""), d.get("expiry_date", ""),
            STATUS_LABEL_ID.get(ds, ds),
        ]
        for col_idx, val in enumerate(row, 1):
            c = ws.cell(row=i, column=col_idx, value=val)
            c.font = Font(size=10)
            c.border = border
            c.alignment = Alignment(vertical="center", wrap_text=col_idx in (2, 4))
            if col_idx == 10:
                c.number_format = '"Rp"#,##0'
        # zebra
        if i % 2 == 0:
            for col_idx in range(1, len(headers) + 1):
                ws.cell(row=i, column=col_idx).fill = PatternFill("solid", fgColor="F8FAFC")

    widths = [16, 30, 18, 40, 20, 16, 24, 22, 22, 18, 14, 14, 22]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    ws.freeze_panes = "A5"

    # Summary sheet
    ws2 = wb.create_sheet("Ringkasan")
    ws2["A1"] = "Ringkasan Portofolio"
    ws2["A1"].font = Font(bold=True, size=14, color="0F766E")
    ws2.append([])
    ws2.append(["Metrik", "Nilai"])
    total_val = sum((d.get("contract_value") or 0) for d in docs)
    by_status_summary = {}
    by_bu_summary = {}
    for d in docs:
        ds = compute_derived_status(d)
        by_status_summary[ds] = by_status_summary.get(ds, 0) + 1
        by_bu_summary.setdefault(d["owning_bu"], {"count": 0, "value": 0})
        by_bu_summary[d["owning_bu"]]["count"] += 1
        by_bu_summary[d["owning_bu"]]["value"] += d.get("contract_value") or 0
    ws2.append(["Total Kontrak", len(docs)])
    ws2.append(["Total Nilai Portofolio", total_val])
    ws2["B5"].number_format = '"Rp"#,##0'
    ws2.append([])
    ws2.append(["Distribusi Status", "Jumlah"])
    for k, v in sorted(by_status_summary.items(), key=lambda x: -x[1]):
        ws2.append([STATUS_LABEL_ID.get(k, k), v])
    ws2.append([])
    ws2.append(["Distribusi Business Unit", "Jumlah", "Nilai (Rp)"])
    for k, v in sorted(by_bu_summary.items(), key=lambda x: -x[1]["value"]):
        ws2.append([k, v["count"], v["value"]])
    ws2.column_dimensions["A"].width = 36
    ws2.column_dimensions["B"].width = 18
    ws2.column_dimensions["C"].width = 22
    for cell in ["A3", "A8", ]:
        ws2[cell].font = Font(bold=True, color="0F766E")

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    fn = f"portofolio-pks-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fn}"'},
    )

@api.get("/reports/portfolio.pdf")
async def export_pdf(
    token: Optional[str] = Query(None),
    institution_type: Optional[str] = None,
    owning_bu: Optional[str] = None,
    status: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    raw = None
    if authorization and authorization.startswith("Bearer "):
        raw = authorization[7:]
    elif token:
        raw = token
    if not raw:
        raise HTTPException(401, "Auth required")
    try:
        jwt.decode(raw, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        raise HTTPException(401, "Invalid token")

    q = await _build_report_query(institution_type, owning_bu, status)
    docs = await db.contracts.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=landscape(A4),
        leftMargin=1.2 * cm, rightMargin=1.2 * cm, topMargin=1.2 * cm, bottomMargin=1.2 * cm,
        title="Laporan Portofolio PKS BSI Maslahat",
    )
    styles = getSampleStyleSheet()
    teal = rl_colors.HexColor("#0F766E")
    amber = rl_colors.HexColor("#F59E0B")
    slate = rl_colors.HexColor("#475569")
    story = []

    title_style = ParagraphStyle("title", parent=styles["Heading1"], textColor=teal, fontSize=18, leading=22, spaceAfter=4)
    sub_style = ParagraphStyle("sub", parent=styles["Normal"], textColor=slate, fontSize=9, leading=12, spaceAfter=14)
    h2_style = ParagraphStyle("h2", parent=styles["Heading2"], textColor=teal, fontSize=13, leading=16, spaceBefore=8, spaceAfter=6)

    story.append(Paragraph("BSI MASLAHAT — Laporan Portofolio Kontrak", title_style))
    story.append(Paragraph(
        f"Dicetak: {datetime.now(timezone.utc).strftime('%d %B %Y %H:%M UTC')}   |   Total kontrak: <b>{len(docs)}</b>",
        sub_style
    ))

    # Summary tiles
    total_val = sum((d.get("contract_value") or 0) for d in docs)
    active_count = sum(1 for d in docs if compute_derived_status(d) == "signed_active")
    expiring_count = sum(1 for d in docs if compute_derived_status(d) == "expiring_soon")
    expired_count = sum(1 for d in docs if compute_derived_status(d) == "expired")
    summary_data = [[
        Paragraph(f"<b>Total Nilai</b><br/><font size=13 color='#0F766E'>Rp {total_val:,.0f}</font>".replace(",", "."), styles["Normal"]),
        Paragraph(f"<b>Active</b><br/><font size=13 color='#059669'>{active_count}</font>", styles["Normal"]),
        Paragraph(f"<b>Expiring Soon</b><br/><font size=13 color='#F59E0B'>{expiring_count}</font>", styles["Normal"]),
        Paragraph(f"<b>Expired</b><br/><font size=13 color='#E11D48'>{expired_count}</font>", styles["Normal"]),
    ]]
    summary_tbl = Table(summary_data, colWidths=[6.5 * cm] * 4)
    summary_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), rl_colors.HexColor("#F8FAFC")),
        ("BOX", (0, 0), (-1, -1), 0.5, rl_colors.HexColor("#CBD5E1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, rl_colors.HexColor("#CBD5E1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("PADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(summary_tbl)
    story.append(Spacer(1, 12))

    story.append(Paragraph("Daftar Kontrak", h2_style))

    header = ["No. PKS", "Mitra", "Jenis Institusi", "Judul PKS", "Owning BU", "Nilai (Rp)", "Berakhir", "Status"]
    body_style = ParagraphStyle("body", parent=styles["Normal"], fontSize=8, leading=10)
    rows = [header]
    for d in docs:
        ds = compute_derived_status(d)
        val = d.get("contract_value") or 0
        rows.append([
            Paragraph(d["contract_id"], body_style),
            Paragraph(d["partner_name"][:60], body_style),
            Paragraph(d["institution_type"], body_style),
            Paragraph(d["agreement_title"][:80], body_style),
            Paragraph(d["owning_bu"], body_style),
            Paragraph(f"Rp {val:,.0f}".replace(",", "."), body_style),
            Paragraph(d.get("expiry_date", ""), body_style),
            Paragraph(STATUS_LABEL_ID.get(ds, ds), body_style),
        ])

    col_widths = [2.4 * cm, 4.2 * cm, 2.4 * cm, 5.2 * cm, 3.0 * cm, 2.6 * cm, 2.0 * cm, 3.0 * cm]
    tbl = Table(rows, colWidths=col_widths, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), teal),
        ("TEXTCOLOR", (0, 0), (-1, 0), rl_colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.4, rl_colors.HexColor("#CBD5E1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [rl_colors.white, rl_colors.HexColor("#F8FAFC")]),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(tbl)

    story.append(Spacer(1, 20))
    story.append(Paragraph(
        "<i>Dokumen ini dihasilkan secara otomatis oleh CRS Maslahat. Untuk konfirmasi lebih lanjut, hubungi Legal &amp; Compliance BSI Maslahat.</i>",
        ParagraphStyle("footer", parent=styles["Normal"], fontSize=8, textColor=slate, alignment=1)
    ))

    doc.build(story)
    buf.seek(0)
    fn = f"portofolio-pks-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fn}"'},
    )

# ---------- Mount ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    client.close()
