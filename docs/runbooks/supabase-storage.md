# Supabase Storage Runbook

HomeHub menggunakan endpoint S3-compatible Supabase dari backend. S3 access key mempunyai akses penuh dan melewati Storage RLS, sehingga credential hanya boleh berada di environment backend.

## Provisioning

1. Buat bucket private `homehub-private`.
2. Buat bucket public `homehub-public`. Bucket ini disiapkan untuk aset yang secara eksplisit dipublikasikan; flow saat ini tetap menyimpan seluruh upload sebagai private.
3. Batasi ukuran file bucket maksimal 5 MB dan MIME type ke `image/jpeg`, `image/png`, serta `application/pdf`.
4. Buka `Storage > Configuration > S3`, aktifkan protokol S3, lalu buat access key khusus backend.
5. Gunakan direct storage endpoint dengan format `https://<project-ref>.storage.supabase.co/storage/v1/s3` dan region yang ditampilkan Supabase.

Isi environment backend:

```env
SUPABASE_STORAGE_ENDPOINT=
SUPABASE_STORAGE_REGION=
SUPABASE_STORAGE_ACCESS_KEY_ID=
SUPABASE_STORAGE_SECRET_ACCESS_KEY=
SUPABASE_STORAGE_PRIVATE_BUCKET=homehub-private
SUPABASE_STORAGE_PUBLIC_BUCKET=homehub-public
```

Jangan menggunakan awalan `NEXT_PUBLIC_` dan jangan menyimpan nilai credential di repository atau log.

## Verification

```powershell
pnpm --filter @monorepo/server storage:check
```

Command harus berhasil mengakses kedua bucket sebelum aplikasi menerima upload production.

## Local File Migration

Inventaris file tenant yang masih menggunakan filesystem lokal:

```powershell
pnpm --filter @monorepo/server storage:migrate-local
```

Setelah `storage:check` lulus, jalankan migrasi:

```powershell
pnpm --filter @monorepo/server storage:migrate-local:execute
```

Migrator hanya memproses record yang sudah memiliki `tenant_id`, mengisi metadata `t_file_object`, dan mempertahankan file lokal sebagai backup. Data legacy tanpa tenant tidak dipindahkan karena akan dihapus pada cutover Phase 6.

## Object Policy

- Object key: `tenants/{tenantId}/{module}/{fileId}/{generatedName}`.
- Nama asli hanya disimpan sebagai metadata.
- Bukti IPL dan UMKM selalu private dan di-stream melalui backend setelah tenant serta RBAC diverifikasi.
- Database menyimpan bucket, key, MIME type, ukuran, SHA-256, uploader, tenant, dan status object.
- Object baru dibersihkan ketika transaksi database gagal; object lama dibersihkan setelah penggantian berhasil commit.

Referensi resmi: [Supabase S3 authentication](https://supabase.com/docs/guides/storage/s3/authentication) dan [S3 compatibility](https://supabase.com/docs/guides/storage/s3/compatibility).
