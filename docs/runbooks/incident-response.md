# Incident Response Runbook

## Data Isolation Incident

1. Suspend endpoint atau deployment terdampak; jangan menghapus bukti/log.
2. Catat request ID, tenant actor, endpoint, entity ID, dan rentang waktu.
3. Rotasi credential yang mungkin terekspos.
4. Audit `t_audit_log`, application log, dan query log tanpa menyalin NIK, token, atau file proof.
5. Verifikasi composite foreign key dan seluruh query endpoint menggunakan tenant context.
6. Jalankan isolation test pada database disposable sebelum membuka akses kembali.

## Failed Subscription Job

1. Buka Console Platform > Operasional dan periksa `last_error`.
2. Pastikan database serta migration ready.
3. Periksa invoice duplicate, subscription tanpa tenant, dan plan inactive.
4. Jalankan `production:check`.
5. Setelah akar masalah diperbaiki, jalankan reconciliation manual satu kali.
6. Pastikan invoice periode yang sama tetap satu per tenant.

## Storage Incident

1. Nonaktifkan upload bila provider tidak stabil; download existing dapat tetap dibuka bila sehat.
2. Jalankan `storage:check` dan periksa status Supabase.
3. Jangan mengubah `object_key` database untuk memulihkan file secara manual.
4. Cari object orphan dan missing melalui inventory `t_file_object`.
5. Pulihkan object dari backup dengan key yang sama, lalu uji checksum dan tenant ownership.

## Secret Exposure

1. Cabut dan rotasi secret terdampak segera.
2. Untuk JWT secret, paksa seluruh user login ulang.
3. Untuk NIK key, ikuti prosedur key versioning; jangan overwrite ciphertext tanpa backup.
4. Untuk Supabase S3 key, buat key baru, deploy, lalu revoke key lama.
5. Cari secret pada git history, CI artifact, log, dan error tracking.

