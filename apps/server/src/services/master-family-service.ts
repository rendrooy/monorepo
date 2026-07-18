import { locales, tableNames } from "../config";
import type { BaseRequest, MasterFamilyInterface } from "@monorepo/types";
import {
  countQuery,
  findOneQuery,
  findQuery,
  insertQuery,
  updateQuery,
  type FindParams,
} from "../config/query/query-runner";
import { type Condition, OperatorTypes, type QueryData } from "../config/query/query-builder";

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
    selectedColumns: "id AS member_id, name AS member_name, CASE WHEN nik_last4 IS NULL THEN NULL ELSE '************' || nik_last4 END AS member_nik, family_relation",
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
