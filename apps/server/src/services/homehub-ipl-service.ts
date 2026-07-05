import { locales, tableNames } from "../config";
import type {
  BaseRequest,
  CashReportInterface,
  ExpenseInterface,
  IplBillInterface,
  IplDashboardInterface,
  IplDashboardRequest,
  IplGenerateBillRequest,
  IplPaymentInterface,
  IplSettingInterface,
  MasterFamilyInterface,
  ResidentDashboardInterface,
} from "@monorepo/types";
import {
  countQuery,
  findOneQuery,
  findQuery,
  insertQuery,
  updateQuery,
  type FindParams,
} from "../config/query/query-runner";
import { type Condition, OperatorTypes, type QueryData } from "../config/query/query-builder";
import { pool } from "../connection/db";
import { createQueryLogger } from "../utils/query-logger";
import { getCurrentAuth } from "../utils/request-context";

const { clientQuery, poolQuery } = createQueryLogger("homehub-ipl-service");

const cleanParams = (params: QueryData): QueryData =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== "")
  );

const buildFamilyParams = (request: MasterFamilyInterface): QueryData => {
  const { member_id: _memberId, member_ids: _memberIds, family_members: _familyMembers, ...familyParams } = request;
  return cleanParams(familyParams as QueryData);
};

const assignMemberToFamily = async (
  memberId: string | null | undefined,
  familyId: string | null | undefined,
  familyRelation?: string | null
) => {
  if (!memberId || !familyId) return;

  await updateQuery(
    tableNames.masterMember,
    cleanParams({
      family_id: familyId,
      family_relation: familyRelation,
      updated_time: new Date(),
    }),
    { id: memberId }
  );
};

const loadFamilyMembers = async (familyId: string) =>
  findQuery<NonNullable<MasterFamilyInterface["family_members"]>[number]>(tableNames.masterMember, {
    selectedColumns: "id AS member_id, name AS member_name, nik AS member_nik, family_relation",
    conditions: [
      { column: "family_id", value: familyId },
      { column: "is_deleted", value: false },
    ],
    order: { order_by: "created_time", order_dir: "ASC" },
  });

const assignMembersToFamily = async (
  familyMembers: MasterFamilyInterface["family_members"],
  memberIds: string[] | undefined,
  fallbackMemberId: string | null | undefined,
  familyId: string | null | undefined
) => {
  if (!familyId) return;

  if (familyMembers?.length) {
    const currentMembers = await loadFamilyMembers(familyId);
    const nextIds = familyMembers.map((member) => member.member_id);
    const removedMembers = currentMembers.filter((member) => !nextIds.includes(member.member_id));

    for (const member of removedMembers) {
      await updateQuery(
        tableNames.masterMember,
        { family_id: null, family_relation: null, updated_time: new Date() },
        { id: member.member_id }
      );
    }

    for (const member of familyMembers) {
      await assignMemberToFamily(member.member_id, familyId, member.family_relation);
    }
    return;
  }

  if (familyMembers && familyMembers.length === 0) {
    const currentMembers = await loadFamilyMembers(familyId);
    for (const member of currentMembers) {
      await updateQuery(
        tableNames.masterMember,
        { family_id: null, family_relation: null, updated_time: new Date() },
        { id: member.member_id }
      );
    }
    return;
  }

  const ids = memberIds?.length ? memberIds : fallbackMemberId ? [fallbackMemberId] : [];

  for (const memberId of ids) {
    await assignMemberToFamily(memberId, familyId);
  }
};

const baseCondition = (alias?: string): Condition => ({
  column: "is_deleted",
  tableAlias: alias,
  value: false,
  operator: OperatorTypes.EQUAL,
});

