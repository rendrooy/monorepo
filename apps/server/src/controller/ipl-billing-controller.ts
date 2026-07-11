import type { BaseRequest, IplBillBatchInterface, IplBillInterface } from "@monorepo/types";
import type { Request, Response } from "express";
import { build } from "./app-response";
import {
  cancelBillBatchService,
  createBillBatchService,
  getBillBatchService,
  loadBillBatchService,
  loadBillService,
  loadMyBillService,
  loadNotificationService,
  publishBillBatchService,
  readNotificationService,
  updateBillBatchService,
} from "../services/ipl-billing-service";

type Body<T> = Request<Record<string, never>, unknown, T>;

export const loadBillBatch = async (req: Body<BaseRequest<IplBillBatchInterface>>, res: Response) => build(res, await loadBillBatchService(req.body));
export const getBillBatch = async (req: Body<IplBillBatchInterface>, res: Response) => build(res, await getBillBatchService(req.body.id));
export const createBillBatch = async (req: Body<IplBillBatchInterface>, res: Response) => build(res, await createBillBatchService(req.body));
export const updateBillBatch = async (req: Body<IplBillBatchInterface>, res: Response) => build(res, await updateBillBatchService(req.body));
export const publishBillBatch = async (req: Body<IplBillBatchInterface>, res: Response) => build(res, await publishBillBatchService(req.body.id));
export const cancelBillBatch = async (req: Body<IplBillBatchInterface>, res: Response) => build(res, await cancelBillBatchService(req.body.id));
export const loadBill = async (req: Body<BaseRequest<IplBillInterface>>, res: Response) => build(res, await loadBillService(req.body));
export const loadMyBill = async (req: Body<BaseRequest<IplBillInterface>>, res: Response) => build(res, await loadMyBillService(req.body));
export const loadNotification = async (_req: Request, res: Response) => build(res, await loadNotificationService());
export const readNotification = async (req: Body<{ id?: string | null }>, res: Response) => build(res, await readNotificationService(req.body.id));
