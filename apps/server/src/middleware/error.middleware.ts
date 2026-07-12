import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";

interface AppError extends Error {
  status?: number;
}

export const errorMiddleware = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error({ err, method: req.method, url: req.originalUrl }, "Unhandled request error");

  return res.status(err.status || 500).json({
    message: err.message || "Internal Server Error"
  });
};
