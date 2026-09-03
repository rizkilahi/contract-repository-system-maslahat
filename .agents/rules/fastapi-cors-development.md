---
description: Panduan mengatur CORS dan .env di FastAPI untuk menghindari masalah preflight options dan hot-reload
---

# FastAPI CORS & Dotenv Best Practices

1. **Konfigurasi CORS dengan Kredensial**:
   - JANGAN PERNAH menggunakan `allow_origins=["*"]` apabila menggunakan `allow_credentials=True`. 
   - Selalu ambil daftar origin dari file konfigurasi (`.env`), misalnya `CORS_ORIGINS`, dan masukkan IP/domain secara eksplisit (contoh: `http://localhost:3000,http://172.17.x.x:3000`).
   - Pastikan `CORSMiddleware` hanya ditambahkan (di-*add*) **satu kali** ke dalam instance aplikasi FastAPI agar tidak terjadi konflik filter pada saat request `OPTIONS`.

2. **Memuat Ulang (Reloading) File .env**:
   - Jika aplikasi dijalankan menggunakan `uvicorn --reload` untuk tahap *development*, pastikan selalu menambahkan parameter `override=True` pada `load_dotenv()` (contoh: `load_dotenv(override=True)`).
   - Hal ini bertujuan agar variabel pada `os.environ` benar-benar tertimpa oleh nilai terbaru di `.env` setiap kali *worker process* melakukan *restart*, sehingga pengguna tidak perlu mematikan dan menyalakan ulang uvicorn secara manual ketika merubah file `.env`.
