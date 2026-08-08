# Steering: HomeHub Multi-Tenant SaaS

Dokumen ini menjadi acuan transformasi HomeHub dari aplikasi satu perumahan menjadi aplikasi subscription untuk banyak perumahan.

Status dokumen: **DRAFT FOR REVIEW**

Dokumen ini belum menjadi persetujuan implementasi. Keputusan berstatus `DECIDED` berasal dari hasil review, sedangkan keputusan berstatus `PROPOSED` masih perlu disetujui sebelum pengerjaan phase terkait dimulai.

## 1. Tujuan

HomeHub akan melayani banyak perumahan dalam satu platform dengan ketentuan:

- Setiap perumahan memiliki data, pengguna, struktur RW/RT, dan konfigurasi sendiri.
- Data antarperumahan harus terisolasi pada backend dan database.
- Satu akun tenant hanya dapat terhubung ke satu perumahan.
- Paket subscription menentukan fitur dan batas pemakaian tenant.
- Super Admin dapat mengelola seluruh tenant tanpa menjadi pengurus tenant.
- Modul yang sudah ada tetap dapat digunakan: master data, IPL, keuangan, UMKM, tamu, notifikasi, dan dashboard.

## 2. Terminologi

| Istilah               | Definisi                                               |
| --------------------- | ------------------------------------------------------ |
| Platform              | Produk HomeHub secara keseluruhan                      |
| Tenant                | Satu organisasi/perumahan pelanggan HomeHub            |
| Super Admin           | Role platform untuk mengelola SaaS HomeHub lintas tenant |
| Admin                 | Role tenant untuk mengelola satu perumahan             |
| Tenant user           | Akun warga/pengurus yang hanya terhubung ke satu tenant |
| Entitlement           | Hak fitur atau limit yang diberikan paket subscription |
| Platform subscription | Langganan perumahan terhadap HomeHub                   |
| UMKM subscription     | Langganan iklan UMKM milik warga di dalam tenant       |

Istilah `platform subscription` dan `UMKM subscription` harus tetap dipisahkan pada penamaan tabel, service, endpoint, dan UI.

## 3. Kondisi Repository Saat Ini

HomeHub saat ini masih menggunakan asumsi single-tenant:

- Tabel domain belum memiliki `tenant_id`.
- JWT belum membawa konteks tenant.
- `m_user` terhubung langsung ke satu role dan satu member.
- Role dan permission berlaku secara global.
- Service menggunakan banyak raw SQL tanpa tenant guard terpusat.
- Unique constraint seperti NIK, nomor KK, dan nomor tagihan belum tenant-aware.
- Bukti pembayaran dan gambar disimpan pada filesystem lokal.
- Base URL API frontend masih menggunakan `http://localhost:3001` pada beberapa file.
- CORS backend hanya mengizinkan `http://localhost:3000`.
- DDL masih bersifat incremental dan belum dikelola oleh migration runner umum.
- Logger sudah memiliki request context, tetapi belum mencatat `tenantId`.

Konsekuensi utama: menambahkan halaman subscription sebelum isolasi tenant selesai dapat menyebabkan kebocoran data antarperumahan.

## 4. Prinsip Arsitektur

### 4.1 Isolasi harus terjadi di backend

Frontend tidak boleh menjadi pengaman tenant. Menghilangkan menu atau menyembunyikan tombol tidak cukup untuk melindungi data.

### 4.2 Tenant context tidak boleh berasal dari body request biasa

Endpoint terautentikasi harus mengambil tenant aktif dari token dan server-side request context. Client tidak boleh bebas mengirim `tenant_id` untuk menentukan data yang diakses.

### 4.3 Semua data domain harus memiliki pemilik yang jelas

Setiap tabel diklasifikasikan sebagai:

- **Platform-global**: plan, feature catalog, platform invoice, role template, menu, dan konfigurasi platform.
- **Tenant-owned**: user tenant, family, member, IPL, UMKM, guest, notification, dan financial ledger tenant.
- **Platform identity**: akun Super Admin yang terpisah dari akun tenant.

### 4.4 Defense in depth

Isolasi tenant menggunakan dua lapisan:

1. Tenant-aware repository/query pada backend.
2. PostgreSQL Row-Level Security (RLS) setelah seluruh query berhasil dimigrasikan.

### 4.5 Tidak ada bypass implisit

Super Admin menggunakan jalur autentikasi, tabel user, dan permission platform yang eksplisit. Super Admin tidak menjadi anggota tenant dan tidak boleh memakai bypass seperti `roleCode === "SDM"` pada tenant guard.

## 5. Keputusan Arsitektur yang Diusulkan

### ADR-001: Model database tenant

Status: `PROPOSED`

Gunakan satu database, satu schema aplikasi, dan kolom `tenant_id` pada seluruh tabel tenant-owned.

```text
Satu deployment HomeHub
  -> satu database PostgreSQL
  -> schema homehub_revamp
  -> seluruh data tenant dipisahkan tenant_id
```

Alasan:

- Operasional dan migration lebih sederhana.
- Biaya lebih rendah untuk jumlah tenant awal.
- Reporting platform lebih mudah.
- Connection pool tidak bertambah per tenant.

Database-per-tenant dapat menjadi opsi enterprise di masa depan, tetapi bukan target implementasi awal.

### ADR-002: Akun tenant dan akun platform dipisahkan

Status: `DECIDED`

`m_user` merupakan akun tenant dan wajib memiliki satu `tenant_id`. Satu akun tidak dapat digunakan pada beberapa tenant. Username dan email login wajib unik secara global. Akun Super Admin disimpan terpisah agar tidak menjadi bypass pada jalur autentikasi tenant.

```text
m_platform_user
  -> akses pengelolaan platform

m_tenant
  -> m_user
       -> m_member (opsional)
       -> role tenant
```

