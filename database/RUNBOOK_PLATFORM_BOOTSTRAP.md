# Runbook Bootstrap Platform

Runbook ini digunakan setelah migration tenant identity berhasil diterapkan. Bootstrap membuat satu akun Super Admin pada `m_platform_user`; akun tersebut tidak menjadi user tenant dan tidak dapat digunakan sebagai bypass route tenant.

## 1. Konfigurasi

Tambahkan nilai berikut pada `apps/server/.env`:

```text
PLATFORM_JWT_SECRET=<random-secret-yang-berbeda-dari-JWT_SECRET>
PLATFORM_ADMIN_USERNAME=<username-super-admin>
PLATFORM_ADMIN_EMAIL=<email-super-admin>
PLATFORM_ADMIN_PASSWORD=<password-minimal-12-karakter>
```

Gunakan secret acak minimal 32 byte. Jangan menyimpan credential aktual pada repository.

Selama masa development sebelum cutover, nilai berikut boleh tetap aktif agar akun legacy tanpa tenant masih dapat login:

```text
ALLOW_LEGACY_TENANTLESS_AUTH=true
```

Nilai tersebut wajib diubah menjadi `false` setelah reset data dan onboarding tenant pada Phase 6.

## 2. Verifikasi Migration

```powershell
pnpm --filter @monorepo/server db:migrate:status
```

Pastikan `000002_create_tenant_identity_foundation.sql` berstatus `applied`.

## 3. Bootstrap Super Admin

```powershell
pnpm --filter @monorepo/server platform:bootstrap-admin
```

Command bersifat idempotent berdasarkan username atau email. Jika akun sudah tersedia, command tidak mengubah password secara otomatis.

## 4. Login Platform

```http
POST /v1/platform/auth/login
Content-Type: application/json

{
  "username": "<username-super-admin>",
  "password": "<password-super-admin>"
}
```

Token platform hanya berlaku pada route `/v1/platform/*` yang memakai middleware platform.

## 5. Membuat Tenant

```http
POST /v1/platform/tenant
Authorization: Bearer <platform-access-token>
Content-Type: application/json

{
  "code": "GRIYA-ASRI",
  "slug": "griya-asri",
  "name": "Griya Asri",
  "address": "Alamat perumahan",
  "contact_name": "Nama kontak",
  "contact_email": "kontak@example.com",
  "contact_phone": "081234567890",
  "admin_username": "admin.griya",
  "admin_email": "admin.griya@example.com",
  "admin_password": "<password-admin-tenant>"
}
```

Pembuatan tenant dan Admin pertama berjalan dalam satu transaction serta dicatat pada `t_audit_log`.
