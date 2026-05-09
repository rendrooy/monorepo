// queryBuilder.ts

import { timeConfig } from "..";

// import { timeConfig } from "../config";

/**
 * ENUM TYPES
 */
export enum DataTypes {
  STRING = "string",
  NUMBER = "number",
  TIMESTAMP = "timestamp",
  DATE = "date",
}

export enum OperatorTypes {
  EQUAL = "equal",
  NOT_EQUAL = "not_equal",
  LESS_THAN = "less_than",
  LESS_THAN_EQUAL = "less_than_equal",
  GREATER_THAN = "greater_than",
  GREATER_THAN_EQUAL = "greater_than_equal",
  LIKE = "like",
  IN = "in",
  IS_NOT_NULL = "is_not_null",
}

/**
 * TYPES
 */
export type ColumnDefinition = Record<string, DataTypes>;
export type QueryData = Record<string, any>;

export interface Condition {
  column: string;
  value?: any;
  tableAlias?: string;
  operator?: OperatorTypes;
}

export interface OrderOption {
  order_by?: string;
  order_dir?: "ASC" | "DESC";
}

/**
 * DEFAULTS
 */
export const queryOption = {
  limit: 100,
  offset: 0,
  page: 1,
};

/**
 * INSERT QUERY
 */
export const buildInsertQuery = (
  columnDefinition: ColumnDefinition,
  data: QueryData
) => {
  const inputColumns: string[] = [];
  const bindColumns: string[] = [];
  const bindValues: any[] = [];

  Object.keys(data).forEach((key) => {
    inputColumns.push(`"${key}"`);
    bindValues.push(data[key]);

    if (columnDefinition[key] === DataTypes.TIMESTAMP) {
      bindColumns.push(
        `to_timestamp(${key}, '${timeConfig.oracle}')`
      );
    } else if (columnDefinition[key] === DataTypes.DATE) {
      bindColumns.push(
        `to_date(${key}, '${timeConfig.oracleDate}')`
      );
    } else {
      bindColumns.push(`${key}`);
    }
  });

  return {
    inputColumns: inputColumns.join(", "),
    bindValues,
    bindColumns: bindColumns.join(", "),
  };
};

/**
 * UPDATE QUERY
 */
export const buildUpdateQuery = (
  columnDefinition: ColumnDefinition,
  data: QueryData,
  condition: QueryData
) => {
  const bindColumns: string[] = [];
  const bindValues: any[] = [];

  Object.keys(data).forEach((key) => {
    bindValues.push(data[key]);
    bindColumns.push(`${key}=$${bindValues.length}`);
  });

  const conditionColumns: string[] = [];

  Object.keys(condition).forEach((key) => {
    bindValues.push(condition[key]);
    conditionColumns.push(`${key}=$${bindValues.length}`);
  });

  return {
    bindValues,
    bindColumns: bindColumns.join(", "),
    conditionColumns: conditionColumns.join(" AND "),
  };
};

/**
 * CONDITION OPERATOR
 */
const buildConditionOperator = (
  columnName: string,
  value: any,
  operator: OperatorTypes = OperatorTypes.EQUAL,
  index: number
): string => {
  switch (operator) {
    case OperatorTypes.LIKE:
      return `LOWER(${columnName}) LIKE '%${(value || "").toLowerCase()}%'`;

    case OperatorTypes.NOT_EQUAL:
      return `${columnName}!=$${index}`;

    case OperatorTypes.LESS_THAN:
      return `${columnName}<$${index}`;

    case OperatorTypes.LESS_THAN_EQUAL:
      return `${columnName}<=$${index}`;

    case OperatorTypes.GREATER_THAN:
      return `${columnName}>$${index}`;

    case OperatorTypes.GREATER_THAN_EQUAL:
      return `${columnName}>=$${index}`;

    case OperatorTypes.IN:
      return `${columnName} IN (${value})`;

    case OperatorTypes.IS_NOT_NULL:
      return `${columnName} IS NOT NULL`;

    default:
      return `${columnName}=$${index}`;
  }
};

/**
 * CONDITION QUERY
 */
export const buildConditionQuery = (conditions: Condition[] = []) => {
  const bindValues: any[] = [];
  const bindConditions: string[] = [];

  conditions.forEach((cond, i) => {
    const columnName = cond.tableAlias
      ? `${cond.tableAlias}.${cond.column}`
      : cond.column;

    const operator = cond.operator || OperatorTypes.EQUAL;

    bindConditions.push(
      buildConditionOperator(
        columnName,
        cond.value,
        operator,
        bindValues.length + 1
      )
    );

    const unbindOperators = [
      OperatorTypes.LIKE,
      OperatorTypes.IS_NOT_NULL,
      OperatorTypes.IN,
    ];

    if (!unbindOperators.includes(operator)) {
      bindValues.push(cond.value);
    }
  });

  const conditionQuery =
    bindConditions.length > 0
      ? `WHERE ${bindConditions.join(" AND ")}`
      : "";

  return {
    bindValues,
    bindQuery: conditionQuery,
  };
};

/**
 * ORDER QUERY
 */
export const buildOrderQuery = (order: OrderOption = {}) => {
  if (!order.order_by) return "";

  return `ORDER BY ${order.order_by} ${order.order_dir || "ASC"}`;
};