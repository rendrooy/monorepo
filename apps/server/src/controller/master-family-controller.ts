import type {
  BaseRequest,
  MasterFamilyInterface,
} from "@monorepo/types";
import type { Request, Response } from "express";
import { build } from "./app-response";
import {
  createFamilyService,
  deleteFamilyService,
  getFamilyService,
  loadFamilyService,
  updateFamilyService,
} from "../services/master-family-service";

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
