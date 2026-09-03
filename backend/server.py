from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=True)

import os
import io
import re
import uuid
import hmac
import math
import logging
import asyncio
import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone, timedelta
from collections import Counter
from typing import List, Optional, Literal

import bcrypt
import jwt
from docx import Document
import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=True) # Load variables from .env into os.environ

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
SESSION_INACTIVITY_MINUTES = 15
JWT_REFRESH_THRESHOLD_SECONDS = 300  # sliding refresh when < 5 min remaining
APP_NAME = os.environ.get('APP_NAME', 'crs-maslahat')
EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY')
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
WEBHOOK_CRON_SECRET = os.environ.get('WEBHOOK_CRON_SECRET', '')
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB max upload limit

# ---------- SMTP Email Config (optional — skip gracefully if not set) ----------
SMTP_HOST = os.environ.get('SMTP_HOST', '')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASS = os.environ.get('SMTP_PASS', '')
SMTP_FROM = os.environ.get('SMTP_FROM', 'noreply@bsimaslahat.co.id')

# ---------- Roles ----------
Role = Literal["admin", "business_unit", "legal_officer", "management"]
INSTITUTION_TYPES = ["Yayasan", "Perusahaan (PT)", "Koperasi", "Instansi Pemerintah", "DKM", "Perkumpulan", "Perorangan"]
OWNING_BUS = [
    "CRG", "CAG", "FSG", "HCG", "PDG", "RNG", "DFG", "BCG",
    "MCG", "IDG", "IAG", "CSG", "LCG", "EDG", "WAG", "SMG",
    "LEG", "PGG"
]

STATUS_FLOW = [
    "drafting",
    "submitted_for_review",
    "under_legal_review",
    "revision_required",
    "ready_for_signature",
    "pending_final_verification",
    "signed_active",
    "expired",
]

# ---------- Security Policy ----------
# State-based Column Lock (BRD rule 3)
LOCKED_STATUSES = {"ready_for_signature", "pending_final_verification", "signed_active"}
LOCKED_FIELDS = {"contract_value", "partner_name", "effective_date"}

# Field-level authorization (BRD rule 2)
BU_EDITABLE_STATES = {"drafting", "revision_required"}
BU_EDITABLE_FIELDS = {
    "partner_name", "partner_pic_name", "partner_pic_phone", "partner_pic_email",
    "institution_type", "agreement_title", "contract_value",
    "effective_date", "expiry_date", "owning_bu", "bu_pic_name", "remarks",
}
LEGAL_EDITABLE_FIELDS = {"remarks"}  # Legal Officer can only update legal remarks
BU_UPLOAD_EXTS = {"docx", "pdf"}                          # BU: .docx (draft) + .pdf (final scan)
LEGAL_UPLOAD_EXTS = {"docx", "pdf", "jpg", "jpeg", "png"}  # Legal: annotated + manual scan files (REQ-03)

# State transitions per role (BRD rule 2 — exclusive rights)
ALLOWED_TRANSITIONS = {
    "business_unit": {
        ("drafting", "submitted_for_review"),
        ("revision_required", "submitted_for_review"),
        ("submitted_for_review", "drafting"),                # BU can recall while awaiting pickup
        ("ready_for_signature", "pending_final_verification"),
    },
    "legal_officer": {
        ("submitted_for_review", "under_legal_review"),      # Pick up for review
        ("submitted_for_review", "revision_required"),       # Reject at intake
        ("under_legal_review", "ready_for_signature"),       # Approve
        ("under_legal_review", "revision_required"),         # Request Revision
        ("pending_final_verification", "revision_required"), # Request Revision (scan)
        ("pending_final_verification", "signed_active"),     # Verify & Activate
    },
}

# ---------- App ----------
app = FastAPI(title="CRS Maslahat API")


api = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("crs")

# ---------- Storage helpers ----------
''' 
# KODE CLOUD STORAGE LAMA (Dikomengari jika suatu saat butuh dipakai lagi)
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
'''

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")

