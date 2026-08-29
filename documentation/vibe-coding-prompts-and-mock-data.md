# VIBE CODING REFERENCE: MOCK DATA & PROMPTS
## Project Name: Contract Repository System (CRS) - Phase 1 MVP
**Document Version:** 5.0  
**Author:** Senior IT System Strategy Consultant  
**Date:** 2026-08-26  

---

## 1. SQL Seed Data (Data Tiruan untuk Basis Data)
*Gunakan skrip SQL ini untuk melakukan seeding database lokal Anda agar saat pengujian pertama aplikasi tidak kosong.*

```sql
-- Seed Users (BSI Maslahat SSO Mock Accounts)
INSERT INTO users (username, email, password_hash, role, business_unit_id) VALUES
('budi_pic', 'budi.santoso@bsimaslahat.org', '$2b$10$xyz...', 'BUSINESS_UNIT', 'RNG'),
('ahmad_legal', 'ahmad.syafiq@bsimaslahat.org', '$2b$10$xyz...', 'LEGAL_OFFICER', 'LCG'),
('bambang_dir', 'bambang.sutrisno@bsimaslahat.org', '$2b$10$xyz...', 'MANAGEMENT', 'EXEC'),
('admin_it', 'it.admin@bsimaslahat.org', '$2b$10$xyz...', 'IT_ADMIN', 'ITD');

-- Seed Contracts (Sample PKS Data Grid)
INSERT INTO contracts (
    contract_no, partner_name, institution_type, agreement_title, contract_value, 
    owning_business_unit, business_unit_pic, partner_pic_name, partner_pic_contact, 
    effective_date, expiry_date, current_status
) VALUES
('03/001/PKS/BSI/2026', 'Yayasan Pendidikan Umat', 'Yayasan', 'Penyaluran Dana Beasiswa 2026', 500000000.00, 'RNG', 'Budi Santoso', 'Bapak Herman', '0812-3456-7890 / herman@yayasannya.org', '2026-08-03', '2027-08-03', 'Signed & Active'),
('03/045/PKS/BSI/2025', 'Koperasi Syariah Sejahtera', 'Koperasi', 'Penghimpunan Zakat Karyawan', 120000000.00, 'CAG', 'Siti Rahma', 'Ibu Diana', '0811-9988-7766 / diana@kopsyariah.co.id', '2024-08-15', '2026-08-15', 'Signed & Active'), -- Expired soon scenario
('03/092/PKS/BSI/2023', 'DKM Masjid Al-Ikhlas', 'DKM', 'Pengelolaan Wakaf Produktif', 75000000.00, 'PGG', 'Ahmad Fauzi', 'Ustadz Mansur', '0857-1122-3344 / mansur@masjid-alikhlas.or.id', '2023-02-10', '2026-02-10', 'Expired'),
(NULL, 'PT Teknologi Ziswaf', 'PT', 'Draf PKS Sistem Pembayaran', 0.00, 'RNG', 'Budi Santoso', 'Andi Pratama', '0821-4455-6677 / andi@techziswaf.com', NULL, NULL, 'Drafting');

-- Seed Contract Versions (Version History Trail)
INSERT INTO contract_versions (contract_id, version_no, file_name, file_path, file_type, uploaded_by, remarks) VALUES
(1, 'v1.0', 'Draf_Beasiswa_v1.0.docx', '/storage/contracts/1/Draf_Beasiswa_v1.0.docx', 'docx', 'Budi Santoso', 'Draf inisiasi awal'),
(1, 'v1.1', 'Draf_Beasiswa_v1.1.docx', '/storage/contracts/1/Draf_Beasiswa_v1.1.docx', 'docx', 'Ahmad Syafiq', 'Perbaikan domisili hukum'),
(1, 'Revisi Manual', 'Hasil_Scan_Coretan.pdf', '/storage/contracts/1/Hasil_Scan_Coretan.pdf', 'pdf', 'Ahmad Syafiq', 'Watermark: DRAFT REVIU - Hasil coretan fisik manual legal'),
(1, 'Final', '001_PKS_Signed.pdf', '/storage/contracts/1/001_PKS_Signed.pdf', 'pdf', 'Budi Santoso', 'Dokumen sah bertanda tangan fisik (Offline Signing)');

-- Seed Audit Trail Log Entries
INSERT INTO audit_logs (actor_id, actor_name, role, action_event, ip_address, contract_id, details) VALUES
(1, 'Budi Santoso', 'BUSINESS_UNIT', 'SUBMIT_DRAFT', '192.168.1.10', 1, 'Inisiasi draf PKS awal v1.0 diunggah dengan auto-fill metadata'),
(2, 'Ahmad Syafiq', 'LEGAL_OFFICER', 'LEGAL_REVISE', '192.168.1.25', 1, 'Mengajukan revisi dan mengunggah coretan manual (PDF) versi v1.1'),
(1, 'Budi Santoso', 'BUSINESS_UNIT', 'SUBMIT_REVISION', '192.168.1.10', 1, 'Mengunggah draf perbaikan v1.1.docx berdasarkan catatan legal'),
(2, 'Ahmad Syafiq', 'LEGAL_OFFICER', 'LEGAL_APPROVE', '192.168.1.25', 1, 'Menyetujui klausul draf final (Status berubah menjadi Ready for Signature)'),
(1, 'Budi Santoso', 'BUSINESS_UNIT', 'UPLOAD_FINAL_SCAN', '192.168.1.10', 1, 'Mengunggah berkas PDF PKS final hasil tanda tangan basah (Offline Signing)'),
(2, 'Ahmad Syafiq', 'LEGAL_OFFICER', 'CONTRACT_ACTIVATE', '192.168.1.25', 1, 'Verifikasi tanda tangan fisik sukses. Kontrak dikunci dan status diaktifkan (Signed & Active)');
```

