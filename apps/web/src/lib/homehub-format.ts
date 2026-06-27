export const formatCurrency = (value?: number | null) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(Number(value || 0));

export const monthOptions = [
    { value: 1, label: "Januari" },
    { value: 2, label: "Februari" },
    { value: 3, label: "Maret" },
    { value: 4, label: "April" },
    { value: 5, label: "Mei" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "Agustus" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "Desember" },
];

export const getCurrentPeriod = () => {
    const now = new Date();
    return {
        period_month: now.getMonth() + 1,
        period_year: now.getFullYear(),
    };
};

export const statusLabel: Record<string, string> = {
    UNPAID: "Belum Bayar",
    PARTIAL: "Sebagian",
    PAID: "Lunas",
    OVERDUE: "Tunggakan",
};
