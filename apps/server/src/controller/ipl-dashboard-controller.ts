import type { Request, Response } from "express";
import { build } from "./app-response";
import { getIplDashboardService, getIplFinancialTrendService } from "../services/ipl-dashboard-service";

export const getIplDashboard = async (req: Request<Record<string, never>, unknown, { period?: string | null }>, res: Response) =>
  build(res, await getIplDashboardService(req.body.period));

export const getIplFinancialTrend = async (req: Request<Record<string, never>, unknown, { year?: number | null }>, res: Response) =>
  build(res, await getIplFinancialTrendService(req.body.year));
