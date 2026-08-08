import type {
  BaseRequest,
  UmkmCategory,
  UmkmCategoryOption,
  UmkmInterface,
} from "@monorepo/types";
import type { PoolClient } from "pg";
import { tableNames } from "../config";
import { pool } from "../connection/db";
import { getCurrentAuth } from "../utils/request-context";
import { addTenantScope, getCurrentTenantId } from "../utils/tenant-scope";
import { hasMenuPermission, PERMISSION } from "../utils/rbac";
import { deleteTenantFile, discardTenantFile, getTenantFile, storeTenantFile } from "./file-object-service";

export const UMKM_CATEGORIES: UmkmCategoryOption[] = [
  ["FOOD_BEVERAGE", "Makanan & Minuman"],
  ["GROCERY", "Sembako"],
  ["FASHION", "Fashion"],
  ["HEALTH_BEAUTY", "Kesehatan & Kecantikan"],
  ["SERVICE", "Jasa"],
  ["CRAFT", "Kerajinan"],
  ["ELECTRONIC", "Elektronik"],
  ["AUTOMOTIVE", "Otomotif"],
  ["AGRICULTURE", "Pertanian & Peternakan"],
  ["EDUCATION", "Pendidikan"],
  ["PROPERTY", "Properti"],
  ["OTHER", "Lainnya"],
].map(([value, label]) => ({ value: value as UmkmCategory, label }));
const categoryCodes = new Set(UMKM_CATEGORIES.map((item) => item.value));
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const ACTION = 4;
const REVIEW_MENU_CODE = "UMKM_CONTENT_REVIEW";

// const hasMenuPermission = async (permissionBit: number) => {
//   const result = await pool.query(
//     `SELECT 1 FROM ${tableNames.masterRoleMenuPermission} permission
//      INNER JOIN ${tableNames.masterMenu} menu ON menu.id = permission.menu_id
//      WHERE permission.role_id = $1 AND menu.code = $2
//        AND permission.is_deleted = false AND permission.is_active = true
//        AND menu.is_deleted = false AND menu.is_active = true
//        AND (permission.permission_mask & $3) = $3 LIMIT 1`,
//     [getCurrentAuth()?.role_id, REVIEW_MENU_CODE, permissionBit],
//   );
//   return Boolean(result.rowCount);
// };

const getUserFamily = async (client: PoolClient, userId?: string | null) => {
  const result = await client.query<{ family_id: string | null }>(
    `SELECT member.family_id FROM ${tableNames.masterUser} users
     LEFT JOIN ${tableNames.masterMember} member ON member.id = users.member_id
     WHERE users.id = $1 AND users.tenant_id IS NOT DISTINCT FROM $2::uuid`,
    [userId, getCurrentTenantId()],
  );
  return result.rows[0]?.family_id || null;
};