NIK yang sama boleh terdaftar pada tenant berbeda melalui akun yang berbeda. Username dan email login menggunakan unique constraint global.

### ADR-003: Tenant aktif berada di access token

Status: `DECIDED`

JWT tenant session membawa minimum payload:

```json
{
  "user_id": "uuid",
  "tenant_id": "uuid",
  "role_id": "uuid",
  "iat": 0,
  "exp": 0
}
```

Server mencari credential secara global, lalu mengambil tenant dari relasi `m_user.tenant_id`. Tenant tidak dapat dipilih oleh client atau diganti selama session berjalan.

### ADR-004: Slug digunakan untuk registrasi dan halaman publik tenant

Status: `DECIDED`

Login menggunakan identitas global tanpa tenant slug. Tenant slug digunakan pada registrasi warga dan halaman publik yang memang perlu mengetahui tenant sebelum autentikasi:

```text
app.homehub.id/t/griya-asri/register
```

Endpoint setelah autentikasi tetap menggunakan tenant dari JWT. Subdomain dan custom domain tidak digunakan pada release awal.

### ADR-005: Subscription platform terpisah dari keuangan tenant

Status: `PROPOSED`

Invoice dan pembayaran subscription HomeHub adalah data platform. Transaksi tersebut tidak boleh masuk ke `t_financial_transaction` milik tenant, karena ledger itu merepresentasikan keuangan perumahan.

### ADR-006: Object storage untuk file

Status: `DECIDED`

Storage lokal diganti dengan **Supabase Storage** melalui API S3-compatible. File sensitif disimpan dalam private bucket dan diakses melalui endpoint backend atau signed URL dengan expiry pendek. Object key selalu mengandung tenant ID.

```text
tenants/{tenant_id}/ipl-payment-proofs/{object_id}
tenants/{tenant_id}/umkm-payment-proofs/{object_id}
tenants/{tenant_id}/umkm-images/{object_id}
```

Bucket awal:

- `homehub-private` untuk bukti pembayaran, dokumen tamu, dan file sensitif lainnya.
- `homehub-public` untuk gambar iklan UMKM yang sudah lolos review dan aset publik lainnya.

Credential Supabase Storage hanya tersedia di backend. Frontend tidak boleh menerima service role key maupun S3 access key. Integrasi wajib melalui abstraction `ObjectStorage` agar provider dapat diganti tanpa mengubah service bisnis.

### ADR-007: Struktur wilayah dalam tenant

Status: `DECIDED`

Satu tenant mewakili satu perumahan dan dapat memiliki banyak RW serta RT. Family ditempatkan pada unit RT dan relasi parent menghubungkan RT ke RW.

### ADR-008: Role menggunakan template platform

Status: `DECIDED`

Admin tidak dapat membuat role bebas. Katalog role dan permission dikelola platform menggunakan template tetap. Satu akun tenant hanya boleh memiliki satu role aktif.

### ADR-009: Perubahan plan dijadwalkan

Status: `DECIDED`

Plan tidak berubah di tengah periode dan tidak menggunakan prorata. Upgrade atau downgrade disimpan sebagai perubahan terjadwal dan diterapkan setelah current period berakhir.

### ADR-010: Tidak ada impersonation

Status: `DECIDED`

Super Admin tidak dapat login atau bertindak sebagai user tenant. Kebutuhan dukungan dilakukan melalui halaman platform khusus dengan akses terbatas dan audit log.

### ADR-011: Harga flat dan paket berbasis fitur

Status: `DECIDED`

Harga plan bersifat flat dan tidak dihitung dari jumlah warga, keluarga, atau user aktif. Perbedaan plan hanya berasal dari fitur yang tersedia.

```text
FREE
  -> database warga

EXTRA
  -> seluruh fitur FREE
  -> pengelolaan pendapatan IPL

SUPER
  -> seluruh fitur EXTRA
  -> iklan UMKM
  -> management guest
  -> seluruh fitur HomeHub lainnya
```

### ADR-012: Tidak ada trial dan cancel kembali ke Free

Status: `DECIDED`

HomeHub tidak menyediakan trial. Tenant yang menghentikan plan berbayar kembali ke plan `FREE` setelah periode aktif berakhir. Seluruh data tetap disimpan; data modul berbayar tidak dihapus dan tersedia kembali ketika tenant mengaktifkan plan yang sesuai.

Setiap plan, termasuk `FREE`, memiliki invoice bulanan. Invoice `FREE` bernilai nol dan berfungsi sebagai rekam siklus subscription. Invoice berbayar yang terlambat menyebabkan subscription langsung `SUSPENDED` tanpa grace period.

### ADR-013: Pembayaran platform sementara diverifikasi manual

Status: `DECIDED`

Sebelum payment gateway tersedia, upgrade/downgrade dan pembayaran plan harus disetujui Super Admin. Integrasi payment gateway menjadi enhancement berikutnya.

### ADR-014: Reset data existing sebelum multi-tenant

Status: `DECIDED`

Data domain dan akun tenant existing tidak dimigrasikan. Sebelum schema multi-tenant diaktifkan, seluruh data aplikasi existing di-truncate melalui runbook terkontrol, lalu tenant baru dibuat melalui flow onboarding.

Reset wajib menggunakan script eksplisit yang memverifikasi environment, meminta flag konfirmasi, dan tidak dijalankan otomatis saat aplikasi startup. Schema, migration history, katalog plan, feature, menu, dan template role platform tidak ikut dihapus.

### ADR-015: Siklus bulanan dan pembatasan paket

Status: `DECIDED`

Semua subscription menggunakan siklus bulanan. Harga tetap flat terhadap jumlah warga dan user. Kuota Supabase Storage menjadi batas operasional per tenant: `FREE` 1 GB, `EXTRA` 5 GB, dan `SUPER` 20 GB.

