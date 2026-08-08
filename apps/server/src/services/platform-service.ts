import type {
  AuthTokenPayload,
  BaseResponse,
  CreateTenantRequest,
  CreateTenantResponse,
  PlatformLoginRequest,
  PlatformLoginResponse,
  PlatformAuditLogInterface,
  PlatformTenantDetailInterface,
  PlatformTenantListItem,
  PlatformTenantStatusRequest,
  PlatformUserInterface,
  TenantInterface,
  BaseRequest,
} from "@monorepo/types";

import { tableNames } from "../config";
import { logger } from "../config/logger";
import { pool } from "../connection/db";
import { signPlatformJwt } from "../utils/jwt";
import { hashPassword, verifyPassword } from "../utils/password";

interface PlatformUserRow extends PlatformUserInterface {
  password: string;
}

interface OnboardingPlanRow {
  code: string;
  id: string;
  name: string;
  price: number;
}

const paging = (request: BaseRequest) => {
  const page = Math.max(Number(request.metadata?.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(request.metadata?.pageSize || 10), 1), 100);
  return { offset: (page - 1) * pageSize, page, pageSize };
};

const normalizeSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const toPlatformUser = (user: PlatformUserRow): PlatformUserInterface => ({
  email: user.email,
  id: user.id,
  role_code: user.role_code,
  role_id: user.role_id,
  role_name: user.role_name,
  username: user.username,
});

export const platformLoginService = async (
  request: PlatformLoginRequest,
): Promise<BaseResponse<null | PlatformLoginResponse>> => {
  try {
    const credential = (request.username || request.email)
      ?.trim()
      .toLowerCase();
    if (!credential || !request.password) {
      return {
        data: null,
        message: "Credential platform belum lengkap",
        status: 400,
      };
    }

    const result = await pool.query<PlatformUserRow>(
      `SELECT platform_user.id,platform_user.username,platform_user.email,platform_user.password,
              platform_user.role_id,role.code AS role_code,role.name AS role_name
       FROM m_platform_user platform_user
       INNER JOIN m_platform_role role ON role.id=platform_user.role_id
       WHERE (lower(platform_user.username)=$1 OR lower(platform_user.email)=$1)
         AND platform_user.status='ACTIVE' AND platform_user.is_deleted=false
         AND role.is_active=true AND role.is_deleted=false
       LIMIT 1`,
      [credential],
    );
    const user = result.rows[0];

    if (!user || !verifyPassword(request.password, user.password)) {
      return {
        data: null,
        message: "Akun atau password platform tidak valid",
        status: 401,
      };
    }

    await pool.query(
      "UPDATE m_platform_user SET last_login_time=now() WHERE id=$1",
      [user.id],
    );

    return {
      data: {
        access_token: signPlatformJwt({
          email: user.email,
          role_code: user.role_code,
          role_id: user.role_id,
          sub: user.id,
          user_id: user.id,
          username: user.username,
        }),
        user: toPlatformUser(user),
      },
      message: "Request successful",
      status: 200,
    };
  } catch (error) {
    logger.error({ err: error }, "Platform login failed");
    return {
      data: null,
      message: "Unable to handle platform login",
      status: 500,
    };
  }
};

