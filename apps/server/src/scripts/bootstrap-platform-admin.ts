import { pool } from "../connection/db";
import { hashPassword } from "../utils/password";

const requireEnvironmentValue = (key: string): string => {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`${key} wajib dikonfigurasi`);
  }
  return value;
};

const run = async (): Promise<void> => {
  const username = requireEnvironmentValue(
    "PLATFORM_ADMIN_USERNAME",
  ).toLowerCase();
  const email = requireEnvironmentValue("PLATFORM_ADMIN_EMAIL").toLowerCase();
  const password = requireEnvironmentValue("PLATFORM_ADMIN_PASSWORD");

  if (password.length < 12) {
    throw new Error("PLATFORM_ADMIN_PASSWORD minimal 12 karakter");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      "homehub:bootstrap-platform-admin",
    ]);

    const roleResult = await client.query<{ id: string }>(
      "SELECT id FROM m_platform_role WHERE code='SUPER_ADMIN' AND is_active=true AND is_deleted=false LIMIT 1",
    );
    const role = roleResult.rows[0];
    if (!role) {
      throw new Error(
        "Role SUPER_ADMIN belum tersedia; jalankan database migration terlebih dahulu",
      );
    }

    const existing = await client.query<{ id: string }>(
      `SELECT id FROM m_platform_user
       WHERE (lower(username)=lower($1) OR lower(email)=lower($2)) AND is_deleted=false LIMIT 1`,
      [username, email],
    );

    if (existing.rows[0]) {
      await client.query("COMMIT");
      process.stdout.write(
        `Super Admin sudah tersedia: ${existing.rows[0].id}\n`,
      );
      return;
    }

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO m_platform_user (role_id,username,email,password,status)
       VALUES ($1,$2,$3,$4,'ACTIVE') RETURNING id`,
      [role.id, username, email, hashPassword(password)],
    );

    await client.query(
      `INSERT INTO t_audit_log (actor_type,actor_id,action,entity_type,entity_id)
       VALUES ('SYSTEM',$1,'PLATFORM_ADMIN_BOOTSTRAP','PLATFORM_USER',$1)`,
      [inserted.rows[0].id],
    );
    await client.query("COMMIT");
    process.stdout.write(
      `Super Admin berhasil dibuat: ${inserted.rows[0].id}\n`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

run()
  .catch((error) => {
    process.stderr.write(
      `Bootstrap Super Admin gagal: ${error instanceof Error ? error.message : "Unknown error"}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