Entitlement wajib ditegakkan oleh backend. Frontend hanya menyembunyikan atau menonaktifkan UI sebagai bantuan UX. Saat downgrade, data fitur di luar entitlement tetap disimpan tetapi tidak dapat dioperasikan sampai tenant kembali menggunakan plan yang sesuai.

## 6. Model Data Target

### 6.1 Tenant

```text
m_tenant
- id
- code
- slug
- name
- legal_name
- address
- timezone
- status
- onboarding_status
- created_time
- updated_time
- is_deleted
```

Constraint minimum:

```sql
UNIQUE (code)
UNIQUE (slug)
```

Status tenant yang diusulkan:

```text
ONBOARDING
ACTIVE
SUSPENDED
```

### 6.2 Struktur RW dan RT

```text
m_tenant_area
- id
- tenant_id
- parent_id
- area_type (RW atau RT)
- code
- name
- is_active
```

Aturan:

- Area `RW` tidak memiliki parent atau mengikuti root tenant.
- Area `RT` wajib memiliki parent bertipe `RW`.
- `m_family.area_id` wajib menunjuk ke area bertipe `RT`.
- Code area unik dalam tenant dan tipe area.

### 6.3 Tenant setting

```text
m_tenant_setting
- tenant_id
- setting_key
- setting_value_json
```

HomeHub menggunakan brand yang sama pada seluruh plan. Tenant hanya memiliki nama perumahan sebagai identitas tampilan, tanpa custom logo, warna, subdomain, atau custom domain pada release awal.

Setting minimum:

- Format nomor tagihan.
- Rekening dan metode pembayaran.
- Zona waktu.
- Konfigurasi IPL.
- Kebijakan tamu.
- Konfigurasi iklan UMKM.
- Nama organisasi dan alamat.

### 6.4 User tenant dan Super Admin

```text
m_user
- id
- tenant_id
- member_id
- username
- email
- password
- role_id
- status

m_platform_user
- id
- username
- email
- password
- status
```

Constraint minimum:

```sql
UNIQUE (LOWER(username))
UNIQUE (LOWER(email))
UNIQUE (tenant_id, member_id) WHERE member_id IS NOT NULL
```

Status user tenant:

```text
PENDING
ACTIVE
REJECTED
SUSPENDED
REVOKED
```

Satu akun tenant hanya dapat terhubung ke satu `tenant_id`. Jika orang yang sama terdaftar di tenant lain, tenant tersebut memiliki akun yang berbeda.

### 6.5 Role dan permission

Role menggunakan katalog template yang dikelola platform:

```text
m_role
- id
- code
- name
- is_system

m_role_menu_permission
- role_id
- menu_id
- permission_mask
```

`m_menu`, `m_role`, dan permission template bersifat platform-global. Admin tenant hanya melakukan assignment role yang tersedia dan tidak dapat membuat atau mengubah template role. Entitlement plan tetap menjadi pembatas tambahan atas menu yang dapat digunakan tenant.

### 6.6 Platform subscription

```text
m_platform_plan
- id
- code
- name
- billing_period
- price
- status

m_platform_feature
- id
- code
- name
- value_type

m_platform_plan_entitlement
- plan_id
- feature_id
- enabled
- limit_value

t_tenant_subscription
- id
- tenant_id
- plan_id
- next_plan_id
- status
- started_time
- current_period_start
- current_period_end
- scheduled_plan_change_time
- change_requested_by_id
- change_approved_by_id
- change_approved_time
- canceled_time

t_tenant_invoice
- id
- tenant_id
- subscription_id
- invoice_number
- amount
- billing_period
- status
- issued_date
- due_date
- paid_time

t_tenant_subscription_payment
- id
- tenant_id
- invoice_id
- payment_provider
- provider_reference
- amount
- status
- paid_time
```

Status subscription:

```text
ACTIVE
SUSPENDED
CANCELED
EXPIRED
```

Status invoice:

```text
DRAFT
ISSUED
PAID
VOID
OVERDUE
```

Perubahan `next_plan_id` diterapkan setelah `current_period_end`. Tidak ada prorata atau perubahan plan di tengah periode.

Seluruh plan menghasilkan satu invoice setiap bulan. Invoice plan `FREE` memiliki amount `0` dan dapat langsung ditandai `PAID` oleh sistem. Cancel plan berbayar menjadwalkan `next_plan_id` ke plan `FREE`, bukan menghapus tenant atau data domain.

### 6.7 Feature entitlement

Entitlement yang disiapkan:

```text
RESIDENT_DATABASE_ENABLED
IPL_ENABLED
UMKM_ADS_ENABLED
GUEST_SECURITY_ENABLED
FINANCIAL_REPORT_ENABLED
STORAGE_LIMIT_BYTES
```

Harga tidak bergantung pada jumlah family, member, atau user aktif. Entitlement diperiksa backend sebelum operasi dibuat. Menu frontend mengikuti entitlement untuk UX, tetapi backend tetap menjadi sumber keputusan.

Kapasitas storage merupakan limit entitlement per tenant. Backend menolak upload baru ketika penggunaan tenant akan melewati kuota, tanpa menghapus file yang sudah tersimpan.

Feature matrix awal:

| Fitur | `FREE` | `EXTRA` | `SUPER` |
| --- | --- | --- | --- |
| Database warga | Ya | Ya | Ya |
| Billing dan pembayaran IPL | Tidak | Ya | Ya |
| Dashboard/laporan pendapatan IPL | Tidak | Ya | Ya |
| Iklan UMKM | Tidak | Tidak | Ya |
| Management guest | Tidak | Tidak | Ya |
| Supabase Storage | 1 GB | 5 GB | 20 GB |

## 7. Perubahan Tabel Existing

Tabel berikut minimum harus memiliki `tenant_id NOT NULL`:

