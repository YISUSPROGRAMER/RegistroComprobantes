import React, { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Download, Plus, Printer, Search, Trash2 } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-hot-toast';
import { db } from '../db/db';
import { SyncService } from '../services/sync';
import { formatCurrency, formatDate } from '../utils/format';
import { ComprobantePrintDocument } from './print/ComprobantePrintDocument';
import { ALL_PERIODS_VALUE, useSharedPeriodFilter } from '../hooks/useSharedPeriodFilter';

const getMonthFromDate = (date: string) => String(date || '').slice(5, 7);
const getYearFromDate = (date: string) => String(date || '').slice(0, 4);

const normalizeText = (value: string | number | undefined) => String(value || '').toLowerCase().trim();

const formatMonthOnly = (month: string) => {
    const parsed = Number(month);
    if (!parsed) return month;
    const name = new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(new Date(2026, parsed - 1, 1));
    return `${month} - ${name}`;
};

const buildSearchText = (item: {
    id: string;
    tipo: string;
    fecha: string;
    valor: number;
    recibidoDe: string;
    concepto: string;
}) => {
    const valueNoFormat = String(item.valor || 0);
    const valueWithFormat = formatCurrency(item.valor || 0);
    return [item.id, item.tipo, item.fecha, formatDate(item.fecha), item.recibidoDe, item.concepto, valueNoFormat, valueWithFormat]
        .join(' ')
        .toLowerCase();
};