---

## 2. Text Parsing Regex Logic for Auto-Fill (Logika Ekstraksi Dokumen)
*Logika pencarian regex berbasis JavaScript untuk melakukan parsing dokumen `.docx` (setelah dikonversi menjadi raw text menggunakan parser seperti `mammoth.js` di frontend browser).*

```javascript
// Target Data: 03/001/PKS/BSI MASLAHAT/2026
const extractContractNo = (rawText) => {
  const match = rawText.match(/(?:BSI\s+Maslahat:\s+No\.|No\.)\s*([0-9]+\/[0-9]+\/PKS\/[A-Z\s]+\/[0-9]+)/i);
  return match ? match[1].trim() : "";
};

// Target Data: PENYALURAN DANA BEASISWA 2026
const extractAgreementTitle = (rawText) => {
  const match = rawText.match(/Tentang\s*\r?\n\s*([A-Z0-9\s]+?)\r?\n(?:No\.|BSI)/i);
  return match ? match[1].trim() : "";
};

// Target Data: YAYASAN PENDIDIKAN UMAT
const extractPartnerName = (rawText) => {
  // Mencari nama setelah angka "2." di bagian awal pendefinisian Pihak Kedua
  const match = rawText.match(/2\.\s+([A-Z\s]+),\s+berkedudukan|beralamat/i);
  return match ? match[1].trim() : "";
};

// Target Data: Rp 500.000.000,-
const extractContractValue = (rawText) => {
  const match = rawText.match(/memiliki\s+nilai\s+kerja\s+sama\s+sebesar\s+([Rp\d\s\.,\-]+)/i);
  if (match) {
    // Bersihkan format string mata uang menjadi numerik murni
    const cleaned = match[1].replace(/[^\d]/g, '');
    return parseFloat(cleaned);
  }
  return 0.00;
};

// Target Data: 03 Agustus 2026
const extractEffectiveDate = (rawText) => {
  const match = rawText.match(/dimulai\s+efektif\s+sejak\s+tanggal\s+([\w\s]+?)\s+hingga/i);
  return match ? match[1].trim() : "";
};

// Target Data: Bapak Herman
const extractPartnerPicName = (rawText) => {
  const match = rawText.match(/Mitra\/Pihak\s+Eksternal[\s\S]+?PIC\s*:\s*([\w\s\.]+)/i);
  return match ? match[1].trim() : "";
};
```

---

## 3. High-Fidelity UI Code: CRS Front Dashboard (Next.js & Tailwind CSS)
*Salin kode komponen React & Tailwind CSS berikut dan berikan ke AI Coding Agent Anda (seperti Cursor, Windsurf, atau emergent.sh) untuk menghasilkan antarmuka visual utama dasbor PKS dengan style BSI Maslahat.*

