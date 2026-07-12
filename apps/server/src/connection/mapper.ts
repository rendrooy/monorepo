'use strict';

import { logger } from "../config/logger";

const resultMapper = <T = unknown>(result: { rows: T[]; }): T[] => {
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
        logger.error({ err: error }, "Database result mapping failed");
        return [];
    }
};

module.exports = {
    resultMapper,
};
