import React, { useEffect, useState } from 'react';
import { ArrowLeft, Save, Wifi, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { checkConnection, getSettings, saveSettings } from '../services/api';
import { toast } from 'react-hot-toast';

export const SettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const [apiUrl, setApiUrl] = useState('');
    const [apiToken, setApiToken] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        const settings = getSettings();
        if (!settings) return;
        setApiUrl(settings.apiUrl);
        setApiToken(settings.apiToken);
    }, []);

    const handleTestConnection = async () => {
        if (!apiUrl || !apiToken) {
            toast.error('Ingresa URL y token');
            return;
        }

        setIsChecking(true);
        setConnectionStatus('idle');

        try {
            const isOk = await checkConnection(apiUrl, apiToken);
            if (isOk) {
                setConnectionStatus('success');
                toast.success('Conexion exitosa con Apps Script');
            } else {
                setConnectionStatus('error');
                toast.error('No se pudo conectar. Revisa URL y token.');
            }
        } catch {
            setConnectionStatus('error');
            toast.error('Error de red al validar conexion');
        } finally {
            setIsChecking(false);
        }
    };

    const handleSave = () => {
        saveSettings({ apiUrl, apiToken });
        toast.success('Configuracion guardada');
        navigate('/estadisticas');
    };

    const handleForceResync = async () => {
        if (!confirm('Esto marcará todo como pendiente para re-subida. ¿Deseas continuar?')) return;
        const { SyncService } = await import('../services/sync');
        const success = await SyncService.resetSyncStatus();
        if (!success) {
            toast.error('No se pudo resetear estado de sync');
            return;
        }
        toast.success('Datos marcados para sincronizar');
        SyncService.syncUp().catch(console.error);
    };

    return (
        <div className="grid h-full min-h-0 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-4">
            <div className="flex min-h-0 flex-col overflow-hidden">
                <div className="sticky top-0 z-20 space-y-2 bg-slate-50/95 pb-2 pt-1 backdrop-blur">
                    <div className="flex items-center gap-2 px-1 py-1">
                        <button
                            onClick={() => navigate('/estadisticas')}
                            className="rounded-full border border-slate-300 bg-white p-2 text-slate-600 transition hover:bg-slate-100"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Configuración</h1>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pb-6">
                    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">URL Google Apps Script</label>
                            <input
                                type="url"
                                value={apiUrl}
                                onChange={(event) => {
                                    setApiUrl(event.target.value);
                                    setConnectionStatus('idle');
                                }}
                                placeholder="https://script.google.com/..."
                                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Token secreto</label>
                            <input
                                type="password"
                                value={apiToken}
                                onChange={(event) => {
                                    setApiToken(event.target.value);
                                    setConnectionStatus('idle');
                                }}
                                placeholder="token"
                                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>

                        {connectionStatus !== 'idle' && (
                            <div
                                className={`flex items-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium ${
                                    connectionStatus === 'success'
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-rose-200 bg-rose-50 text-rose-700'
                                }`}
                            >
                                {connectionStatus === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                <span>
                                    {connectionStatus === 'success'
                                        ? 'Conexión establecida correctamente.'
                                        : 'No fue posible conectarse al servicio.'}
                                </span>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <aside className="hidden lg:block">
                <div className="sticky top-6 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <h2 className="mb-2 text-sm font-extrabold text-slate-900">Acciones</h2>
                    <button
                        onClick={handleTestConnection}
                        disabled={isChecking}
                        className="mb-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-70"
                    >
                        <Wifi size={16} /> {isChecking ? 'Probando...' : 'Probar conexión'}
                    </button>

                    <button
                        onClick={handleSave}
                        className="mb-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 text-sm font-bold text-white shadow-lg hover:bg-cyan-800"
                    >
                        <Save size={16} /> Guardar configuración
                    </button>

                    <button
                        onClick={handleForceResync}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-amber-300 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                    >
                        <AlertCircle size={16} /> Forzar re-subida
                    </button>
                </div>
            </aside>

            <div className="pointer-events-none fixed bottom-24 right-4 z-30 flex flex-col items-end gap-2 lg:hidden">
                <button
                    onClick={handleTestConnection}
                    disabled={isChecking}
                    className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-white shadow-xl disabled:opacity-70"
                    title="Probar conexión"
                >
                    <Wifi size={18} />
                </button>

                <button
                    onClick={handleSave}
                    className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-700 text-white shadow-xl hover:bg-cyan-800"
                    title="Guardar"
                >
                    <Save size={18} />
                </button>

                <button
                    onClick={handleForceResync}
                    className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-600 text-white shadow-xl hover:bg-amber-700"
                    title="Forzar re-subida"
                >
                    <AlertCircle size={18} />
                </button>
            </div>

        </div>
    );
};