const loadEntity = async <T>(
  tableName: string,
  request: BaseRequest,
  searchableColumns: string[],
  selectedColumns = "*",
  joins: FindParams["joins"] = []
) => {
  const params = request.params as Record<string, unknown> | undefined;
  const page = request.metadata?.page || 1;
  const limit = request.metadata?.pageSize || 100;
  const sortBy = request.metadata?.sortBy || "created_time";
  const sortDir = request.metadata?.sortDir || "DESC";
  const offset = (page - 1) * limit;
  const conditions: Condition[] = [baseCondition()];

  searchableColumns.forEach((column) => {
    const value = params?.[column];
    if (value !== undefined && value !== null && value !== "") {
      conditions.push({
        column,
        value: value as string,
        operator: typeof value === "number" ? OperatorTypes.EQUAL : OperatorTypes.LIKE,
      });
    }
  });

  const queryParams: FindParams = {
    selectedColumns,
    conditions,
    joins,
    limit,
    offset,
    order: { order_by: sortBy, order_dir: sortDir },
  };

  const [data, total] = await Promise.all([
    findQuery<T>(tableName, queryParams),
    countQuery(tableName, { conditions, joins }),
  ]);

  return {
    status: 200,
    message: locales.request_success,
    data,
    metaData: {
      total,
      page,
      pageSize: limit,
      sortBy,
      sortDir,
    },
  };
};

const recalculateBillStatus = async (billId: string) => {
  const result = await poolQuery(
    "recalculateBillStatus.getPaidAmount",
    `
      SELECT
        b.amount,
        b.due_date,
        COALESCE(SUM(p.amount), 0) AS paid_amount
      FROM ${tableNames.iplBill} b
      LEFT JOIN ${tableNames.iplPayment} p
        ON p.bill_id = b.id
       AND p.is_deleted = false
      WHERE b.id = $1
        AND b.is_deleted = false
      GROUP BY b.id
    `,
    [billId]
  );

  const row = result.rows?.[0];
  if (!row) return null;

  const amount = Number(row.amount || 0);
  const paidAmount = Number(row.paid_amount || 0);
  const isOverdue = row.due_date ? new Date(row.due_date) < new Date() : false;
  const status =
    paidAmount >= amount
      ? "PAID"
      : paidAmount > 0
        ? "PARTIAL"
        : isOverdue
          ? "OVERDUE"
          : "UNPAID";

  const updated = await updateQuery<IplBillInterface>(
    tableNames.iplBill,
    {
      paid_amount: paidAmount,
      status,
      updated_time: new Date(),
    },
    { id: billId }
  );

  return updated;
};

export const getFamilyService = async (request: MasterFamilyInterface) => {
  try {
    const data = await findOneQuery<MasterFamilyInterface>(tableNames.masterFamily, {
      conditions: [{ column: "id", value: request.id }],
    });
    const familyMembers = data?.id ? await loadFamilyMembers(data.id) : [];
    return data
      ? {
        status: 200,
        message: locales.request_success,
        data: {
          ...data,
          family_members: familyMembers,
          member_ids: familyMembers.map((member) => member.member_id),
          member_id: familyMembers[0]?.member_id ?? "",
        },
      }
      : { status: 404, message: locales.resource_not_found };
  } catch {
    return { status: 500, message: locales.unable_to_handle_request };
  }
};

export const loadFamilyService = async (request: BaseRequest<MasterFamilyInterface>) => {
  try {
    return await loadEntity<MasterFamilyInterface>(tableNames.masterFamily, request, [
      "no_kk",
      "no_pbb",
      "address",
      "postal_code",
    ]);
  } catch {
    return { status: 500, message: locales.unable_to_handle_request, data: null };
  }
};

export const createFamilyService = async (request: MasterFamilyInterface) => {
  try {
    const data = await insertQuery<MasterFamilyInterface>(
      tableNames.masterFamily,
      buildFamilyParams(request)
    );
    await assignMembersToFamily(request.family_members, request.member_ids, request.member_id, data?.id);
    return { status: 201, message: locales.request_success, data };
  } catch {
    return { status: 500, message: locales.unable_to_handle_request, data: null };
  }
};

export const updateFamilyService = async (request: MasterFamilyInterface) => {
  try {
    const data = await updateQuery<MasterFamilyInterface>(
      tableNames.masterFamily,
      { ...buildFamilyParams(request), updated_time: new Date() },
      { id: request.id }
    );
    await assignMembersToFamily(request.family_members, request.member_ids, request.member_id, request.id);
    return { status: 200, message: locales.request_success, data };
  } catch {
    return { status: 500, message: locales.unable_to_handle_request, data: null };
  }
};

