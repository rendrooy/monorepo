import type {
    BaseRequest,
    UmkmSubscriptionInterface,
    UmkmSubscriptionPlanInterface,
} from "@monorepo/types";
import { tableNames } from "../config";
import { pool } from "../connection/db";
import { getCurrentAuth } from "../utils/request-context";
import { getCurrentTenantId } from "../utils/tenant-scope";
import { hasMenuPermission, PERMISSION } from "../utils/rbac";
import { postIncomeTransaction } from "./financial-transaction-service";
import { deleteTenantFile, discardTenantFile, getTenantFile, storeTenantFile } from "./file-object-service";

const MAX = 5 * 1024 * 1024;
// const permission = async (code: string, bit: number) =>
//     Boolean(
//         (
//             await pool.query(
//                 `SELECT 1 FROM ${tableNames.masterRoleMenuPermission} permission
//                  INNER JOIN ${tableNames.masterMenu} menu ON menu.id=permission.menu_id
//                  WHERE permission.role_id=$1 AND menu.code=$2
//                    AND permission.is_deleted=false AND permission.is_active=true
//                    AND menu.is_deleted=false AND menu.is_active=true
//                    AND (permission.permission_mask & $3)=$3 LIMIT 1`,
//                 [getCurrentAuth()?.role_id, code, bit],
//             )
//         ).rowCount,
//     );
const page = (r: BaseRequest) => {
    const p = Math.max(Number(r.metadata?.page || 1), 1),
        s = Math.min(Math.max(Number(r.metadata?.pageSize || 10), 1), 100);
    return { p, s, o: (p - 1) * s };
};
const decodeProof = (r: UmkmSubscriptionInterface) => {
    const m = r.proof_data?.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) throw Error("Bukti pembayaran tidak valid");
    const mime = m[1]!,
        b = Buffer.from(m[2]!, "base64"),
        jpg = mime === "image/jpeg" && b[0] === 255 && b[1] === 216 && b[2] === 255,
        png =
            mime === "image/png" &&
            b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
        pdf = mime === "application/pdf" && b.subarray(0, 4).toString() === "%PDF";
    if (!b.length || b.length > MAX) throw Error("Ukuran bukti maksimal 5 MB");
    if (!jpg && !png && !pdf)
        throw Error("Bukti hanya boleh JPEG, PNG, atau PDF");
    return { body: b, mime, extension: jpg ? "jpg" : png ? "png" : "pdf" };
};