### Master dan auth

- `m_user`
- `m_family`
- `m_member`

Tabel baru `m_tenant_area` juga bersifat tenant-owned. `m_role`, `m_menu`, dan `m_role_menu_permission` tetap platform-global sebagai template yang tidak dapat diubah Admin tenant.

### IPL dan keuangan

- `t_ipl_bill_batch`
- `t_ipl_bill`
- `t_ipl_payment`
- `t_ipl_family_credit`
- `t_ipl_credit_ledger`
- `t_financial_transaction`
- `t_notification`

### UMKM

- `m_umkm`
- `t_umkm_revision`
- `m_umkm_subscription_plan`
- `t_umkm_subscription`

### Guest security

- `t_guest_visit`
- `t_guest_vehicle`
- `t_guest_visit_history`

Semua index, unique constraint, dan foreign key harus diaudit ulang.

Contoh perubahan:

```sql
-- Sebelum
UNIQUE (nik_lookup_hash)

-- Sesudah
UNIQUE (tenant_id, nik_lookup_hash)
```

```sql
-- Sebelum
UNIQUE (family_id, period)

-- Sesudah
UNIQUE (tenant_id, family_id, period)
```

Untuk mencegah cross-tenant reference, gunakan composite foreign key pada relasi kritis:

```sql
FOREIGN KEY (tenant_id, family_id)
REFERENCES m_family (tenant_id, id)
```

Parent table memerlukan unique constraint `(tenant_id, id)` agar composite foreign key dapat dibuat.

## 8. NIK pada Multi-Tenant

Ketentuan:

- NIK tetap dienkripsi menggunakan AES-256-GCM.
- Exact lookup tetap menggunakan HMAC blind index.
- Unique constraint berubah menjadi `(tenant_id, nik_lookup_hash)`.
- Registrasi publik harus mengetahui tenant slug sebelum melakukan pencarian NIK.
- NIK yang sama boleh terdaftar pada tenant berbeda.
- API normal hanya mengembalikan NIK masked.

Phase awal dapat menggunakan platform-managed encryption key yang sama dengan key version. Per-tenant key derivation atau key management service menjadi hardening lanjutan dan memerlukan desain rotasi tersendiri.

## 9. Tenant Context pada Backend

Request context target:

```ts
interface RequestContext {
  requestId: string;
  userId?: string;
  tenantId?: string;
  roleId?: string;
  isPlatformAdmin?: boolean;
}
```

Aturan:

- Endpoint tenant-owned wajib memiliki `tenantId`.
- Service tidak menerima `tenant_id` mentah dari request body.
- Insert otomatis menambahkan `tenant_id` dari context.
- Select, update, dan delete otomatis menambahkan kondisi tenant.
- ID valid dari tenant lain harus menghasilkan `404` atau `403` sesuai kebijakan, tanpa membocorkan keberadaan data.
- Background job wajib menetapkan tenant context secara eksplisit.
- Log wajib mencatat `tenantId` dan `userId`.

Query helper target:

```ts
tenantQuery("t_ipl_bill").where("id", "=", billId).executeTakeFirst();
```

Raw SQL tetap diperbolehkan untuk transaksi kompleks, tetapi wajib menggunakan tenant condition dan melalui query observer.

## 10. PostgreSQL Row-Level Security

RLS diterapkan setelah query aplikasi sudah tenant-aware.

Contoh konsep:

```sql
ALTER TABLE homehub_revamp.m_family ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_family
ON homehub_revamp.m_family
USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

Pada setiap transaction:

```sql
SET LOCAL app.tenant_id = 'tenant-uuid';
```

Connection pool tidak boleh menggunakan session-level tenant state karena koneksi dipakai ulang. Gunakan `SET LOCAL` di dalam transaction.

Platform operation menggunakan database role atau policy khusus dan harus tercatat dalam audit log.

## 11. Authentication Flow

### 11.1 Login global

```text
User membuka halaman login
  -> mengirim username/email dan password
  -> server mencari user secara global
  -> server mengambil tenant dari relasi akun
  -> server memvalidasi status tenant dan user
  -> server menerbitkan tenant access token
```

### 11.2 Registrasi warga

```text
User membuka halaman registrasi tenant
  -> mengirim tenant slug + NIK + credential
  -> server membuat blind index NIK
  -> pencarian dibatasi tenant
  -> user tenant dibuat PENDING
  -> Admin tenant menyetujui
```

Tenant slug hanya digunakan pada registrasi dan flow publik tenant. Login tidak menerima tenant slug. Setelah token diterbitkan, tenant dari JWT menjadi sumber kebenaran. Tidak ada tenant selector atau tenant switch karena satu akun hanya terhubung ke satu tenant.

## 12. Entitlement Enforcement

Setiap fitur subscription memiliki menu code atau feature code.

Pemeriksaan backend:

```text
Authentication
  -> tenant status
  -> subscription status
  -> feature entitlement
  -> RBAC permission
  -> domain validation