const downloadCsv = (rows: string[][], filename: string) => {
    const csv = rows
        .map((row) =>
            row
                .map((cell) => {
                    const escaped = String(cell ?? '').replace(/"/g, '""');
                    return `"${escaped}"`;
                })
                .join(',')
        )
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
};

export const ComprobantesList: React.FC = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [includeSignatureOnPrint, setIncludeSignatureOnPrint] = useState(false);
    const [printSignatureName, setPrintSignatureName] = useState('');
    const [actionsOpen, setActionsOpen] = useState(false);
    const [page, setPage] = useState(1);
    const pageSize = 30;

    const { selectedYear, selectedMonth, setSelectedMonth, setSelectedYear } = useSharedPeriodFilter();

    const comprobantes = useLiveQuery(() => db.comprobantes.orderBy('fecha').reverse().toArray(), []);

    const { years, monthsByYear, filtered, stats } = useMemo(() => {
        const active = (comprobantes || []).filter((item) => item.deleted !== 1);
        const yearSet = new Set<string>();
        const monthsMap = new Map<string, Set<string>>();

        for (const item of active) {
            const year = getYearFromDate(item.fecha);
            const month = getMonthFromDate(item.fecha);
            if (!year || !month) continue;
            yearSet.add(year);
            if (!monthsMap.has(year)) monthsMap.set(year, new Set<string>());
            monthsMap.get(year)?.add(month);
        }

        const yearsSorted = Array.from(yearSet).sort((a, b) => Number(b) - Number(a));
        const availableMonthsByYear = new Map<string, string[]>();
        monthsMap.forEach((value, key) => {
            availableMonthsByYear.set(
                key,
                Array.from(value).sort((a, b) => Number(b) - Number(a))
            );
        });

        const searchTerm = normalizeText(search);
        const list = active.filter((item) => {
            const itemYear = getYearFromDate(item.fecha);
            const itemMonth = getMonthFromDate(item.fecha);

            const passYear = selectedYear === ALL_PERIODS_VALUE || itemYear === selectedYear;
            const passMonth = selectedMonth === ALL_PERIODS_VALUE || itemMonth === selectedMonth;
            const passSearch = !searchTerm || buildSearchText(item).includes(searchTerm);

            return passYear && passMonth && passSearch;
        });

        const totalValor = list.reduce((sum, item) => sum + Number(item.valor || 0), 0);

        return {
            years: yearsSorted,
            monthsByYear: availableMonthsByYear,
            filtered: list,
            stats: {
                totalComprobantes: list.length,
                totalValor
            }
        };
    }, [comprobantes, search, selectedMonth, selectedYear]);

    const monthOptions = useMemo(() => {
        if (selectedYear === ALL_PERIODS_VALUE) {
            const allMonths = new Set<string>();
            monthsByYear.forEach((months) => months.forEach((month) => allMonths.add(month)));
            return Array.from(allMonths).sort((a, b) => Number(b) - Number(a));
        }
        return monthsByYear.get(selectedYear) || [];
    }, [monthsByYear, selectedYear]);

    const visible = useMemo(() => filtered.slice(0, page * pageSize), [filtered, page]);
    const hasMore = visible.length < filtered.length;

    const selectedComprobantes = useMemo(
        () => filtered.filter((item) => selectedIds.includes(item.id)),
        [filtered, selectedIds]
    );

    const printSelectionRef = useRef<HTMLDivElement>(null);
    const printFilteredRef = useRef<HTMLDivElement>(null);

    const handlePrintSelection = useReactToPrint({
        contentRef: printSelectionRef,
        documentTitle: 'Comprobantes-seleccionados'
    });

    const handlePrintFiltered = useReactToPrint({
        contentRef: printFilteredRef,
        documentTitle: 'Comprobantes-filtrados'
    });

    const selectedInFilterCount = useMemo(() => {
        const filteredIds = new Set(filtered.map((item) => item.id));
        return selectedIds.filter((id) => filteredIds.has(id)).length;
    }, [filtered, selectedIds]);

    const allSelected = filtered.length > 0 && selectedInFilterCount === filtered.length;

    const actionButtons = (
        <>
            <label className="mb-2 flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-sm font-semibold text-slate-700">
                <input
                    type="checkbox"
                    checked={includeSignatureOnPrint}
                    onChange={(event) => setIncludeSignatureOnPrint(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-500"
                />
                Incluir firma al imprimir
            </label>

            {includeSignatureOnPrint && (
                <input
                    type="text"
                    value={printSignatureName}
                    onChange={(event) => setPrintSignatureName(event.target.value)}
                    placeholder="Nombre de firma (opcional)"
                    className="mb-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                />
            )}

            <button
                type="button"
                onClick={() => {
                    if (filtered.length === 0) {
                        toast.error('No hay comprobantes para imprimir');
                        return;
                    }
                    handlePrintFiltered();
                    setActionsOpen(false);
                }}
                className="mb-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 text-sm font-semibold text-cyan-800 hover:bg-cyan-100"
            >
                <Printer size={15} /> Imprimir filtrados
            </button>

            <button
                type="button"
                onClick={() => {
                    if (selectedComprobantes.length === 0) {
                        toast.error('Selecciona al menos un comprobante');
                        return;
                    }
                    handlePrintSelection();
                    setActionsOpen(false);
                }}
                className="mb-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            >
                <Printer size={15} /> Imprimir seleccionados
            </button>

            <button
                type="button"
                onClick={() => {
                    if (filtered.length === 0) {
                        toast.error('No hay datos para exportar');
                        return;
                    }
                    const rows = [
                        ['ID', 'Tipo', 'Fecha', 'Valor', 'RecibidoDe', 'Concepto'],
                        ...filtered.map((item) => [item.id, item.tipo, item.fecha, String(item.valor || 0), item.recibidoDe, item.concepto])
                    ];
                    downloadCsv(rows, 'comprobantes_filtrados.csv');
                    toast.success('CSV exportado');
                    setActionsOpen(false);
                }}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 text-sm font-semibold text-amber-800 hover:bg-amber-100"
            >
                <Download size={15} /> Exportar CSV
            </button>
        </>
    );

    return (
        <div className="relative grid h-full min-h-0 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-4">
            <div className="flex min-h-0 flex-col overflow-hidden">
                <div className="sticky top-0 z-20 space-y-2 bg-slate-50/95 pb-2 pt-1 backdrop-blur">
                    <div className="flex items-center justify-between px-1 py-1">
                        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Comprobantes</h1>
                    </div>

                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                        <select
                            value={selectedYear}
                            onChange={(event) => {
                                setSelectedYear(event.target.value);
                                setSelectedMonth(ALL_PERIODS_VALUE);
                                setPage(1);
                            }}
                            className="h-10 rounded-lg border border-slate-300 bg-white px-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value={ALL_PERIODS_VALUE}>Año: Todos</option>
                            {years.map((year) => (
                                <option key={year} value={year}>
                                    Año: {year}
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedMonth}
                            onChange={(event) => {
                                setSelectedMonth(event.target.value);
                                setPage(1);
                            }}
                            className="h-10 rounded-lg border border-slate-300 bg-white px-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value={ALL_PERIODS_VALUE}>Mes: Todos</option>
                            {monthOptions.map((month) => (
                                <option key={month} value={month}>
                                    {formatMonthOnly(month)}
                                </option>
                            ))}
                        </select>

                        <div className="hidden items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 lg:flex">
                            {stats.totalComprobantes} comprobantes
                        </div>

                        <div className="hidden items-center justify-end rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-cyan-800 lg:flex">
                            {formatCurrency(stats.totalValor)}
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Buscar..."
                            className="h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm lg:hidden">
                        <div className="font-semibold text-slate-700">{stats.totalComprobantes} comprobantes</div>
                        <div className="font-bold text-cyan-800">{formatCurrency(stats.totalValor)}</div>
                    </div>

                    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                        <label className="inline-flex items-center gap-2.5 font-semibold text-slate-700">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={(event) => {
                                    if (event.target.checked) setSelectedIds(filtered.map((item) => item.id));
                                    else setSelectedIds([]);
                                }}
                                className="h-5 w-5 rounded border-slate-300 text-cyan-700 focus:ring-cyan-500"
                            />
                            Seleccionar todos
                        </label>
                        <span className="font-medium text-slate-500">{selectedInFilterCount} seleccionados</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 pb-8 lg:pb-4">
                    <div className="grid grid-cols-1 gap-2 pb-2 lg:grid-cols-2 xl:grid-cols-3">
                        {visible.map((item) => (
                            <article key={item.id} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
                                <div className="mb-1.5 flex items-center justify-between gap-2">
                                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(item.id)}
                                            onChange={(event) => {
                                                if (event.target.checked) setSelectedIds((prev) => [...prev, item.id]);
                                                else setSelectedIds((prev) => prev.filter((id) => id !== item.id));
                                            }}
                                            className="h-5 w-5 rounded border-slate-300 text-cyan-700 focus:ring-cyan-500"
                                        />
                                        Seleccionar
                                    </label>

                                    <div className="flex items-center gap-1.5">
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.tipo === 'CI' ? 'bg-cyan-100 text-cyan-800' : 'bg-rose-100 text-rose-800'}`}>
                                            {item.tipo}
                                        </span>
                                        <span className="font-mono text-[10px] text-slate-400">{item.id}</span>
                                    </div>

                                    <button
                                        onClick={async () => {
                                            if (!confirm('Deseas eliminar este comprobante?')) return;
                                            await db.comprobantes.update(item.id, { deleted: 1, sync: 1 });
                                            toast.success('Comprobante eliminado');
                                            SyncService.syncUp().catch(console.error);
                                        }}
                                        className="rounded-md border border-rose-200 px-2 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                                        title="Eliminar"
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            <Trash2 size={14} />
                                            Eliminar
                                        </span>
                                    </button>
                                </div>

                                <button onClick={() => navigate(`/comprobantes/${item.id}/edit`)} className="w-full text-left">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-base font-bold text-slate-900">{item.recibidoDe}</p>
                                            <p className="line-clamp-1 text-sm text-slate-500">{item.concepto}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-slate-500">{formatDate(item.fecha)}</p>
                                            <p className="text-base font-extrabold text-slate-900">{formatCurrency(item.valor)}</p>
                                        </div>
                                    </div>
                                    {item.sync === 1 && (
                                        <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                            Pendiente sync
                                        </span>
                                    )}
                                </button>
                            </article>
                        ))}
                    </div>

                    {hasMore && (
                        <button
                            type="button"
                            onClick={() => setPage((prev) => prev + 1)}
                            className="mx-auto mt-1 block rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Cargar mas
                        </button>
                    )}

                    {filtered.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No hay comprobantes para mostrar.</p>}
                </div>
            </div>

            <aside className="hidden lg:block">
                <div className="sticky top-6 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <h2 className="mb-2 text-sm font-extrabold text-slate-900">Acciones</h2>
                    {actionButtons}

                    <button
                        type="button"
                        onClick={() => navigate('/comprobantes/new')}
                        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 text-sm font-bold text-white shadow-lg hover:bg-cyan-800"
                        title="Nuevo comprobante"
                    >
                        <Plus size={16} /> Nuevo comprobante
                    </button>
                </div>
            </aside>

            <div className="pointer-events-none fixed bottom-24 right-4 z-30 flex flex-col items-end gap-2 lg:hidden">
                {actionsOpen && (
                    <div className="pointer-events-auto w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                        {actionButtons}
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => setActionsOpen((prev) => !prev)}
                    className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl"
                    title="Acciones"
                >
                    <ChevronDown size={18} className={actionsOpen ? 'rotate-180 transition' : 'transition'} />
                </button>

                <button
                    type="button"
                    onClick={() => navigate('/comprobantes/new')}
                    className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-700 text-white shadow-xl hover:bg-cyan-800"
                    title="Nuevo comprobante"
                >
                    <Plus size={20} />
                </button>
            </div>

            <div className="hidden">
                <ComprobantePrintDocument
                    ref={printFilteredRef}
                    comprobantes={filtered}
                    includeSignature={includeSignatureOnPrint}
                    signatureName={printSignatureName}
                />
                <ComprobantePrintDocument
                    ref={printSelectionRef}
                    comprobantes={selectedComprobantes}
                    includeSignature={includeSignatureOnPrint}
                    signatureName={printSignatureName}
                />
            </div>
        </div>
    );
};
