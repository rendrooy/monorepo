# Development Phases: HomeHub Multi-Tenant SaaS

Dokumen ini memecah keputusan pada `STEERING_MULTI_TENANT_SAAS.md` menjadi urutan pengerjaan teknis. Steering tetap menjadi sumber keputusan produk; dokumen ini menjadi checklist eksekusi development.

Status: **READY FOR REVIEW**

## 1. Aturan Eksekusi

- Phase dikerjakan berurutan karena setiap phase menjadi fondasi phase berikutnya.
- Satu phase belum selesai sebelum acceptance criteria dan release gate-nya lulus.
- Perubahan database harus memiliki migration yang repeatable dan tercatat.
- `tenant_id` tidak boleh dipercaya dari body, query, atau header yang dikirim client.
- Super Admin menggunakan identity, route, permission, dan session platform yang terpisah dari user tenant.
- Entitlement plan dan RBAC selalu divalidasi backend.
- Truncate data existing hanya dijalankan melalui runbook terkontrol dengan approval eksplisit.
- Setiap phase harus menjaga `pnpm --filter @monorepo/server build` dan `pnpm --filter web build` tetap lulus.

## 2. Ringkasan Phase

| Phase | Status | Fokus | Hasil utama |
| --- | --- | --- | --- |
| 0 | `COMPLETED` | Technical baseline | Migration runner, inventaris ownership, reset tooling, dan test baseline |
| 1 | `COMPLETED` | Tenant foundation | Tenant context, login global, Super Admin, Admin tenant, dan audit context |
| 2 | `COMPLETED` | Tenant isolation | Seluruh modul existing aman untuk banyak tenant |
| 3 | `COMPLETED` | Supabase Storage | File private tenant-scoped, backend streaming, migrator, dan isolation test |
| 4 | `COMPLETED` | Subscription | Plan, invoice bulanan, pembayaran manual, entitlement, dan storage quota |
| 5 | `COMPLETED` | Console dan onboarding | UI Super Admin, billing Admin tenant, dan onboarding tenant |
| 6 | `IN PROGRESS` | Production hardening | Scheduler, observability, backup, security test, dan cutover |

## 3. Phase 0: Technical Baseline dan Reset Readiness

### Tujuan

Menyiapkan jalur migration dan reset yang aman sebelum model data existing diubah.

### Database dan tooling

- Inventaris seluruh tabel sebagai `platform-global`, `platform-identity`, atau `tenant-owned`.
- Inventaris foreign key, unique constraint, raw SQL, sequence, trigger, dan file lokal.
- Tambahkan migration runner berbasis PostgreSQL dengan tabel histori migration.
- Pisahkan migration schema dari seed katalog platform.
- Buat script reset data tenant-owned dengan environment guard dan flag konfirmasi eksplisit.
- Pastikan script reset tidak menghapus migration history, plan, feature, menu, permission, atau template role platform.
- Siapkan seed idempotent untuk plan `FREE`, `EXTRA`, `SUPER`, feature, menu, dan role template.

### Infrastruktur

- Buat project Supabase dan region yang akan digunakan production.
- Siapkan bucket private dan public, tetapi belum migrasikan service file pada phase ini.
- Definisikan environment variable storage tanpa memasukkan secret ke repository.
- Dokumentasikan backup database, backup file lokal, reset, dan restore.

### Testing

- Rekam baseline build backend dan frontend.
- Tambahkan smoke test koneksi database dan migration runner.
- Uji reset script pada database disposable.
- Verifikasi seed dapat dijalankan berulang tanpa duplicate record.

### Acceptance criteria

- Semua tabel memiliki klasifikasi ownership.
- Migration runner dapat apply dan mendeteksi migration yang sudah dijalankan.
- Reset script menolak target yang tidak memiliki flag dan environment yang benar.
- Backup dan restore dry run berhasil.
- Belum ada truncate pada environment shared atau production.

## 4. Phase 1: Tenant Foundation dan Identity

### Tujuan