```jsx
import React, { useState } from 'react';

// Mock Data matching SQL seeds
const initialContracts = [
  { id: 1, no: '03/001/PKS/BSI/2026', partner: 'Yayasan Pendidikan Umat', title: 'Penyaluran Dana Beasiswa 2026', start: '2026-08-03', end: '2027-08-03', status: 'Active', value: 500000000 },
  { id: 2, no: '03/045/PKS/BSI/2025', partner: 'Koperasi Syariah Sejahtera', title: 'Penghimpunan Zakat Karyawan', start: '2024-08-15', end: '2026-08-15', status: 'Expiring Soon', value: 120000000 },
  { id: 3, no: '03/092/PKS/BSI/2023', partner: 'DKM Masjid Al-Ikhlas', title: 'Pengelolaan Wakaf Produktif', start: '2023-02-10', end: '2026-02-10', status: 'Expired', value: 75000000 },
  { id: 4, no: '-', partner: 'PT Teknologi Ziswaf', title: 'Draf PKS Sistem Pembayaran', start: '-', end: '-', status: 'Drafting', value: 0 }
];

export default function CRSDashboard() {
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContract, setSelectedContract] = useState(null);

  // Filter & Search Logic
  const filteredContracts = initialContracts.filter(c => {
    const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
    const matchesSearch = c.partner.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.no.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Top Navbar Brand Style */}
      <nav className="bg-[#008A85] text-white px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center space-x-3">
          <div className="font-bold text-lg tracking-wider">BSI MASLAHAT | CRS</div>
        </div>
        <div className="flex items-center space-x-4 text-sm font-semibold">
          <span className="bg-emerald-800 px-3 py-1.5 rounded-md">RNG PIC: Budi Santoso</span>
          <button className="text-white hover:text-emerald-150">Logout</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Monitoring & Management PKS</h1>
          <p className="text-slate-500 text-sm mt-1">Sistem repositori kontrak tersentralisasi - Fase 1 MVP</p>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Total Active Contracts</span>
            <span className="text-3xl font-extrabold text-emerald-600 mt-2">124</span>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Expiring Soon (H-30)</span>
            <span className="text-3xl font-extrabold text-amber-500 mt-2">1</span>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Expired Contracts</span>
            <span className="text-3xl font-extrabold text-red-500 mt-2">2</span>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Under Legal Review</span>
            <span className="text-3xl font-extrabold text-[#008A85] mt-2">3</span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <div className="flex-1 max-w-md">
            <input 
              type="text" 
              placeholder="Cari Mitra, Judul Perjanjian, atau No. PKS..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#008A85]"
            />
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <span className="text-slate-500 font-semibold">Filter Status:</span>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#008A85]"
            >
              <option value="All">Semua Kontrak</option>
              <option value="Active">Aktif</option>
              <option value="Expiring Soon">Segera Berakhir</option>
              <option value="Expired">Kedaluwarsa</option>
              <option value="Drafting">Penyusunan</option>
            </select>
          </div>
        </div>

        {/* Data Grid Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#008A85]/5 text-[#008A85] font-semibold text-xs uppercase tracking-wider border-b border-slate-100">
                <th className="py-4 px-6">Contract ID / No. PKS</th>
                <th className="py-4 px-6">Nama Mitra</th>
                <th className="py-4 px-6">Judul Perjanjian</th>
                <th className="py-4 px-6">Masa Berlaku</th>
                <th className="py-4 px-6">Status Kontrak</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredContracts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-4 px-6 font-mono font-semibold text-xs text-slate-600">{c.no}</td>
                  <td className="py-4 px-6 font-semibold text-slate-900">{c.partner}</td>
                  <td className="py-4 px-6 text-slate-500">{c.title}</td>
                  <td className="py-4 px-6 text-slate-500 text-xs">
                    {c.start !== '-' ? `${c.start} s/d ${c.end}` : '-'}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-semibold
                      ${c.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : ''}
                      ${c.status === 'Expiring Soon' ? 'bg-amber-50 text-amber-700' : ''}
                      ${c.status === 'Expired' ? 'bg-red-50 text-red-700' : ''}
                      ${c.status === 'Drafting' ? 'bg-slate-100 text-slate-600' : ''}
                    `}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-2
                        ${c.status === 'Active' ? 'bg-emerald-500' : ''}
                        ${c.status === 'Expiring Soon' ? 'bg-amber-500' : ''}
                        ${c.status === 'Expired' ? 'bg-red-500' : ''}
                        ${c.status === 'Drafting' ? 'bg-slate-400' : ''}
                      `}></span>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => setSelectedContract(c)}
                      className="px-3 py-1.5 border border-[#F3A912] hover:bg-[#F3A912] text-[#F3A912] hover:text-white rounded-md text-xs font-semibold transition"
                    >
                      Lihat Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

---

## 4. Prompt for AI Web Builder / Vibe Coding Agent (Copy-Paste to emergent.sh / Cursor)
*Gunakan prompt instruksi bahasa Inggris tingkat tinggi ini agar asisten AI Anda mengerti skenario teknis, arsitektur keamanan, database schema, dan style panduan UI BSI Maslahat.*

```text
Build a responsive Contract Repository System (CRS) Phase 1 MVP web application for BSI Maslahat. The portal must follow the design styling of Maslahat Connect.

