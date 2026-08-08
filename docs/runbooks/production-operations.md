# Production Operations Runbook

## Runtime Configuration

Production minimum:

```env
NODE_ENV=production
CORS_ORIGINS=https://app.example.com
TRUST_PROXY=true
LOG_LEVEL=info
LOG_SQL=false
LOG_SQL_PARAMS=false
PLATFORM_SCHEDULER_ENABLED=false
PLATFORM_SCHEDULER_POLL_MS=60000
API_RATE_LIMIT_MAX=300
TENANT_RATE_LIMIT_MAX=180
AUTH_RATE_LIMIT_MAX=10
```

Gunakan `JWT_SECRET` dan `PLATFORM_JWT_SECRET` yang berbeda, acak, dan tidak memakai default. Credential database, NIK encryption, serta Supabase hanya boleh tersedia pada secret manager backend.

## Deployment

1. Ambil backup database sebelum migration.
2. Jalankan `pnpm --filter @monorepo/server db:migrate:validate`.
3. Jalankan `pnpm --filter @monorepo/server db:migrate` satu kali.
4. Jalankan `pnpm --filter @monorepo/server production:check`.
5. Deploy backend dengan health probe:
   - Liveness: `GET /v1/health/live`
   - Readiness: `GET /v1/health/ready`
6. Deploy frontend setelah backend ready.
7. Verifikasi Console Platform > Operasional.

Backend menangani `SIGTERM` dan `SIGINT`, menghentikan scheduler, menutup HTTP listener, lalu menutup database pool. Berikan termination grace period lebih besar dari `SHUTDOWN_TIMEOUT_MS`.

## Subscription Scheduler

Mode production yang direkomendasikan adalah satu managed cron atau worker
terpisah. Semua instance API menggunakan `PLATFORM_SCHEDULER_ENABLED=false`.
Jalankan command berikut satu kali per hari setelah pergantian tanggal WIB:

```powershell
pnpm --filter @monorepo/server subscription:job
```

`subscription:job` menggunakan claim pada `t_platform_job_run`. Pemanggilan
berulang pada tanggal yang sama akan dilewati setelah job berhasil. Scheduler
internal hanya boleh diaktifkan untuk deployment single-instance yang selalu
aktif dan tidak menjalankan managed cron.

- Job code: `TENANT_SUBSCRIPTION_RECONCILIATION`.
- Satu run per tanggal Asia/Jakarta dijamin oleh unique key database.
- Instance paralel aman karena claim job dan reconciliation menggunakan database lock/idempotency constraint.
- Job gagal dicoba ulang maksimal tiga kali dengan jeda 15 menit.
- Run `RUNNING` lebih dari 30 menit boleh direbut instance lain.
- Setelah tiga kegagalan, periksa `last_error`, perbaiki penyebab, lalu jalankan reconciliation manual setelah review.

Manual reconciliation:

```powershell
pnpm --filter @monorepo/server subscription:reconcile
```

Command manual tersebut melewati claim job dan hanya digunakan untuk tindakan
operasional setelah penyebab kegagalan diperiksa. Idempotency invoice tetap
dijaga oleh constraint database.

## Backup dan Restore

### Database

Gunakan backup terjadwal provider sebagai lapisan utama dan `pg_dump` terenkripsi sebelum migration besar:

```powershell
pg_dump --format=custom --no-owner --no-acl --dbname $env:DB_URL --file homehub.dump
pg_restore --clean --if-exists --no-owner --no-acl --dbname $env:RESTORE_DB_URL homehub.dump
```

Restore selalu dilakukan ke database disposable terlebih dahulu. Setelah restore, jalankan migration status, `production:check`, login platform, dan smoke test dua tenant.

### Supabase Storage

- Inventory object berasal dari `t_file_object`.
- Gunakan S3-compatible sync/copy ke bucket backup dengan credential terpisah.
- Restore object harus mempertahankan bucket dan `object_key` yang tercatat pada database.
- Setelah restore, sampling file private minimal dua tenant dan pastikan cross-tenant download ditolak.

## Alerts

Buat alert untuk:

- Readiness `503` selama lebih dari dua menit.
- Job `FAILED`, job tidak sukses selama 26 jam, atau attempt mencapai tiga.
- Kenaikan HTTP `5xx` dan `429`.
- Database slow query serta pool error.
- Invoice overdue atau tenant suspended naik tidak wajar.
- Storage tenant mencapai 80% dan 95% kuota.
