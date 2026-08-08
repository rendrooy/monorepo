import { randomUUID } from "node:crypto";
import type { AuthTokenPayload, MasterFamilyInterface } from "@monorepo/types";
import { tableNames } from "../config";
import { findOneQuery, updateQuery } from "../config/query/query-runner";
import { OperatorTypes } from "../config/query/query-builder";
import { pool } from "../connection/db";
import { runWithAuthContext } from "../utils/request-context";

const withAuth = <T>(auth: AuthTokenPayload, operation: () => Promise<T>) =>
  new Promise<T>((resolve, reject) => {
    runWithAuthContext(auth, () => {
      operation().then(resolve, reject);
    });
  });

const main = async () => {
  const suffix = randomUUID().slice(0, 8);
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const familyA = randomUUID();
  const familyB = randomUUID();
  const userA = randomUUID();
  const userB = randomUUID();
  const auth = (tenantId: string, userId: string): AuthTokenPayload => ({
    sub: userId,
    user_id: userId,
    tenant_id: tenantId,
    identity_type: "TENANT",
  });

  try {
    await pool.query(
      `INSERT INTO ${tableNames.tenant} (id,code,slug,name)
       VALUES ($1,$2,$3,$4),($5,$6,$7,$8)`,
      [
        tenantA, `ISO-A-${suffix}`, `iso-a-${suffix}`, `Isolation A ${suffix}`,
        tenantB, `ISO-B-${suffix}`, `iso-b-${suffix}`, `Isolation B ${suffix}`,
      ],
    );
    await pool.query(
      `INSERT INTO ${tableNames.masterFamily} (id,tenant_id,no_kk,address)
       VALUES ($1,$2,$3,$4),($5,$6,$7,$8)`,
      [
        familyA, tenantA, `ISO-A-${suffix}`, "Tenant A",
        familyB, tenantB, `ISO-B-${suffix}`, "Tenant B",
      ],
    );

    const ownFamily = await withAuth(auth(tenantA, userA), () =>
      findOneQuery<MasterFamilyInterface>(tableNames.masterFamily, {
        conditions: [{ column: "id", operator: OperatorTypes.EQUAL, value: familyA }],
      }),
    );
    const foreignFamily = await withAuth(auth(tenantA, userA), () =>
      findOneQuery<MasterFamilyInterface>(tableNames.masterFamily, {
        conditions: [{ column: "id", operator: OperatorTypes.EQUAL, value: familyB }],
      }),
    );
    const foreignUpdate = await withAuth(auth(tenantA, userA), () =>
      updateQuery(tableNames.masterFamily, { address: "Cross tenant" }, { id: familyB }),
    );

    if (!ownFamily || foreignFamily || foreignUpdate) {
      throw new Error("Query runner tenant isolation check failed");
    }

    let crossTenantForeignKeyRejected = false;
    try {
      await pool.query(
        `INSERT INTO ${tableNames.masterMember} (tenant_id,family_id,name)
         VALUES ($1,$2,$3)`,
        [tenantA, familyB, `Cross Tenant ${suffix}`],
      );
    } catch (error) {
      crossTenantForeignKeyRejected = (error as { code?: string }).code === "23503";
    }
    if (!crossTenantForeignKeyRejected) {
      throw new Error("Composite tenant foreign key check failed");
    }

    process.stdout.write("Tenant isolation smoke test passed\n");
  } finally {
    await pool.query(`DELETE FROM ${tableNames.masterMember} WHERE name=$1`, [`Cross Tenant ${suffix}`]);
    await pool.query(`DELETE FROM ${tableNames.masterFamily} WHERE id=ANY($1::uuid[])`, [[familyA, familyB]]);
    await pool.query(`DELETE FROM ${tableNames.tenant} WHERE id=ANY($1::uuid[])`, [[tenantA, tenantB]]);
    await pool.end();
  }
};

main().catch((error) => {
  process.stderr.write(`Tenant isolation smoke test failed: ${(error as Error).message}\n`);
  process.exitCode = 1;
});