Membangun tenant context dan memisahkan identity platform dari identity tenant.

### Database

- Tambahkan `m_tenant`, `m_tenant_setting`, dan `m_tenant_area` untuk struktur RW/RT.
- Tambahkan `m_platform_user` untuk Super Admin.
- Tambahkan `tenant_id` pada `m_user` dan tabel auth yang diperlukan.
- Terapkan unique username dan email secara global, case-insensitive.
- Seed role Admin tenant dari template platform.
- Tambahkan audit log untuk operasi platform dan tenant.

### Backend

- Pisahkan autentikasi Super Admin dan user tenant.
- Login tenant menggunakan username/email global tanpa tenant slug.
- Ambil tenant dari relasi akun setelah credential valid.
- Tambahkan `tenant_id`, `user_id`, dan `role_id` pada tenant access token.
- Bangun tenant request context pada middleware.
- Tolak tenant dari body/query/header sebagai sumber authorization.
- Buat route platform terpisah untuk bootstrap dan pengelolaan tenant.
- Tambahkan `tenantId` ke logger dan query observer.

### Frontend

- Pertahankan halaman login global.
- Simpan tenant identity dari session hasil login.
- Tambahkan halaman status tenant `SUSPENDED` dan `EXPIRED`.
- Siapkan shell awal Super Admin yang terpisah dari dashboard tenant.
- Registrasi warga tetap menggunakan tenant slug agar pencarian NIK memiliki scope tenant.

### Testing

- Login berhasil tanpa tenant slug dan menghasilkan tenant yang sesuai akun.
- Username/email duplikat lintas tenant ditolak.
- NIK yang sama dapat digunakan pada tenant berbeda.
- User tenant tidak dapat memperoleh atau mengganti tenant melalui request payload.
- Token Super Admin tidak diterima pada route tenant biasa sebagai bypass.

### Acceptance criteria

- Super Admin dan user tenant menggunakan tabel serta session berbeda.
- Admin tenant hanya memiliki akses pada tenant miliknya.
- Request tenant terautentikasi selalu memiliki tenant context dari token.
- Audit dan log menyertakan actor serta tenant yang relevan.
- Auth integration test minimal dua tenant lulus.

## 5. Phase 2: Tenant Isolation Seluruh Modul

### Tujuan

Menambahkan ownership tenant pada semua data domain dan menutup kemungkinan kebocoran lintas tenant.

### Urutan wave

1. Master family, member, user registration, role, dan menu permission.
2. IPL billing, payment, credit, financial ledger, notification, report, dan dashboard.
3. UMKM content, package, subscription, payment, approval, dan carousel iklan.
4. Guest report, vehicle, gate check-in/check-out, dan history.

Setiap wave harus selesai beserta isolation test sebelum wave berikutnya dimulai.

### Database

- Tambahkan `tenant_id NOT NULL` pada seluruh tabel tenant-owned.
- Ubah unique constraint bisnis menjadi tenant-aware, kecuali username/email yang tetap global.
- Gunakan composite foreign key `(tenant_id, referenced_id)` untuk relasi tenant-owned.
- Tambahkan index yang diawali `tenant_id` untuk list, filter, dan lookup utama.
- Siapkan RLS pada tabel berisiko tinggi setelah seluruh query sudah tenant-aware.

### Backend

- Audit seluruh raw SQL dan query builder.
- Semua list, count, detail, update, delete, export, dan dashboard wajib tenant-scoped.
- Background job wajib membawa tenant context eksplisit.
- File metadata sementara wajib memiliki tenant ownership walaupun storage baru dipindah pada Phase 3.
- RBAC tetap berbasis action permission, bukan role code atau role name.

### Frontend

- Jangan mengirim `tenant_id` pada form domain.
- Pastikan cache key dan state sensitif mengikuti tenant session.
- Filter menu menggunakan RBAC; entitlement plan ditambahkan pada Phase 4.
- Tangani `403` dan tenant status tanpa menampilkan data stale dari session sebelumnya.