def init_storage() -> Optional[str]:
    try:
        os.makedirs(UPLOADS_DIR, exist_ok=True)
        return "local"
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    if not init_storage():
        raise HTTPException(500, "Storage unavailable")
    
    # Path might contain subdirectories (e.g. contracts/123/doc.pdf)
    full_path = os.path.join(UPLOADS_DIR, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    
    with open(full_path, "wb") as f:
        f.write(data)
    
    return {"status": "ok", "path": path}

def get_object(path: str):
    if not init_storage():
        raise HTTPException(500, "Storage unavailable")
        
    full_path = os.path.join(UPLOADS_DIR, path)
    if not os.path.exists(full_path):
        raise HTTPException(404, "File not found")
        
    with open(full_path, "rb") as f:
        content = f.read()
        
    # Simple guess for content type based on extension
    content_type = "application/octet-stream"
    if path.endswith(".pdf"):
        content_type = "application/pdf"
    elif path.endswith(".docx"):
        content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        
    return content, content_type

# ---------- Password + JWT ----------
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str, business_unit_id: Optional[str] = None) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "businessUnitId": business_unit_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=SESSION_INACTIVITY_MINUTES),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(
    response: Response,
    creds: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    if not creds or not creds.credentials:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Session timed out (15 menit tidak aktif). Silakan login ulang.")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    # Sliding session: mint new token if remaining life < threshold — enables 15-min inactivity timeout.
    try:
        exp_ts = payload.get("exp")
        if exp_ts:
            exp_dt = datetime.fromtimestamp(exp_ts, tz=timezone.utc)
            remaining = (exp_dt - datetime.now(timezone.utc)).total_seconds()
            if remaining < JWT_REFRESH_THRESHOLD_SECONDS:
                new_tok = create_access_token(user["id"], user["email"], user["role"], user.get("business_unit_id"))
                response.headers["X-New-Token"] = new_tok
    except Exception:
        pass
    return user

def require_roles(*roles: str):
    """Strict role gate — admin has NO implicit bypass per BRD security policy."""
    async def _check(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, f"Akses ditolak untuk role '{user['role']}'. Diperlukan: {list(roles)}")
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
    business_unit_id: Optional[str] = None
    is_active: bool = True

class CreateUserIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str
    business_unit_id: Optional[str] = None
    is_active: bool = True

class UpdateUserIn(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    business_unit_id: Optional[str] = None
    is_active: Optional[bool] = None

class ResetPasswordIn(BaseModel):
    new_password: str

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
    reference_number: Optional[str] = None
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

# ---------- Watermark Helpers (REQ-03) ----------
def inject_watermark_pdf(pdf_bytes: bytes) -> bytes:
    """Inject diagonal 'DRAFT - HASIL REVIU LEGAL' watermark on every page of a PDF.
    Uses reportlab to create watermark overlay, pypdf to merge onto existing pages.
    Falls back to returning original bytes if any error occurs.
    """
    try:
        from reportlab.pdfgen import canvas as rl_canvas
        from reportlab.lib.pagesizes import A4, landscape
        from pypdf import PdfWriter, PdfReader

        # Step 1: Create single-page watermark PDF in memory
        wm_buf = io.BytesIO()
        page_w, page_h = landscape(A4)  # wide page to cover any orientation
        c = rl_canvas.Canvas(wm_buf, pagesize=(page_w, page_h))
        c.setFont("Helvetica-Bold", 52)
        c.setFillColorRGB(0.55, 0.55, 0.55, alpha=0.30)  # gray @ 30% opacity
        c.saveState()
        c.translate(page_w / 2, page_h / 2)
        c.rotate(45)
        c.drawCentredString(0, 0, "DRAFT - HASIL REVIU LEGAL")
        c.restoreState()
        c.save()
        wm_buf.seek(0)

        # Step 2: Merge watermark onto every page of the source PDF
        wm_reader = PdfReader(wm_buf)
        wm_page = wm_reader.pages[0]

        src_reader = PdfReader(io.BytesIO(pdf_bytes))
        writer = PdfWriter()
        for page in src_reader.pages:
            page.merge_page(wm_page)
            writer.add_page(page)

        out_buf = io.BytesIO()
        writer.write(out_buf)
        out_buf.seek(0)
        logger.info("PDF watermark injected successfully")
        return out_buf.read()
    except Exception as e:
        logger.warning(f"PDF watermark injection failed: {e}. File disimpan tanpa watermark.")
        return pdf_bytes


def inject_watermark_image(img_bytes: bytes, ext: str) -> bytes:
    """Inject diagonal 'DRAFT - HASIL REVIU LEGAL' watermark on a JPG/PNG image.
    Uses Pillow (PIL). Falls back to returning original bytes if any error occurs.
    """
    try:
        from PIL import Image, ImageDraw, ImageFont

        img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
        w, h = img.size

        # Create transparent overlay
        overlay = Image.new("RGBA", img.size, (255, 255, 255, 0))
        draw = ImageDraw.Draw(overlay)

        # Font size proportional to image width
        font_size = max(40, w // 12)
        font = None
        for font_name in ["arial.ttf", "Arial.ttf", "DejaVuSans-Bold.ttf"]:
            try:
                font = ImageFont.truetype(font_name, font_size)
                break
            except Exception:
                continue
        if font is None:
            font = ImageFont.load_default()

        text = "DRAFT - HASIL REVIU LEGAL"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]

        # Create text image and rotate diagonally
        txt_img = Image.new("RGBA", (text_w + 40, text_h + 40), (255, 255, 255, 0))
        txt_draw = ImageDraw.Draw(txt_img)
        txt_draw.text((20, 20), text, fill=(80, 80, 80, 77), font=font)  # ~30% opacity

        angle = math.degrees(math.atan2(h, w))
        rotated = txt_img.rotate(angle, expand=True)

        # Center on image
        x = (w - rotated.width) // 2
        y = (h - rotated.height) // 2
        overlay.paste(rotated, (x, y), rotated)

        composited = Image.alpha_composite(img, overlay).convert("RGB")
        out_buf = io.BytesIO()
        fmt = "JPEG" if ext in ("jpg", "jpeg") else "PNG"
        composited.save(out_buf, format=fmt, quality=92)
        out_buf.seek(0)
        logger.info(f"Image watermark injected successfully ({ext})")
        return out_buf.read()
    except Exception as e:
        logger.warning(f"Image watermark injection failed: {e}. File disimpan tanpa watermark.")
        return img_bytes


# ---------- Email Helper (REQ-05) ----------
def send_reminder_email(to_email: str, subject: str, html_body: str) -> None:
    """Send HTML email via SMTP. Gracefully skips if SMTP_HOST / SMTP_USER not configured."""
    if not SMTP_HOST or not SMTP_USER:
        logger.info(f"SMTP tidak dikonfigurasi — lewati email ke {to_email}")
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = SMTP_FROM
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html", "utf-8"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())
        logger.info(f"Email terkirim ke {to_email}: {subject}")
    except Exception as e:
        logger.warning(f"Gagal kirim email ke {to_email}: {e}")

# ---------- Seed ----------
DEMO_USERS = [
    {"email": "muhamadrizkiilahi03@gmail.com", "name": "Muhamad Rizki Ilahi (Admin)", "role": "admin", "password": "Admin@CRS2026", "business_unit_id": None},
    {"email": "bu@bsimaslahat.co.id", "name": "Ahmad Faizal (Business Unit)", "role": "business_unit", "password": "Demo@2026", "business_unit_id": "CRG"},
    {"email": "legal@bsimaslahat.co.id", "name": "Siti Rahmawati (Legal Officer)", "role": "legal_officer", "password": "Demo@2026", "business_unit_id": None},
    {"email": "management@bsimaslahat.co.id", "name": "Budi Santoso (Manajemen)", "role": "management", "password": "Demo@2026", "business_unit_id": None},
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
            "business_unit_id": None,
            "password_hash": hash_password(admin_pw), "created_at": now_iso(),
        })
    else:
        updates = {}
        if not verify_password(admin_pw, existing["password_hash"]):
            updates["password_hash"] = hash_password(admin_pw)
        if "business_unit_id" not in existing:
            updates["business_unit_id"] = None
        if updates:
            await db.users.update_one({"email": admin_email}, {"$set": updates})
    for u in DEMO_USERS:
        e = u["email"].lower()
        existing_u = await db.users.find_one({"email": e})
        if not existing_u:
            await db.users.insert_one({
                "id": str(uuid.uuid4()),
                "email": e, "name": u["name"], "role": u["role"],
                "business_unit_id": u.get("business_unit_id"),
                "password_hash": hash_password(u["password"]), "created_at": now_iso(),
            })
        elif "business_unit_id" not in existing_u:
            await db.users.update_one({"email": e}, {"$set": {"business_unit_id": u.get("business_unit_id")}})

async def seed_sample_contracts():
    # Backfill reference_number for existing seeded contracts that don't have one (idempotent).
    async for existing in db.contracts.find({"$or": [{"reference_number": None}, {"reference_number": ""}, {"reference_number": {"$exists": False}}]}, {"_id": 0, "id": 1}):
        seq = await db.contracts.count_documents({"reference_number": {"$exists": True, "$nin": [None, ""]}})
        ref = f"{(seq+1):02d}/{((seq+1)*17 % 900 + 100):03d}/PKS/BSI MASLAHAT/2026"
        await db.contracts.update_one({"id": existing["id"]}, {"$set": {"reference_number": ref}})

    if await db.contracts.count_documents({}) > 0:
        # Ensure at least one submitted_for_review sample exists for the new filter option.
        if not await db.contracts.find_one({"status": "submitted_for_review"}):
            bu = await db.users.find_one({"role": "business_unit"})
            if bu:
                eff = datetime.now(timezone.utc).date()
                exp = eff + timedelta(days=365)
                cid = gen_contract_id()
                await db.contracts.insert_one({
                    "id": str(uuid.uuid4()), "contract_id": cid,
                    "partner_name": "PT Sinar Amanah Nusantara",
                    "partner_pic_name": "Ir. Rahmat Hidayat",
                    "partner_pic_phone": "+628123456789",
                    "partner_pic_email": "rahmat@sinaramanah.co.id",
                    "institution_type": "Perusahaan (PT)",
                    "agreement_title": "Program Beasiswa Mahasiswa Dhuafa 2026",
                    "contract_value": 150_000_000,
                    "effective_date": eff.isoformat(), "expiry_date": exp.isoformat(),
                    "owning_bu": "LEG", "bu_pic_name": bu["name"], "bu_pic_id": bu["id"],
                    "business_unit_id": "LEG",
                    "reference_number": "04/001/PKS/BSI MASLAHAT/2026",
                    "remarks": "Menunggu Legal untuk mulai review", "status": "submitted_for_review",
                    "versions": [], "created_at": now_iso(), "updated_at": now_iso(),
                })
        return
    bu = await db.users.find_one({"role": "business_unit"})
    if not bu:
        return
    samples = [
        ("Yayasan Rumah Zakat", "Yayasan", "PKS Program ZISWAF - Distribusi Bantuan Sosial", "signed_active", "WAG", 250_000_000, 45),
        ("PT Berkah Sejahtera", "Perusahaan (PT)", "Kerjasama Corporate CSR Pendidikan", "signed_active", "LEG", 500_000_000, 200),
        ("Koperasi Mitra Ummat", "Koperasi", "Pembiayaan Mikro Anggota Koperasi", "pending_final_verification", "EDG", 750_000_000, 300),
        ("Yayasan Pendidikan Al-Amanah", "Yayasan", "Beasiswa Santri Berprestasi 2026", "under_legal_review", "LEG", 180_000_000, 365),
        ("PT Halal Logistik Indonesia", "Perusahaan (PT)", "Distribusi Logistik Bantuan Kemanusiaan", "signed_active", "CAG", 320_000_000, 25),
        ("Dinas Sosial Provinsi Jabar", "Instansi Pemerintah", "Sinergi Program Pengentasan Kemiskinan", "drafting", "CAG", 0, 400),
        ("Yayasan Panti Asuhan Nurul Iman", "Yayasan", "Program Ramadhan Berbagi 2026", "signed_active", "WAG", 95_000_000, -10),
        ("PT Fintech Syariah Nusantara", "Perusahaan (PT)", "Integrasi Pembayaran Zakat Digital", "revision_required", "FSG", 420_000_000, 500),
        ("Ustadz Ahmad Hidayat", "Perorangan", "Program Dai Ambassador BSI Maslahat", "ready_for_signature", "LEG", 60_000_000, 730),
        ("Yayasan Rumah Yatim Indonesia", "Yayasan", "Program Ekonomi Keluarga Yatim", "signed_active", "EDG", 275_000_000, 90),
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
    await db.contracts.create_index("id", unique=True)
    await db.contracts.create_index("owning_bu")
    await db.contracts.create_index("status")
    await db.contracts.create_index([("created_at", -1)])
    await db.audit_logs.create_index("contract_id")
    await db.files.create_index("id", unique=True)
    await db.files.create_index("contract_id")
    await db.comments.create_index("contract_id")
    await db.notifications.create_index([("user_id", 1), ("read", 1)])
    await db.system_audit.create_index([("timestamp", -1)])
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
    if user.get("is_active") is False:
        raise HTTPException(403, "Akun Anda telah dinonaktifkan oleh Administrator. Silakan hubungi admin.")
    token = create_access_token(user["id"], user["email"], user["role"], user.get("business_unit_id"))
    return {
        "token": token,
        "session_minutes": SESSION_INACTIVITY_MINUTES,
        "user": {
            "id": user["id"], "email": user["email"], "name": user["name"],
            "role": user["role"], "business_unit_id": user.get("business_unit_id"),
        },
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
    "DKM": [
        {"doc": "Surat Keputusan Pembentukan DKM", "kategori": "Wajib", "cp": "YA",
         "risiko": "DKM tidak memiliki legal standing sebagai pengelola masjid yang sah.",
         "solusi": "Minta SK Pembentukan dari Dewan Kemakmuran Masjid atau pengurus masjid induk."},
        {"doc": "KTP Ketua / PIC DKM", "kategori": "Wajib", "cp": "YA",
         "risiko": "Penandatangan tidak dapat diidentifikasi secara hukum.",
         "solusi": "Verifikasi KTP via Dukcapil jika diperlukan."},
        {"doc": "Surat Keterangan Domisili Masjid", "kategori": "Wajib", "cp": "TIDAK",
         "risiko": "Lokasi operasional DKM tidak terdokumentasi.",
         "solusi": "Minta surat dari kelurahan/kecamatan setempat."},
    ],
    "Perkumpulan": [
        {"doc": "Akta Pendirian Perkumpulan", "kategori": "Wajib", "cp": "YA",
         "risiko": "Perkumpulan tidak sah sebagai subjek hukum.",
         "solusi": "Verifikasi akta via notaris dan cek AHU Online."},
        {"doc": "SK Pengesahan Kemenkumham (AHU)", "kategori": "Wajib", "cp": "YA",
         "risiko": "Perkumpulan belum berbadan hukum resmi.",
         "solusi": "Tunda PKS hingga SK terbit dan terverifikasi."},
        {"doc": "AD/ART Perkumpulan", "kategori": "Wajib", "cp": "TIDAK",
         "risiko": "Struktur kepengurusan dan kewenangan tanda tangan tidak jelas.",
         "solusi": "Sertakan salinan AD/ART terbaru yang telah disahkan."},
        {"doc": "SK Pengurus Aktif", "kategori": "Wajib (Bisa Disubstitusi)", "cp": "YA",
         "risiko": "Penandatangan tidak memiliki kewenangan mewakili perkumpulan.",
         "solusi": "Substitusi dengan Berita Acara Rapat Anggota yang sah."},
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
    if user.get("role") == "business_unit":
        query["owning_bu"] = user.get("business_unit_id")
    if institution_type and institution_type != "all":
        query["institution_type"] = institution_type
    if owning_bu and owning_bu != "all":
        query["owning_bu"] = owning_bu
    # Only apply DB-level status filter for real stored statuses.
    if status and status not in ("all", "expiring_soon", "expired"):
        query["status"] = status
    if q:
        safe_q = re.escape(q.strip())
        query["$or"] = [
            {"contract_id": {"$regex": safe_q, "$options": "i"}},
            {"partner_name": {"$regex": safe_q, "$options": "i"}},
            {"agreement_title": {"$regex": safe_q, "$options": "i"}},
        ]
    docs = await db.contracts.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    for d in docs:
        d["derived_status"] = compute_derived_status(d)
    # Derived-state filters computed post-query
    if status in ("expiring_soon", "expired"):
        docs = [d for d in docs if d["derived_status"] == status]
    return docs

@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    query = {}
    if user.get("role") == "business_unit":
        query["owning_bu"] = user.get("business_unit_id")
    docs = await db.contracts.find(query, {"_id": 0}).to_list(1000)
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
        "business_unit_id": user.get("business_unit_id") or body.owning_bu,
        "status": "drafting",
        "versions": [],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })
    await db.contracts.insert_one(doc)
    await add_audit(doc["id"], user, "CONTRACT_CREATED", f"Kontrak {cid} dibuat")
    return strip_id(doc)

class ContractUpdate(BaseModel):
    partner_name: Optional[str] = None
    partner_pic_name: Optional[str] = None
    partner_pic_phone: Optional[str] = None
    partner_pic_email: Optional[EmailStr] = None
    institution_type: Optional[str] = None
    agreement_title: Optional[str] = None
    contract_value: Optional[float] = None
    effective_date: Optional[str] = None
    expiry_date: Optional[str] = None
    owning_bu: Optional[str] = None
    bu_pic_name: Optional[str] = None
    remarks: Optional[str] = None

@api.put("/contracts/{cid}")
async def update_contract_metadata(cid: str, body: ContractUpdate, user: dict = Depends(get_current_user)):
    """Update contract metadata with state-based Column-Level Lock (BRD rule 3)."""
    doc = await db.contracts.find_one({"id": cid})
    if not doc:
        raise HTTPException(404, "Kontrak tidak ditemukan")
    payload = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not payload:
        raise HTTPException(400, "Tidak ada field untuk diubah")
    role = user["role"]
    current_status = doc.get("status", "drafting")

    if role == "business_unit":
        if doc.get("owning_bu") != user.get("business_unit_id"):
            raise HTTPException(403, "Akses ditolak: Kontrak bukan milik unit kerja Anda")
        if current_status not in BU_EDITABLE_STATES:
            raise HTTPException(403, {
                "error": "State Locked",
                "message": f"Business Unit tidak boleh mengubah metadata saat status '{current_status}'. Hanya diizinkan pada: {sorted(BU_EDITABLE_STATES)}.",
                "current_status": current_status,
            })
        disallowed = [k for k in payload if k not in BU_EDITABLE_FIELDS]
        if disallowed:
            raise HTTPException(403, {"error": "Field not permitted", "fields": disallowed})
    elif role == "legal_officer":
        # Legal Officer may only edit legal remarks — never financial metadata.
        disallowed = [k for k in payload if k not in LEGAL_EDITABLE_FIELDS]
        if disallowed:
            raise HTTPException(403, {
                "error": "Field not permitted for Legal Officer",
                "fields": disallowed,
                "allowed": sorted(LEGAL_EDITABLE_FIELDS),
            })
    else:
        # admin: no contract metadata editing per BRD; management: read-only.
        raise HTTPException(403, f"Role '{role}' tidak diperbolehkan mengubah metadata kontrak")

    # Defensive Column-Level Lock — reject sensitive edits in locked states regardless of role.
    if current_status in LOCKED_STATUSES:
        locked_present = [k for k in payload if k in LOCKED_FIELDS]
        if locked_present:
            raise HTTPException(403, {
                "error": "State Locked",
                "message": f"Field terkunci pada status '{current_status}'",
                "locked_fields": locked_present,
                "current_status": current_status,
            })

    payload["updated_at"] = now_iso()
    await db.contracts.update_one({"id": cid}, {"$set": payload})
    await add_audit(cid, user, "METADATA_UPDATED", f"Fields: {', '.join(payload.keys())}")
    return {"ok": True, "updated_fields": list(payload.keys())}

@api.get("/contracts/{cid}")
async def get_contract(cid: str, user: dict = Depends(get_current_user)):
    doc = await db.contracts.find_one({"id": cid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Kontrak tidak ditemukan")
    if user.get("role") == "business_unit" and doc.get("owning_bu") != user.get("business_unit_id"):
        raise HTTPException(403, "Akses ditolak: Kontrak bukan milik unit kerja Anda")
    doc["derived_status"] = compute_derived_status(doc)
    return doc

@api.get("/contracts/{cid}/audit")
async def get_audit(cid: str, user: dict = Depends(get_current_user)):
    doc = await db.contracts.find_one({"id": cid}, {"_id": 1, "owning_bu": 1})
    if doc and user.get("role") == "business_unit" and doc.get("owning_bu") != user.get("business_unit_id"):
        raise HTTPException(403, "Akses ditolak: Kontrak bukan milik unit kerja Anda")
    logs = await db.audit_logs.find({"contract_id": cid}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return logs

@api.patch("/contracts/{cid}/status")
async def update_status(cid: str, body: StatusUpdate, user: dict = Depends(get_current_user)):
    doc = await db.contracts.find_one({"id": cid})
    if not doc:
        raise HTTPException(404, "Kontrak tidak ditemukan")
    new_status = body.status
    if new_status not in STATUS_FLOW:
        raise HTTPException(400, "Status tidak valid")
    role = user["role"]
    if role == "business_unit" and doc.get("owning_bu") != user.get("business_unit_id"):
        raise HTTPException(403, "Akses ditolak: Kontrak bukan milik unit kerja Anda")
    if role not in ALLOWED_TRANSITIONS:
        raise HTTPException(403, f"Role '{role}' tidak diperbolehkan mengubah status kontrak")
    transition = (doc.get("status"), new_status)
    if transition not in ALLOWED_TRANSITIONS[role]:
        raise HTTPException(403, {
            "error": "Transisi status tidak diperbolehkan",
            "role": role,
            "from_status": doc.get("status"),
            "to_status": new_status,
            "allowed_for_role": sorted([f"{a}→{b}" for a, b in ALLOWED_TRANSITIONS[role]]),
        })
    await db.contracts.update_one({"id": cid}, {"$set": {"status": new_status, "updated_at": now_iso()}})
    await add_audit(cid, user, "STATUS_CHANGED", f"{doc.get('status')} → {new_status}. {body.remarks or ''}")
    return {"ok": True, "status": new_status}

# ---------- File upload / versions ----------
@api.post("/contracts/{cid}/versions")
async def upload_version(
    cid: str,
    file: UploadFile = File(...),
    remarks: str = Form(""),
    version_label: str = Form(""),
    user: dict = Depends(require_roles("business_unit", "legal_officer")),
):
    doc = await db.contracts.find_one({"id": cid})
    if not doc:
        raise HTTPException(404, "Kontrak tidak ditemukan")
    if user.get("role") == "business_unit" and doc.get("owning_bu") != user.get("business_unit_id"):
        raise HTTPException(403, "Akses ditolak: Kontrak bukan milik unit kerja Anda")
    ext = (file.filename.split(".")[-1] if "." in (file.filename or "") else "bin").lower()
    # Role-based file-type restrictions per BRD rule 2.
    allowed_exts = BU_UPLOAD_EXTS if user["role"] == "business_unit" else LEGAL_UPLOAD_EXTS
    if ext not in allowed_exts:
        raise HTTPException(400, f"Role '{user['role']}' hanya boleh mengunggah: {sorted(allowed_exts)}")
    # State-lock: BU cannot upload draft (.docx) once in locked state; PDF scan uploads allowed only in ready_for_signature.
    if user["role"] == "business_unit":
        current = doc.get("status", "drafting")
        if ext == "docx" and current not in BU_EDITABLE_STATES:
            raise HTTPException(403, {"error": "State Locked", "message": f"BU tidak boleh upload draft baru saat status '{current}'"})
        if ext == "pdf" and current != "ready_for_signature":
            raise HTTPException(403, {"error": "State Locked", "message": "Scan PDF tandatangan hanya bisa diupload saat status 'ready_for_signature'"})
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/contracts/{cid}/{file_id}.{ext}"
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(413, f"Ukuran file ({len(data)/(1024*1024):.1f}MB) melebihi batas maksimum {MAX_FILE_SIZE // (1024*1024)}MB")

    # REQ-03: Auto-inject watermark when Legal Officer uploads manual review scan (pdf/jpg/png)
    watermarked = False
    if user["role"] == "legal_officer" and ext in {"pdf", "jpg", "jpeg", "png"}:
        original_size = len(data)
        if ext == "pdf":
            data = inject_watermark_pdf(data)
        else:
            data = inject_watermark_image(data, ext)
        watermarked = len(data) != original_size or True  # mark as attempted
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
        "uploader_role": user["role"],
        "uploaded_at": now_iso(),
        "remarks": remarks,
    }
    file_record["watermarked"] = watermarked
    await db.files.insert_one({**file_record, "contract_id": cid, "is_deleted": False})
    await db.contracts.update_one({"id": cid}, {"$push": {"versions": file_record}, "$set": {"updated_at": now_iso()}})
    audit_detail = f"Upload {next_ver}: {file.filename}"
    if watermarked:
        audit_detail += " | Watermark 'DRAFT - HASIL REVIU LEGAL' disuntikkan (REQ-03)"
    await add_audit(cid, user, "VERSION_UPLOADED", audit_detail)
    if watermarked:
        await add_audit(cid, user, "WATERMARK_INJECTED", f"Watermark otomatis pada: {file.filename}")
    return file_record

@api.get("/files/{file_id}")
async def download_file(
    file_id: str,
    token: Optional[str] = Query(None),
    inline: bool = Query(False),
    authorization: Optional[str] = Header(None)
):
    # Manual auth (support ?token= for direct browser download links)
    raw = None
    if authorization and authorization.startswith("Bearer "):
        raw = authorization[7:]
    elif token:
        raw = token
    if not raw:
        raise HTTPException(401, "Auth required")
    try:
        payload = jwt.decode(raw, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        raise HTTPException(401, "Invalid token")
    rec = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "File tidak ditemukan")

    # Verify contract ownership for business_unit role
    user_role = payload.get("role")
    if user_role == "business_unit":
        contract = await db.contracts.find_one({"id": rec.get("contract_id")}, {"_id": 0, "owning_bu": 1})
        if contract and contract.get("owning_bu") != payload.get("businessUnitId"):
            raise HTTPException(403, "Akses ditolak: Kontrak bukan milik unit kerja Anda")

    data, ct = get_object(rec["storage_path"])
    disp = "inline" if inline else "attachment"
    from starlette.responses import Response as StarletteResponse
    return StarletteResponse(
        content=data,
        media_type=rec.get("content_type") or ct,
        headers={"Content-Disposition": f'{disp}; filename="{rec["original_filename"]}"'}
    )

# ---------- Users (admin) ----------
@api.get("/users")
async def list_users(
    q: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: dict = Depends(require_roles("admin", "management"))
):
    query = {}
    if role and role != "all":
        query["role"] = role
    if status == "active":
        query["is_active"] = {"$ne": False}
    elif status == "inactive":
        query["is_active"] = False
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return users

@api.post("/users")
async def create_user(body: CreateUserIn, user: dict = Depends(require_roles("admin"))):
    email_clean = body.email.strip().lower()
    existing = await db.users.find_one({"email": email_clean})
    if existing:
        raise HTTPException(400, "Email sudah terdaftar dalam sistem")
    
    valid_roles = ["admin", "business_unit", "legal_officer", "management"]
    if body.role not in valid_roles:
        raise HTTPException(400, f"Role tidak valid. Pilihan: {valid_roles}")
    
    if len(body.password.strip()) < 6:
        raise HTTPException(400, "Password minimal 6 karakter")

    bu_id = body.business_unit_id if body.role == "business_unit" else None
    new_id = str(uuid.uuid4())
    doc = {
        "id": new_id,
        "email": email_clean,
        "name": body.name.strip(),
        "role": body.role,
        "business_unit_id": bu_id,
        "is_active": body.is_active,
        "password_hash": hash_password(body.password),
        "created_at": now_iso(),
        "created_by": user["email"]
    }
    await db.users.insert_one(doc)
    doc_out = {k: v for k, v in doc.items() if k not in ("_id", "password_hash")}
    
    # Audit trail
    await db.system_audit.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_email": user["email"],
        "action": "USER_CREATED",
        "detail": f"Membuat pengguna baru {body.name} ({email_clean}) dengan role {body.role}",
        "timestamp": now_iso()
    })
    return doc_out

@api.put("/users/{user_id}")
async def update_user(user_id: str, body: UpdateUserIn, user: dict = Depends(require_roles("admin"))):
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(404, "Pengguna tidak ditemukan")
    
    # Self-lockout prevention
    if user["id"] == user_id:
        if body.is_active is False:
            raise HTTPException(400, "Anda tidak dapat menonaktifkan akun Anda sendiri demi keamanan sistem")
        if body.role and body.role != "admin":
            raise HTTPException(400, "Anda tidak dapat mencabut hak Administrator dari akun Anda sendiri")
    
    updates = {}
    if body.name is not None and body.name.strip():
        updates["name"] = body.name.strip()
    if body.role is not None:
        valid_roles = ["admin", "business_unit", "legal_officer", "management"]
        if body.role not in valid_roles:
            raise HTTPException(400, f"Role tidak valid. Pilihan: {valid_roles}")
        updates["role"] = body.role
        if body.role != "business_unit":
            updates["business_unit_id"] = None
    if body.business_unit_id is not None and (body.role == "business_unit" or existing.get("role") == "business_unit"):
        updates["business_unit_id"] = body.business_unit_id
    if body.is_active is not None:
        updates["is_active"] = body.is_active
    
    if updates:
        updates["updated_at"] = now_iso()
        await db.users.update_one({"id": user_id}, {"$set": updates})
        
        await db.system_audit.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "user_email": user["email"],
            "action": "USER_UPDATED",
            "detail": f"Memperbarui akun {existing['email']}: {list(updates.keys())}",
            "timestamp": now_iso()
        })
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return updated

