import { logger } from "../logger";

export const resultMapper = <T = unknown>(result: { rows: T[]; }): T[] => {
    try {
        if (result.rows) {
            const rows: T[] = [];
            result.rows.forEach((values) => {
                rows.push(values);
            });
            return rows;
        }
        return [];
    } catch (error) {
        logger.error({ err: error }, "Query result mapping failed");
        return [];
    }
};
