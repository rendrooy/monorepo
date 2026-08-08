# HomeHub

HomeHub adalah aplikasi operasional lingkungan perumahan untuk mengelola data warga, keuangan IPL, iklan UMKM, registrasi akun, notifikasi, dan keamanan kunjungan tamu. Akses fitur dikendalikan melalui Role-Based Access Control (RBAC).

## Fitur Utama

- **Dashboard keuangan**: ringkasan tagihan, pembayaran, pendapatan, dan tren pendapatan IPL serta iklan UMKM.
- **Master data**: keluarga, anggota keluarga, pengguna, role, menu, dan permission.
- **Registrasi warga**: warga mendaftar menggunakan NIK yang telah tercatat, kemudian pengurus menyetujui atau menolak akun.
- **IPL**: pembuatan batch tagihan, publikasi tagihan per keluarga, pembayaran parsial/lebih, saldo overpaid, unggah bukti, verifikasi, reversal, laporan, dan ledger kredit.
- **Iklan UMKM**: penyusunan konten, pemilihan paket, review konten, verifikasi pembayaran, perilisan mandiri oleh warga, dan carousel iklan aktif.
- **Keamanan tamu**: pelaporan tamu dan kendaraan oleh warga, check-in/check-out oleh petugas, serta riwayat kunjungan.
- **Notifikasi dalam aplikasi** untuk aktivitas operasional.
- **Ledger keuangan terpusat** untuk pendapatan IPL, iklan UMKM, donasi, dan transaksi lainnya.

## Alur Utama

### Pembayaran IPL

```text
Pengurus membuat draft tagihan
  -> tagihan dipublikasikan untuk keluarga berdomisili
  -> warga/pengurus mengunggah bukti pembayaran
  -> bendahara menyetujui atau menolak
  -> pembayaran yang disetujui masuk ke ledger keuangan
  -> kelebihan pembayaran menjadi saldo keluarga untuk tagihan berikutnya
```

### Iklan UMKM

```text
WRG membuat konten dan memilih paket
  -> WRG mengirim konten
  -> KRT/KRW/SDM melakukan review konten
  -> WRG mengunggah bukti pembayaran
  -> BDR/SDM memverifikasi pembayaran
  -> WRG merilis iklan
  -> iklan aktif ditampilkan pada dashboard
```

### Kunjungan Tamu

```text
WRG melaporkan tamu dan kendaraan (SUBMITTED)
  -> petugas berizin melakukan check-in (CHECKED_IN)
  -> petugas melakukan check-out (CHECKED_OUT)

Laporan hanya dapat dibatalkan saat masih SUBMITTED (CANCELED).
```

## Role

| Kode | Peran umum |
| --- | --- |
| `WRG` | Warga |
| `SDM` | Super Admin |
| `BDR` | Bendahara |
| `KRW` | Ketua RW |
| `KRT` | Ketua RT |
| `STPM` | Petugas keamanan |

Role di atas menggambarkan tanggung jawab default. Otorisasi endpoint dan aksi tetap ditentukan oleh permission menu, bukan dengan membandingkan nama atau kode role secara langsung.

Permission disimpan sebagai bit mask:

| Aksi | Nilai |
| --- | ---: |
| Read | `1` |
| Action | `4` |
| Edit | `8` |
| Add | `16` |
| Delete | `32` |

## Teknologi

| Layer | Teknologi |
| --- | --- |
| Monorepo | Turborepo, pnpm workspaces |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Backend | Express 5, TypeScript, PostgreSQL (`pg`), Sequelize |
| Validasi/form | Yup, Formik, React Hook Form |
| Logging | Pino, pino-http, query observer |
| UI/data | Radix UI, PrimeReact, Recharts, Lucide |

## Struktur Repository

```text
apps/
  web/                 Next.js frontend
  server/              Express API

packages/
  types/               Shared API dan domain types
  ui/                  Shared shadcn/ui components
  utils/               Shared utilities

database/
  DDL/                 Struktur dan enhancement tabel
  DML/                 Seed menu serta permission modul
```

## Prasyarat

- Node.js 20 atau lebih baru.
- pnpm `9.12.1`.
- PostgreSQL dengan extension `pgcrypto`/fungsi `gen_random_uuid()` tersedia.
- Database baseline HomeHub yang telah memiliki schema `homehub_revamp`, `m_user`, `m_menu`, dan `m_role_menu_permission`.