### Acceptance criteria

- Tenant A tidak dapat membaca, mengubah, menghapus, atau mengunduh data Tenant B walaupun mengetahui UUID-nya.
- Count, pagination, export, notification, dan dashboard hanya menghitung tenant aktif.
- Seluruh wave memiliki integration test dua tenant.
- Tidak ada query tenant-owned yang berjalan tanpa tenant context.
- Build backend dan frontend lulus setelah setiap wave.

## 6. Phase 3: Supabase Storage

### Tujuan

Memindahkan penyimpanan file dari local backend ke object storage yang persistent dan tenant-safe.

### Storage design

- Gunakan bucket `homehub-private` untuk bukti pembayaran, dokumen tamu, dan file sensitif.
- Gunakan bucket `homehub-public` hanya untuk aset yang memang boleh dipublikasikan, seperti iklan UMKM aktif.
- Gunakan object key `tenants/{tenantId}/{module}/{objectId}/{fileName}`.
- Simpan provider, bucket, object key, MIME type, size, checksum, uploader, dan tenant pada database.

### Backend

- Buat interface `ObjectStorage` dan implementasi `SupabaseObjectStorage` melalui API S3-compatible.
- Credential Supabase hanya tersedia pada backend.
- Upload, download, dan delete selalu memvalidasi tenant serta RBAC.
- Private file diberikan melalui signed URL berumur pendek atau streaming endpoint backend.
- Validasi MIME type, extension, ukuran, checksum, dan nama object buatan server.
- Catat penggunaan storage per tenant secara atomik.
- Hapus penggunaan filesystem lokal dari flow IPL, UMKM, dan guest.

### Frontend

- Pertahankan kontrak upload melalui API HomeHub.
- Jangan mengakses service role, S3 credential, atau private bucket secara langsung.
- Tangani progress, retry, file invalid, quota exceeded, dan signed URL expired.

### Acceptance criteria

- Restart atau perpindahan instance backend tidak menghilangkan file.
- Private file Tenant A tidak dapat diakses Tenant B.
- File publik hanya berasal dari record yang berstatus layak tayang.
- Tidak ada absolute local path baru yang disimpan ke database.
- Penggunaan storage tenant dapat dihitung secara konsisten.

## 7. Phase 4: Subscription, Invoice, dan Entitlement

Status implementasi backend: **IN PROGRESS**

- Selesai: schema plan, feature, entitlement, subscription, invoice, pembayaran manual, dan histori harga invoice.
- Selesai: subscription `FREE` serta invoice nol otomatis untuk tenant existing dan tenant baru.
- Selesai: middleware entitlement backend, filtering menu berdasarkan entitlement, dan akses billing berbasis RBAC.
- Selesai: upload bukti pembayaran ke Supabase, review Super Admin, storage quota atomik, serta reconciliation idempotent.
- Terverifikasi: migration `000007` sampai `000009`, audit read-only subscription, build backend, dan build frontend.
- Tersisa: lifecycle test mutatif pada database disposable serta UI billing/Super Admin yang dikerjakan pada Phase 5.

### Tujuan

Menambahkan monetisasi platform tanpa mencampurkannya dengan ledger keuangan tenant.

### Database

- Tambahkan plan, feature catalog, plan entitlement, subscription, invoice, dan subscription payment.
- Simpan histori harga agar invoice lama tidak berubah ketika harga plan diperbarui.
- Terapkan satu subscription aktif per tenant.
- Terapkan idempotency key/unique constraint untuk invoice per tenant dan periode.
- Simpan `next_plan_id` untuk upgrade/downgrade periode berikutnya.

### Aturan bisnis

