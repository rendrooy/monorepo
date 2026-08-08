import type { RequestHandler } from "express";

import type { TenantFeatureCode } from "../services/tenant-entitlement-service";
import { requireTenantEntitlement } from "../services/tenant-entitlement-service";

export const requireTenantFeature = (
  featureCode: TenantFeatureCode,
): RequestHandler => async (_req, res, next) => {
  try {
    await requireTenantEntitlement(featureCode);
    next();
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 500;
    res.status(status).json({
      data: null,
      message: (error as Error).message,
      status,
    });
  }
};
