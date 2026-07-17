import type { BaseRequest, GuestVisitActionRequest, GuestVisitInterface } from "@monorepo/types";
import type { Request, Response } from "express";
import { build } from "./app-response";
import { cancelGuestVisitService, checkInGuestService, checkOutGuestService, createGuestVisitService, loadGuestGateService, loadGuestHistoryService, loadMyGuestVisitsService, updateGuestVisitService } from "../services/guest-visit-service";

type Body<T> = Request<Record<string, never>, unknown, T>;
export const loadMyGuestVisits = async (req: Body<BaseRequest<GuestVisitInterface>>, res: Response) => build(res, await loadMyGuestVisitsService(req.body));
export const createGuestVisit = async (req: Body<GuestVisitInterface>, res: Response) => build(res, await createGuestVisitService(req.body));
export const updateGuestVisit = async (req: Body<GuestVisitInterface>, res: Response) => build(res, await updateGuestVisitService(req.body));
export const cancelGuestVisit = async (req: Body<GuestVisitActionRequest>, res: Response) => build(res, await cancelGuestVisitService(req.body.id));
export const loadGuestGate = async (req: Body<BaseRequest<GuestVisitInterface>>, res: Response) => build(res, await loadGuestGateService(req.body));
export const loadGuestHistory = async (req: Body<BaseRequest<GuestVisitInterface>>, res: Response) => build(res, await loadGuestHistoryService(req.body));
export const checkInGuest = async (req: Body<GuestVisitActionRequest>, res: Response) => build(res, await checkInGuestService(req.body.id));
export const checkOutGuest = async (req: Body<GuestVisitActionRequest>, res: Response) => build(res, await checkOutGuestService(req.body.id));
