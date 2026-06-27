'use strict';

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
        console.log('Error: resultMapper => ', error);
        return [];
    }
};

module.exports = {
    resultMapper,
};
