import type {
  ApproveTenantPlanChangeRequest,
  BaseRequest,
  CreateTenantSubscriptionPaymentRequest,
  RequestTenantPlanChangeRequest,
  ReviewTenantSubscriptionPaymentRequest,
  UpdatePlatformPlanRequest,
} from "@monorepo/types";
import type { Request, Response } from "express";

import { getPlatformAuthPayload } from "../middleware/platform-auth.middleware";
import {
  approveTenantPlanChangeService,
  approveTenantSubscriptionPaymentService,
  createTenantSubscriptionPaymentService,
  getPlatformPlansService,
  getPlatformSubscriptionPaymentProofService,
  getTenantBillingSummaryService,
  getTenantSubscriptionPaymentProofService,
  loadPlatformPaymentReviewsService,
  loadPlatformSubscriptionsService,
  loadTenantInvoicesService,
  reconcileTenantSubscriptions,
  rejectTenantSubscriptionPaymentService,
  requestTenantPlanChangeService,
  updatePlatformPlanService,
} from "../services/platform-billing-service";
import { build } from "./app-response";

type Body<T> = Request<Record<string, never>, unknown, T>;

export const getPlatformPlans = async (_req: Request, res: Response) =>
  build(res, await getPlatformPlansService());
export const getTenantPlatformPlans = async (_req: Request, res: Response) => {
  const result = await getPlatformPlansService();
  build(res, { ...result, data: result.data?.filter((plan) => plan.status === "ACTIVE") || [] });
};
export const updatePlatformPlan = async (req: Body<UpdatePlatformPlanRequest>, res: Response) => {
  const auth = getPlatformAuthPayload(req);
  build(res, auth ? await updatePlatformPlanService(auth, req.body) : { data: null, message: "Unauthorized", status: 401 });
};
export const getTenantBillingSummary = async (_req: Request, res: Response) =>
  build(res, await getTenantBillingSummaryService());
export const loadTenantInvoices = async (req: Body<BaseRequest>, res: Response) =>
  build(res, await loadTenantInvoicesService(req.body));
export const requestTenantPlanChange = async (req: Body<RequestTenantPlanChangeRequest>, res: Response) =>
  build(res, await requestTenantPlanChangeService(req.body));
export const createTenantSubscriptionPayment = async (req: Body<CreateTenantSubscriptionPaymentRequest>, res: Response) =>
  build(res, await createTenantSubscriptionPaymentService(req.body));
export const getTenantSubscriptionPaymentProof = async (req: Request, res: Response) => {
  const proof = await getTenantSubscriptionPaymentProofService(String(req.params.id));
  if (!proof) { res.status(404).json({ data: null, message: "Bukti pembayaran tidak ditemukan", status: 404 }); return; }
  res.type(proof.mime);
  res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(proof.name)}`);
  res.send(proof.body);
};
export const loadPlatformPaymentReviews = async (req: Body<BaseRequest>, res: Response) =>
  build(res, await loadPlatformPaymentReviewsService(req.body));
export const loadPlatformSubscriptions = async (req: Body<BaseRequest>, res: Response) =>
  build(res, await loadPlatformSubscriptionsService(req.body));
export const approveTenantSubscriptionPayment = async (req: Body<ReviewTenantSubscriptionPaymentRequest>, res: Response) => {
  const auth = getPlatformAuthPayload(req);
  build(res, auth ? await approveTenantSubscriptionPaymentService(auth, req.body) : { data: null, message: "Unauthorized", status: 401 });
};
export const rejectTenantSubscriptionPayment = async (req: Body<ReviewTenantSubscriptionPaymentRequest>, res: Response) => {
  const auth = getPlatformAuthPayload(req);
  build(res, auth ? await rejectTenantSubscriptionPaymentService(auth, req.body) : { data: null, message: "Unauthorized", status: 401 });
};
export const approveTenantPlanChange = async (req: Body<ApproveTenantPlanChangeRequest>, res: Response) => {
  const auth = getPlatformAuthPayload(req);
  build(res, auth ? await approveTenantPlanChangeService(auth, req.body) : { data: null, message: "Unauthorized", status: 401 });
};
export const getPlatformSubscriptionPaymentProof = async (req: Request, res: Response) => {
  const proof = await getPlatformSubscriptionPaymentProofService(String(req.params.id));
  if (!proof) { res.status(404).json({ data: null, message: "Bukti pembayaran tidak ditemukan", status: 404 }); return; }
  res.type(proof.mime);
  res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(proof.name)}`);
  res.send(proof.body);
};
export const reconcilePlatformSubscriptions = async (_req: Request, res: Response) => {
  const generated = await reconcileTenantSubscriptions();
  build(res, { data: { generated }, message: "Reconciliation berhasil dijalankan", status: 200 });
};
