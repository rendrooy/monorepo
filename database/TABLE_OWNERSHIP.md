# Database Table Ownership

Dokumen ini adalah inventaris awal Phase 0. Sumber yang dibaca reset tooling berada pada `apps/server/src/config/data-ownership.ts`; perubahan klasifikasi harus memperbarui keduanya dalam commit yang sama.

## Infrastructure

| Table | Keterangan |
| --- | --- |
| `m_schema_migration` | Histori migration dan checksum |

## Platform Global

| Table | Keterangan |
| --- | --- |
| `m_menu` | Katalog menu platform |
| `m_platform_role` | Role platform |
| `m_platform_permission` | Permission platform |
| `m_platform_role_permission` | Assignment permission platform |
| `m_role` | Template role tenant |
| `m_role_menu_permission` | Template permission role |
| `m_umkm_subscription_plan` | Daftar paket iklan UMKM |

## Platform Identity

| Table | Keterangan |
| --- | --- |
| `m_platform_user` | Akun Super Admin; dibuat pada Phase 1 |

## Tenant Owned

| Modul | Table |
| --- | --- |
| Identity dan warga | `m_user`, `m_family`, `m_member` |
| Tenant | `m_tenant`, `m_tenant_setting`, `m_tenant_area` |
| IPL | `t_ipl_bill_batch`, `t_ipl_bill`, `t_ipl_payment`, `t_ipl_family_credit`, `t_ipl_credit_ledger` |
| Keuangan dan notifikasi | `t_financial_transaction`, `t_notification` |
| UMKM | `m_umkm`, `t_umkm_revision`, `t_umkm_subscription` |
| Guest | `t_guest_visit`, `t_guest_vehicle`, `t_guest_visit_history` |
| Audit | `t_audit_log` |

## Aturan Klasifikasi

- Tabel baru wajib diklasifikasikan sebelum migration-nya digabungkan.
- Reset tooling berhenti jika database memiliki tabel yang tidak tercantum pada manifest.
- Tabel tenant-owned akan menjadi target truncate saat cutover Phase 6.
- Tabel platform-global, platform-identity, dan infrastructure tidak boleh masuk daftar truncate.
- Reset tidak menggunakan `CASCADE`; foreign key atau tabel yang terlewat harus menyebabkan operasi gagal.