export const deleteFamilyService = async (request: MasterFamilyInterface) => {
  try {
    await updateQuery(tableNames.masterFamily, { is_deleted: true, updated_time: new Date() }, { id: request.id });
    return { status: 200, message: locales.delete_success };
  } catch {
    return { status: 500, message: locales.unable_to_handle_request, data: null };
  }
};

export const getIplSettingService = async (request: IplSettingInterface) => {
  try {
    const data = await findOneQuery<IplSettingInterface>(tableNames.iplSetting, {
      conditions: [{ column: "id", value: request.id }],
    });
    return data
      ? { status: 200, message: locales.request_success, data }
      : { status: 404, message: locales.resource_not_found };
  } catch {
    return { status: 500, message: locales.unable_to_handle_request };
  }
};

export const loadIplSettingService = async (request: BaseRequest<IplSettingInterface>) => {
  try {
    return await loadEntity<IplSettingInterface>(tableNames.iplSetting, request, ["name"]);
  } catch {
    return { status: 500, message: locales.unable_to_handle_request, data: null };
  }
};

export const createIplSettingService = async (request: IplSettingInterface) => {
  try {
    const data = await insertQuery<IplSettingInterface>(
      tableNames.iplSetting,
      cleanParams(request as QueryData)
    );
    return { status: 201, message: locales.request_success, data };
  } catch {
    return { status: 500, message: locales.unable_to_handle_request, data: null };
  }
};

export const updateIplSettingService = async (request: IplSettingInterface) => {
  try {
    const data = await updateQuery<IplSettingInterface>(
      tableNames.iplSetting,
      cleanParams({ ...(request as QueryData), updated_time: new Date() }),
      { id: request.id }
    );
    return { status: 200, message: locales.request_success, data };
  } catch {
    return { status: 500, message: locales.unable_to_handle_request, data: null };
  }
};

export const deleteIplSettingService = async (request: IplSettingInterface) => {
  try {
    await updateQuery(tableNames.iplSetting, { is_deleted: true, updated_time: new Date() }, { id: request.id });
    return { status: 200, message: locales.delete_success };
  } catch {
    return { status: 500, message: locales.unable_to_handle_request, data: null };
  }
};

export const getIplBillService = async (request: IplBillInterface) => {
  try {
    const data = await findOneQuery<IplBillInterface>(tableNames.iplBill, {
      selectedColumns: "t_ipl_bill.*, m_family.no_kk AS family_no_kk, m_family.address AS family_address",
      joins: [{ table: tableNames.masterFamily, alias: "m_family", on: "t_ipl_bill.family_id = m_family.id" }],
      conditions: [{ column: "id", value: request.id, tableAlias: "t_ipl_bill" }],
    });
    return data
      ? { status: 200, message: locales.request_success, data }
      : { status: 404, message: locales.resource_not_found };
  } catch {
    return { status: 500, message: locales.unable_to_handle_request };
  }
};

export const loadIplBillService = async (request: BaseRequest<IplBillInterface>) => {
  try {
    const params = request.params;
    const conditions: Condition[] = [baseCondition("b")];
    if (params?.family_id) conditions.push({ column: "family_id", value: params.family_id, tableAlias: "b" });
    if (params?.period_month) conditions.push({ column: "period_month", value: params.period_month, tableAlias: "b" });
    if (params?.period_year) conditions.push({ column: "period_year", value: params.period_year, tableAlias: "b" });
    if (params?.status) conditions.push({ column: "status", value: params.status, tableAlias: "b" });

    const page = request.metadata?.page || 1;
    const limit = request.metadata?.pageSize || 100;
    const sortBy = request.metadata?.sortBy || "b.period_year";
    const sortDir = request.metadata?.sortDir || "DESC";
    const offset = (page - 1) * limit;
    const joins = [{ table: tableNames.masterFamily, alias: "f", on: "b.family_id = f.id" }];
    const queryParams: FindParams = {
      selectedColumns: "b.*, f.no_kk AS family_no_kk, f.address AS family_address",
      joins,
      conditions,
      limit,
      offset,
      order: { order_by: sortBy, order_dir: sortDir },
    };
    const [data, total] = await Promise.all([
      findQuery<IplBillInterface>(`${tableNames.iplBill} b`, queryParams),
      countQuery(`${tableNames.iplBill} b`, { conditions, joins }),
    ]);
    return { status: 200, message: locales.request_success, data, metaData: { total, page, pageSize: limit, sortBy, sortDir } };
  } catch {
    return { status: 500, message: locales.unable_to_handle_request, data: null };
  }
};

