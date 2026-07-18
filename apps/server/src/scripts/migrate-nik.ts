import { pool } from "../connection/db";
import { decryptNik, normalizeNik, toNikStorage } from "../utils/nik-crypto";

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE m_member IN SHARE ROW EXCLUSIVE MODE");
    const result = await client.query<{ id: string; nik: string }>(
      `SELECT id,nik FROM m_member
       WHERE nik IS NOT NULL AND BTRIM(nik)<>'' AND nik_lookup_hash IS NULL
       ORDER BY created_time,id FOR UPDATE`,
    );

    for (const member of result.rows) normalizeNik(member.nik);
    for (const member of result.rows) {
      const encrypted = toNikStorage(member.nik);
      if (decryptNik({ ciphertext: encrypted.nik_ciphertext, iv: encrypted.nik_iv, authTag: encrypted.nik_auth_tag }) !== member.nik.trim()) {
        throw new Error("Verifikasi enkripsi NIK gagal");
      }
      await client.query(
        `UPDATE m_member SET nik_ciphertext=$2,nik_iv=$3,nik_auth_tag=$4,
         nik_lookup_hash=$5,nik_last4=$6,nik_key_version=$7,nik=NULL,updated_time=now()
         WHERE id=$1`,
        [member.id, encrypted.nik_ciphertext, encrypted.nik_iv, encrypted.nik_auth_tag,
        encrypted.nik_lookup_hash, encrypted.nik_last4, encrypted.nik_key_version],
      );
    }
    await client.query("ALTER TABLE m_member VALIDATE CONSTRAINT chk_member_nik_plaintext_empty");
    await client.query("COMMIT");
    process.stdout.write(`Migrasi NIK selesai: ${result.rowCount || 0} record.\n`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate().catch((error) => {
  process.stderr.write(`Migrasi NIK gagal: ${error instanceof Error ? error.message : "Unknown error"}\n`);
  process.exitCode = 1;
});