@api.post("/users/{user_id}/reset-password")
async def reset_password(user_id: str, body: ResetPasswordIn, user: dict = Depends(require_roles("admin"))):
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(404, "Pengguna tidak ditemukan")
    
    if not body.new_password or len(body.new_password.strip()) < 6:
        raise HTTPException(400, "Password minimal 6 karakter")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password_hash": hash_password(body.new_password), "updated_at": now_iso()}}
    )
    
    await db.system_audit.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_email": user["email"],
        "action": "USER_PASSWORD_RESET",
        "detail": f"Reset password untuk pengguna {existing['email']}",
        "timestamp": now_iso()
    })
    return {"status": "ok", "message": f"Password untuk {existing['email']} berhasil diatur ulang"}

@api.delete("/users/{user_id}")
async def delete_or_deactivate_user(user_id: str, user: dict = Depends(require_roles("admin"))):
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(404, "Pengguna tidak ditemukan")
    if user["id"] == user_id:
        raise HTTPException(400, "Anda tidak dapat menghapus akun Anda sendiri")
    
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": False, "deleted_at": now_iso()}})
    
    await db.system_audit.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_email": user["email"],
        "action": "USER_DEACTIVATED",
        "detail": f"Menonaktifkan pengguna {existing['email']}",
        "timestamp": now_iso()
    })
    return {"status": "ok", "message": f"Pengguna {existing['email']} berhasil dinonaktifkan"}

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
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(413, f"Ukuran file ({len(data)/(1024*1024):.1f}MB) melebihi batas maksimum {MAX_FILE_SIZE // (1024*1024)}MB")
    return extract_docx_metadata(data)

