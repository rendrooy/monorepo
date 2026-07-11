import type { BaseRequest, IplPaymentActionRequest, IplPaymentInterface } from "@monorepo/types";
import type { Request, Response } from "express";
import { build } from "./app-response";
import {
  approvePaymentService, createPaymentService, getPaymentProofService,
  loadMyPaymentService, loadPaymentService, rejectPaymentService, reversePaymentService,
} from "../services/ipl-payment-service";

type Body<T> = Request<Record<string, never>, unknown, T>;

export const createPayment = async (req: Body<IplPaymentInterface>, res: Response) => build(res, await createPaymentService(req.body));
export const loadPayment = async (req: Body<BaseRequest<IplPaymentInterface>>, res: Response) => build(res, await loadPaymentService(req.body));
export const loadMyPayment = async (req: Body<BaseRequest<IplPaymentInterface>>, res: Response) => build(res, await loadMyPaymentService(req.body));
export const approvePayment = async (req: Body<IplPaymentActionRequest>, res: Response) => build(res, await approvePaymentService(req.body.id));
export const rejectPayment = async (req: Body<IplPaymentActionRequest>, res: Response) => build(res, await rejectPaymentService(req.body.id, req.body.note));
export const reversePayment = async (req: Body<IplPaymentActionRequest>, res: Response) => build(res, await reversePaymentService(req.body.id, req.body.note));
export const getPaymentProof = async (req: Request<{ id: string }>, res: Response) => {
  const proof = await getPaymentProofService(req.params.id);
  if (!proof) {
    res.status(404).json({ status: 404, message: "Bukti pembayaran tidak ditemukan", data: null });
    return;
  }
  res.type(proof.mime);
  res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(proof.name)}`);
  res.sendFile(proof.path);
};
