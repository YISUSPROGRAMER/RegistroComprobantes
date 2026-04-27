import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Download, RefreshCw, Settings } from 'lucide-react';
import { db } from '../db/db';
import { SyncService } from '../services/sync';
import { formatCurrency, formatMonthKey } from '../utils/format';
import { ALL_PERIODS_VALUE, useSharedPeriodFilter } from '../hooks/useSharedPeriodFilter';

const getMonthFromDate = (date: string) => String(date || '').slice(5, 7);
const getYearFromDate = (date: string) => String(date || '').slice(0, 4);

export const Dashboard: React.FC = () => {
    const [busyAction, setBusyAction] = useState<'sync' | 'download' | null>(null);
    const { selectedYear, selectedMonth, setSelectedMonth, setSelectedYear } = useSharedPeriodFilter();

    const data = useLiveQuery(async () => {
        const comprobantes = await db.comprobantes.orderBy('fecha').reverse().toArray();
        const activos = comprobantes.filter((item) => item.deleted !== 1);

        const yearSet = new Set<string>();
        const monthsMap = new Map<string, Set<string>>();

        for (const item of activos) {
            const year = getYearFromDate(item.fecha);
            const month = getMonthFromDate(item.fecha);
            if (!year || !month) continue;
            yearSet.add(year);
            if (!monthsMap.has(year)) monthsMap.set(year, new Set<string>());
            monthsMap.get(year)?.add(month);
        }

        const years = Array.from(yearSet).sort((a, b) => Number(b) - Number(a));
        const monthsByYear = new Map<string, string[]>();
        monthsMap.forEach((value, key) => {
            monthsByYear.set(
                key,
                Array.from(value).sort((a, b) => Number(b) - Number(a))
            );
        });

        const filtrados = activos.filter((item) => {
            const year = getYearFromDate(item.fecha);
            const month = getMonthFromDate(item.fecha);
            const passYear = selectedYear === ALL_PERIODS_VALUE || year === selectedYear;
            const passMonth = selectedMonth === ALL_PERIODS_VALUE || month === selectedMonth;
            return passYear && passMonth;
        });

        const totalIngresos = filtrados
            .filter((item) => item.tipo === 'CI')
            .reduce((sum, item) => sum + Number(item.valor || 0), 0);

        const totalEgresos = filtrados
            .filter((item) => item.tipo === 'CE')
            .reduce((sum, item) => sum + Number(item.valor || 0), 0);

        const totalValor = filtrados.reduce((sum, item) => sum + Number(item.valor || 0), 0);

        const pendientesSync =
            (await db.comprobantes.where('sync').equals(1).count()) +
            (await db.terceros.where('sync').equals(1).count());

        return {
            years,
            monthsByYear,
            totalComprobantes: filtrados.length,
            totalIngresos,
            totalEgresos,
            totalValor,
            balance: totalIngresos - totalEgresos,
            pendientesSync
        };
    }, [selectedMonth, selectedYear]);

    const monthOptions = useMemo(() => {
        if (!data) return [] as string[];
        if (selectedYear === ALL_PERIODS_VALUE) {
            const allMonths = new Set<string>();
            data.monthsByYear.forEach((months) => months.forEach((month) => allMonths.add(month)));
            return Array.from(allMonths).sort((a, b) => Number(b) - Number(a));
        }
        return data.monthsByYear.get(selectedYear) || [];
    }, [data, selectedYear]);

    const periodLabel = useMemo(() => {
        if (selectedYear === ALL_PERIODS_VALUE && selectedMonth === ALL_PERIODS_VALUE) return 'Todos los periodos';
        if (selectedYear !== ALL_PERIODS_VALUE && selectedMonth !== ALL_PERIODS_VALUE) {
            return formatMonthKey(`${selectedYear}-${selectedMonth}`);
        }
        if (selectedYear !== ALL_PERIODS_VALUE && selectedMonth === ALL_PERIODS_VALUE) return `Año ${selectedYear}`;
        return `Mes ${selectedMonth} (todos los años)`;
    }, [selectedMonth, selectedYear]);

    const balanceClass = useMemo(() => {
        if (!data) return 'text-slate-800';
        if (data.balance > 0) return 'text-emerald-700';
        if (data.balance < 0) return 'text-rose-700';
        return 'text-slate-800';
    }, [data]);

    const canInteract = !busyAction;

    return (
        <div className="grid h-full min-h-0 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-4">
            <div className="flex min-h-0 flex-col overflow-hidden">
                <div className="sticky top-0 z-20 space-y-2 bg-slate-50/95 pb-2 pt-1 backdrop-blur">
                    <div className="flex items-center justify-between px-1 py-1">
                        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Estadísticas</h1>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <select
                            value={selectedYear}
                            onChange={(event) => {
                                setSelectedYear(event.target.value);
                                setSelectedMonth(ALL_PERIODS_VALUE);
                            }}
                            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value={ALL_PERIODS_VALUE}>Todos los años</option>
                            {(data?.years || []).map((year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedMonth}
                            onChange={(event) => setSelectedMonth(event.target.value)}
                            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value={ALL_PERIODS_VALUE}>Todos los meses</option>
                            {monthOptions.map((month) => (
                                <option key={month} value={month}>
                                    {selectedYear === ALL_PERIODS_VALUE ? `Mes ${month}` : formatMonthKey(`${selectedYear}-${month}`)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filtro general activo</p>
                        <p className="mt-0.5 font-bold text-slate-900">{periodLabel}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pb-6">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Total comprobantes</p>
                            <p className="mt-1 text-xl font-extrabold text-slate-900">{data?.totalComprobantes || 0}</p>
                        </article>

                        <article className="rounded-xl border border-cyan-100 bg-cyan-50 p-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Suma de valores</p>
                            <p className="mt-1 text-xl font-extrabold text-cyan-800">{formatCurrency(data?.totalValor || 0)}</p>
                        </article>

                        <article className="rounded-xl border border-cyan-100 bg-cyan-50 p-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Ingresos</p>
                            <p className="mt-1 text-xl font-extrabold text-cyan-800">{formatCurrency(data?.totalIngresos || 0)}</p>
                        </article>

                        <article className="rounded-xl border border-rose-100 bg-rose-50 p-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Egresos</p>
                            <p className="mt-1 text-xl font-extrabold text-rose-800">{formatCurrency(data?.totalEgresos || 0)}</p>
                        </article>

                        <article className="rounded-xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Pendientes Sync</p>
                            <p className="mt-1 text-xl font-extrabold text-amber-800">{data?.pendientesSync || 0}</p>
                        </article>

                        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Balance</p>
                            <p className={`mt-1 text-2xl font-extrabold ${balanceClass}`}>{formatCurrency(data?.balance || 0)}</p>
                        </article>
                    </div>
                </div>
            </div>

            <aside className="hidden lg:block">
                <div className="sticky top-6 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <h2 className="mb-2 text-sm font-extrabold text-slate-900">Acciones</h2>
                    <button
                        onClick={async () => {
                            if (!canInteract) return;
                            setBusyAction('download');
                            try {
                                await SyncService.syncDown();
                            } finally {
                                setBusyAction(null);
                            }
                        }}
                        disabled={!canInteract}
                        className="mb-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-800 disabled:opacity-60"
                    >
                        <Download size={16} className={busyAction === 'download' ? 'animate-spin' : ''} /> Descargar
                    </button>

                    <button
                        onClick={async () => {
                            if (!canInteract) return;
                            setBusyAction('sync');
                            try {
                                await SyncService.syncAll();
                            } finally {
                                setBusyAction(null);
                            }
                        }}
                        disabled={!canInteract}
                        className="mb-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 text-sm font-semibold text-cyan-800 disabled:opacity-60"
                    >
                        <RefreshCw size={16} className={busyAction === 'sync' ? 'animate-spin' : ''} /> Sincronizar
                    </button>

                    <Link
                        to="/settings"
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700"
                    >
                        <Settings size={16} /> Configuración
                    </Link>
                </div>
            </aside>

            <div className="pointer-events-none fixed bottom-24 right-4 z-30 flex flex-col items-end gap-2 lg:hidden">
                <button
                    onClick={async () => {
                        if (!canInteract) return;
                        setBusyAction('download');
                        try {
                            await SyncService.syncDown();
                        } finally {
                            setBusyAction(null);
                        }
                    }}
                    disabled={!canInteract}
                    className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl disabled:opacity-70"
                    title="Descargar"
                >
                    <Download size={18} className={busyAction === 'download' ? 'animate-spin' : ''} />
                </button>

                <button
                    onClick={async () => {
                        if (!canInteract) return;
                        setBusyAction('sync');
                        try {
                            await SyncService.syncAll();
                        } finally {
                            setBusyAction(null);
                        }
                    }}
                    disabled={!canInteract}
                    className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-700 text-white shadow-xl disabled:opacity-70"
                    title="Sincronizar"
                >
                    <RefreshCw size={18} className={busyAction === 'sync' ? 'animate-spin' : ''} />
                </button>

                <Link
                    to="/settings"
                    className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-white shadow-xl"
                    title="Configuración"
                >
                    <Settings size={18} />
                </Link>
            </div>
        </div>
    );
};