@api.get("/files/{file_id}/text")
async def file_text(file_id: str, user: dict = Depends(get_current_user)):
    rec = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "Tidak ditemukan")
    if user.get("role") == "business_unit":
        contract = await db.contracts.find_one({"id": rec.get("contract_id")}, {"_id": 0, "owning_bu": 1})
        if contract and contract.get("owning_bu") != user.get("business_unit_id"):
            raise HTTPException(403, "Akses ditolak: Kontrak bukan milik unit kerja Anda")
    data, _ = get_object(rec["storage_path"])
    if rec["original_filename"].lower().endswith(".docx"):
        meta = extract_docx_metadata(data)
        return {"kind": "docx", "text": meta.get("raw_text", ""), "meta": meta, "filename": rec["original_filename"]}
    return {"kind": "binary", "filename": rec["original_filename"], "text": ""}

# ---------- Analytics ----------
@api.get("/dashboard/analytics")
async def analytics(user: dict = Depends(get_current_user)):
    query = {}
    if user.get("role") == "business_unit":
        query["owning_bu"] = user.get("business_unit_id")
    docs = await db.contracts.find(query, {"_id": 0}).to_list(1000)
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
    doc = await db.contracts.find_one({"id": cid}, {"_id": 1, "owning_bu": 1})
    if doc and user.get("role") == "business_unit" and doc.get("owning_bu") != user.get("business_unit_id"):
        raise HTTPException(403, "Akses ditolak: Kontrak bukan milik unit kerja Anda")
    return await db.comments.find({"contract_id": cid}, {"_id": 0}).sort("created_at", 1).to_list(500)

