<div align="center">

<br/>

```
███████╗██╗      █████╗ ██╗    ██╗ ██████╗███████╗
██╔════╝██║     ██╔══██╗██║    ██║██╔════╝██╔════╝
█████╗  ██║     ███████║██║ █╗ ██║██║     █████╗  
██╔══╝  ██║     ██╔══██║██║███╗██║██║     ██╔══╝  
██║     ███████╗██║  ██║╚███╔███╔╝╚██████╗███████╗
╚═╝     ╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝  ╚═════╝╚══════╝
```

### **Track less. Flow more.**

*Smart personal finance tracker powered by AI — built for Indonesians.*

<br/>

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-Apache_2.0-green?style=for-the-badge)](./LICENSE)

<br/>

</div>

---

## ✨ Tentang Flawce

**Flawce** adalah aplikasi keuangan pribadi yang mengubah cara kamu mencatat pengeluaran. Lupakan form yang membosankan — cukup ketik atau ucapkan *"habis makan siang 35rb"* dan AI akan mencatat semuanya secara otomatis.

Dirancang khusus untuk pengguna Indonesia, Flawce memahami nama bank lokal, bahasa sehari-hari, dan kebiasaan keuangan kamu.

---

## 🚀 Fitur Unggulan

### 🤖 AI Financial Assistant
Chat dengan asisten AI dalam Bahasa Indonesia. Cukup ceritakan transaksimu secara natural — AI akan memahami, mengkategorikan, dan mencatatnya seketika.

```
"Habis jajan warteg 15rb dari gopay"         → Tercatat ✓
"Target beli laptop 8jt sampai bulan depan"  → Goal dibuat ✓
"Anggaran makan bulan ini maksimal 1.5jt"    → Budget aktif ✓
"Tambah akun SeaBank saldo 230rb"            → Akun baru ✓
```

### 📊 Dashboard Interaktif
- Ringkasan saldo real-time dari semua akun
- Grafik pengeluaran harian/mingguan/bulanan/tahunan
- Progress target tabungan
- Status anggaran per kategori
- Widget yang bisa dikustomisasi sesuai preferensi

### 🔔 Smart Alerts
Notifikasi cerdas yang memantau keuanganmu secara otomatis:

| Level | Kondisi |
|-------|---------|
| 🔴 **Kritis** | Budget hampir habis (< 20%) atau sudah terlampaui |
| 🟡 **Peringatan** | Pengeluaran minggu ini melonjak > 30%, atau belum ada pemasukan |
| 🔵 **Informasi** | Deadline goal sudah dekat tapi progres < 50% |

### 📱 Voice Input Pintar
Input transaksi dengan suara — dilengkapi kamus koreksi fonetik khusus nama bank Indonesia:

> *"si beng"* → **SeaBank** &nbsp;|&nbsp; *"be ce a"* → **BCA** &nbsp;|&nbsp; *"be er i"* → **BRI**

### 📸 Scan Struk Otomatis
Foto struk belanjaan kamu, dan AI akan langsung mengekstrak jumlah, nama toko, kategori, dan tanggal — tanpa ketik manual.

### 📈 Monthly Review AI
Setiap akhir bulan, dapatkan analisis keuangan personal:
- ⭐ Rating pengelolaan keuangan (1–10)
- 🎉 Apresiasi atas kebiasaan baik
- ⚠️ Peringatan pengeluaran berlebih
- 💡 Satu tips actionable untuk bulan depan

### 📤 Export Laporan
Unduh laporan keuangan dalam berbagai format:

| Format | Keterangan |
|--------|------------|
| 📄 **CSV** | Ringan, cocok untuk analisis manual |
| 📊 **Excel (XLSX)** | Lengkap dengan ringkasan dan detail |
| 📑 **PDF** | Rapi dengan tabel otomatis |
| 📝 **Word (DOCX)** | Siap untuk keperluan formal |

### 🔒 Keamanan
- **PIN Lock** dengan hash aman di localStorage
- **Auto-lock** otomatis setelah 5 menit tidak aktif
- **Firestore Security Rules** ketat — data user terisolasi penuh
- **Offline Support** via IndexedDB persistence

---

## 🛠️ Tech Stack

```
Frontend          Backend           AI & Tools
─────────────     ───────────────   ──────────────────
React 19          Firebase Auth     Gemini AI API
TypeScript 5.8    Cloud Firestore   @google/genai
Vite 6            IndexedDB         
Tailwind CSS v4   (offline cache)   Libraries
Framer Motion                       Recharts (grafik)
Lucide React      Deploy            jsPDF + autotable
date-fns          Vercel            SheetJS (xlsx)
Recharts                            docx
```

---

## ⚡ Mulai Cepat

### Prasyarat
- **Node.js** v18+
- **Firebase project** (Firestore + Authentication)
- **Gemini API Key**

### Instalasi

```bash
# 1. Clone repo
git clone https://github.com/username/flawce-ai.git
cd flawce-ai

# 2. Install dependencies
npm install

# 3. Salin file environment
cp .env.example .env.local
```

### Konfigurasi

Edit `.env.local`:
```env
VITE_GEMINI_API_KEY="your_gemini_api_key_here"
APP_URL="http://localhost:5173"
```

Isi `firebase-applet-config.json` dengan konfigurasi Firebase project kamu:
```json
{
  "apiKey": "...",
  "authDomain": "...",
  "projectId": "...",
  "storageBucket": "...",
  "messagingSenderId": "...",
  "appId": "..."
}
```