export const createTenantService = async (
  auth: AuthTokenPayload,
  request: CreateTenantRequest,
): Promise<BaseResponse<CreateTenantResponse | null>> => {
  const code = request.code?.trim().toUpperCase();
  const name = request.name?.trim();
  const slug = normalizeSlug(request.slug || request.name || "");
  const adminUsername = request.admin_username?.trim().toLowerCase();
  const adminEmail = request.admin_email?.trim().toLowerCase();

  if (
    !code ||
    !name ||
    !slug ||
    !adminUsername ||
    !adminEmail ||
    !request.admin_password
  ) {
    return {
      data: null,
      message: "Data tenant dan Admin belum lengkap",
      status: 400,
    };
  }
  if (request.admin_password.length < 8) {
    return {
      data: null,
      message: "Password Admin minimal 8 karakter",
      status: 400,
    };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      "homehub:create-tenant",
    ]);

    const duplicateTenant = await client.query(
      `SELECT 1 FROM m_tenant
       WHERE (lower(code)=lower($1) OR lower(slug)=lower($2)) AND is_deleted=false LIMIT 1`,
      [code, slug],
    );
    if (duplicateTenant.rowCount) {
      await client.query("ROLLBACK");
      return {
        data: null,
        message: "Kode atau slug tenant sudah digunakan",
        status: 409,
      };
    }

    const duplicateUser = await client.query(
      `SELECT 1 FROM m_user
       WHERE (lower(username)=lower($1) OR lower(email)=lower($2)) AND is_deleted=false LIMIT 1`,
      [adminUsername, adminEmail],
    );
    if (duplicateUser.rowCount) {
      await client.query("ROLLBACK");
      return {
        data: null,
        message: "Username atau email Admin sudah digunakan",
        status: 409,
      };
    }

    const adminRole = await client.query<{ id: string }>(
      "SELECT id FROM m_role WHERE code='ADM' AND is_active=true AND is_deleted=false LIMIT 1",
    );
    if (!adminRole.rows[0]) {
      throw new Error("Role Admin tenant belum tersedia");
    }

    const planResult = await client.query<OnboardingPlanRow>(
      `SELECT id,code,name,price::float8 AS price
       FROM ${tableNames.platformPlan}
       WHERE (($1<>'' AND id::text=$1) OR ($1='' AND code='FREE'))
         AND status='ACTIVE' AND is_deleted=false
       LIMIT 1`,
      [request.plan_id?.trim() || ""],
    );
    const plan = planResult.rows[0];
    if (!plan) {
      await client.query("ROLLBACK");
      return {
        data: null,
        message: "Paket onboarding tidak tersedia atau sedang nonaktif",
        status: 400,
      };
    }

    const tenantResult = await client.query<TenantInterface>(
      `INSERT INTO m_tenant
       (code,slug,name,address,contact_name,contact_email,contact_phone,created_by_platform_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id,code,slug,name,address,contact_name,contact_email,contact_phone,status`,
      [
        code,
        slug,
        name,
        request.address?.trim() || null,
        request.contact_name?.trim() || null,
        request.contact_email?.trim().toLowerCase() || null,
        request.contact_phone?.trim() || null,
        auth.user_id,
      ],
    );
    const tenant = tenantResult.rows[0];

    const adminResult = await client.query<{ id: string }>(
      `INSERT INTO m_user
       (tenant_id,username,email,password,role_id,registration_status,is_active,is_deleted,created_time)
       VALUES ($1,$2,$3,$4,$5,'APPROVED',true,false,now()) RETURNING id`,
      [
        tenant.id,
        adminUsername,
        adminEmail,
        hashPassword(request.admin_password),
        adminRole.rows[0].id,
      ],
    );

    const subscriptionResult = await client.query<{ id: string }>(
      `INSERT INTO ${tableNames.tenantSubscription}
       (tenant_id,plan_id,status,current_period_start,current_period_end)
       VALUES ($1,$2,'ACTIVE',date_trunc('month',current_date)::date,
         (date_trunc('month',current_date)+interval '1 month - 1 day')::date)
       RETURNING id`,
      [tenant.id, plan.id],
    );

    await client.query(
      `INSERT INTO ${tableNames.tenantInvoice}
       (tenant_id,subscription_id,invoice_number,plan_code,plan_name,amount,billing_period,status,issued_date,due_date,paid_time)
       VALUES ($1,$2,'HH-'||to_char(current_date,'YYYYMM')||'-'||lpad(nextval('tenant_invoice_number_seq')::text,6,'0'),
         $3,$4,$5,date_trunc('month',current_date)::date,
         CASE WHEN $5::numeric=0 THEN 'PAID' ELSE 'ISSUED' END,current_date,
         CASE WHEN $5::numeric=0 THEN current_date ELSE (current_date+interval '6 days')::date END,
         CASE WHEN $5::numeric=0 THEN now() ELSE NULL END)`,
      [
        tenant.id,
        subscriptionResult.rows[0].id,
        plan.code,
        plan.name,
        plan.price,
      ],
    );

    await client.query(
      `INSERT INTO t_audit_log
       (tenant_id,actor_type,actor_id,action,entity_type,entity_id,metadata)
       VALUES ($1,'PLATFORM',$2,'TENANT_CREATE','TENANT',$1,$3::jsonb)`,
      [
        tenant.id,
        auth.user_id,
        JSON.stringify({
          admin_user_id: adminResult.rows[0].id,
          code,
          plan_code: plan.code,
          slug,
        }),
      ],
    );

    await client.query("COMMIT");
    return {
      data: { admin_user_id: adminResult.rows[0].id, tenant },
      message: "Tenant berhasil dibuat",
      status: 201,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error({ err: error }, "Tenant creation failed");
    return { data: null, message: "Tenant gagal dibuat", status: 500 };
  } finally {
    client.release();
  }
};

