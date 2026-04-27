import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '../db/db';
import { SyncService } from '../services/sync';

export const TercerosList: React.FC = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const terceros = useLiveQuery(() => db.terceros.orderBy('nombre').toArray(), []);

    const filtered = useMemo(
        () =>
            (terceros || []).filter(
                (item) => item.deleted !== 1 && `${item.nombre} ${item.codigo}`.toLowerCase().includes(search.trim().toLowerCase())
            ),
        [search, terceros]
    );

    return (
        <div className="relative grid h-full min-h-0 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-4">
            <div className="flex min-h-0 flex-col overflow-hidden">
                <div className="sticky top-0 z-20 space-y-2 bg-slate-50/95 pb-2 pt-1 backdrop-blur">
                    <div className="flex items-center justify-between px-1 py-1">
                        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Terceros</h1>
                        <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800">{filtered.length}</span>
                    </div>

                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar por nombre o código"
                            className="h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pb-8 lg:pb-4">
                    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
                        {filtered.map((item) => (
                            <article key={item.id} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
                                <div className="flex items-center justify-between gap-2">
                                    <button onClick={() => navigate(`/terceros/${item.id}/edit`)} className="flex-1 text-left">
                                        <p className="truncate text-base font-bold text-slate-900">{item.nombre}</p>
                                        <p className="mt-0.5 font-mono text-sm text-slate-500">{item.codigo}</p>

                                        {item.sync === 1 && (
                                            <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                                Pendiente sync
                                            </span>
                                        )}
                                    </button>

                                    <button
                                        onClick={async () => {
                                            if (!confirm('Deseas eliminar este tercero?')) return;
                                            await db.terceros.update(item.id, { deleted: 1, sync: 1 });
                                            toast.success('Tercero eliminado');
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
                            </article>
                        ))}
                    </div>

                    {filtered.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No hay terceros para mostrar.</p>}
                </div>
            </div>

            <aside className="hidden lg:block">
                <div className="sticky top-6 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <h2 className="mb-2 text-sm font-extrabold text-slate-900">Acciones</h2>
                    <button
                        type="button"
                        onClick={() => navigate('/terceros/new')}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 text-sm font-bold text-white shadow-lg hover:bg-cyan-800"
                        title="Nuevo tercero"
                    >
                        <Plus size={16} /> Nuevo tercero
                    </button>
                </div>
            </aside>

            <div className="pointer-events-none fixed bottom-24 right-4 z-30 lg:hidden">
                <button
                    type="button"
                    onClick={() => navigate('/terceros/new')}
                    className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-700 text-white shadow-xl hover:bg-cyan-800"
                    title="Nuevo tercero"
                >
                    <Plus size={20} />
                </button>
            </div>
        </div>
    );
};
