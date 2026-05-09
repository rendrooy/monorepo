export const resultMapper = (result: { rows: any[]; }) => {
    try {
        if (result.rows) {
            const rows: any[] = [];
            result.rows.forEach((values: any) => {
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