# Nusantara Portal — Company Portal

![Dashboard Nusantara Portal](docs/dashboard.png)

**Nusantara Portal** adalah aplikasi **portal perusahaan internal** yang dibangun dengan **React + Vite + TypeScript** dan antarmuka **AdminLTE 4** (Bootstrap 5.3). Semua data bersifat demo dan disimpan di `localStorage` browser, sehingga setiap perubahan bertahan antar sesi **tanpa backend**.

> Cocok sebagai starter/template portal HR/IT internal: dashboard, pengumuman, direktori, dokumen, cuti & absensi, helpdesk, dan manajemen karyawan.

---

## Daftar isi

1. [Fitur](#fitur)
2. [Teknologi](#teknologi)
3. [Prasyarat](#prasyarat)
4. [Instalasi & menjalankan](#instalasi--menjalankan)
5. [Akun demo](#akun-demo)
6. [Struktur proyek](#struktur-proyek)
7. [Halaman & modul](#halaman--modul)
8. [Peran & hak akses](#peran--hak-akses)
9. [Penyimpanan data (localStorage)](#penyimpanan-data-localstorage)
10. [Tema & responsif](#tema--responsif)
11. [Build & deploy](#build--deploy)
12. [Skrip npm](#skrip-npm)
13. [Troubleshooting](#troubleshooting)
14. [Kustomisasi cepat](#kustomisasi-cepat)

---

## Fitur

### Umum
- 🔐 **Login** dengan peran Administrator dan Karyawan.
- 🌗 **Tema gelap/terang** yang tersimpan di browser.
- 🔍 **Pencarian global** (karyawan, dokumen, pengumuman) dengan dropdown hasil.
- 🔔 **Notifikasi** (pengumuman belum dibaca, cuti menunggu, tiket aktif).
- ⚡ **Aksi cepat** (ajukan cuti, buat tiket, buat pengumuman, tambah karyawan).
- 📱 **Responsif** dengan drawer sidebar di mobile.

### Dashboard
- KPI: karyawan aktif, hadir hari ini, cuti menunggu, tiket IT aktif.
- Grafik **kehadiran 7 hari kerja** (persentase per hari + rata-rata).
- Pengumuman penting, antrian persetujuan cuti, dan tiket terbaru.
- Widget jam real-time dan sapaan pengguna.

### Pengumuman
- Daftar dengan pin, kategori, pencarian, dan filter.
- CRUD pengumuman (admin) + tandai sudah dibaca.

### Direktori Karyawan
- Pencarian nama/jabatan/departemen, filter departemen.
- Profil detail karyawan (kontak, jabatan, lokasi, tanggal bergabung).

### Dokumen
- Kategori, pencarian, ukuran file, pengunggah.
- **Unduh simulasi** (counter unduhan bertambah + toast).
- Manajemen dokumen (admin): tambah & hapus.

### Cuti & Absensi
- **Pengajuan cuti** dengan validasi tanggal (mulai ≤ selesai) dan alasan wajib.
- **Persetujuan/penolakan** oleh admin (catatan wajib saat menolak).
- **Clock in / clock out** dengan mode kerja (WFO/WFH/Dinas).
- Riwayat cuti & absensi per karyawan, sisa kuota cuti.

### Tiket IT (Helpdesk)
- Buat tiket dengan kategori, prioritas, deskripsi.
- Status (terbuka → diproses → selesai), penugasan (admin), komentar.
- Filter dan pencarian.

### Manajemen Karyawan (Admin)
- Tambah, edit, aktif/nonaktifkan akun.
- Statistik karyawan (aktif, baru bulan ini, administrator).

### Profil Saya
- Ubah data diri & kata sandi.
- **Reset data demo** (kembali ke data awal).

---

## Teknologi

| Kebutuhan | Paket |
| --- | --- |
| Framework UI | React 18 |
| Build tool | Vite 6 |
| Bahasa | TypeScript 5 |
| Styling | AdminLTE 4.0 + Bootstrap 5.3.3 |
| Ikon | Bootstrap Icons 1.11 |
| Routing | react-router-dom 6 |
| Tooltip/posisi | @popperjs/core |

> Tailwind **tidak** digunakan; seluruh styling memakai AdminLTE/Bootstrap + `src/index.css`.

---

## Prasyarat

- **Node.js** ≥ 18 (disarankan 20 LTS)
- **npm** ≥ 9
- Browser modern (Chrome/Edge/Firefox/Safari)

Cek versi:

```bash
node -v
npm -v
```

---

## Instalasi & menjalankan

```bash
# 1. Masuk ke folder proyek
cd companyportal

# 2. Install dependensi
npm install

# 3. Jalankan dev server
npm run dev
```

Aplikasi berjalan di **http://localhost:5173/**.

### Build produksi

```bash
npm run build      # typecheck + build
npm run preview    # preview build di http://localhost:4173
```

---

## Akun demo

Tersedia di `README` (tidak ditampilkan di layar login). Masukkan manual di form login.

| Peran | Email | Kata sandi | Akses |
| --- | --- | --- | --- |
| Administrator | `admin@nusantara.co.id` | `admin123` | Penuh: kelola karyawan, pengumuman, dokumen, cuti, tiket |
| Karyawan | `budi@nusantara.co.id` | `karyawan123` | Absensi, cuti, tiket, direktori, dokumen |

> Kuota cuti default karyawan: **12 hari/tahun** (kecuali cuti melahirkan).

---

## Struktur proyek

```
companyportal/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
├── docs/
│   └── dashboard.png          # screenshot untuk README
├── public/                    # aset statis
└── src/
    ├── main.tsx               # entry + urutan import CSS AdminLTE
    ├── App.tsx                # routing & guard peran
    ├── index.css              # kustomisasi AdminLTE (dark mode, tabel, kartu, dll)
    ├── types.ts               # tipe data
    ├── data/
    │   └── seed.ts            # data awal PT Nusantara Digital
    ├── lib/
    │   ├── labels.ts          # label & tone badge
    │   └── utils.ts           # utilitas (tanggal, format, dll)
    ├── store/
    │   └── AppStore.tsx       # state global + aksi CRUD (Context)
    ├── components/
    │   ├── Layout.tsx         # shell: header, sidebar, search, notifikasi, footer
    │   └── ui.tsx             # komponen bersama (Avatar, Badge, Modal, dll)
    └── pages/
        ├── Login.tsx
        ├── Dashboard.tsx
        ├── Announcements.tsx
        ├── Directory.tsx
        ├── Documents.tsx
        ├── Leave.tsx
        ├── Tickets.tsx
        ├── Admin.tsx
        └── Profile.tsx
```

---

## Halaman & modul

| Route | Halaman | Akses |
| --- | --- | --- |
| `/login` | Login | Publik |
| `/` | Dashboard | Semua |
| `/pengumuman` | Pengumuman | Semua |
| `/direktori` | Direktori Karyawan | Semua |
| `/dokumen` | Dokumen | Semua |
| `/cuti` | Cuti & Absensi | Semua |
| `/tiket` | Tiket IT | Semua |
| `/admin` | Manajemen Karyawan | **Admin** |
| `/profil` | Profil Saya | Semua |

### Query string yang didukung
- `/cuti?baru=1` → buka modal pengajuan cuti.
- `/tiket?baru=1` → buka modal buat tiket.
- `/pengumuman?baru=1` → buka modal buat pengumuman (admin).
- `/admin?baru=1` → buka modal tambah karyawan (admin).
- `/cuti?tab=persetujuan` → tab persetujuan (admin).
- `?q=...` → filter pencarian di halaman terkait.

---

## Peran & hak akses

- **Administrator** (`role: 'admin'`):
  - Akses `/admin` (manajemen karyawan).
  - CRUD pengumuman & dokumen.
  - Persetujuan/penolakan cuti, penugasan tiket, ubah status tiket.
- **Karyawan** (`role: 'karyawan'`):
  - Hanya melihat data milik sendiri untuk cuti & tiket.
  - Tidak bisa mengakses `/admin` (redirect ke Dashboard).

Guard peran diterapkan di `App.tsx` dan di komponen halaman.

---

## Penyimpanan data (localStorage)

State disimpan di browser dengan kunci berikut:

| Kunci | Isi |
| --- | --- |
| `nusantara-portal-db-v1` | Basis data demo (users, announcements, documents, leaves, attendance, tickets) |
| `nusantara-portal-session-v1` | ID pengguna yang sedang login |
| `nusantara-theme` | `light` / `dark` |
| `nusantara-remember-email` | Email yang diingat di form login |

### Perilaku
- Data seed memakai **tanggal relatif** (`dateISO`, `hoursAgo`) agar selalu relevan.
- Setiap mutasi (tambah/edit/hapus) langsung tersimpan.
- **Reset data demo** (Profil Saya) mengembalikan data awal **tanpa** menghapus sesi login.
- Menghapus manual: buka DevTools → Application → Local Storage → hapus kunci di atas, lalu refresh.

---

## Tema & responsif

- Tema diatur via atribut `data-bs-theme` pada `<html>` dan kelas `.sidebar-expand-lg`.
- Sidebar selalu gelap (AdminLTE style) dengan `data-bs-theme="dark"` pada `<aside>`.
- Mobile (< 992px): sidebar menjadi drawer yang dibuka lewat tombol hamburger; overlay menutup saat diklik.
- Tabel lebar menggunakan `.table-responsive` + `min-width` agar scroll horizontal, tidak merusak layout.

---

## Build & deploy

```bash
npm run build
```

Output ada di folder `dist/`. Untuk hosting statis (Netlify, Vercel, GitHub Pages), aktifkan **SPA fallback** ke `index.html` agar routing BrowserRouter berfungsi.

Contoh `_redirects` (Netlify):
```
/*    /index.html   200
```

---

## Skrip npm

| Skrip | Fungsi |
| --- | --- |
| `npm run dev` | Jalankan dev server (Vite) |
| `npm run build` | Typecheck + build produksi |
| `npm run typecheck` | Cek tipe TypeScript saja |
| `npm run preview` | Preview build produksi |

---

## Troubleshooting

| Masalah | Solusi |
| --- | --- |
| Halaman blank setelah deploy | Pastikan SPA fallback ke `index.html` aktif. |
| Data tidak tersimpan | Cek `localStorage` tidak diblokir (mode privat/incognito). |
| Sidebar mobile tidak terbuka | Pastikan viewport < 992px; klik hamburger. |
| Tema tidak berubah | Hapus `nusantara-theme` di localStorage lalu refresh. |
| Error tipe TypeScript | Jalankan `npm run typecheck` untuk detail. |
| Port 5173 terpakai | `npm run dev -- --port 5174` |

---

## Kustomisasi cepat

- **Branding**: ubah nama "Nusantara" di `src/components/Layout.tsx` dan `src/pages/Login.tsx`.
- **Data seed**: edit `src/data/seed.ts` (karyawan, pengumuman, dokumen, tiket).
- **Warna tema**: sesuaikan variabel di `src/index.css`.
- **Kuota cuti**: ubah `leaveQuota` di seed atau di form tambah karyawan.
- **Ikon**: pakai Bootstrap Icons (`bi-*`).

---

## Lisensi

Proyek internal/demo. Silakan gunakan dan modifikasi sesuai kebutuhan organisasi Anda.