export const generateIplBillService = async (request: IplGenerateBillRequest) => {
  const client = await pool.connect();
  try {
    const periodMonth = Number(request.period_month || new Date().getMonth() + 1);
    const periodYear = Number(request.period_year || new Date().getFullYear());
    const settingResult = await clientQuery(
      client,
      "generateIplBillService.getActiveSetting",
      `SELECT monthly_amount, due_day FROM ${tableNames.iplSetting} WHERE is_active = true AND is_deleted = false ORDER BY created_time DESC LIMIT 1`
    );
    const activeSetting = settingResult.rows?.[0];
    const amount = Number(request.amount || activeSetting?.monthly_amount || 0);
    const dueDay = Number(request.due_day || activeSetting?.due_day || 10);
    const dueDate = new Date(periodYear, periodMonth - 1, dueDay);

    if (!amount) {
      return { status: 400, message: "Tarif IPL belum diisi", data: { generated: 0, skipped: 0 } };
    }

    await clientQuery(client, "generateIplBillService.begin", "BEGIN");
    const families = await clientQuery<{ id: string }>(
      client,
      "generateIplBillService.getActiveFamilies",
      `SELECT id FROM ${tableNames.masterFamily} WHERE is_deleted = false AND is_active = true`
    );

    let generated = 0;
    let skipped = 0;

    for (const family of families.rows) {
      const existing = await clientQuery(
        client,
        "generateIplBillService.checkExistingBill",
        `SELECT id FROM ${tableNames.iplBill}
         WHERE family_id = $1 AND period_month = $2 AND period_year = $3 AND is_deleted = false
         LIMIT 1`,
        [family.id, periodMonth, periodYear]
      );

      if (existing.rowCount) {
        skipped += 1;
        continue;
      }

      await clientQuery(
        client,
        "generateIplBillService.insertBill",
        `INSERT INTO ${tableNames.iplBill}
          (family_id, period_month, period_year, amount, paid_amount, status, due_date)
         VALUES ($1, $2, $3, $4, 0, $5, $6)`,
        [family.id, periodMonth, periodYear, amount, dueDate < new Date() ? "OVERDUE" : "UNPAID", dueDate]
      );
      generated += 1;
    }

    await clientQuery(client, "generateIplBillService.commit", "COMMIT");
    return { status: 200, message: locales.request_success, data: { generated, skipped } };
  } catch (error) {
    await clientQuery(client, "generateIplBillService.rollback", "ROLLBACK");
    console.error("generateIplBillService error:", error);
    return { status: 500, message: locales.unable_to_handle_request, data: { generated: 0, skipped: 0 } };
  } finally {
    client.release();
  }
};

export const updateIplBillService = async (request: IplBillInterface) => {
  try {
    const data = await updateQuery<IplBillInterface>(
      tableNames.iplBill,
      cleanParams({ ...(request as QueryData), updated_time: new Date() }),
      { id: request.id }
    );
    if (request.id) await recalculateBillStatus(request.id);
    return { status: 200, message: locales.request_success, data };
  } catch {
    return { status: 500, message: locales.unable_to_handle_request, data: null };
  }
};

export const deleteIplBillService = async (request: IplBillInterface) => {
  try {
    await updateQuery(tableNames.iplBill, { is_deleted: true, updated_time: new Date() }, { id: request.id });
    return { status: 200, message: locales.delete_success };
  } catch {
    return { status: 500, message: locales.unable_to_handle_request, data: null };
  }
};