- Siklus seluruh plan adalah bulanan.
- Plan `FREE` menghasilkan invoice bernilai nol dan diselesaikan otomatis.
- `EXTRA` dan `SUPER` menggunakan verifikasi pembayaran manual oleh Super Admin.
- Invoice terlambat langsung mengubah subscription menjadi `SUSPENDED` tanpa grace period.
- Admin tenant tetap dapat mengakses billing dan export saat suspended; user lain diblokir.
- Downgrade tidak menghapus data fitur, tetapi operasi fitur diblokir sampai entitlement tersedia kembali.
- Pembayaran platform tidak masuk ke `t_financial_transaction` tenant.

### Entitlement awal

| Entitlement | `FREE` | `EXTRA` | `SUPER` |
| --- | --- | --- | --- |
| Database warga | Ya | Ya | Ya |
| IPL dan pendapatan | Tidak | Ya | Ya |
| Iklan UMKM | Tidak | Tidak | Ya |
| Management guest | Tidak | Tidak | Ya |
| Supabase Storage | 1 GB | 5 GB | 20 GB |

### Backend dan frontend

- Tambahkan entitlement middleware/service sebelum domain validation.
- Tolak direct API ketika plan tidak memberikan fitur.
- Filter menu frontend berdasarkan gabungan entitlement dan RBAC.
- Tampilkan plan, usage storage, invoice, pembayaran, dan perubahan plan terjadwal.
- Tambahkan upload bukti pembayaran subscription untuk flow manual.

### Acceptance criteria

- Fitur tidak dapat digunakan melalui direct API di luar entitlement.
- Invoice bulanan idempotent dan tidak pernah ganda untuk periode yang sama.
- Invoice `FREE` otomatis berstatus selesai dengan amount nol.
- Suspend, renewal, upgrade, downgrade, dan kembali ke `FREE` mengikuti matriks akses.
- Storage upload ditolak sebelum melewati kuota plan.

## 8. Phase 5: Super Admin Console dan Tenant Onboarding

Status implementasi: **COMPLETED**

- Selesai: login dan session platform terpisah.
- Selesai: console tenant, onboarding atomik, detail tenant, activate/suspend, paket, perubahan paket, pembayaran, dan audit.
- Selesai: halaman billing Admin tenant untuk plan, storage, invoice, perubahan paket, dan upload bukti pembayaran.
- Selesai: smoke API platform dengan akun platform aktual serta build backend/frontend.
- Selesai: role `ADM` mengikuti template permission `SDM`, dengan isolation tenant dan entitlement tetap divalidasi backend.
- Selesai: template role, menu, dan permission tenant dikelola eksklusif oleh Super Admin melalui Platform Console; Admin tenant hanya melakukan assignment role yang tersedia.
- Catatan verifikasi: otomasi visual browser tidak tersedia pada sesi implementasi; route smoke test dan production build lulus.

### Tujuan

Membuat tenant baru dan mengoperasikan subscription tanpa SQL manual.

### Super Admin console

- Login platform terpisah.
- Daftar, detail, create, suspend, dan activate tenant.
- Pembuatan Admin tenant pertama.
- Approval perubahan plan dan pembayaran subscription.
- Riwayat invoice, pembayaran, plan, dan audit tenant.
- Tidak menyediakan impersonation user tenant.

### Admin tenant

- Melihat plan aktif, periode, usage, invoice, dan status pembayaran.
- Mengajukan upgrade/downgrade untuk periode berikutnya.
- Mengunggah bukti pembayaran subscription.
- Mengakses export dan billing ketika tenant suspended.

### Onboarding tenant

- Data minimum: nama, kode, alamat, kontak, dan Admin pertama.
- Tenant baru selalu mulai pada plan `FREE`.
- Setup struktur RW/RT, rekening, IPL, UMKM, guest policy, dan tenant setting sesuai entitlement.
- Seed role/menu dilakukan secara idempotent.

### Acceptance criteria

- Super Admin dapat membuat tenant tanpa query manual.
- Admin tenant pertama dapat login dan hanya melihat tenant miliknya.
- Tenant baru langsung memiliki subscription dan invoice `FREE` bulan berjalan.
- Onboarding gagal tidak meninggalkan tenant parsial.
- Semua aksi sensitif tercatat pada audit log.