1. TECH STACK & DESIGN THEME:
- Next.js (App Router), React, Tailwind CSS.
- Color System: Primary color is Emerald Green/Deep Teal (#008A85), Accent color is Warm Amber/Gold (#F3A912) for active badges and primary buttons.
- Fully polished, beautiful enterprise layout with a top header and collapsible sidebar.

2. DATABASE SCHEMA (Postgres/SQLite):
Implement database tables for:
- Users (Roles: BUSINESS_UNIT, LEGAL_OFFICER, MANAGEMENT)
- Contracts (With columns for contract_no, partner_name, institution_type, agreement_title, contract_value, owning_business_unit, partner_pic_name, partner_pic_contact, effective_date, expiry_date, current_status)
- Contract Versions (tracks .docx and scanned .pdf files uploaded)
- Audit Logs (immutable append-only log capturing timestamp, actor, role, action, ip_address, contract_id).

3. CORE USER STORIES & FRONTEND VIEWS:
- Front Dashboard: Create 4 KPI summary cards (Total Active, Expiring soon H-30, Expired, Under Legal Review) and a robust data table grid with global search, sorting, and dropdown filtering by status.
- Add New Contract Form: Implement a Drag-and-Drop file uploader. When a standardized .docx PKS file is uploaded, use client-side text parsing (mocking regex parsing logic) to automatically fill in form inputs (Contract No, Partner Name, Agreement Title, Value, PIC, etc.) and keep fields editable.
- Smart Legal Guidelines Button: Add a "?" button next to the "Institution Type" dropdown. Clicking it opens a Read-Only modal displaying administrative prerequisites for that specific institution type (e.g., if "Yayasan" is selected, show: Akta Pendirian, SK Pengesahan Kemenkumham, AD/ART, SK Pengurus with associated legal risks and mitigations).
- Pop-Up Side Panel Detail View: When clicking "Lihat Detail" on the dashboard, slide a side-panel from the right containing 3 tabs:
  1) Contract Metadata (with newly added fields "Institution Type", "Owning Business Unit: RNG/CAG/PGG", and "Partner PIC contact").
  2) File Version History (list of uploaded files like v1.0, v1.1, manual scan pdf).
  3) Live Activity Audit Log (immutable timeline showing action, actor, timestamp, and IP).

4. SECURITY MIDDLEWARE:
- Implement mock JWT authentication and Role-Based Access Control (RBAC).
- Enforce strict State-Based Locking: If contract status is "Signed & Active" or "Expired", block any modification requests (HTTP 403) and lock metadata inputs.
- Only "LEGAL_OFFICER" role can click the final activation "Approve & Activate" button to trigger the final status update.
- Ensure that if the Legal Officer uploads a scanned manual review file (.pdf or .png) during rejection/revision request, the backend mock automatically applies a visual watermark text diagonal: "DRAFT - HASIL REVIU LEGAL" with 30% opacity across pages.

Pre-fill the views with high-quality mock seed data matching the "Yayasan Pendidikan Umat" scholarship penyaluran contract (BSI PKS: 03/001/PKS/BSI MASLAHAT/2026, value Rp 500.000.000, Business unit PIC Budi Santoso, Partner PIC Bapak Herman).
```

---
*Gunakan file referensi taktis ini sebagai umpan (feed) AI Vibe Coding Anda untuk mempercepat pengembangan purwarupa fungsional.*