> Script pada `database/` saat ini bersifat incremental dan belum menjadi satu migration chain untuk bootstrap database kosong. `database/DDL/user.sql` juga masih berupa placeholder.

## Instalasi

Aktifkan pnpm sesuai versi repository:

```powershell
corepack enable
corepack prepare pnpm@9.12.1 --activate
pnpm install
```

Salin konfigurasi backend:

```powershell
Copy-Item apps/server/.env.example apps/server/.env
```

Untuk shell Unix:

```bash
cp apps/server/.env.example apps/server/.env
```

## Konfigurasi Backend

Isi `apps/server/.env` dan jangan commit file tersebut.

```env
PORT=3001

# Pilih DB_URL atau konfigurasi DB terpisah.
DB_URL=postgresql://user:password@localhost:5432/homehub
DB_SSL=false

# Jika DB_URL tidak digunakan:
DB_USER=
DB_HOST=localhost
DB_NAME=homehub
DB_PASSWORD=
DB_PORT=5432

JWT_SECRET=
JWT_EXPIRES_IN_SECONDS=28800

NIK_ENCRYPTION_KEY=
NIK_LOOKUP_KEY=
NIK_KEY_VERSION=1

LOG_LEVEL=debug
LOG_TO_FILE=true
LOG_DIRECTORY=logs
LOG_SQL=true
LOG_SQL_PARAMS=false
SLOW_QUERY_MS=1000
```

Generate JWT secret:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"
```

Generate dua key NIK yang berbeda:

```powershell
node -e "const {randomBytes}=require('node:crypto'); console.log('NIK_ENCRYPTION_KEY='+randomBytes(32).toString('base64')); console.log('NIK_LOOKUP_KEY='+randomBytes(32).toString('base64'))"
```

Simpan key tersebut secara permanen melalui secret manager pada production. Kehilangan `NIK_ENCRYPTION_KEY` menyebabkan NIK terenkripsi tidak dapat dipulihkan, sedangkan perubahan `NIK_LOOKUP_KEY` membuat pencarian NIK lama tidak cocok.

Karena query aplikasi menggunakan nama tabel tanpa schema pada beberapa tempat, pastikan `search_path` user database mencakup `homehub_revamp`:

```sql
ALTER ROLE homehub_app IN DATABASE homehub
SET search_path = homehub_revamp, public;
```

Sesuaikan `homehub_app` dan `homehub` dengan role serta database yang digunakan.

## Database

DDL modul tersedia di `database/DDL`:

- `family.sql`, `member.sql`, `role.sql`: master data dasar.
- `billing.sql`, `payment.sql`, `phase3.sql`: IPL dan saldo overpaid.
- `umkm.sql`, `umkm-subscription.sql`: konten serta langganan iklan UMKM.
- `financial-transaction.sql`: ledger keuangan terpusat dan backfill pendapatan.
- `guest-visit.sql`: laporan, kendaraan, dan riwayat tamu.
- `nik-security.sql`: kolom enkripsi, blind index, dan constraint NIK.

DML menu dan permission tersedia di `database/DML`:

- `ipl-menu.sql`
- `umkm-menu.sql`
- `guest-visit-menu.sql`

Jalankan file SQL menggunakan pgAdmin atau `psql`, dengan `ON_ERROR_STOP` agar proses berhenti saat terjadi error:

```powershell
psql "$env:DB_URL" -v ON_ERROR_STOP=1 -f database/DDL/guest-visit.sql
psql "$env:DB_URL" -v ON_ERROR_STOP=1 -f database/DML/guest-visit-menu.sql
```

Beberapa DDL melakukan backfill dan bergantung pada tabel modul sebelumnya. Selalu backup database dan review file SQL sebelum menjalankannya pada production.

## Migrasi NIK

NIK disimpan menggunakan AES-256-GCM. Pencarian exact menggunakan blind index HMAC-SHA-256, sedangkan respons API normal hanya menampilkan bentuk masking seperti `************1234`.

Untuk database lama yang masih menyimpan NIK plaintext:

1. Hentikan sementara proses tulis ke `m_member`.
2. Backup database.
3. Konfigurasikan `NIK_ENCRYPTION_KEY` dan `NIK_LOOKUP_KEY` permanen.
4. Jalankan `database/DDL/nik-security.sql`.
5. Jalankan migrasi:

```powershell
pnpm --filter @monorepo/server migrate:nik
```

Migrasi menggunakan satu transaction dan akan rollback seluruh perubahan jika satu record gagal.

Verifikasi hasil:

```sql
SELECT
  COUNT(*) FILTER (WHERE nik IS NOT NULL) AS plaintext_remaining,
  COUNT(*) FILTER (WHERE nik_ciphertext IS NOT NULL) AS encrypted_records,
  COUNT(*) FILTER (WHERE nik_lookup_hash IS NOT NULL) AS indexed_records