export const getIplPaymentService = async (request: IplPaymentInterface) => {
  try {
    const data = await findOneQuery<IplPaymentInterface>(tableNames.iplPayment, {
      conditions: [{ column: "id", value: request.id }],
    });
    return data
      ? { status: 200, message: locales.request_success, data }
      : { status: 404, message: locales.resource_not_found };
  } catch {
    return { status: 500, message: locales.unable_to_handle_request };
  }
};

export const loadIplPaymentService = async (request: BaseRequest<IplPaymentInterface>) => {
  try {
    const params = request.params;
    const conditions: Condition[] = [baseCondition("p")];
    if (params?.family_id) conditions.push({ column: "family_id", value: params.family_id, tableAlias: "p" });
    if (params?.bill_id) conditions.push({ column: "bill_id", value: params.bill_id, tableAlias: "p" });
    const page = request.metadata?.page || 1;
    const limit = request.metadata?.pageSize || 100;
    const sortBy = request.metadata?.sortBy || "p.payment_date";
    const sortDir = request.metadata?.sortDir || "DESC";
    const offset = (page - 1) * limit;
    const joins = [
      { table: `${tableNames.iplBill}`, alias: "b", on: "p.bill_id = b.id" },
      { table: `${tableNames.masterFamily}`, alias: "f", on: "p.family_id = f.id" },
    ];
    const [data, total] = await Promise.all([
      findQuery<IplPaymentInterface>(`${tableNames.iplPayment} p`, {
        selectedColumns: "p.*, f.no_kk AS family_no_kk, f.address AS family_address, b.period_month, b.period_year",
        conditions,
        joins,
        limit,
        offset,
        order: { order_by: sortBy, order_dir: sortDir },
      }),
      countQuery(`${tableNames.iplPayment} p`, { conditions, joins }),
    ]);
    return { status: 200, message: locales.request_success, data, metaData: { total, page, pageSize: limit, sortBy, sortDir } };
  } catch {
    return { status: 500, message: locales.unable_to_handle_request, data: null };
  }
};

export const createIplPaymentService = async (request: IplPaymentInterface) => {
  try {
    const bill = await findOneQuery<IplBillInterface>(tableNames.iplBill, {
      conditions: [{ column: "id", value: request.bill_id }],
    });
    const data = await insertQuery<IplPaymentInterface>(
      tableNames.iplPayment,
      cleanParams({
        ...(request as QueryData),
        family_id: request.family_id || bill?.family_id,
        payment_date: request.payment_date || new Date(),
      })
    );
    if (request.bill_id) await recalculateBillStatus(request.bill_id);
    return { status: 201, message: locales.request_success, data };
  } catch {
    return { status: 500, message: locales.unable_to_handle_request, data: null };
  }
};

export const updateIplPaymentService = async (request: IplPaymentInterface) => {
  try {
    const current = await findOneQuery<IplPaymentInterface>(tableNames.iplPayment, {
      conditions: [{ column: "id", value: request.id }],
    });
    const data = await updateQuery<IplPaymentInterface>(
      tableNames.iplPayment,
      cleanParams({ ...(request as QueryData), updated_time: new Date() }),
      { id: request.id }
    );
    if (current?.bill_id) await recalculateBillStatus(current.bill_id);
    if (request.bill_id && request.bill_id !== current?.bill_id) await recalculateBillStatus(request.bill_id);
    return { status: 200, message: locales.request_success, data };
  } catch {
    return { status: 500, message: locales.unable_to_handle_request, data: null };
  }
};

export const deleteIplPaymentService = async (request: IplPaymentInterface) => {
  try {
    const current = await findOneQuery<IplPaymentInterface>(tableNames.iplPayment, {
      conditions: [{ column: "id", value: request.id }],
    });
    await updateQuery(tableNames.iplPayment, { is_deleted: true, updated_time: new Date() }, { id: request.id });
    if (current?.bill_id) await recalculateBillStatus(current.bill_id);
    return { status: 200, message: locales.delete_success };
  } catch {
    return { status: 500, message: locales.unable_to_handle_request, data: null };
  }
};

