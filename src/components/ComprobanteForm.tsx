import React, { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { db, generateNextId, generateNextTerceroCodigo } from '../db/db';
import { SyncService } from '../services/sync';
import type { TipoComprobante } from '../types';

const today = new Date().toISOString().split('T')[0];

const normalizeName = (value: string) => value.trim().toLowerCase();

const parseCurrencyInput = (value: string) => {
    const cleaned = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : NaN;
};

export const ComprobanteForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditing = Boolean(id);

    const terceros = useLiveQuery(() => db.terceros.filter((t) => t.deleted !== 1).sortBy('nombre'), []);

    const [tipo, setTipo] = useState<TipoComprobante>('CI');
    const [fecha, setFecha] = useState(today);
    const [valorInput, setValorInput] = useState('');
    const [recibidoDe, setRecibidoDe] = useState('');
    const [concepto, setConcepto] = useState('');

    useEffect(() => {
        if (!isEditing || !id) return;
        db.comprobantes.get(id).then((current) => {
            if (!current) return;
            setTipo(current.tipo);
            setFecha(String(current.fecha || '').split('T')[0] || today);
            setValorInput(String(current.valor || ''));
            setRecibidoDe(current.recibidoDe || '');
            setConcepto(current.concepto || '');
        });
    }, [id, isEditing]);

    const existingTercero = useMemo(() => {
        const candidate = normalizeName(recibidoDe);
        if (!candidate) return undefined;
        return (terceros || []).find((item) => normalizeName(item.nombre) === candidate);
    }, [recibidoDe, terceros]);

    const shouldCreateTercero = Boolean(recibidoDe.trim()) && !existingTercero;

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();

        const valor = parseCurrencyInput(valorInput);
        if (!Number.isFinite(valor) || valor <= 0) {
            toast.error('Ingresa un valor valido para el comprobante');
            return;
        }

        if (!recibidoDe.trim() || !concepto.trim()) {
            toast.error('Completa tercero y concepto');
            return;
        }

        try {
            let terceroId = existingTercero?.id;
            const terceroNombre = recibidoDe.trim();

            if (!existingTercero) {
                const newTerceroId = await generateNextId('TER');
                const newCodigo = await generateNextTerceroCodigo();
                await db.terceros.add({
                    id: newTerceroId,
                    codigo: newCodigo,
                    nombre: terceroNombre,
                    sync: 1
                });
                terceroId = newTerceroId;
            }

            if (isEditing && id) {
                await db.comprobantes.update(id, {
                    tipo,
                    fecha,
                    valor,
                    terceroId,
                    recibidoDe: terceroNombre,
                    concepto: concepto.trim(),
                    sync: 1,
                    deleted: 0
                });
                toast.success('Comprobante actualizado');
            } else {
                const newId = await generateNextId('COM');
                await db.comprobantes.add({
                    id: newId,
                    tipo,
                    fecha,
                    valor,
                    terceroId,
                    recibidoDe: terceroNombre,
                    concepto: concepto.trim(),
                    sync: 1,
                    deleted: 0
                });
                toast.success('Comprobante guardado');
            }

            SyncService.syncUp().catch(console.error);
            navigate('/comprobantes');
        } catch (error) {
            console.error('Error guardando comprobante:', error);
            toast.error('No se pudo guardar el comprobante');
        }
    };

    return (
        <form onSubmit={handleSave} className="grid h-full min-h-0 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-4">
            <div className="flex min-h-0 flex-col overflow-hidden">
                <div className="sticky top-0 z-20 space-y-2 bg-slate-50/95 pb-2 pt-1 backdrop-blur">
                    <div className="flex items-center gap-2 px-1 py-1">
                        <button
                            type="button"
                            onClick={() => navigate('/comprobantes')}
                            className="rounded-full border border-slate-300 bg-white p-2 text-slate-600 transition hover:bg-slate-100"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{isEditing ? 'Editar' : 'Nuevo'} Comprobante</h1>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pb-6">
                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Tipo de comprobante</label>
                                <select
                                    value={tipo}
                                    onChange={(event) => setTipo(event.target.value as TipoComprobante)}
                                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                                >
                                    <option value="CI">Ingreso (CI)</option>
                                    <option value="CE">Egreso (CE)</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Fecha</label>
                                <input
                                    type="date"
                                    required
                                    value={fecha}
                                    onChange={(event) => setFecha(event.target.value)}
                                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Valor del comprobante</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    required
                                    value={valorInput}
                                    onChange={(event) => setValorInput(event.target.value)}
                                    placeholder="Ejemplo: 250000"
                                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Recibido de</label>
                                <input
                                    type="text"
                                    required
                                    list="terceros-options"
                                    value={recibidoDe}
                                    onChange={(event) => setRecibidoDe(event.target.value)}
                                    placeholder="Escribe o selecciona un tercero"
                                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                                <datalist id="terceros-options">
                                    {(terceros || []).map((item) => (
                                        <option key={item.id} value={item.nombre} />
                                    ))}
                                </datalist>

                                {shouldCreateTercero && (
                                    <p className="mt-1 text-xs font-medium text-amber-700">
                                        Este tercero no existe. Al guardar se creará automáticamente.
                                    </p>
                                )}
                            </div>

                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Por concepto de</label>
                                <textarea
                                    required
                                    rows={5}
                                    value={concepto}
                                    onChange={(event) => setConcepto(event.target.value)}
                                    placeholder="Describe el concepto del comprobante"
                                    className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <aside className="hidden lg:block">
                <div className="sticky top-6 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <h2 className="mb-2 text-sm font-extrabold text-slate-900">Acciones</h2>
                    <button
                        type="submit"
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 text-sm font-bold text-white shadow-lg hover:bg-cyan-800"
                    >
                        <Save size={16} /> Guardar comprobante
                    </button>
                </div>
            </aside>

            <div className="pointer-events-none fixed bottom-24 right-4 z-30 lg:hidden">
                <button
                    type="submit"
                    className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-700 text-white shadow-xl hover:bg-cyan-800"
                    title="Guardar"
                >
                    <Save size={18} />
                </button>
            </div>
        </form>
    );
};