FROM homehub_revamp.m_member;
```

`plaintext_remaining` harus bernilai `0`.

## Menjalankan Development

Jalankan seluruh workspace dari root:

```powershell
pnpm dev
```

Alamat default:

- Web: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:3001/v1](http://localhost:3001/v1)
- Health response sederhana: [http://localhost:3001/v1](http://localhost:3001/v1)

Menjalankan aplikasi secara terpisah:

```powershell
pnpm --filter web dev
pnpm --filter @monorepo/server dev
```

## Command

| Command | Kegunaan |
| --- | --- |
| `pnpm dev` | Menjalankan web dan API melalui Turborepo |
| `pnpm build` | Build seluruh workspace |
| `pnpm lint` | Menjalankan lint seluruh workspace |
| `pnpm format` | Memeriksa format |
| `pnpm format:fix` | Memperbaiki format |
| `pnpm --filter web build` | Build frontend saja |
| `pnpm --filter @monorepo/server build` | Build backend saja |
| `pnpm --filter @monorepo/server migrate:nik` | Migrasi NIK plaintext |

## Build dan Production

Build seluruh aplikasi:

```powershell
pnpm build
```

Jalankan hasil build pada terminal/proses terpisah:

```powershell
pnpm --filter @monorepo/server start
pnpm --filter web start
```

Sebelum deployment production, sesuaikan hal berikut:

- Base URL API frontend masih menggunakan `http://localhost:3001` secara langsung pada beberapa file.
- CORS backend saat ini hanya menerima `http://localhost:3000`.
- File pembayaran dan gambar UMKM disimpan di filesystem lokal.
- Gunakan reverse proxy HTTPS dan persistent volume untuk folder storage.
- Simpan seluruh key serta kredensial database di secret manager.

## Storage dan Logging

Runtime backend membuat data lokal berikut:

```text
apps/server/storage/payment-proofs/
apps/server/storage/umkm-payment-proofs/
apps/server/storage/umkm-images/
apps/server/logs/application.log
apps/server/logs/error.log
apps/server/logs/query.log
```

Folder storage dan log diabaikan Git. Backup persistent volume diperlukan karena database hanya menyimpan path file.

Query parameter sensitif seperti NIK, bukti pembayaran, token, dan password disensor oleh logger. Biarkan `LOG_SQL_PARAMS=false` pada production kecuali sedang melakukan diagnosis terkontrol.

## Troubleshooting

### Web gagal karena port atau lock Next.js

```text
Port 3000 is in use
Another next dev server is already running
```

Hentikan proses dev web lama, pastikan port `3000` bebas, lalu jalankan kembali `pnpm dev`. Jangan menghapus lock saat proses Next.js masih aktif.

### Login gagal saat membuat token

```text
The "key" argument ... Received undefined
```

Pastikan `JWT_SECRET` terisi di `apps/server/.env`, lalu restart backend.

### Migrasi NIK gagal

```text
NIK_ENCRYPTION_KEY wajib dikonfigurasi
```

Pastikan kedua key NIK berisi Base64 dari 32 random byte dan tersedia pada environment proses migrasi.

### Tabel tidak ditemukan

Pastikan database sudah memiliki schema `homehub_revamp` dan `search_path` user koneksi mengarah ke `homehub_revamp, public`.

### Upload hilang setelah deployment

Pastikan `apps/server/storage` diarahkan ke persistent volume. Container atau filesystem ephemeral akan menghapus upload ketika instance dibuat ulang.

## Catatan Keamanan

- Jangan commit `.env`, key NIK, JWT secret, password database, file upload, atau log.
- Gunakan HTTPS pada production, terutama untuk registrasi NIK dan unggah bukti pembayaran.
- Jangan menampilkan NIK lengkap pada list; gunakan masking dan permission khusus jika fitur reveal dibuat kemudian.
- Backup key enkripsi secara aman dan rencanakan key rotation menggunakan `NIK_KEY_VERSION`.
- Akses operasional harus melalui permission RBAC.
- Review batas upload, MIME signature, otorisasi file, dan retensi log secara berkala.
