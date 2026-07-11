import type { BaseRequest, IplCreditLedgerInterface, IplReportRequest } from "@monorepo/types";
import type { Request, Response } from "express";
import { build } from "./app-response";
import { getIplReportSummaryService, loadCreditLedgerService } from "../services/ipl-report-service";

type Body<T> = Request<Record<string, never>, unknown, T>;
export const getIplReportSummary = async (req: Body<IplReportRequest>, res: Response) => build(res, await getIplReportSummaryService(req.body));
export const loadIplCreditLedger = async (req: Body<BaseRequest<IplCreditLedgerInterface>>, res: Response) => build(res, await loadCreditLedgerService(req.body));
