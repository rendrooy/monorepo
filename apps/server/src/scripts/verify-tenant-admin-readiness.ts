import "../config";

import { pool } from "../connection/db";
import { runWithAuthContext } from "../utils/request-context";
import { hasMenuPermission, PERMISSION } from "../utils/rbac";

const main = async () => {
  const result = await pool.query<{ menus: string | null; permission_count: number }>(
    `SELECT count(permission.menu_id)::int AS permission_count,
            string_agg(menu.code,',' ORDER BY menu.code) AS menus
     FROM m_role role
     LEFT JOIN m_role_menu_permission permission ON permission.role_id=role.id
       AND permission.is_active=true AND permission.is_deleted=false
     LEFT JOIN m_menu menu ON menu.id=permission.menu_id
       AND menu.is_active=true AND menu.is_deleted=false
     WHERE role.code='ADM' AND role.is_deleted=false`,
  );
  const row = result.rows[0];
  process.stdout.write(`ADM permissions: ${row?.permission_count || 0}\nMenus: ${row?.menus || "none"}\n`);
  const catalog = await pool.query<{ code: string; name: string; parent_code: string | null }>(
    `SELECT menu.code,menu.name,parent.code AS parent_code FROM m_menu menu
     LEFT JOIN m_menu parent ON parent.id=menu.parent_id
     WHERE menu.is_active=true AND menu.is_deleted=false ORDER BY menu.sort_order,menu.code`,
  );
  process.stdout.write(`${catalog.rows.map((menu) => `${menu.code}|${menu.parent_code || "ROOT"}|${menu.name}`).join("\n")}\n`);
  const admin = await pool.query<{ id: string }>("SELECT id FROM m_role WHERE code='ADM' AND is_deleted=false LIMIT 1");
  if (!admin.rows[0]) throw new Error("Role ADM tidak tersedia");
  const permissionChecks = await new Promise<[boolean, boolean]>((resolve, reject) => {
    runWithAuthContext(
      { identity_type: "TENANT", role_id: admin.rows[0].id, sub: "readiness", user_id: "readiness" },
      () => Promise.all([
        hasMenuPermission("OP_IPL", PERMISSION.READ),
        hasMenuPermission("PLATFORM_BILLING", PERMISSION.READ),
      ]).then(resolve).catch(reject),
    );
  });
  if (!permissionChecks.every(Boolean)) throw new Error("Resolver permission ADM tidak valid");
  process.stdout.write("ADM semantic permission resolver: passed\n");
};

main()
  .catch((error) => { process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`); process.exitCode = 1; })
  .finally(() => pool.end());