```

Kebijakan status:

| Status | Akses | Keterangan |
| --- | --- | --- |
| `ACTIVE` | Sesuai entitlement plan | Berlaku untuk plan `FREE`, `EXTRA`, dan `SUPER` |
| `SUSPENDED` | Admin tenant: billing platform dan export data; user tenant lain: tidak dapat masuk aplikasi | Invoice terlambat langsung menyebabkan suspend |
| `CANCELED` | Historis | Plan berbayar berakhir dan tenant kembali ke `FREE` |
| `EXPIRED` | Admin tenant: billing platform dan export data; user tenant lain: tidak dapat masuk aplikasi | Memerlukan aktivasi atau keputusan Super Admin |

Tidak ada status trial, past due, atau grace period pada lifecycle awal. Workflow export data tetap tersedia dan data tenant tidak dihapus ketika plan berbayar dihentikan.

Pada status `SUSPENDED` atau `EXPIRED`, hanya akun dengan role Admin pada tenant tersebut yang dapat menyelesaikan flow billing dan export. Permission RBAC tetap diperiksa; status tenant tidak memberikan bypass permission.

## 13. File Storage

Perubahan yang diperlukan:

- Buat abstraction `ObjectStorage`.
- Implementasi provider awal menggunakan Supabase Storage melalui endpoint S3-compatible.
- Service tidak menyimpan absolute path pada database.
- Database menyimpan provider, bucket, object key, MIME type, size, dan checksum.
- Semua object private secara default; hanya aset yang memang ditujukan untuk publik yang disimpan dalam `homehub-public`.
- Download menggunakan endpoint terotorisasi atau signed URL dengan expiry pendek.
- Object key dibuat server dan selalu tenant-scoped.
- Service role key dan S3 access key hanya digunakan oleh backend dan tidak pernah dikirim ke frontend.
- Storage usage dicatat per tenant dan diperiksa sebelum upload terhadap kuota plan: `FREE` 1 GB, `EXTRA` 5 GB, dan `SUPER` 20 GB.
- Cancel plan berbayar tidak menghapus object karena tenant kembali ke `FREE`. Penghapusan permanen tenant, jika dibuat kemudian, harus memiliki kebijakan khusus dan bukan bagian flow cancel subscription.

Data yang perlu dimigrasikan:

- Bukti pembayaran IPL.
- Bukti pembayaran iklan UMKM.
- Gambar konten UMKM.

## 14. Frontend

Perubahan minimum:

- Pindahkan API base URL ke `NEXT_PUBLIC_API_URL`.
- Tambahkan tenant bootstrap berdasarkan slug untuk registrasi dan halaman publik tenant.
- Simpan tenant session secara konsisten.
- Tampilkan brand HomeHub dan nama perumahan aktif.
- Filter menu berdasarkan entitlement dan RBAC.
- Tambahkan halaman tenant suspended/expired.
- Jangan menerima `tenant_id` bebas pada form domain.
- Pastikan cache dan state frontend selalu menggunakan scope tenant dari session.

URL target awal:

```text
/login
/t/{tenantSlug}/register
/dashboard
```

Custom branding, custom domain, dan subdomain tenant berada di luar scope implementasi awal.

## 15. Background Job

Proses berikut dipindahkan atau disiapkan untuk queue/scheduler:

- Generate tagihan periodik.
- Reminder tagihan.
- Perubahan status subscription.
- Invoice platform berkala.
- Expiry iklan UMKM.
- Rekonsiliasi pembayaran.
- Cleanup upload sementara.
- Retensi dan penghapusan tenant.

Job payload wajib memiliki `tenant_id`, idempotency key, retry policy, dan audit metadata.

## 16. Observability dan Audit

Log minimum:

```text
requestId
tenantId
userId
roleId
route
durationMs
statusCode
```

Audit event minimum:

- Tenant dibuat, disuspend, atau diaktifkan.
- Plan/subscription berubah.
- Super Admin mengakses data tenant melalui halaman platform yang diizinkan.
- User tenant disetujui, ditolak, disuspend, atau dicabut.
- Permission berubah.
- Pembayaran diverifikasi atau direverse.
- Export data dilakukan.
- Object sensitif diunduh.

Jangan mencatat NIK plaintext, password, token, bukti pembayaran, atau signed URL lengkap.

## 17. Strategi Reset Data Existing

Data aplikasi existing tidak dibawa ke model multi-tenant. Implementasi dimulai dengan data tenant kosong agar constraint dan isolation dapat diterapkan secara langsung tanpa compatibility layer atau backfill data lama.

Urutan reset:

1. Inventaris tabel platform-global dan tabel tenant-owned.
2. Buat backup terakhir untuk kebutuhan audit dan pemulihan darurat.
3. Pastikan environment target benar dan aplikasi dihentikan dari aktivitas tulis selama reset.
4. Jalankan script reset dengan flag konfirmasi eksplisit.
5. Truncate seluruh tabel tenant-owned dan reset identity/sequence yang relevan.
6. Pertahankan schema migration history, katalog plan, feature, menu, permission, dan template role platform.
7. Bersihkan object storage existing yang tidak lagi memiliki metadata aktif melalui job terpisah.
8. Terapkan schema multi-tenant dengan `tenant_id NOT NULL` dan constraint tenant-aware sejak awal.
9. Seed plan `FREE`, `EXTRA`, `SUPER`, feature entitlement, role template, dan menu secara idempotent.
10. Buat Super Admin pertama melalui bootstrap platform yang terpisah.
11. Buat tenant dan Admin tenant pertama melalui flow onboarding.
12. Jalankan isolation test menggunakan minimal dua tenant sebelum aplikasi dibuka kembali.

Script reset tidak boleh dijalankan otomatis oleh migration runner atau startup aplikasi. Eksekusi pada production memerlukan approval operasional eksplisit dan hasil backup yang telah diverifikasi.

## 18. Roadmap Implementasi

Roadmap pada bagian ini bersifat high-level. Breakdown tugas, urutan dependency, dan release gate yang menjadi acuan eksekusi tersedia pada `DEVELOPMENT_PHASES_MULTI_TENANT_SAAS.md`.

### Phase 0: Discovery dan keputusan

Tujuan: menyelesaikan keputusan produk yang memengaruhi model data.

Deliverable:

- Persetujuan ADR tenant foundation yang masih berstatus `PROPOSED`.
- Finalisasi model struktur RW/RT yang sudah diputuskan.
- Finalisasi implementasi single-role per akun tenant.
- Persetujuan runbook reset data existing.
- Inventaris seluruh tabel, endpoint, raw SQL, unique constraint, dan file storage.
- Pemetaan keputusan bisnis subscription yang harus selesai sebelum Phase 3.

Acceptance criteria:

- Tidak ada pertanyaan blocker untuk Phase 1 pada bagian 22.
- Model tenancy dan auth disetujui.
- Runbook truncate data tenant-owned dan bootstrap platform disetujui.

### Phase 1: Tenant foundation

Tujuan: membuat tenant context pada database yang telah di-reset tanpa membawa data tenant existing.

Deliverable:

- DDL `m_tenant`, `m_tenant_area`, dan pemisahan `m_platform_user`.
- Script reset data existing dengan environment guard dan flag konfirmasi.
- Seed katalog platform serta bootstrap Super Admin pertama.
- Tenant dan Admin tenant pertama dibuat melalui onboarding/bootstrap terkontrol.
- Tenant-aware JWT dan request context.
- Login menggunakan identitas global; registrasi menggunakan tenant slug.
- Pemisahan Super Admin platform dan Admin tenant.
- Logger memiliki tenant context.
- API base URL frontend menggunakan environment variable.
- Test helper untuk dua tenant.

Acceptance criteria:

- Tenant session selalu berasal dari relasi akun dan tidak dapat dipilih melalui request login.
- Satu akun tenant tidak dapat dipindahkan atau digunakan pada tenant lain.
- Tenant ID dari body tidak dapat mengganti tenant aktif.
- Akses Super Admin tercatat dalam audit log.
- Seluruh auth dan tenant-account test lulus.

### Phase 2: Tenant isolation seluruh domain

Tujuan: memastikan seluruh modul existing aman untuk banyak tenant.

Urutan implementasi modul:

1. Master family dan member.
2. User registration, role, menu permission.
3. IPL billing, payment, credit, report, dan dashboard.
4. Central financial ledger dan notification.
5. UMKM content, package, subscription, payment, dan ads.
6. Guest report, gate, history, dan vehicle.
7. File authorization dan storage path.

Deliverable:

- `tenant_id` pada seluruh tabel tenant-owned.
- Unique constraint dan composite FK tenant-aware.
- Tenant-aware query helper.
- Seluruh raw SQL diaudit.
- Tenant-aware RBAC.
- Tenant-aware file access.
- Isolation integration test seluruh endpoint.
- RLS pada tabel kritis setelah query siap.

Acceptance criteria:

- Tenant A tidak dapat read, update, delete, atau download data Tenant B walaupun mengetahui UUID-nya.
- Nilai bisnis yang sama dapat digunakan tenant berbeda sesuai constraint.
- Count, pagination, export, dashboard, dan notification tidak mencampur tenant.
- Background process tidak berjalan tanpa tenant context.
- Seluruh isolation test lulus.

### Phase 3: Platform subscription dan entitlement

Tujuan: menambahkan monetisasi HomeHub setelah isolasi tenant stabil.

Deliverable:

- Feature matrix plan `FREE`, `EXTRA`, dan `SUPER`.
- Plan dan feature catalog.
- Plan entitlement tanpa limit jumlah warga atau user.
- Kuota storage per tenant: `FREE` 1 GB, `EXTRA` 5 GB, dan `SUPER` 20 GB.
- Tenant subscription.
- Platform invoice dan payment.
- Renewal, direct suspend saat invoice terlambat, cancel, dan fallback ke `FREE`.
- Backend entitlement middleware/service.
- Halaman Super Admin untuk tenant dan subscription.
- Halaman Admin tenant untuk plan, usage, invoice, dan payment.
- Request upgrade/downgrade yang berlaku pada periode berikutnya tanpa prorata.
- Approval upgrade/downgrade dan pembayaran oleh Super Admin.
- Kontrak integrasi payment gateway untuk enhancement berikutnya.

Acceptance criteria:

- Tenant tidak dapat menggunakan fitur di luar plan melalui direct API.
- Jumlah family, member, dan user tidak mengubah harga atau plan.
- Fitur setiap plan tidak dapat diakses melalui direct API di luar entitlement.
- Jika payment gateway ditambahkan, webhook wajib idempotent dan terverifikasi sebelum diaktifkan pada production.
- Platform payment tidak masuk ke financial ledger tenant.
- Semua plan memiliki invoice bulanan; invoice `FREE` bernilai nol dan diselesaikan otomatis.
- Perubahan plan tidak mengubah current period yang sedang berjalan.
- Cancel plan berbayar mengaktifkan `FREE` tanpa menghapus data.
- Status subscription menghasilkan akses sesuai matriks kebijakan.

### Phase 4: Tenant onboarding dan configuration

Tujuan: tenant baru dapat aktif tanpa perubahan manual database.

Deliverable:

- Tenant registration/onboarding wizard.
- Pembuatan Admin tenant pertama.
- Template role dan permission.
- Tenant settings dengan brand HomeHub tetap.
- Import family/member terkontrol.
- Setup rekening, IPL, UMKM, dan guest policy.
- Onboarding checklist dan activation gate.

Acceptance criteria:

- Tenant baru dapat dibuat tanpa SQL manual.
- Role default dan menu entitlement dibuat idempotent.
- Tenant tidak aktif sebelum konfigurasi wajib lengkap.
- Import gagal tidak meninggalkan data parsial.

### Phase 5: Production hardening

Tujuan: menyiapkan operasi SaaS yang dapat dipantau dan dipulihkan.

Deliverable:

- Object storage dan migrasi file lokal.
- Queue dan scheduler.
- Rate limiting tenant-aware.
- Metrics, tracing, alerting, dan audit viewer.
- Backup/restore serta disaster recovery test.
- Data export dan retention workflow.
- Security review dan penetration test.

Acceptance criteria:

- Restore tenant dapat diuji tanpa mencampur data tenant lain.
- Upload bertahan setelah redeploy dan scale-out.
- Job retry tidak membuat invoice/tagihan ganda.
- Alert tersedia untuk error rate, queue backlog, storage, dan database.
- Security checklist production disetujui.

## 19. Test Matrix Isolasi Tenant

Setiap endpoint tenant-owned diuji menggunakan minimal Tenant A dan Tenant B.

| Skenario                                  | Hasil yang diharapkan                       |
| ----------------------------------------- | ------------------------------------------- |
| List data Tenant A                        | Tidak memuat data Tenant B                  |
| Get UUID milik Tenant B dengan token A    | `404` atau `403`                            |
| Update UUID milik Tenant B dengan token A | Ditolak, tidak ada perubahan                |
| Delete UUID milik Tenant B dengan token A | Ditolak, tidak ada perubahan                |
| Download file Tenant B dengan token A     | Ditolak                                     |
| Filter dan count                          | Hanya menghitung tenant aktif               |
| Notification                              | Hanya dikirim ke user tenant terkait        |
| Background job                            | Hanya memproses tenant pada payload         |
| Duplicate NIK lintas tenant               | Diizinkan                                   |
| Duplicate NIK dalam tenant                | Ditolak                                     |
| Tenant suspended                          | Mengikuti matriks akses subscription        |
| Super Admin access                        | Diizinkan hanya dengan permission dan audit |

Isolation test menjadi release gate. Feature dianggap belum selesai jika hanya memiliki happy-path test dalam satu tenant.

## 20. Risiko Utama

### Kebocoran data melalui query lama

Mitigasi:

- Inventaris raw SQL.
- Tenant-aware query helper.
- Integration test dua tenant.
- RLS.

### Cross-tenant foreign key

Mitigasi:

- Composite foreign key `(tenant_id, referenced_id)`.
- Validasi migration dan constraint database.

### Tenant context tertinggal pada connection pool

Mitigasi:

- Gunakan `SET LOCAL` hanya dalam transaction.
- Jangan gunakan session-level `SET app.tenant_id`.

### Super Admin menjadi bypass permanen

Mitigasi:

- Pisahkan platform permission.
- Pisahkan akun Super Admin dari `m_user` tenant.
- Jangan menyediakan impersonation.
- Gunakan halaman support platform khusus dan audit semua akses data tenant.

### File bocor melalui object key atau URL

Mitigasi:

- Private bucket.
- Signed URL expiry pendek.
- Tenant authorization sebelum URL dibuat.
- Object key opaque dan tenant-scoped.

### Reset data existing salah target atau gagal sebagian

Mitigasi:

- Verifikasi environment dan database target sebelum reset.
- Wajibkan flag konfirmasi eksplisit dan approval operasional.
- Jalankan dry run pada salinan database.
- Verifikasi backup dan rollback plan sebelum truncate.

### Subscription race condition

Mitigasi:

- Idempotency key.
- Unique provider reference.
- Database transaction dan locking.
- Webhook signature verification.

## 21. Out of Scope Awal

- Database terpisah untuk setiap tenant.
- White-label mobile application.
- PWA.
- Custom branding tenant.
- Custom domain tenant.
- Per-tenant encryption key management service.
- Multi-region active-active deployment.
- Marketplace eksternal.
- Multiple currency dan international tax.

Item out of scope dapat dipindahkan ke roadmap setelah Phase 3 stabil.

## 22. Hasil Review dan Keputusan Terbuka

### 22.1 Keputusan fondasi yang sudah disepakati

1. Satu tenant mewakili satu perumahan.
2. Satu tenant dapat memiliki banyak RW dan RT.
3. Satu akun tenant tidak boleh menjadi warga atau pengurus pada beberapa tenant.
4. Admin tenant tidak dapat membuat role bebas; role menggunakan template yang dikelola platform.
5. Perubahan plan tidak berlaku di tengah periode. Plan baru dijadwalkan dan diterapkan setelah current plan berakhir, tanpa prorata.
6. Tenant wajib dapat melakukan export data sebelum ditutup.
7. Tidak ada custom branding. Semua plan menggunakan brand HomeHub.
8. Tidak ada subdomain atau custom domain pada release awal.
9. Super Admin tidak boleh impersonate user tenant.
10. NIK yang sama boleh terdaftar pada tenant berbeda.
### 22.2 Jawaban review subscription dan operasional

| No. | Topik | Keputusan |
| --- | --- | --- |
| 1 | Role akun tenant | Satu akun tenant hanya memiliki satu role aktif. |
| 2 | Model harga | Harga subscription bersifat flat dan tidak bergantung pada jumlah warga, keluarga, atau user. Perbedaan paket hanya berdasarkan fitur. |
| 3 | Paket | `FREE`: database warga. `EXTRA`: seluruh fitur Free ditambah pengelolaan pendapatan melalui IPL. `SUPER`: seluruh fitur, termasuk iklan UMKM dan manajemen tamu. |
| 4 | Trial | Tidak tersedia masa trial. |
| 5 | Invoice terlambat | Tenant langsung berstatus `SUSPENDED` tanpa grace period. |
| 6 | Pembayaran platform | Fase awal menggunakan verifikasi manual oleh Super Admin. Integrasi payment gateway akan ditambahkan kemudian. |
| 7 | Upgrade/downgrade | Admin tenant mengajukan perubahan paket dan Super Admin menyetujuinya selama payment gateway belum tersedia. Perubahan berlaku pada periode berikutnya. |
| 8 | Cancel dan retensi data | Tenant dikembalikan ke paket `FREE`, sehingga seluruh data tetap tersimpan dan database warga tetap dapat digunakan. |
| 9 | Object storage | Menggunakan Supabase Storage melalui API S3-compatible. Detail arsitektur tersedia pada Bagian 22.5. |
| 10 | Data existing | Seluruh data tenant existing di-truncate; implementasi multi-tenant dimulai dari data kosong. |

### 22.3 Keputusan sebelum pembagian phase development

| No. | Topik | Keputusan |
| --- | --- | --- |
| 1 | Role administrator | Super Admin adalah role platform. Administrator pada perumahan menggunakan role Admin dan tetap tenant-scoped. |
| 2 | Pembuatan tenant | Hanya Super Admin yang membuat tenant. Data minimum: nama, kode, alamat, kontak, dan Admin tenant pertama. Tenant mulai dengan plan `FREE`. |
| 3 | Identitas login | Username dan email login unik secara global. Tenant diperoleh dari relasi akun setelah autentikasi. |
| 4 | Data existing | Seluruh data aplikasi existing di-truncate melalui runbook terkontrol; tidak ada migrasi data tenant lama. |
| 5 | Tenant suspended | Hanya Admin tenant yang dapat mengakses billing dan export. User tenant lainnya tidak dapat masuk ke aplikasi. |
| 6 | Siklus subscription | Seluruh plan menggunakan siklus bulanan. |
| 7 | Invoice plan Free | Plan `FREE` tetap menghasilkan invoice bulanan bernilai nol. |
| 8 | Kuota storage | `FREE` 1 GB, `EXTRA` 5 GB, dan `SUPER` 20 GB per tenant. |
| 9 | Feature gating | Backend wajib menegakkan entitlement. Penyembunyian menu di frontend hanya untuk UX. |
| 10 | Downgrade | Data fitur di luar plan tetap disimpan tetapi tidak dapat dioperasikan sampai entitlement tersedia kembali. |

### 22.4 Keputusan yang masih terbuka

1. Kapan payment gateway mulai diintegrasikan dan provider mana yang digunakan?

### 22.5 Penjelasan object storage

Object storage adalah layanan penyimpanan file berbasis object key, bukan filesystem lokal server. Database hanya menyimpan metadata dan object key, sedangkan bukti pembayaran serta gambar berada dalam private bucket.

Kebutuhan ini penting untuk SaaS karena aplikasi dapat berjalan pada beberapa instance dan instance dapat diganti saat deployment. File pada local disk dapat hilang atau hanya tersedia pada satu instance.

| Provider | Cocok ketika | Trade-off utama |
| --- | --- | --- |
| Supabase Storage | Membutuhkan private bucket, signed URL, kontrol akses, dan API S3-compatible dalam satu layanan terkelola | Tetap bergantung pada batasan fitur dan harga Supabase Storage |
| Cloudflare R2 | Hosting aplikasi tidak terikat satu cloud dan membutuhkan API S3-compatible | Tetap bergantung pada layanan Cloudflare |
| AWS S3 | Infrastruktur utama menggunakan AWS dan membutuhkan ekosistem paling matang | Biaya transfer dan konfigurasi AWS perlu dikelola |
| Google Cloud Storage | Infrastruktur utama menggunakan Google Cloud | Integrasi lebih optimal dalam ekosistem GCP |
| MinIO | Storage ingin di-host dan dikontrol sendiri | Tim harus mengelola server, replication, backup, dan availability |

Provider yang dipilih adalah **Supabase Storage** melalui API S3-compatible. HomeHub menggunakan bucket `homehub-private` untuk file sensitif dan `homehub-public` untuk aset yang memang boleh diakses publik. Semua upload serta pembuatan signed URL dilakukan melalui backend setelah validasi tenant dan RBAC.

Integrasi tetap dibungkus dengan abstraction `ObjectStorage`. Dengan demikian, HomeHub dapat berpindah ke Cloudflare R2, AWS S3, atau provider S3-compatible lainnya tanpa mengubah seluruh service bisnis.

Kontrak aplikasi tidak boleh bergantung langsung pada SDK provider:

```ts
interface ObjectStorage {
  putObject(input: PutObjectInput): Promise<StoredObject>;
  getSignedReadUrl(objectKey: string, expiresInSeconds: number): Promise<string>;
  deleteObject(objectKey: string): Promise<void>;
}
```

## 23. Definition of Done Program

Transformasi multi-tenant dianggap selesai ketika:

- Seluruh tabel domain memiliki ownership yang eksplisit.
- Seluruh endpoint tenant-owned lolos isolation test dua tenant.
- Super Admin platform dan Admin tenant terpisah.
- Setiap akun tenant hanya dapat login dalam scope tenant miliknya.
- Struktur RW/RT dapat dikelola dalam satu tenant.
- Role template tidak dapat diubah oleh Admin tenant.
- Setiap akun tenant hanya memiliki satu role aktif.
- Subscription dan entitlement ditegakkan backend.
- Plan `FREE`, `EXTRA`, dan `SUPER` memiliki feature matrix sesuai keputusan produk.
- Harga plan tetap flat tanpa limit jumlah warga atau user.
- Tidak ada trial dan invoice terlambat langsung menyebabkan suspend.
- Perubahan plan terjadwal berlaku setelah current period berakhir tanpa prorata.
- Perubahan plan dan pembayaran manual memerlukan approval Super Admin sampai payment gateway tersedia.
- Tenant baru dapat onboarding tanpa SQL manual.
- Tenant dapat melakukan export sebelum penutupan.
- Cancel plan berbayar mengaktifkan plan `FREE` tanpa menghapus data.
- Data tenant existing di-reset melalui runbook terkontrol dan tidak dibawa ke model multi-tenant.
- Semua plan menghasilkan invoice bulanan, termasuk invoice `FREE` bernilai nol.
- Kuota Supabase Storage ditegakkan per tenant sesuai plan.
- File storage tenant-safe dan persistent.
- Background job tenant-aware dan idempotent.
- Audit, backup, restore, dan monitoring tersedia.
- Tidak ada secret, NIK plaintext, atau data tenant sensitif pada log.
- Runbook operasional dan incident response tersedia.
