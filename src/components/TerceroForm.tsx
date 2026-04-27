import React, { useEffect, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { db, generateNextId, generateNextTerceroCodigo } from '../db/db';
import { SyncService } from '../services/sync';

export const TerceroForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditing = Boolean(id);

    const [nombre, setNombre] = useState('');
    const [codigo, setCodigo] = useState('');

    useEffect(() => {
        if (!isEditing || !id) return;
        db.terceros.get(id).then((item) => {
            if (!item) return;
            setNombre(item.nombre || '');
            setCodigo(item.codigo || '');
        });
    }, [id, isEditing]);

    useEffect(() => {
        if (isEditing) return;
        generateNextTerceroCodigo().then(setCodigo).catch(() => setCodigo(''));
    }, [isEditing]);

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!nombre.trim() || !codigo.trim()) {
            toast.error('Completa nombre y codigo');
            return;
        }

        try {
            if (isEditing && id) {
                await db.terceros.update(id, {
                    nombre: nombre.trim(),
                    codigo: codigo.trim(),
                    sync: 1,
                    deleted: 0
                });
                toast.success('Tercero actualizado');
            } else {
                const newId = await generateNextId('TER');
                await db.terceros.add({
                    id: newId,
                    nombre: nombre.trim(),
                    codigo: codigo.trim(),
                    sync: 1,
                    deleted: 0
                });
                toast.success('Tercero creado');
            }

            SyncService.syncUp().catch(console.error);
            navigate('/terceros');
        } catch (error) {
            console.error(error);
            toast.error('No se pudo guardar el tercero');
        }
    };

    return (
        <form onSubmit={handleSave} className="grid h-full min-h-0 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-4">
            <div className="flex min-h-0 flex-col overflow-hidden">
                <div className="sticky top-0 z-20 space-y-2 bg-slate-50/95 pb-2 pt-1 backdrop-blur">
                    <div className="flex items-center gap-2 px-1 py-1">
                        <button
                            type="button"
                            onClick={() => navigate('/terceros')}
                            className="rounded-full border border-slate-300 bg-white p-2 text-slate-600 transition hover:bg-slate-100"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{isEditing ? 'Editar' : 'Nuevo'} Tercero</h1>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pb-6">
                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Código de tercero</label>
                                <input
                                    type="text"
                                    required
                                    value={codigo}
                                    onChange={(event) => setCodigo(event.target.value)}
                                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                                    placeholder="TER0001"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Nombre de tercero</label>
                                <input
                                    type="text"
                                    required
                                    value={nombre}
                                    onChange={(event) => setNombre(event.target.value)}
                                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                                    placeholder="Nombre o razón social"
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
                        <Save size={16} /> Guardar tercero
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
