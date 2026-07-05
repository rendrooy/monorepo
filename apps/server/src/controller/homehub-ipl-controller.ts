import type {
  BaseRequest,
  ExpenseInterface,
  IplBillInterface,
  IplDashboardRequest,
  IplGenerateBillRequest,
  IplPaymentInterface,
  IplSettingInterface,
  MasterFamilyInterface,
} from "@monorepo/types";
import type { Request, Response } from "express";
import { build } from "./app-response";
import {
  createExpenseService,
  createFamilyService,
  createIplPaymentService,
  createIplSettingService,
  deleteExpenseService,
  deleteFamilyService,
  deleteIplBillService,
  deleteIplPaymentService,
  deleteIplSettingService,
  generateIplBillService,
  getCashReportService,
  getDashboardIplService,
  getFamilyService,
  getIplBillService,
  getIplPaymentService,
  getIplSettingService,
  getResidentDashboardService,
  loadExpenseService,
  loadFamilyService,
  loadIplBillService,
  loadIplPaymentService,
  loadIplSettingService,
  updateFamilyService,
  updateIplBillService,
  updateIplPaymentService,
  updateIplSettingService,
} from "../services/homehub-ipl-service";

type RequestBody<T> = Request<Record<string, never>, unknown, T>;

export const getFamily = async (
  req: RequestBody<MasterFamilyInterface>,
  res: Response,
) => build(res, await getFamilyService(req.body));
export const loadFamily = async (
  req: RequestBody<BaseRequest<MasterFamilyInterface>>,
  res: Response,
) => build(res, await loadFamilyService(req.body));
export const createFamily = async (
  req: RequestBody<MasterFamilyInterface>,
  res: Response,
) => build(res, await createFamilyService(req.body));
export const updateFamily = async (
  req: RequestBody<MasterFamilyInterface>,
  res: Response,
) => build(res, await updateFamilyService(req.body));
export const deleteFamily = async (
  req: RequestBody<MasterFamilyInterface>,
  res: Response,
) => build(res, await deleteFamilyService(req.body));

export const getIplSetting = async (
  req: RequestBody<IplSettingInterface>,
  res: Response,
) => build(res, await getIplSettingService(req.body));
export const loadIplSetting = async (
  req: RequestBody<BaseRequest<IplSettingInterface>>,
  res: Response,
) => build(res, await loadIplSettingService(req.body));
export const createIplSetting = async (
  req: RequestBody<IplSettingInterface>,
  res: Response,
) => build(res, await createIplSettingService(req.body));
export const updateIplSetting = async (
  req: RequestBody<IplSettingInterface>,
  res: Response,
) => build(res, await updateIplSettingService(req.body));
export const deleteIplSetting = async (
  req: RequestBody<IplSettingInterface>,
  res: Response,
) => build(res, await deleteIplSettingService(req.body));

export const getIplBill = async (
  req: RequestBody<IplBillInterface>,
  res: Response,
) => build(res, await getIplBillService(req.body));
export const loadIplBill = async (
  req: RequestBody<BaseRequest<IplBillInterface>>,
  res: Response,
) => build(res, await loadIplBillService(req.body));
export const generateIplBill = async (
  req: RequestBody<IplGenerateBillRequest>,
  res: Response,
) => build(res, await generateIplBillService(req.body));
export const updateIplBill = async (
  req: RequestBody<IplBillInterface>,
  res: Response,
) => build(res, await updateIplBillService(req.body));
export const deleteIplBill = async (
  req: RequestBody<IplBillInterface>,
  res: Response,
) => build(res, await deleteIplBillService(req.body));

export const getIplPayment = async (
  req: RequestBody<IplPaymentInterface>,
  res: Response,
) => build(res, await getIplPaymentService(req.body));
export const loadIplPayment = async (
  req: RequestBody<BaseRequest<IplPaymentInterface>>,
  res: Response,
) => build(res, await loadIplPaymentService(req.body));
export const createIplPayment = async (
  req: RequestBody<IplPaymentInterface>,
  res: Response,
) => build(res, await createIplPaymentService(req.body));
export const updateIplPayment = async (
  req: RequestBody<IplPaymentInterface>,
  res: Response,
) => build(res, await updateIplPaymentService(req.body));
export const deleteIplPayment = async (
  req: RequestBody<IplPaymentInterface>,
  res: Response,
) => build(res, await deleteIplPaymentService(req.body));

export const getIplDashboard = async (
  req: RequestBody<IplDashboardRequest>,
  res: Response,
) => build(res, await getDashboardIplService(req.body));
export const getCashReport = async (
  req: RequestBody<IplDashboardRequest>,
  res: Response,
) => build(res, await getCashReportService(req.body));
export const getResidentDashboard = async (
  _req: RequestBody<Record<string, never>>,
  res: Response,
) => build(res, await getResidentDashboardService());
export const loadExpense = async (
  req: RequestBody<BaseRequest<ExpenseInterface>>,
  res: Response,
) => build(res, await loadExpenseService(req.body));
export const createExpense = async (
  req: RequestBody<ExpenseInterface>,
  res: Response,
) => build(res, await createExpenseService(req.body));
export const deleteExpense = async (
  req: RequestBody<ExpenseInterface>,
  res: Response,
) => build(res, await deleteExpenseService(req.body));
