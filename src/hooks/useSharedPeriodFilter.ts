import { useCallback, useMemo, useState } from 'react';

const STORAGE_KEY = 'registro_comprobantes_period_filter';

export const ALL_PERIODS_VALUE = '__all_periods__';

interface PeriodState {
    year: string;
    month: string;
}

const now = new Date();
const defaultPeriod: PeriodState = {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1).padStart(2, '0')
};

const readStoredPeriod = (): PeriodState => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultPeriod;
        const parsed = JSON.parse(raw) as Partial<PeriodState>;
        if (!parsed.year || !parsed.month) return defaultPeriod;
        return {
            year: parsed.year,
            month: parsed.month
        };
    } catch {
        return defaultPeriod;
    }
};

export const useSharedPeriodFilter = () => {
    const [state, setState] = useState<PeriodState>(() => readStoredPeriod());

    const setYear = useCallback((year: string) => {
        setState((previous) => {
            const next = { ...previous, year };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const setMonth = useCallback((month: string) => {
        setState((previous) => {
            const next = { ...previous, month };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const periodKey = useMemo(() => {
        if (state.year === ALL_PERIODS_VALUE || state.month === ALL_PERIODS_VALUE) return ALL_PERIODS_VALUE;
        return `${state.year}-${state.month}`;
    }, [state.month, state.year]);

    return {
        selectedYear: state.year,
        selectedMonth: state.month,
        periodKey,
        setSelectedYear: setYear,
        setSelectedMonth: setMonth
    };
};
