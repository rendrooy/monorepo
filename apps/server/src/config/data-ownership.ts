export const dataOwnership = {
  infrastructure: ["m_schema_migration"],
  platformGlobal: [
    "m_menu",
    "m_platform_permission",
    "m_platform_feature",
    "m_platform_plan",
    "m_platform_plan_entitlement",
    "m_platform_role",
    "m_platform_role_permission",
    "m_role",
    "m_role_menu_permission",
    "m_umkm_subscription_plan",
    "t_platform_job_run",
  ],
  platformIdentity: ["m_platform_user"],
  tenantOwned: [
    "m_family",
    "m_member",
    "m_tenant",
    "m_tenant_area",
    "m_tenant_setting",
    "m_umkm",
    "m_user",
    "t_financial_transaction",
    "t_file_object",
    "t_guest_vehicle",
    "t_guest_visit",
    "t_guest_visit_history",
    "t_ipl_bill",
    "t_ipl_bill_batch",
    "t_ipl_credit_ledger",
    "t_ipl_family_credit",
    "t_ipl_payment",
    "t_notification",
    "t_tenant_invoice",
    "t_tenant_subscription",
    "t_tenant_subscription_payment",
    "t_audit_log",
    "t_umkm_revision",
    "t_umkm_subscription",
  ],
} as const;

export type DataOwnership = keyof typeof dataOwnership;

export const getClassifiedTableNames = (): Set<string> =>
  new Set(Object.values(dataOwnership).flat());

const tenantScopeExclusions = new Set(["m_tenant", "t_audit_log"]);

export const tenantScopedTableNames = new Set<string>(
  dataOwnership.tenantOwned.filter((tableName) => !tenantScopeExclusions.has(tableName)),
);
