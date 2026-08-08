# Database Migrations

Migration dikelola oleh `apps/server/src/scripts/db-migrate.ts` dan disimpan dengan format:

```text
NNNNNN_deskripsi_snake_case.sql
```

Contoh:

```text
000002_create_tenant_foundation.sql
```

## Commands

```powershell
pnpm --filter @monorepo/server db:migrate:validate
pnpm --filter @monorepo/server db:migrate:status
pnpm --filter @monorepo/server db:migrate
```

## Rules

- Version enam digit harus unik dan selalu bertambah.
- File yang sudah applied tidak boleh diedit; buat migration baru.
- Runner memverifikasi checksum file applied dan berhenti jika berubah.
- Satu file dijalankan dalam satu transaction.
- Jangan menulis `BEGIN`, `COMMIT`, atau `ROLLBACK` di dalam file migration.
- Perubahan schema dan seed wajib deterministik.
- Seed katalog menggunakan key stabil dan `ON CONFLICT` agar aman terhadap bootstrap berulang.
- Migration runner memakai PostgreSQL advisory lock untuk mencegah apply paralel.
- Jalankan `validate` pada CI tanpa memerlukan koneksi database.

`status` hanya membaca database. `apply` membuat tabel histori jika belum ada dan menjalankan migration pending.