@api.post("/contracts/{cid}/comments")
async def add_comment(cid: str, body: CommentIn, user: dict = Depends(get_current_user)):
    contract = await db.contracts.find_one({"id": cid}, {"_id": 1, "owning_bu": 1})
    if contract and user.get("role") == "business_unit" and contract.get("owning_bu") != user.get("business_unit_id"):
        raise HTTPException(403, "Akses ditolak: Kontrak bukan milik unit kerja Anda")
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
async def resolve_comment(comment_id: str, user: dict = Depends(require_roles("legal_officer", "admin"))):
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
        body_text = f"{d['partner_name']} — {d['agreement_title'][:80]} berakhir pada {d['expiry_date']}"

        # Collect recipient IDs and emails
        recipients = set()
        recipient_emails: dict = {}
        if d.get("bu_pic_id"):
            recipients.add(d["bu_pic_id"])
            bu_user = await db.users.find_one({"id": d["bu_pic_id"]}, {"_id": 0, "email": 1})
            if bu_user:
                recipient_emails[d["bu_pic_id"]] = bu_user.get("email", "")
        for u in legal:
            recipients.add(u["id"])
            recipient_emails[u["id"]] = u.get("email", "")

        for uid in recipients:
            existing = await db.notifications.find_one({
                "user_id": uid, "contract_id": d["id"], "kind": f"expiry_h{bucket}"
            })
            if existing:
                continue
            await create_notification(uid, f"expiry_h{bucket}", title, body_text, contract_id=d["id"])
            # REQ-05: Also send email if SMTP is configured
            to_email = recipient_emails.get(uid, "")
            if to_email:
                html_body = f"""
                <html><body style='font-family:Arial,sans-serif;color:#1e293b'>
                <div style='background:#0F766E;padding:16px 24px;border-radius:8px 8px 0 0'>
                  <h2 style='color:#fff;margin:0'>⚠️ Peringatan Kedaluwarsa PKS</h2>
                </div>
                <div style='padding:20px 24px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px'>
                  <p><strong>{title}</strong></p>
                  <p>{body_text}</p>
                  <p style='color:#64748b;font-size:13px'>Segera ambil tindakan perpanjangan, adendum, atau PKS baru sebelum kontrak berakhir.</p>
                  <hr style='border-color:#e2e8f0'>
                  <small style='color:#94a3b8'>CRS BSI Maslahat — Automated Reminder H-{bucket} | Pesan ini dikirim otomatis, jangan dibalas.</small>
                </div>
                </body></html>
                """
                await asyncio.to_thread(send_reminder_email, to_email, f"[CRS] {title}", html_body)
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
    "submitted_for_review": "Submitted for Review",
    "under_legal_review": "Under Legal Review",
    "revision_required": "Revision Required",
    "ready_for_signature": "Ready for Signature",
    "pending_final_verification": "Pending Final Verification",
    "signed_active": "Signed & Active",
    "expiring_soon": "Expiring Soon",
    "expired": "Expired",
}