export const loadPlans = async (activeOnly = false) => ({
    status: 200,
    message: "Request successful",
    data: (
        await pool.query(
            `SELECT * FROM ${tableNames.umkmSubscriptionPlan} WHERE is_deleted=false ${activeOnly ? "AND is_active=true" : ""} ORDER BY price,name`,
        )
    ).rows,
});
export const savePlan = async (r: UmkmSubscriptionPlanInterface) => {
    const requiredPermission = r.id ? PERMISSION.EDIT : PERMISSION.ADD;
    if (!(await hasMenuPermission("UMKM_SUBSCRIPTION_PLAN", requiredPermission)))
        return { status: 403, message: "Akses ditolak", data: null };
    //   if (!(await permission("UMKM_SUBSCRIPTION_PLAN", r.id ? 8 : 16)))
    //     return { status: 403, message: "Akses ditolak", data: null };
    if (!r.name?.trim() || Number(r.price) <= 0 || Number(r.duration_days) <= 0)
        return { status: 400, message: "Data paket belum lengkap", data: null };
    const u = getCurrentAuth()?.user_id,
        q = r.id
            ? await pool.query(
                `UPDATE ${tableNames.umkmSubscriptionPlan} SET name=$2,price=$3,duration_days=$4,description=$5,is_active=$6,updated_time=now(),updated_by_id=$7 WHERE id=$1 AND is_deleted=false RETURNING *`,
                [
                    r.id,
                    r.name.trim(),
                    r.price,
                    r.duration_days,
                    r.description?.trim() || null,
                    r.is_active !== false,
                    u,
                ],
            )
            : await pool.query(
                `INSERT INTO ${tableNames.umkmSubscriptionPlan}(name,price,duration_days,description,is_active,created_by_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
                [
                    r.name.trim(),
                    r.price,
                    r.duration_days,
                    r.description?.trim() || null,
                    r.is_active !== false,
                    u,
                ],
            );
    return {
        status: q.rows[0] ? 200 : 404,
        message: q.rows[0] ? "Paket berhasil disimpan" : "Paket tidak ditemukan",
        data: q.rows[0] || null,
    };
};
export const choosePlan = async (r: UmkmSubscriptionInterface) => {
    if (!(await hasMenuPermission("OP_UMKM", PERMISSION.ADD)))
        return { status: 403, message: "Akses ditolak", data: null };
    const c = await pool.connect();
    const tenantId = getCurrentTenantId();
    try {
        await c.query("BEGIN");
        const b = (
            await c.query(
                `SELECT business.id, COALESCE($3::uuid, business.approved_revision_id) AS revision_id
                 FROM ${tableNames.umkm} business
                 WHERE business.id=$1 AND business.owner_user_id=$2 AND business.is_deleted=false
                   AND business.tenant_id IS NOT DISTINCT FROM $4::uuid FOR UPDATE`,
                 [r.umkm_id, getCurrentAuth()?.user_id, r.revision_id || null, tenantId],
            )
        ).rows[0];
        if (!b?.revision_id) throw Error("Revisi konten UMKM tidak ditemukan");
        const p = (
            await c.query(
                `SELECT * FROM ${tableNames.umkmSubscriptionPlan} WHERE id=$1 AND is_active=true AND is_deleted=false`,
                [r.plan_id],
            )
        ).rows[0];
        if (!p) throw Error("Paket tidak tersedia");
        const x = (
            await c.query(
                `INSERT INTO ${tableNames.umkmSubscription}(tenant_id,umkm_id,revision_id,plan_id,plan_name,price,duration_days,status,created_by_id)
                 VALUES($8,$1,$2,$3,$4,$5,$6,'DRAFT',$7) RETURNING *`,
                [
                    b.id,
                    b.revision_id,
                    p.id,
                    p.name,
                    p.price,
                    p.duration_days,
                    getCurrentAuth()?.user_id,
                    tenantId,
                ],
            )
        ).rows[0];
        await c.query("COMMIT");
        return { status: 201, message: "Paket berhasil dipilih", data: x };
    } catch (e) {
        await c.query("ROLLBACK");
        return {
            status: 409,
            message: e instanceof Error ? e.message : "Gagal memilih paket",
            data: null,
        };
    } finally {
        c.release();
    }
};
export const loadMySubscriptions = async () => {
    if (!(await hasMenuPermission("OP_UMKM", PERMISSION.READ)))
        return { status: 403, message: "Akses ditolak", data: [] };
    await pool.query(
        `UPDATE ${tableNames.umkmSubscription} SET status='EXPIRED',updated_time=now()
         WHERE status='ACTIVE' AND end_date<current_date AND is_deleted=false
           AND tenant_id IS NOT DISTINCT FROM $1::uuid`,
        [getCurrentTenantId()],
    );
    const result = await pool.query(
        `SELECT subscription.*,revision.name umkm_name
         FROM ${tableNames.umkmSubscription} subscription
         INNER JOIN ${tableNames.umkm} business ON business.id=subscription.umkm_id
         INNER JOIN ${tableNames.umkmRevision} revision ON revision.id=subscription.revision_id
         WHERE business.owner_user_id=$1 AND subscription.is_deleted=false
           AND subscription.tenant_id IS NOT DISTINCT FROM $2::uuid
         ORDER BY subscription.created_time DESC`,
        [getCurrentAuth()?.user_id, getCurrentTenantId()],
    );
    return { status: 200, message: "Request successful", data: result.rows };
};

export const loadActiveAds = async () => {
    await pool.query(
        `UPDATE ${tableNames.umkmSubscription} SET status='EXPIRED',updated_time=now()
         WHERE status='ACTIVE' AND end_date<current_date AND is_deleted=false
           AND tenant_id IS NOT DISTINCT FROM $1::uuid`,
        [getCurrentTenantId()],
    );
    const result = await pool.query(
        `SELECT subscription.id AS subscription_id,revision.id AS revision_id,
           revision.name,revision.category,
           CASE revision.category
             WHEN 'FOOD_BEVERAGE' THEN 'Makanan & Minuman' WHEN 'GROCERY' THEN 'Sembako'
             WHEN 'FASHION' THEN 'Fashion' WHEN 'HEALTH_BEAUTY' THEN 'Kesehatan & Kecantikan'
             WHEN 'SERVICE' THEN 'Jasa' WHEN 'CRAFT' THEN 'Kerajinan'
             WHEN 'ELECTRONIC' THEN 'Elektronik' WHEN 'AUTOMOTIVE' THEN 'Otomotif'
             WHEN 'AGRICULTURE' THEN 'Pertanian & Peternakan' WHEN 'EDUCATION' THEN 'Pendidikan'
             WHEN 'PROPERTY' THEN 'Properti' ELSE 'Lainnya' END AS category_label,
           revision.description,revision.address,revision.whatsapp,revision.external_url,
           subscription.start_date,subscription.end_date
         FROM ${tableNames.umkmSubscription} subscription
         INNER JOIN ${tableNames.umkm} business ON business.id=subscription.umkm_id
         INNER JOIN ${tableNames.umkmRevision} revision ON revision.id=subscription.revision_id
         WHERE subscription.status='ACTIVE' AND subscription.start_date<=current_date
           AND subscription.tenant_id IS NOT DISTINCT FROM $1::uuid
           AND subscription.end_date>=current_date AND subscription.is_deleted=false
           AND business.status='APPROVED' AND business.is_deleted=false
           AND revision.status='APPROVED' AND revision.is_deleted=false
         ORDER BY subscription.released_time DESC,subscription.created_time DESC`,
        [getCurrentTenantId()],
    );
    return { status: 200, message: "Request successful", data: result.rows };
};
export const submitPayment = async (r: UmkmSubscriptionInterface) => {
    if (!(await hasMenuPermission("OP_UMKM", PERMISSION.ACTION)))
        return { status: 403, message: "Akses ditolak", data: null };
    const client = await pool.connect();
    let stored: Awaited<ReturnType<typeof storeTenantFile>> | null = null;
    let oldFileId: string | null = null;
    try {
        if (!r.id || Number(r.amount) <= 0 || !r.payment_date || !r.payment_method)
            throw Error("Data pembayaran belum lengkap");
        const decoded = decodeProof(r);
        const tenantId = getCurrentTenantId();
        await client.query("BEGIN");
        const current = await client.query<{
            price: string;
            status: string;
            revision_status: string;
            proof_file_id: string | null;
        }>(
            `SELECT subscription.price,subscription.status,subscription.proof_file_id,
               revision.status AS revision_status
             FROM ${tableNames.umkmSubscription} subscription
             INNER JOIN ${tableNames.umkm} business ON business.id=subscription.umkm_id
             INNER JOIN ${tableNames.umkmRevision} revision ON revision.id=subscription.revision_id
             WHERE subscription.id=$1 AND business.owner_user_id=$2
               AND subscription.status IN ('DRAFT','PENDING_CONTENT_REVIEW','PAYMENT_REJECTED')
               AND subscription.tenant_id IS NOT DISTINCT FROM $3::uuid
               AND business.tenant_id IS NOT DISTINCT FROM $3::uuid
             FOR UPDATE OF subscription`,
            [r.id, getCurrentAuth()?.user_id, tenantId],
        );
        const existing = current.rows[0];
        if (!existing || Number(r.amount) !== Number(existing.price))
            throw Error("Nominal harus sama dengan harga paket");
        oldFileId = existing.proof_file_id;
        stored = await storeTenantFile(client, {
            module: "UMKM_PAYMENT",
            originalName: r.proof_original_name || `bukti.${decoded.extension}`,
            mimeType: decoded.mime,
            extension: decoded.extension,
            body: decoded.body,
        });
        const nextStatus = existing.status === "PAYMENT_REJECTED" || existing.revision_status === "APPROVED"
            ? "PENDING_PAYMENT_REVIEW"
            : existing.status === "PENDING_CONTENT_REVIEW"
                ? "PENDING_CONTENT_REVIEW"
                : "DRAFT";
        const q = await client.query(
            `UPDATE ${tableNames.umkmSubscription}
             SET amount=$3,payment_date=$4,payment_method=$5,reference_number=$6,note=$7,
                 proof_file_id=$8,proof_path=$9,proof_original_name=$10,proof_mime_type=$11,proof_size=$12,
                 status=$13,rejection_note=NULL,submitted_time=now(),updated_time=now(),updated_by_id=$2
             WHERE id=$1 AND tenant_id IS NOT DISTINCT FROM $14::uuid RETURNING *`,
            [
                r.id,
                getCurrentAuth()?.user_id,
                r.amount,
                r.payment_date,
                r.payment_method,
                r.reference_number?.trim() || null,
                r.note?.trim() || null,
                stored.id,
                stored.objectKey,
                stored.originalName,
                stored.mimeType,
                stored.size,
                nextStatus,
                tenantId,
            ],
        );
        if (q.rows[0].status === "PENDING_PAYMENT_REVIEW") await client.query(
            `INSERT INTO ${tableNames.notification}(tenant_id,user_id,type,title,message,reference_id,reference_url,created_by_id)
             SELECT $4::uuid,u.id,'UMKM_PAYMENT_SUBMITTED','Pembayaran UMKM menunggu verifikasi',$2,$1::uuid,'/umkm/verifikasi-pembayaran',$3::uuid
             FROM ${tableNames.masterUser} u JOIN ${tableNames.masterRoleMenuPermission} p ON p.role_id=u.role_id
             JOIN ${tableNames.masterMenu} m ON m.id=p.menu_id
             WHERE m.code='UMKM_PAYMENT_REVIEW' AND (p.permission_mask&4)=4
               AND p.is_deleted=false AND u.is_deleted=false
               AND u.tenant_id IS NOT DISTINCT FROM $4::uuid`,
            [
                r.id,
                `Pembayaran UMKM sebesar Rp ${Number(r.amount).toLocaleString("id-ID")} telah diajukan.`,
                getCurrentAuth()?.user_id,
                tenantId,
            ],
        );
        await client.query("COMMIT");
        if (oldFileId && oldFileId !== stored.id)
            await deleteTenantFile(oldFileId).catch(() => undefined);
        return {
            status: 200,
            message: "Pembayaran berhasil diajukan",
            data: q.rows[0],
        };
    } catch (e) {
        await client.query("ROLLBACK");
        await discardTenantFile(stored).catch(() => undefined);
        return {
            status: 400,
            message: e instanceof Error ? e.message : "Gagal mengajukan pembayaran",
            data: null,
        };
    } finally {
        client.release();
    }
};
export const loadPaymentReviews = async (
    r: BaseRequest<UmkmSubscriptionInterface>,
) => {
    if (!(await hasMenuPermission("UMKM_PAYMENT_REVIEW", PERMISSION.READ)))
        return { status: 403, message: "Akses ditolak", data: [] };
    const { p, s, o } = page(r);
    const from = `FROM ${tableNames.umkmSubscription} s JOIN ${tableNames.umkm} b ON b.id=s.umkm_id JOIN ${tableNames.umkmRevision} rev ON rev.id=s.revision_id JOIN ${tableNames.masterUser} u ON u.id=b.owner_user_id LEFT JOIN ${tableNames.masterMember} mm ON mm.id=u.member_id LEFT JOIN ${tableNames.masterFamily} f ON f.id=mm.family_id WHERE s.status='PENDING_PAYMENT_REVIEW' AND s.is_deleted=false AND s.tenant_id IS NOT DISTINCT FROM $1::uuid`;
    return {
        status: 200,
        message: "Request successful",
        data: (
            await pool.query(
                `SELECT s.*,rev.name umkm_name,u.username owner_name,f.no_kk family_no_kk ${from} ORDER BY s.submitted_time LIMIT $2 OFFSET $3`,
                [getCurrentTenantId(), s, o],
            )
        ).rows,
        metaData: {
            total: Number(
                (await pool.query(`SELECT count(*) ${from}`, [getCurrentTenantId()])).rows[0].count,
            ),
            page: p,
            pageSize: s,
        },
    };
};
export const reviewPayment = async (
    id: string | undefined,
    approve: boolean,
    note?: string | null,
) => {
    if (!(await hasMenuPermission("UMKM_PAYMENT_REVIEW", PERMISSION.ACTION)))
        return { status: 403, message: "Akses ditolak", data: null };
    if (!approve && !note?.trim())
        return { status: 400, message: "Alasan penolakan wajib diisi", data: null };
    const c = await pool.connect();
    const tenantId = getCurrentTenantId();
    try {
        await c.query("BEGIN");
        const x = (
            await c.query(
                `SELECT s.*,b.owner_user_id,b.family_id FROM ${tableNames.umkmSubscription} s
                 JOIN ${tableNames.umkm} b ON b.id=s.umkm_id
                 WHERE s.id=$1 AND s.status='PENDING_PAYMENT_REVIEW'
                   AND s.tenant_id IS NOT DISTINCT FROM $2::uuid FOR UPDATE`,
                [id, tenantId],
            )
        ).rows[0];
        if (!x) throw Error("Pembayaran tidak dapat diverifikasi");
        if (approve) {
            await c.query(
                `UPDATE ${tableNames.umkmSubscription} SET status='READY_TO_RELEASE',ready_time=now(),reviewed_time=now(),reviewed_by_id=$2,updated_time=now(),updated_by_id=$2
                 WHERE id=$1 AND tenant_id IS NOT DISTINCT FROM $3::uuid`,
                [id, getCurrentAuth()?.user_id, tenantId],
            );
            await postIncomeTransaction(c, {
                transactionType: "UMKM_ADS",
                amount: Number(x.amount),
                transactionDate: x.payment_date,
                referenceType: "UMKM_SUBSCRIPTION",
                referenceId: x.id,
                familyId: x.family_id,
                description: `Pembayaran iklan UMKM ${x.plan_name}`,
            });
        } else
            await c.query(
                `UPDATE ${tableNames.umkmSubscription} SET status='PAYMENT_REJECTED',rejection_note=$2,reviewed_time=now(),reviewed_by_id=$3,updated_time=now(),updated_by_id=$3
                 WHERE id=$1 AND tenant_id IS NOT DISTINCT FROM $4::uuid`,
                [id, note!.trim(), getCurrentAuth()?.user_id, tenantId],
            );
        await c.query(
            `INSERT INTO ${tableNames.notification}(tenant_id,user_id,type,title,message,reference_id,reference_url,created_by_id)
             VALUES($7::uuid,$1,$2,$3,$4,$5::uuid,'/operation/umkm',$6::uuid)`,
            [
                x.owner_user_id,
                approve ? "UMKM_PAYMENT_APPROVED" : "UMKM_PAYMENT_REJECTED",
                approve ? "Pembayaran UMKM disetujui" : "Pembayaran UMKM ditolak",
                approve
                    ? "Pembayaran disetujui. Iklan siap Anda rilis."
                    : `Pembayaran ditolak: ${note}`,
                id,
                getCurrentAuth()?.user_id,
                tenantId,
            ],
        );
        await c.query("COMMIT");
        return {
            status: 200,
            message: approve ? "Pembayaran disetujui" : "Pembayaran ditolak",
            data: null,
        };
    } catch (e) {
        await c.query("ROLLBACK");
        return {
            status: 409,
            message: e instanceof Error ? e.message : "Verifikasi gagal",
            data: null,
        };
    } finally {
        c.release();
    }
};

export const releaseSubscription = async (id?: string | null) => {
    if (!(await hasMenuPermission("OP_UMKM", PERMISSION.ACTION)))
        return { status: 403, message: "Akses ditolak", data: null };
    const client = await pool.connect();
    const tenantId = getCurrentTenantId();
    try {
        await client.query("BEGIN");
        const subscription = (
            await client.query(
                `SELECT subscription.id,subscription.umkm_id,subscription.duration_days
                 FROM ${tableNames.umkmSubscription} subscription
                 INNER JOIN ${tableNames.umkm} business ON business.id=subscription.umkm_id
                  WHERE subscription.id=$1 AND business.owner_user_id=$2
                    AND subscription.status='READY_TO_RELEASE' AND subscription.is_deleted=false
                    AND subscription.tenant_id IS NOT DISTINCT FROM $3::uuid FOR UPDATE`,
                [id, getCurrentAuth()?.user_id, tenantId],
            )
        ).rows[0];
        if (!subscription) throw new Error("Iklan belum siap dirilis");
        const active = await client.query(
            `SELECT 1 FROM ${tableNames.umkmSubscription}
             WHERE umkm_id=$1 AND status='ACTIVE' AND end_date>=current_date AND is_deleted=false
               AND tenant_id IS NOT DISTINCT FROM $2::uuid FOR UPDATE`,
            [subscription.umkm_id, tenantId],
        );
        if (active.rowCount) throw new Error("Masih ada subscription aktif");
        await client.query(
            `UPDATE ${tableNames.umkmSubscription}
             SET status='ACTIVE',released_time=now(),start_date=current_date,
                 end_date=current_date+(duration_days-1),updated_time=now(),updated_by_id=$2
             WHERE id=$1 AND tenant_id IS NOT DISTINCT FROM $3::uuid`,
            [id, getCurrentAuth()?.user_id, tenantId],
        );
        await client.query("COMMIT");
        return { status: 200, message: "Iklan berhasil dirilis", data: null };
    } catch (error) {
        await client.query("ROLLBACK");
        return {
            status: 409,
            message: error instanceof Error ? error.message : "Iklan gagal dirilis",
            data: null,
        };
    } finally {
        client.release();
    }
};
export const getSubscriptionProof = async (id: string) => {
    const q = await pool.query(
        `SELECT s.*,b.owner_user_id FROM ${tableNames.umkmSubscription} s
         JOIN ${tableNames.umkm} b ON b.id=s.umkm_id
         WHERE s.id=$1 AND s.is_deleted=false
           AND s.tenant_id IS NOT DISTINCT FROM $2::uuid`,
        [id, getCurrentTenantId()],
    ),
        x = q.rows[0];
    if (!x?.proof_file_id) return null;
    if (
        x.owner_user_id !== getCurrentAuth()?.user_id &&
        !(await hasMenuPermission("UMKM_PAYMENT_REVIEW", PERMISSION.READ))
    ) return null;
    return getTenantFile(x.proof_file_id);
};