## 9. Phase 6: Production Hardening dan Cutover

Status implementasi: **IN PROGRESS**

- Selesai: scheduler reconciliation subscription harian yang idempotent, memiliki retry terbatas, dan dapat mengambil alih job stale.
- Selesai: liveness/readiness endpoint, graceful shutdown, security headers, CORS allowlist, serta rate limit global, auth, dan tenant-aware.
- Selesai: ringkasan operasional platform, riwayat job, production readiness command, dan runbook operasi, insiden, serta release.
- Selesai: migration job runner telah diterapkan; build backend/frontend, migration status, readiness API, dan pemeriksaan read-only production lulus.
- Release gate tersisa: restore drill database dan Supabase Storage, dependency/secret scan, uji concurrency, serta integration test cross-tenant pada database disposable.
- Catatan: rate limiter saat ini bersifat per-instance; deployment multi-instance memerlukan limiter terdistribusi di edge atau Redis.

### Tujuan

Menyiapkan sistem untuk pengoperasian multi-tenant secara konsisten dan dapat dipulihkan.

### Operasional

- Scheduler invoice bulanan, renewal, suspend, dan scheduled plan change.
- Idempotent job, retry policy, dead-letter handling, dan reconciliation command.
- Metrics per tenant tanpa mengekspos data sensitif.
- Alert untuk invoice job, storage, database, error rate, dan queue backlog.
- Backup/restore database serta Supabase Storage recovery drill.
- Rate limit tenant-aware dan upload limit.
- Audit log retention dan incident response runbook.

### Security dan quality gate

- Cross-tenant integration test seluruh endpoint.
- Test concurrency pada publish bill, payment approval, invoice generation, dan quota update.
- Dependency audit dan secret scan.
- Verifikasi log tidak mengandung NIK plaintext, password, token, signed URL lengkap, atau bukti pembayaran.
- Security review untuk Super Admin route, signed URL, dan suspended tenant.
- Build, lint, smoke test, dan restore drill lulus.

### Cutover

- Freeze aktivitas tulis pada environment target.
- Verifikasi backup terakhir.
- Jalankan reset data existing dengan approval eksplisit.
- Apply migration dan seed platform.
- Bootstrap Super Admin, lalu buat tenant pertama melalui onboarding.
- Jalankan smoke test dua tenant sebelum membuka akses pengguna.

### Acceptance criteria

- Tidak ada temuan critical/high yang belum ditangani.
- Scheduler dapat diulang tanpa transaksi atau invoice ganda.
- Restore drill memenuhi target pemulihan yang disepakati.
- Isolation test dua tenant menjadi release gate wajib.
- Aplikasi dapat beroperasi tanpa filesystem lokal untuk file persisten.

## 10. Dependensi Phase

```text
Phase 0
  -> Phase 1
      -> Phase 2
          -> Phase 3
              -> Phase 4
                  -> Phase 5
                      -> Phase 6
```

Phase 2 dapat dikerjakan per wave oleh beberapa developer, tetapi perubahan shared auth, request context, query helper, dan schema ownership harus diselesaikan lebih dahulu pada Phase 1.

## 11. Definition of Done per Phase

Setiap phase dianggap selesai jika:

- Acceptance criteria phase terpenuhi.
- DDL/migration, backend, frontend, dan seed terkait berada pada commit yang dapat direproduksi.
- Test baru mencakup happy path, authorization, validation, dan cross-tenant access.
- Build backend dan frontend lulus.
- Tidak ada penggunaan role code/name untuk menggantikan RBAC action.
- Tidak ada secret atau data sensitif pada log dan repository.
- Steering dan dokumen phase diperbarui jika keputusan berubah selama implementasi.

## 12. Deferred

- Integrasi dan pemilihan provider payment gateway.
- PWA.
- Custom domain, subdomain, dan custom branding tenant.
- Impersonation user tenant oleh Super Admin.
- Migrasi data tenant existing.
- Per-tenant encryption key management dan multi-region deployment.
