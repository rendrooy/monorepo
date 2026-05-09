import { Response } from "express";
// import shared BaseResponse type from monorepo packages (type-only import erased at runtime)
import type { BaseResponse } from "@monorepo/types";

export const build = (
    res: Response,
    result: BaseResponse = { status: 200, message: "Request handled successfully" }
): void => {
    res.status(result.status ?? 200).json(result);
};
