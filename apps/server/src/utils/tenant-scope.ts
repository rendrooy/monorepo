import { getCurrentAuth } from "./request-context";

export const getCurrentTenantId = () => getCurrentAuth()?.tenant_id ?? null;

export const addTenantScope = (
  values: unknown[],
  column = "tenant_id",
) => {
  const tenantId = getCurrentTenantId();

  if (!tenantId) return `${column} IS NULL`;

  values.push(tenantId);
  return `${column} = $${values.length}`;
};

export const requireCurrentTenantId = () => {
  const tenantId = getCurrentTenantId();
  if (!tenantId) throw new Error("Tenant context is required for this operation");
  return tenantId;
};
