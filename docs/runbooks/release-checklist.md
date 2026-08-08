# Production Release Checklist

## Before Release

- [ ] Backup database dan storage inventory tersedia.
- [ ] Migration validate dan status lulus.
- [ ] Backend dan frontend production build lulus.
- [ ] `production:check` lulus.
- [ ] Secret production tidak menggunakan default dan tidak berada di frontend.
- [ ] `LOG_SQL_PARAMS=false` dan `LOG_SQL=false`.
- [ ] CORS hanya berisi origin production.
- [ ] Scheduler hanya aktif pada backend worker yang ditentukan.
- [ ] Rate limit dan trust proxy sesuai load balancer.

## Security Gate

- [ ] Login platform dan tenant memakai token yang terpisah.
- [ ] Direct API di luar entitlement menghasilkan `403`.
- [ ] Tenant suspended hanya dapat membuka billing melalui permission ADM.
- [ ] UUID Tenant B tidak dapat dibaca/diubah Tenant A.
- [ ] File private Tenant B tidak dapat diunduh Tenant A.
- [ ] Log tidak memuat NIK, password, token, proof base64, atau storage credential.

## After Release

- [ ] Liveness dan readiness `200`.
- [ ] Login platform, daftar tenant, paket, payment queue, dan audit dapat dibuka.
- [ ] Console Operasional menampilkan status job.
- [ ] Tenant Admin dapat membuka Subscription.
- [ ] Satu invoice saja per tenant dan periode.
- [ ] Tidak ada kenaikan `5xx`, slow query, atau failed job.