export const getDashboardIplService = async (request: IplDashboardRequest) => {
  try {
    const date = new Date();
    const periodMonth = Number(request.period_month || date.getMonth() + 1);
    const periodYear = Number(request.period_year || date.getFullYear());
    const result = await poolQuery(
      "getDashboardIplService.summary",
      `
        SELECT
          COALESCE(SUM(amount), 0) AS total_bill,
          COALESCE(SUM(paid_amount), 0) AS total_payment,
          COALESCE(SUM(amount - paid_amount), 0) AS total_outstanding,
          COUNT(*) FILTER (WHERE status = 'PAID') AS paid_count,
          COUNT(*) FILTER (WHERE status = 'UNPAID') AS unpaid_count,
          COUNT(*) FILTER (WHERE status = 'PARTIAL') AS partial_count,
          COUNT(*) FILTER (WHERE status = 'OVERDUE') AS overdue_count
        FROM ${tableNames.iplBill}
        WHERE is_deleted = false
          AND period_month = $1
          AND period_year = $2
      `,
      [periodMonth, periodYear]
    );
    const row = result.rows?.[0] ?? {};
    const data: IplDashboardInterface = {
      period_month: periodMonth,
      period_year: periodYear,
      total_bill: Number(row.total_bill || 0),
      total_payment: Number(row.total_payment || 0),
      total_outstanding: Number(row.total_outstanding || 0),
      paid_count: Number(row.paid_count || 0),
      unpaid_count: Number(row.unpaid_count || 0),
      partial_count: Number(row.partial_count || 0),
      overdue_count: Number(row.overdue_count || 0),
    };
    return { status: 200, message: locales.request_success, data };
  } catch {
    return { status: 500, message: locales.unable_to_handle_request, data: null };
  }
};

export const getResidentDashboardService = async () => {
  try {
    const auth = getCurrentAuth();
    if (!auth?.user_id) {
      return { status: 401, message: locales.invalid_access_token, data: null };
    }

    const userResult = await poolQuery<{
      registration_status: string | null;
      is_active: boolean | null;
      member_name: string | null;
      member_nik: string | null;
      family_id: string | null;
      family_relation: string | null;
      family_no_kk: string | null;
      family_address: string | null;
    }>(
      "getResidentDashboardService.user",
      `
        SELECT
          u.registration_status,
          u.is_active,
          m.name AS member_name,
          m.nik AS member_nik,
          m.family_id,
          m.family_relation,
          f.no_kk AS family_no_kk,
          f.address AS family_address
        FROM ${tableNames.masterUser} u
        LEFT JOIN ${tableNames.masterMember} m
          ON u.member_id = m.id
         AND m.is_deleted = false
        LEFT JOIN ${tableNames.masterFamily} f
          ON m.family_id = f.id
         AND f.is_deleted = false
        WHERE u.id = $1
          AND u.is_deleted = false
        LIMIT 1
      `,
      [auth.user_id]
    );

    const user = userResult.rows?.[0];
    if (!user) {
      return { status: 404, message: locales.resource_not_found, data: null };
    }

    const data: ResidentDashboardInterface = {
      account_status: user.registration_status,
      is_active: user.is_active,
      member_name: user.member_name,
      member_nik: user.member_nik,
      family_id: user.family_id,
      family_relation: user.family_relation,
      family_no_kk: user.family_no_kk,
      family_address: user.family_address,
      total_bill: 0,
      total_outstanding: 0,
      unpaid_count: 0,
      latest_payment: null,
    };

    if (!user.family_id) {
      return { status: 200, message: locales.request_success, data };
    }

    const summaryResult = await poolQuery<{
      total_bill: string | number | null;
      total_outstanding: string | number | null;
      unpaid_count: string | number | null;
    }>(
      "getResidentDashboardService.billSummary",
      `
        SELECT
          COALESCE(SUM(amount), 0) AS total_bill,
          COALESCE(SUM(amount - paid_amount), 0) AS total_outstanding,
          COUNT(*) FILTER (WHERE status IN ('UNPAID', 'PARTIAL', 'OVERDUE')) AS unpaid_count
        FROM ${tableNames.iplBill}
        WHERE family_id = $1
          AND is_deleted = false
      `,
      [user.family_id]
    );

    const latestPaymentResult = await poolQuery<NonNullable<ResidentDashboardInterface["latest_payment"]>>(
      "getResidentDashboardService.latestPayment",
      `
        SELECT
          p.id,
          p.amount,
          p.payment_date,
          p.payment_method,
          b.period_month,
          b.period_year
        FROM ${tableNames.iplPayment} p
        LEFT JOIN ${tableNames.iplBill} b
          ON p.bill_id = b.id
        WHERE p.family_id = $1
          AND p.is_deleted = false
        ORDER BY p.payment_date DESC, p.created_time DESC
        LIMIT 1
      `,
      [user.family_id]
    );

    const summary = summaryResult.rows?.[0] ?? {};
    return {
      status: 200,
      message: locales.request_success,
      data: {
        ...data,
        total_bill: Number(summary.total_bill || 0),
        total_outstanding: Number(summary.total_outstanding || 0),
        unpaid_count: Number(summary.unpaid_count || 0),
        latest_payment: latestPaymentResult.rows?.[0] ?? null,
      },
    };
  } catch (error) {
    console.error("getResidentDashboardService error:", error);
    return { status: 500, message: locales.unable_to_handle_request, data: null };
  }
};

