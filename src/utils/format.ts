export const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(value || 0);

export const formatDate = (value: string) => {
    const [year, month, day] = String(value || '').split('-').map(Number);
    if (!year || !month || !day) return value;
    return new Intl.DateTimeFormat('es-CO').format(new Date(year, month - 1, day));
};

export const monthKeyFromDate = (value: string) => String(value || '').slice(0, 7);

export const formatMonthKey = (monthKey: string) => {
    const [year, month] = monthKey.split('-').map(Number);
    if (!year || !month) return monthKey;
    return new Intl.DateTimeFormat('es-CO', {
        month: 'long',
        year: 'numeric'
    }).format(new Date(year, month - 1, 1));
};