const decodeImage = (data?: string | null) => {
  const match = data?.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Gambar UMKM tidak valid");
  const mime = match[1] || "";
  const buffer = Buffer.from(match[2] || "", "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_SIZE)
    throw new Error("Ukuran gambar maksimal 2 MB");
  const jpeg =
    mime === "image/jpeg" &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;
  const png =
    mime === "image/png" &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (!jpeg && !png) throw new Error("Gambar hanya boleh berupa JPEG atau PNG");
  return { buffer, mime, extension: jpeg ? "jpg" : "png" };
};

const saveImage = async (client: PoolClient, request: UmkmInterface) => {
  const image = decodeImage(request.image_data);
  return storeTenantFile(client, {
    module: "UMKM_IMAGE",
    originalName: request.image_original_name || `umkm.${image.extension}`,
    mimeType: image.mime,
    extension: image.extension,
    body: image.buffer,
  });
};

const validate = (request: UmkmInterface) => {
  if (
    !request.name?.trim() ||
    !request.category ||
    !categoryCodes.has(request.category) ||
    !request.description?.trim() ||
    !request.address?.trim() ||
    !request.whatsapp?.trim()
  )
    throw new Error("Data UMKM belum lengkap");
  if (!/^\+?[0-9]{9,15}$/.test(request.whatsapp.replace(/[\s-]/g, "")))
    throw new Error("Nomor WhatsApp tidak valid");
  if (request.external_url) {
    try {
      new URL(request.external_url);
    } catch {
      throw new Error("Tautan eksternal tidak valid");
    }
  }
};

const categoryCase = `CASE revision.category ${UMKM_CATEGORIES.map((item) => `WHEN '${item.value}' THEN '${item.label.replaceAll("'", "''")}'`).join(" ")} ELSE revision.category END`;
const selectedRevisionJoin = `LEFT JOIN LATERAL (
  SELECT candidate.* FROM ${tableNames.umkmRevision} candidate WHERE candidate.umkm_id = business.id AND candidate.is_deleted = false
    AND candidate.tenant_id IS NOT DISTINCT FROM business.tenant_id
  ORDER BY CASE candidate.status WHEN 'DRAFT' THEN 1 WHEN 'PENDING_REVIEW' THEN 2 WHEN 'REJECTED' THEN 3 WHEN 'APPROVED' THEN 4 ELSE 5 END, candidate.version_no DESC LIMIT 1
) revision ON true`;

export const loadMyUmkmService = async (
  request: BaseRequest<UmkmInterface>,
) => {
  if (!(await hasMenuPermission("OP_UMKM", PERMISSION.READ)))
    return { status: 403, message: "Akses ditolak", data: [] };
  const page = Math.max(Number(request.metadata?.page || 1), 1);
  const pageSize = Math.min(
    Math.max(Number(request.metadata?.pageSize || 10), 1),
    100,
  );
  const offset = (page - 1) * pageSize;
  const values: unknown[] = [getCurrentAuth()?.user_id];
  const where = ["business.owner_user_id = $1", "business.is_deleted = false", addTenantScope(values, "business.tenant_id")];
  if (request.params?.name) {
    values.push(`%${request.params.name}%`);
    where.push(`revision.name ILIKE $${values.length}`);
  }
  if (request.params?.status) {
    values.push(request.params.status);
    where.push(`revision.status = $${values.length}`);
  }
  const clause = `WHERE ${where.join(" AND ")}`;
  const count = await pool.query(
    `SELECT COUNT(*) FROM ${tableNames.umkm} business ${selectedRevisionJoin} ${clause}`,
    values,
  );
  values.push(pageSize, offset);
  const data = await pool.query<UmkmInterface>(
    `SELECT business.id, business.owner_user_id, business.family_id, business.approved_revision_id,business.status AS operational_status,
      revision.id AS revision_id, revision.version_no, revision.name, revision.category, ${categoryCase} AS category_label,
      revision.description, revision.address, revision.whatsapp, revision.external_url, revision.image_original_name,
      revision.image_mime_type, revision.image_size, revision.status, revision.review_note, revision.reviewed_time, revision.created_time,
      subscription.id AS subscription_id,subscription.plan_id,subscription.status AS subscription_status
     FROM ${tableNames.umkm} business ${selectedRevisionJoin}
     LEFT JOIN LATERAL (SELECT * FROM ${tableNames.umkmSubscription} candidate WHERE candidate.revision_id=revision.id AND candidate.is_deleted=false ORDER BY candidate.created_time DESC LIMIT 1) subscription ON true
     ${clause}
     ORDER BY business.created_time DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
  return {
    status: 200,
    message: "Request successful",
    data: data.rows,
    metaData: { total: Number(count.rows[0]?.count || 0), page, pageSize },
  };
};

export const saveUmkmDraftService = async (request: UmkmInterface) => {
  const requiredPermission = request.id ? PERMISSION.EDIT : PERMISSION.ADD;
  if (!(await hasMenuPermission("OP_UMKM", requiredPermission)))
    return { status: 403, message: "Akses ditolak", data: null };
  try {
    validate(request);
  } catch (error) {
    return { status: 400, message: (error as Error).message, data: null };
  }
  const client = await pool.connect();
  let savedImage: Awaited<ReturnType<typeof saveImage>> | null = null;
  try {
    await client.query("BEGIN");
    if (request.image_data) savedImage = await saveImage(client, request);
    const userId = getCurrentAuth()?.user_id;
    const tenantId = getCurrentTenantId();
    const familyId = await getUserFamily(client, userId);
    if (!familyId) throw new Error("Akun belum terhubung dengan keluarga");
    let businessId = request.id;
    if (!businessId) {
      const business = await client.query<{ id: string }>(
        `INSERT INTO ${tableNames.umkm} (tenant_id,owner_user_id,family_id,created_by_id)
         VALUES ($1,$2,$3,$2) RETURNING id`,
        [tenantId, userId, familyId],
      );
      businessId = business.rows[0]!.id;
    } else {
      const owned = await client.query(
        `SELECT id FROM ${tableNames.umkm}
         WHERE id = $1 AND owner_user_id = $2 AND is_deleted = false
           AND tenant_id IS NOT DISTINCT FROM $3::uuid FOR UPDATE`,
        [businessId, userId, tenantId],
      );
      if (!owned.rowCount) throw new Error("UMKM tidak ditemukan");
    }
    const current = await client.query<any>(
      `SELECT * FROM ${tableNames.umkmRevision}
       WHERE umkm_id = $1 AND is_deleted = false
         AND tenant_id IS NOT DISTINCT FROM $2::uuid
       ORDER BY version_no DESC LIMIT 1 FOR UPDATE`,
      [businessId, tenantId],
    );
    const revision = current.rows[0];
    if (revision?.status === "PENDING_REVIEW")
      throw new Error("UMKM sedang menunggu verifikasi");
    const image = savedImage || revision;
    if (!image?.objectKey && !image?.image_path)
      throw new Error("Gambar UMKM wajib diunggah");
    const params = [
      request.name!.trim(),
      request.category,
      request.description!.trim(),
      request.address!.trim(),
      request.whatsapp!.replace(/[\s-]/g, ""),
      request.external_url?.trim() || null,
      savedImage?.objectKey || revision.image_path,
      savedImage?.id || revision.image_file_id,
      savedImage?.originalName || revision.image_original_name,
      savedImage?.mimeType || revision.image_mime_type,
      savedImage?.size || revision.image_size,
      userId,
    ];
    let result;
    if (revision?.status === "DRAFT") {
      result = await client.query<UmkmInterface>(
        `UPDATE ${tableNames.umkmRevision} SET name=$1,category=$2,description=$3,address=$4,whatsapp=$5,external_url=$6,image_path=$7,image_file_id=$8,image_original_name=$9,image_mime_type=$10,image_size=$11,updated_time=now(),updated_by_id=$12
         WHERE id=$13 AND tenant_id IS NOT DISTINCT FROM $14::uuid RETURNING id AS revision_id,*`,
        [...params, revision.id, tenantId],
      );
    } else {
      result = await client.query<UmkmInterface>(
        `INSERT INTO ${tableNames.umkmRevision} (tenant_id,umkm_id,version_no,name,category,description,address,whatsapp,external_url,image_path,image_file_id,image_original_name,image_mime_type,image_size,created_by_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id AS revision_id,*`,
        [tenantId, businessId, Number(revision?.version_no || 0) + 1, ...params],
      );
    }
    const revisionId = result.rows[0]?.revision_id;
    if (revision?.status === "REJECTED")
      await client.query(
        `UPDATE ${tableNames.umkmSubscription}
         SET revision_id=$2,status='DRAFT',rejection_note=NULL,updated_time=now(),updated_by_id=$3
         WHERE revision_id=$1 AND status='CONTENT_REJECTED' AND is_deleted=false
           AND tenant_id IS NOT DISTINCT FROM $4::uuid`,
        [revision.id, revisionId, userId, tenantId],
      );
    if (!request.id && !request.plan_id)
      throw new Error("Paket subscription wajib dipilih");
    if (request.plan_id) {
      const plan = await client.query(
        `SELECT id,name,price,duration_days FROM ${tableNames.umkmSubscriptionPlan}
         WHERE id=$1 AND is_active=true AND is_deleted=false`,
        [request.plan_id],
      );
      if (!plan.rows[0]) throw new Error("Paket subscription tidak tersedia");
      await client.query(
        `INSERT INTO ${tableNames.umkmSubscription}
         (tenant_id,umkm_id,revision_id,plan_id,plan_name,price,duration_days,status,created_by_id)
         VALUES($8,$1,$2,$3,$4,$5,$6,'DRAFT',$7)
         ON CONFLICT (revision_id) WHERE status IN ('DRAFT','PENDING_CONTENT_REVIEW','CONTENT_REJECTED','PENDING_PAYMENT_REVIEW','PAYMENT_REJECTED','READY_TO_RELEASE') AND is_deleted=false
         DO UPDATE SET plan_id=EXCLUDED.plan_id,plan_name=EXCLUDED.plan_name,price=EXCLUDED.price,
           duration_days=EXCLUDED.duration_days,updated_time=now(),updated_by_id=EXCLUDED.created_by_id`,
        [businessId, revisionId, plan.rows[0].id, plan.rows[0].name, plan.rows[0].price, plan.rows[0].duration_days, userId, tenantId],
      );
    }
    await client.query(
      `UPDATE ${tableNames.umkm}
       SET status=CASE WHEN approved_revision_id IS NULL THEN 'DRAFT' ELSE status END,
          updated_time=now(),updated_by_id=$2
        WHERE id=$1 AND tenant_id IS NOT DISTINCT FROM $3::uuid`,
      [businessId, userId, tenantId],
    );
    await client.query("COMMIT");
    if (savedImage && revision?.image_file_id && revision.image_file_id !== savedImage.id) {
      await deleteTenantFile(revision.image_file_id).catch(() => undefined);
    }
    return {
      status: request.id ? 200 : 201,
      message: "Draft UMKM berhasil disimpan",
      data: { ...result.rows[0], id: businessId },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    await discardTenantFile(savedImage).catch(() => undefined);
    return {
      status: 400,
      message: error instanceof Error ? error.message : "Gagal menyimpan UMKM",
      data: null,
    };
  } finally {
    client.release();
  }
};

export const submitUmkmService = async (id?: string | null) => {
  if (!(await hasMenuPermission("OP_UMKM", PERMISSION.ACTION)))
    return { status: 403, message: "Akses ditolak", data: null };
  const client = await pool.connect();
  const tenantId = getCurrentTenantId();
  try {
    await client.query("BEGIN");
    const eligible = await client.query<{ revision_id: string; name: string; subscription_id: string | null }>(
      `SELECT revision.id AS revision_id,revision.name,subscription.id AS subscription_id
       FROM ${tableNames.umkmRevision} revision
       INNER JOIN ${tableNames.umkm} business ON business.id=revision.umkm_id
       LEFT JOIN ${tableNames.umkmSubscription} subscription ON subscription.revision_id=revision.id AND subscription.is_deleted=false
        WHERE business.id=$1 AND business.owner_user_id=$2 AND revision.status='DRAFT'
          AND business.tenant_id IS NOT DISTINCT FROM $3::uuid
          AND revision.tenant_id IS NOT DISTINCT FROM $3::uuid
         AND (business.approved_revision_id IS NOT NULL OR
           (subscription.status='DRAFT' AND subscription.proof_path IS NOT NULL AND subscription.amount=subscription.price))
         AND revision.is_deleted=false
       FOR UPDATE OF revision,business`,
      [id, getCurrentAuth()?.user_id, tenantId],
    );
    if (!eligible.rows[0]) throw new Error("Paket dan bukti pembayaran wajib dilengkapi sebelum pengajuan");
    const result = await client.query<{ revision_id: string; name: string }>(
      `UPDATE ${tableNames.umkmRevision} revision SET status='PENDING_REVIEW',updated_time=now(),updated_by_id=$2
       FROM ${tableNames.umkm} business WHERE revision.umkm_id=business.id AND business.id=$1 AND business.owner_user_id=$2
       AND revision.status='DRAFT' AND revision.is_deleted=false
       AND business.tenant_id IS NOT DISTINCT FROM $3::uuid
       AND revision.tenant_id IS NOT DISTINCT FROM $3::uuid RETURNING revision.id AS revision_id,revision.name`,
      [id, getCurrentAuth()?.user_id, tenantId],
    );
    if (!result.rows[0]) throw new Error("Draft UMKM tidak dapat diajukan");
    if (eligible.rows[0].subscription_id)
      await client.query(
        `UPDATE ${tableNames.umkmSubscription} SET status='PENDING_CONTENT_REVIEW',submitted_time=now(),updated_time=now(),updated_by_id=$2
         WHERE id=$1 AND tenant_id IS NOT DISTINCT FROM $3::uuid`,
        [eligible.rows[0].subscription_id, getCurrentAuth()?.user_id, tenantId],
      );
    await client.query(
      `UPDATE ${tableNames.umkm}
       SET status=CASE WHEN approved_revision_id IS NULL THEN 'PENDING_REVIEW' ELSE status END,
          updated_time=now(),updated_by_id=$2
        WHERE id=$1 AND tenant_id IS NOT DISTINCT FROM $3::uuid`,
      [id, getCurrentAuth()?.user_id, tenantId],
    );
    await client.query(
      `INSERT INTO ${tableNames.notification} (tenant_id,user_id,type,title,message,reference_id,reference_url,created_by_id)
       SELECT $6::uuid,users.id,'UMKM_CONTENT_SUBMITTED','Konten UMKM menunggu verifikasi',$2,$1::uuid,'/umkm/verifikasi-content',$3::uuid
       FROM ${tableNames.masterUser} users INNER JOIN ${tableNames.masterRoleMenuPermission} permission ON permission.role_id=users.role_id
       INNER JOIN ${tableNames.masterMenu} menu ON menu.id=permission.menu_id WHERE menu.code=$4 AND (permission.permission_mask & $5)=$5
       AND users.is_active=true AND users.is_deleted=false AND permission.is_deleted=false
       AND users.tenant_id IS NOT DISTINCT FROM $6::uuid`,
      [
        result.rows[0].revision_id,
        `UMKM ${result.rows[0].name} telah diajukan.`,
        getCurrentAuth()?.user_id,
        REVIEW_MENU_CODE,
        ACTION,
        tenantId,
      ],
    );
    await client.query("COMMIT");
    return { status: 200, message: "UMKM berhasil diajukan", data: null };
  } catch (error) {
    await client.query("ROLLBACK");
    return {
      status: 409,
      message: error instanceof Error ? error.message : "Gagal mengajukan UMKM",
      data: null,
    };
  } finally {
    client.release();
  }
};

export const setUmkmSuspendedService = async (id?: string | null, suspended = true) => {
  if (!(await hasMenuPermission("OP_UMKM", PERMISSION.ACTION)))
    return { status: 403, message: "Akses ditolak", data: null };
  const result = await pool.query(
    `UPDATE ${tableNames.umkm}
     SET status=$3,updated_time=now(),updated_by_id=$2
     WHERE id=$1 AND owner_user_id=$2 AND approved_revision_id IS NOT NULL AND is_deleted=false
       AND tenant_id IS NOT DISTINCT FROM $4::uuid
     RETURNING id`,
    [id, getCurrentAuth()?.user_id, suspended ? "SUSPENDED" : "APPROVED", getCurrentTenantId()],
  );
  return {
    status: result.rows[0] ? 200 : 404,
    message: result.rows[0]
      ? suspended ? "UMKM ditangguhkan" : "UMKM diaktifkan kembali"
      : "UMKM tidak ditemukan",
    data: null,
  };
};

export const loadUmkmReviewService = async (
  request: BaseRequest<UmkmInterface>,
) => {
  if (!(await hasMenuPermission(REVIEW_MENU_CODE, PERMISSION.READ)))
    return { status: 403, message: "Akses ditolak", data: [] };
  const page = Math.max(Number(request.metadata?.page || 1), 1),
    pageSize = Math.min(
      Math.max(Number(request.metadata?.pageSize || 10), 1),
      100,
    ),
    offset = (page - 1) * pageSize;
  const values: unknown[] = [];
  const where = [
    "revision.status='PENDING_REVIEW'",
    "revision.is_deleted=false",
    "business.is_deleted=false",
    addTenantScope(values, "revision.tenant_id"),
  ];
  if (request.params?.name) {
    values.push(`%${request.params.name}%`);
    where.push(`revision.name ILIKE $${values.length}`);
  }
  const clause = `WHERE ${where.join(" AND ")}`;
  const joins = `INNER JOIN ${tableNames.umkm} business ON business.id=revision.umkm_id INNER JOIN ${tableNames.masterUser} users ON users.id=business.owner_user_id INNER JOIN ${tableNames.masterFamily} family ON family.id=business.family_id`;
  const count = await pool.query(
    `SELECT COUNT(*) FROM ${tableNames.umkmRevision} revision ${joins} ${clause}`,
    values,
  );
  values.push(pageSize, offset);
  const data = await pool.query<UmkmInterface>(
    `SELECT business.id,revision.id AS revision_id,revision.*,users.username AS owner_name,family.no_kk AS family_no_kk,${categoryCase} AS category_label FROM ${tableNames.umkmRevision} revision ${joins} ${clause} ORDER BY revision.created_time ASC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
  return {
    status: 200,
    message: "Request successful",
    data: data.rows,
    metaData: { total: Number(count.rows[0]?.count || 0), page, pageSize },
  };
};

export const reviewUmkmService = async (
  revisionId?: string | null,
  approve = true,
  note?: string | null,
) => {
  if (!(await hasMenuPermission(REVIEW_MENU_CODE, PERMISSION.ACTION)))
    return { status: 403, message: "Anda tidak memiliki permission ACTION", data: null };
  if (!approve && !note?.trim())
    return { status: 400, message: "Alasan penolakan wajib diisi", data: null };
  const client = await pool.connect();
  const tenantId = getCurrentTenantId();
  try {
    await client.query("BEGIN");
    const revisionResult = await client.query<any>(
      `SELECT revision.*,business.owner_user_id,business.approved_revision_id
       FROM ${tableNames.umkmRevision} revision
       INNER JOIN ${tableNames.umkm} business ON business.id=revision.umkm_id
       WHERE revision.id=$1 AND revision.status='PENDING_REVIEW'
         AND revision.tenant_id IS NOT DISTINCT FROM $2::uuid
         AND business.tenant_id IS NOT DISTINCT FROM $2::uuid FOR UPDATE`,
      [revisionId, tenantId],
    );
    const revision = revisionResult.rows[0];
    if (!revision) throw new Error("Konten tidak dapat diverifikasi");
    if (approve) {
      if (revision.approved_revision_id)
        await client.query(
          `UPDATE ${tableNames.umkmRevision} SET status='SUPERSEDED',updated_time=now()
           WHERE id=$1 AND tenant_id IS NOT DISTINCT FROM $2::uuid`,
          [revision.approved_revision_id, tenantId],
        );
      await client.query(
        `UPDATE ${tableNames.umkmRevision} SET status='APPROVED',review_note=$2,reviewed_time=now(),reviewed_by_id=$3,updated_time=now(),updated_by_id=$3
         WHERE id=$1 AND tenant_id IS NOT DISTINCT FROM $4::uuid`,
        [revisionId, note?.trim() || null, getCurrentAuth()?.user_id, tenantId],
      );
      await client.query(
        `UPDATE ${tableNames.umkm}
         SET status=CASE WHEN status='SUSPENDED' THEN 'SUSPENDED' ELSE 'APPROVED' END,
           approved_revision_id=$2,updated_time=now(),updated_by_id=$3
         WHERE id=$1 AND tenant_id IS NOT DISTINCT FROM $4::uuid`,
        [revision.umkm_id, revisionId, getCurrentAuth()?.user_id, tenantId],
      );
      const subscription = await client.query(
        `UPDATE ${tableNames.umkmSubscription}
         SET status='PENDING_PAYMENT_REVIEW',updated_time=now(),updated_by_id=$2
         WHERE revision_id=$1 AND status='PENDING_CONTENT_REVIEW' AND is_deleted=false
           AND tenant_id IS NOT DISTINCT FROM $3::uuid RETURNING id`,
        [revisionId, getCurrentAuth()?.user_id, tenantId],
      );
      if (subscription.rows[0])
        await client.query(
          `INSERT INTO ${tableNames.notification}(tenant_id,user_id,type,title,message,reference_id,reference_url,created_by_id)
           SELECT $5::uuid,users.id,'UMKM_PAYMENT_REVIEW_REQUIRED','Pembayaran UMKM menunggu verifikasi',
             $2,$1::uuid,'/umkm/verifikasi-pembayaran',$3::uuid
           FROM ${tableNames.masterUser} users
           INNER JOIN ${tableNames.masterRoleMenuPermission} permission ON permission.role_id=users.role_id
           INNER JOIN ${tableNames.masterMenu} menu ON menu.id=permission.menu_id
           WHERE menu.code='UMKM_PAYMENT_REVIEW' AND (permission.permission_mask & $4)=$4
             AND permission.is_deleted=false AND permission.is_active=true
              AND users.is_deleted=false AND users.is_active=true
              AND users.tenant_id IS NOT DISTINCT FROM $5::uuid`,
          [subscription.rows[0].id, `Pembayaran UMKM ${revision.name} siap diperiksa.`, getCurrentAuth()?.user_id, ACTION, tenantId],
        );
      if (!subscription.rowCount)
        await client.query(
          `UPDATE ${tableNames.umkmSubscription}
           SET revision_id=$2,updated_time=now(),updated_by_id=$3
           WHERE umkm_id=$1 AND status='ACTIVE' AND is_deleted=false
             AND tenant_id IS NOT DISTINCT FROM $4::uuid`,
          [revision.umkm_id, revisionId, getCurrentAuth()?.user_id, tenantId],
        );
    } else {
      await client.query(
        `UPDATE ${tableNames.umkmRevision} SET status='REJECTED',review_note=$2,reviewed_time=now(),reviewed_by_id=$3,updated_time=now(),updated_by_id=$3
         WHERE id=$1 AND tenant_id IS NOT DISTINCT FROM $4::uuid`,
        [revisionId, note!.trim(), getCurrentAuth()?.user_id, tenantId],
      );
      await client.query(
        `UPDATE ${tableNames.umkm} SET status=CASE WHEN approved_revision_id IS NULL THEN 'REJECTED' ELSE 'APPROVED' END,updated_time=now(),updated_by_id=$2
         WHERE id=$1 AND tenant_id IS NOT DISTINCT FROM $3::uuid`,
        [revision.umkm_id, getCurrentAuth()?.user_id, tenantId],
      );
      await client.query(
        `UPDATE ${tableNames.umkmSubscription}
         SET status='CONTENT_REJECTED',rejection_note=$2,updated_time=now(),updated_by_id=$3
         WHERE revision_id=$1 AND status='PENDING_CONTENT_REVIEW' AND is_deleted=false
           AND tenant_id IS NOT DISTINCT FROM $4::uuid`,
        [revisionId, note!.trim(), getCurrentAuth()?.user_id, tenantId],
      );
    }
    await client.query(
      `INSERT INTO ${tableNames.notification}(tenant_id,user_id,type,title,message,reference_id,reference_url,created_by_id)
       VALUES($7::uuid,$1,$2,$3,$4,$5::uuid,'/operation/umkm',$6::uuid)`,
      [
        revision.owner_user_id,
        approve ? "UMKM_CONTENT_APPROVED" : "UMKM_CONTENT_REJECTED",
        approve ? "Konten UMKM disetujui" : "Konten UMKM ditolak",
        approve
          ? `UMKM ${revision.name} telah disetujui.`
          : `UMKM ${revision.name} ditolak: ${note}`,
        revisionId,
        getCurrentAuth()?.user_id,
        tenantId,
      ],
    );
    await client.query("COMMIT");
    return {
      status: 200,
      message: approve ? "Konten UMKM disetujui" : "Konten UMKM ditolak",
      data: null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    return {
      status: 409,
      message: error instanceof Error ? error.message : "Verifikasi gagal",
      data: null,
    };
  } finally {
    client.release();
  }
};

export const getUmkmImageService = async (revisionId?: string | null) => {
  const result = await pool.query<any>(
    `SELECT revision.*,business.owner_user_id FROM ${tableNames.umkmRevision} revision
     INNER JOIN ${tableNames.umkm} business ON business.id=revision.umkm_id
     WHERE revision.id=$1 AND revision.is_deleted=false
       AND revision.tenant_id IS NOT DISTINCT FROM $2::uuid`,
    [revisionId, getCurrentTenantId()],
  );
  const row = result.rows[0];
  if (!row) return null;
  const allowed =
    row.owner_user_id === getCurrentAuth()?.user_id ||
    row.status === "APPROVED" ||
    (await hasMenuPermission(REVIEW_MENU_CODE, PERMISSION.READ));
  if (!allowed) return null;
  return getTenantFile(row.image_file_id);
};