export const loadExpenseService = async (request: BaseRequest<ExpenseInterface>) => {
  try {
    return await loadEntity<ExpenseInterface>(tableNames.expense, request, ["category", "description"]);
  } catch {
    return { status: 500, message: locales.unable_to_handle_request, data: null };
  }
};

export const createExpenseService = async (request: ExpenseInterface) => {
  try {
    const data = await insertQuery<ExpenseInterface>(
      tableNames.expense,
      cleanParams({ ...(request as QueryData), expense_date: request.expense_date || new Date() })
    );
    return { status: 201, message: locales.request_success, data };
  } catch {
    return { status: 500, message: locales.unable_to_handle_request, data: null };
  }
};

export const deleteExpenseService = async (request: ExpenseInterface) => {
  try {
    await updateQuery(tableNames.expense, { is_deleted: true, updated_time: new Date() }, { id: request.id });
    return { status: 200, message: locales.delete_success };
  } catch {
    return { status: 500, message: locales.unable_to_handle_request, data: null };
  }
};

export const getCashReportService = async (request: IplDashboardRequest) => {
  try {
    const date = new Date();
    const periodMonth = Number(request.period_month || date.getMonth() + 1);
    const periodYear = Number(request.period_year || date.getFullYear());
    const incomeResult = await poolQuery(
      "getCashReportService.income",
      `
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM ${tableNames.iplPayment}
        WHERE is_deleted = false
          AND EXTRACT(MONTH FROM payment_date) = $1
          AND EXTRACT(YEAR FROM payment_date) = $2
      `,
      [periodMonth, periodYear]
    );
    const expenseResult = await poolQuery(
      "getCashReportService.expense",
      `
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM ${tableNames.expense}
        WHERE is_deleted = false
          AND EXTRACT(MONTH FROM expense_date) = $1
          AND EXTRACT(YEAR FROM expense_date) = $2
      `,
      [periodMonth, periodYear]
    );
    const totalIncome = Number(incomeResult.rows?.[0]?.total || 0);
    const totalExpense = Number(expenseResult.rows?.[0]?.total || 0);
    const data: CashReportInterface = {
      period_month: periodMonth,
      period_year: periodYear,
      opening_balance: 0,
      total_income: totalIncome,
      total_expense: totalExpense,
      ending_balance: totalIncome - totalExpense,
    };
    return { status: 200, message: locales.request_success, data };
  } catch {
    return { status: 500, message: locales.unable_to_handle_request, data: null };
  }
};