### Jalankan

```bash
npm run dev
```

Buka [http://localhost:5173](http://localhost:5173) di browser kamu. 🎉

---

## 📂 Struktur Project

```
flawce-ai/
├── src/
│   ├── components/           # Komponen UI utama
│   │   ├── Dashboard.tsx     # Halaman utama + widget
│   │   ├── ChatBot.tsx       # AI assistant interface
│   │   ├── Transactions.tsx  # Riwayat & manajemen transaksi
│   │   ├── Reports.tsx       # Grafik & analisis keuangan
│   │   ├── Budgets.tsx       # Manajemen anggaran
│   │   ├── Goals.tsx         # Target tabungan
│   │   ├── Accounts.tsx      # Manajemen akun/dompet
│   │   ├── Settings.tsx      # Pengaturan aplikasi
│   │   ├── AuthScreen.tsx    # Login & registrasi
│   │   ├── PinLock.tsx       # Keamanan PIN
│   │   └── settings/         # Sub-komponen settings
│   │
│   ├── services/             # Layer bisnis & API
│   │   ├── geminiService.ts  # Integrasi Gemini AI
│   │   ├── exportService.ts  # Export CSV/Excel/PDF/DOCX
│   │   └── transactionService.ts
│   │
│   ├── lib/                  # Utilities & hooks
│   │   ├── AuthContext.tsx   # Global auth state
│   │   ├── ThemeContext.tsx  # Dark/light mode
│   │   ├── useSmartAlerts.ts # Smart notification engine
│   │   ├── useAccounts.ts    # Hook manajemen akun
│   │   ├── useCategories.ts  # Hook kategori
│   │   ├── useCategoryRules.ts # Auto-kategori
│   │   ├── speechCorrections.ts # Koreksi fonetik bank
│   │   ├── firebase.ts       # Konfigurasi Firebase
│   │   └── types.ts          # TypeScript interfaces
│   │
│   └── App.tsx               # Root component & routing
│
├── firestore.rules           # Security rules Firestore
├── firebase-blueprint.json   # Blueprint struktur data
└── vite.config.ts
```

---

## 🗃️ Model Data

<details>
<summary><b>Transaction</b></summary>

```typescript
interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: string;         // ISO date string
  accountId: string;
  createdAt?: Timestamp;
}
```
</details>

<details>
<summary><b>Account</b></summary>

```typescript
interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'cash' | 'bank' | 'ewallet' | 'credit';
  balance: number;
  icon?: string;
  isDefault?: boolean;
}
```
</details>

<details>
<summary><b>Budget</b></summary>

```typescript
interface Budget {
  id: string;
  userId: string;
  category: string;
  limit: number;
  spent: number;
  month: string;        // Format: YYYY-MM
  period?: 'daily' | 'weekly' | 'monthly';
}
```
</details>

<details>
<summary><b>Goal</b></summary>

```typescript
interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;     // ISO date string
  isCompleted: boolean;
}
```
</details>

---

## 🔐 Firebase Setup

### Authentication
Aktifkan provider berikut di Firebase Console:
- ✅ Google
- ✅ Email/Password
- ✅ Phone

### Firestore Security Rules
Deploy rules yang sudah tersedia:
```bash
firebase deploy --only firestore:rules
```

Rules dirancang dengan prinsip **least privilege** — setiap user hanya dapat mengakses dokumen miliknya sendiri, dengan validasi field yang ketat di setiap koleksi.

---

## 🎨 Kustomisasi

### Tema & Warna Aksen
Tersedia di **Settings → Appearance**. Pengguna bisa memilih warna aksen utama yang akan diterapkan ke seluruh UI.

### Dashboard Widgets
Widgets bisa ditampilkan/disembunyikan dan diurutkan ulang sesuai preferensi. Konfigurasi disimpan per-user di Firestore.

### Kategori Kustom
Tambah kategori pengeluaran/pemasukan sendiri beserta icon emoji.

### Auto-Category Rules
Buat aturan keyword untuk kategorisasi otomatis — misalnya semua transaksi dengan kata "gojek" otomatis masuk kategori *Transport*.

---

## 📜 Scripts

```bash
npm run dev       # Development server
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # TypeScript type check
npm run clean     # Hapus folder dist
```

---

## 🤝 Kontribusi

Kontribusi sangat disambut! Silakan:

1. Fork repository ini
2. Buat branch fitur: `git checkout -b feat/nama-fitur`
3. Commit perubahan: `git commit -m 'feat: tambah fitur X'`
4. Push ke branch: `git push origin feat/nama-fitur`
5. Buka Pull Request

### Konvensi Commit
```
feat:     Fitur baru
fix:      Bug fix
docs:     Perubahan dokumentasi
style:    Formatting, tidak ada perubahan logika
refactor: Refactoring kode
perf:     Peningkatan performa
test:     Menambah atau memperbaiki test
```

---

## 📄 Lisensi

Didistribusikan di bawah lisensi **Apache 2.0**. Lihat [`LICENSE`](./LICENSE) untuk detail lebih lanjut.

---

<div align="center">

<br/>

**Dibuat dengan ❤️ untuk membantu kamu lebih bijak mengelola keuangan**

*Flawce — Track less. Flow more.*

<br/>

</div>