export const loadPlatformTenantsService = async (
  request: BaseRequest,
): Promise<BaseResponse<PlatformTenantListItem[]>> => {
  const { offset, page, pageSize } = paging(request);
  const params = (request.params || {}) as { keyword?: string; status?: string };
  const values: unknown[] = [];
  const conditions = ["tenant.is_deleted=false"];
  if (params.keyword?.trim()) {
    values.push(`%${params.keyword.trim()}%`);
    conditions.push(`(tenant.name ILIKE $${values.length} OR tenant.code ILIKE $${values.length} OR tenant.slug ILIKE $${values.length})`);
  }
  if (params.status?.trim()) {
    values.push(params.status.trim().toUpperCase());
    conditions.push(`tenant.status=$${values.length}`);
  }
  values.push(pageSize, offset);
  const where = conditions.join(" AND ");
  const [rows, count] = await Promise.all([
    pool.query<PlatformTenantListItem>(
      `SELECT tenant.id,tenant.code,tenant.slug,tenant.name,tenant.address,tenant.contact_name,
              tenant.contact_email,tenant.contact_phone,tenant.status,
              subscription.id AS subscription_id,subscription.status AS subscription_status,
              subscription.current_period_end,plan.code AS plan_code,plan.name AS plan_name,
              COALESCE(storage.limit_value,0)::float8 AS storage_limit_bytes,
              COALESCE(usage.total,0)::float8 AS storage_usage_bytes
       FROM ${tableNames.tenant} tenant
       LEFT JOIN ${tableNames.tenantSubscription} subscription ON subscription.tenant_id=tenant.id
         AND subscription.status IN ('ACTIVE','SUSPENDED') AND subscription.is_deleted=false
       LEFT JOIN ${tableNames.platformPlan} plan ON plan.id=subscription.plan_id
       LEFT JOIN LATERAL (
         SELECT entitlement.limit_value FROM ${tableNames.platformPlanEntitlement} entitlement
         INNER JOIN ${tableNames.platformFeature} feature ON feature.id=entitlement.feature_id
         WHERE entitlement.plan_id=plan.id AND feature.code='STORAGE_LIMIT_BYTES' LIMIT 1
       ) storage ON true
       LEFT JOIN LATERAL (
         SELECT sum(size_bytes) AS total FROM ${tableNames.fileObject}
         WHERE tenant_id=tenant.id AND status='AVAILABLE' AND is_deleted=false
       ) usage ON true
       WHERE ${where} ORDER BY tenant.created_time DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    ),
    pool.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM ${tableNames.tenant} tenant WHERE ${where}`,
      values.slice(0, -2),
    ),
  ]);
  return { data: rows.rows, message: "Request successful", metaData: { page, pageSize, total: count.rows[0]?.total || 0 }, status: 200 };
};

export const getPlatformTenantService = async (
  tenantId?: null | string,
): Promise<BaseResponse<PlatformTenantDetailInterface | null>> => {
  if (!tenantId) return { data: null, message: "Tenant wajib dipilih", status: 400 };
  const tenantResult = await pool.query<PlatformTenantListItem>(
    `SELECT tenant.id,tenant.code,tenant.slug,tenant.name,tenant.address,tenant.contact_name,
            tenant.contact_email,tenant.contact_phone,tenant.status,
            subscription.id AS subscription_id,subscription.status AS subscription_status,
            subscription.current_period_end,plan.code AS plan_code,plan.name AS plan_name,
            COALESCE(storage.limit_value,0)::float8 AS storage_limit_bytes,
            COALESCE(usage.total,0)::float8 AS storage_usage_bytes
     FROM ${tableNames.tenant} tenant
     LEFT JOIN ${tableNames.tenantSubscription} subscription ON subscription.tenant_id=tenant.id
       AND subscription.status IN ('ACTIVE','SUSPENDED') AND subscription.is_deleted=false
     LEFT JOIN ${tableNames.platformPlan} plan ON plan.id=subscription.plan_id
     LEFT JOIN LATERAL (
       SELECT entitlement.limit_value FROM ${tableNames.platformPlanEntitlement} entitlement
       INNER JOIN ${tableNames.platformFeature} feature ON feature.id=entitlement.feature_id
       WHERE entitlement.plan_id=plan.id AND feature.code='STORAGE_LIMIT_BYTES' LIMIT 1
     ) storage ON true
     LEFT JOIN LATERAL (
       SELECT sum(size_bytes) AS total FROM ${tableNames.fileObject}
       WHERE tenant_id=tenant.id AND status='AVAILABLE' AND is_deleted=false
     ) usage ON true
     WHERE tenant.id=$1 AND tenant.is_deleted=false LIMIT 1`, [tenantId]);
  const tenant = tenantResult.rows[0];
  if (!tenant) return { data: null, message: "Tenant tidak ditemukan", status: 404 };
  const [admin, invoices] = await Promise.all([
    pool.query<{ email: string; id: string; username: string }>(
      `SELECT user_account.id,user_account.username,user_account.email
       FROM ${tableNames.masterUser} user_account
       INNER JOIN ${tableNames.masterRole} role ON role.id=user_account.role_id
       INNER JOIN ${tableNames.masterRoleMenuPermission} permission ON permission.role_id=role.id
       INNER JOIN ${tableNames.masterMenu} menu ON menu.id=permission.menu_id AND menu.code='PLATFORM_BILLING'
       WHERE user_account.tenant_id=$1 AND user_account.is_active=true AND user_account.is_deleted=false
       ORDER BY user_account.created_time LIMIT 1`, [tenantId]),
    pool.query(
      `SELECT id,invoice_number,plan_code,plan_name,amount::float8 AS amount,billing_period,status,due_date,paid_time
       FROM ${tableNames.tenantInvoice} WHERE tenant_id=$1 AND is_deleted=false
       ORDER BY billing_period DESC LIMIT 12`, [tenantId]),
  ]);
  return { data: { admin: admin.rows[0] || null, invoices: invoices.rows, tenant }, message: "Request successful", status: 200 };
};

