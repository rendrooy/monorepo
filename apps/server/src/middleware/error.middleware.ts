import { Request, Response, NextFunction } from "express";

interface AppError extends Error {
  status?: number;
}

export const errorMiddleware = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err);

  return res.status(err.status || 500).json({
    message: err.message || "Internal Server Error"
  });
};