async def _build_report_query(institution_type: Optional[str], owning_bu: Optional[str], status: Optional[str], user: dict = None):
    q = {}
    if user and user.get("role") == "business_unit":
        q["owning_bu"] = user.get("business_unit_id")
    elif owning_bu and owning_bu != "all":
        q["owning_bu"] = owning_bu
    if institution_type and institution_type != "all":
        q["institution_type"] = institution_type
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
        payload = jwt.decode(raw, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(401, "User not found")
    except Exception:
        raise HTTPException(401, "Invalid token")

    q = await _build_report_query(institution_type, owning_bu, status, user)
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
        payload = jwt.decode(raw, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(401, "User not found")
    except Exception:
        raise HTTPException(401, "Invalid token")

    q = await _build_report_query(institution_type, owning_bu, status, user)
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

# ---------- Global Security Middleware ----------
# 1) Data-retention: block DELETE on contract resources (BRD rule 5)
# 2) Audit-Trail Logger (append-only) for POST/PUT/PATCH/DELETE + file downloads (BRD rule 4)
from starlette.responses import JSONResponse as _StarletteJSON

BLOCK_DELETE_PREFIXES = ("/api/contracts", "/api/files", "/api/comments", "/api/versions")

@app.middleware("http")
async def security_and_audit_middleware(request: Request, call_next):
    method = request.method
    path = request.url.path

    async def _write_audit(status_code: int):
        """Append-only audit entry. Best-effort, never raises."""
        user_id = role = email = business_unit_id = None
        auth_hdr = request.headers.get("authorization")
        raw = None
        if auth_hdr and auth_hdr.startswith("Bearer "):
            raw = auth_hdr[7:]
        elif request.query_params.get("token"):
            raw = request.query_params.get("token")
        if raw:
            try:
                p = jwt.decode(raw, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                user_id = p.get("sub"); role = p.get("role")
                email = p.get("email"); business_unit_id = p.get("businessUnitId")
            except Exception:
                pass
        xff = request.headers.get("x-forwarded-for")
        ip = (xff.split(",")[0].strip() if xff else (request.client.host if request.client else "unknown"))
        try:
            await db.system_audit.insert_one({
                "id": str(uuid.uuid4()),
                "timestamp": now_iso(),
                "user_id": user_id, "user_email": email, "role": role,
                "business_unit_id": business_unit_id,
                "method": method, "path": path,
                "query": str(request.url.query)[:400] if request.url.query else "",
                "status_code": status_code,
                "ip": ip,
                "user_agent": request.headers.get("user-agent", "")[:200],
            })
        except Exception as e:
            logger.warning(f"audit log failed: {e}")

    # (5) NO-DELETE policy — block AND log the attempt
    if method == "DELETE" and any(path.startswith(p) for p in BLOCK_DELETE_PREFIXES):
        await _write_audit(405)
        return _StarletteJSON(
            status_code=405,
            content={"detail": "Data Retention Policy: contract resources cannot be deleted", "path": path},
        )

    response = await call_next(request)

    # Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    if method == "OPTIONS" or not path.startswith("/api/"):
        return response

    is_mutating = method in ("POST", "PUT", "PATCH", "DELETE")
    is_file_download = method == "GET" and path.startswith("/api/files/")
    if is_mutating or is_file_download:
        await _write_audit(response.status_code)
    return response

# ---------- Admin Audit Log API ----------
@app.get("/api/admin/audit-log", tags=["Admin"])
async def admin_audit_log(
    limit: int = Query(200, ge=1, le=1000),
    method: Optional[str] = None,
    role_filter: Optional[str] = None,
    user: dict = Depends(require_roles("admin")),
):
    q = {}
    if method:
        q["method"] = method.upper()
    if role_filter:
        q["role"] = role_filter
    items = await db.system_audit.find(q, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    total = await db.system_audit.count_documents({})
    return {"items": items, "total": total, "returned": len(items)}

@app.get("/api/admin/security-policy", tags=["Admin"])
async def get_security_policy(user: dict = Depends(get_current_user)):
    """Returns the active RBAC + state-lock matrix for the frontend to consume."""
    return {
        "session_minutes": SESSION_INACTIVITY_MINUTES,
        "locked_statuses": sorted(LOCKED_STATUSES),
        "locked_fields": sorted(LOCKED_FIELDS),
        "bu_editable_states": sorted(BU_EDITABLE_STATES),
        "bu_editable_fields": sorted(BU_EDITABLE_FIELDS),
        "legal_editable_fields": sorted(LEGAL_EDITABLE_FIELDS),
        "allowed_transitions": {r: sorted([f"{a}→{b}" for a, b in t]) for r, t in ALLOWED_TRANSITIONS.items()},
        "no_delete_prefixes": list(BLOCK_DELETE_PREFIXES),
    }

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-New-Token"],
)

@app.on_event("shutdown")
async def shutdown():
    client.close()
