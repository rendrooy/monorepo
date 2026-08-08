# Runbook Reset Data Tenant

Reset data tenant disiapkan pada Phase 0 dan baru digunakan pada cutover Phase 6. Script tidak menghapus data dalam mode default.

## Prasyarat

1. Pastikan perubahan tulis ke database target sudah dihentikan.
2. Buat backup database dan file lokal terakhir.
3. Verifikasi restore backup pada target disposable.
4. Review `database/TABLE_OWNERSHIP.md` dan manifest pada backend.
5. Jalankan dry run dan pastikan tidak ada tabel unclassified.

## Dry Run

```powershell
pnpm --filter @monorepo/server db:reset:tenant-data
```

Dry run menampilkan database, schema, tabel tenant-owned yang ditemukan, tabel yang belum tersedia, dan tabel yang belum diklasifikasikan. Tidak ada query truncate pada mode ini.

## Eksekusi

Nilai confirmation token harus dibentuk dari database dan schema aktual:

```text
TRUNCATE:{database_name}:{schema_name}
```

Contoh konfigurasi PowerShell untuk environment non-production:

```powershell
$env:RESET_TARGET_DB="homehub"
$env:RESET_TENANT_DATA_CONFIRM="TRUNCATE:homehub:public"
pnpm --filter @monorepo/server db:reset:tenant-data:execute
```

Production juga memerlukan:

```powershell
$env:ALLOW_PRODUCTION_TENANT_RESET="true"
```

Jangan menyimpan nilai konfirmasi reset pada environment deployment permanen.

## Pengaman

- Tanpa `--execute`, script selalu berjalan sebagai dry run.
- `RESET_TARGET_DB` harus sama dengan `current_database()`.
- Confirmation token harus memuat database dan schema aktual.
- Production membutuhkan flag tambahan.
- Tabel unclassified membatalkan reset.
- Truncate berjalan dalam transaction dan menggunakan advisory lock.
- Reset tidak memakai `CASCADE`.

## Verifikasi Setelah Reset

- Seluruh tabel tenant-owned memiliki row count nol.
- Tabel migration history, role, menu, dan permission tetap tersedia.
- Migration dan seed platform berhasil dijalankan.
- Super Admin dapat login setelah bootstrap.
- Tenant pertama dibuat melalui onboarding.
- Isolation smoke test minimal dua tenant lulus sebelum akses pengguna dibuka.

Setelah cutover selesai, set `ALLOW_LEGACY_TENANTLESS_AUTH=false` agar akun tanpa tenant ditolak secara eksplisit.