export const updatePlatformTenantStatusService = async (
  auth: AuthTokenPayload,
  request: PlatformTenantStatusRequest,
): Promise<BaseResponse<null>> => {
  if (!request.tenant_id || !request.status)
    return { data: null, message: "Tenant dan status wajib diisi", status: 400 };
  if (request.status === "ACTIVE") {
    const overdue = await pool.query(
      `SELECT 1 FROM ${tableNames.tenantInvoice}
       WHERE tenant_id=$1 AND status='OVERDUE' AND is_deleted=false LIMIT 1`, [request.tenant_id]);
    if (overdue.rowCount) return { data: null, message: "Tenant masih memiliki invoice overdue", status: 409 };
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE ${tableNames.tenant} SET status=$2,updated_by_platform_user_id=$3,updated_time=now()
       WHERE id=$1 AND is_deleted=false RETURNING id`,
      [request.tenant_id, request.status, auth.user_id],
    );
    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return { data: null, message: "Tenant tidak ditemukan", status: 404 };
    }
    await client.query(
      `UPDATE ${tableNames.tenantSubscription} SET status=$2,updated_time=now()
       WHERE tenant_id=$1 AND status IN ('ACTIVE','SUSPENDED') AND is_deleted=false`,
      [request.tenant_id, request.status],
    );
    await client.query(
      `INSERT INTO ${tableNames.auditLog} (tenant_id,actor_type,actor_id,action,entity_type,entity_id,metadata)
       VALUES ($1,'PLATFORM',$2,'TENANT_STATUS_UPDATE','TENANT',$1,$3::jsonb)`,
      [request.tenant_id, auth.user_id, JSON.stringify({ status: request.status })],
    );
    await client.query("COMMIT");
    return { data: null, message: `Tenant berhasil di${request.status === "ACTIVE" ? "aktifkan" : "suspend"}`, status: 200 };
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error({ err: error }, "Tenant status update failed");
    return { data: null, message: "Status tenant gagal diperbarui", status: 500 };
  } finally { client.release(); }
};

export const loadPlatformAuditService = async (
  request: BaseRequest,
): Promise<BaseResponse<PlatformAuditLogInterface[]>> => {
  const { offset, page, pageSize } = paging(request);
  const params = (request.params || {}) as { action?: string; tenant_id?: string };
  const values: unknown[] = [];
  const conditions = ["true"];
  if (params.tenant_id) { values.push(params.tenant_id); conditions.push(`audit.tenant_id=$${values.length}`); }
  if (params.action?.trim()) { values.push(`%${params.action.trim()}%`); conditions.push(`audit.action ILIKE $${values.length}`); }
  values.push(pageSize, offset);
  const where = conditions.join(" AND ");
  const [rows, count] = await Promise.all([
    pool.query<PlatformAuditLogInterface>(
      `SELECT audit.id,audit.tenant_id,tenant.code AS tenant_code,tenant.name AS tenant_name,
              audit.actor_type,audit.actor_id,audit.action,audit.entity_type,audit.entity_id,audit.metadata,audit.created_time
       FROM ${tableNames.auditLog} audit LEFT JOIN ${tableNames.tenant} tenant ON tenant.id=audit.tenant_id
       WHERE ${where} ORDER BY audit.created_time DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values),
    pool.query<{ total: number }>(`SELECT count(*)::int AS total FROM ${tableNames.auditLog} audit WHERE ${where}`, values.slice(0, -2)),
  ]);
  return { data: rows.rows, message: "Request successful", metaData: { page, pageSize, total: count.rows[0]?.total || 0 }, status: 200 };
};
