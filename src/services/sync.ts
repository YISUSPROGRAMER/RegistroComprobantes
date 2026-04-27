import { db } from '../db/db';
import { ApiService, getSettings } from './api';
import { toast } from 'react-hot-toast';

interface SyncOptions {
    silent?: boolean;
    skipOnlineToast?: boolean;
    pullAfterPush?: boolean;
    notifyUser?: boolean;
}

const hasApiConfig = () => {
    const settings = getSettings();
    return Boolean(settings?.apiUrl && settings?.apiToken);
};

const notifyError = (message: string, options?: SyncOptions) => {
    if (!options?.silent) toast.error(message);
};

export const SyncService = {
    isSyncing: false,
    lastAutoSyncAt: 0,

    async syncUp(options: SyncOptions = {}) {
        if (this.isSyncing) return { ok: false, pushed: 0 };

        if (!hasApiConfig()) {
            if (!options.silent) {
                toast.error('Configura URL y token para sincronizar');
            }
            return { ok: false, pushed: 0 };
        }

        if (!navigator.onLine) {
            if (!options.skipOnlineToast) notifyError('Sin conexion a internet', options);
            return { ok: false, pushed: 0 };
        }

        this.isSyncing = true;
        const toastId = options.silent ? undefined : toast.loading('Iniciando sincronizacion...');

        try {
            const pendingComprobantes = await db.comprobantes.where('sync').equals(1).toArray();
            const pendingTerceros = await db.terceros.where('sync').equals(1).toArray();

            const pendingTotal = pendingComprobantes.length + pendingTerceros.length;

            if (pendingTotal === 0) {
                if (!options.silent && toastId) toast.success('Todo al dia (subida)', { id: toastId });
                return { ok: true, pushed: 0 };
            }

            const response = await ApiService.syncData({
                comprobantes: pendingComprobantes,
                terceros: pendingTerceros
            });

            if (response?.success) {
                await db.transaction('rw', db.comprobantes, db.terceros, async () => {
                    const added = response.added || {};

                    if (Array.isArray(added.comprobantes)) {
                        for (const id of added.comprobantes) {
                            const item = await db.comprobantes.get(id);
                            if (!item) continue;
                            if (item.deleted === 1) await db.comprobantes.delete(id);
                            else await db.comprobantes.update(id, { sync: 0 });
                        }
                    }

                    if (Array.isArray(added.terceros)) {
                        for (const id of added.terceros) {
                            const item = await db.terceros.get(id);
                            if (!item) continue;
                            if (item.deleted === 1) await db.terceros.delete(id);
                            else await db.terceros.update(id, { sync: 0 });
                        }
                    }
                });

                if (!options.silent && toastId) toast.success('Subida exitosa', { id: toastId });

                if (options.pullAfterPush ?? true) {
                    await this.syncDown({
                        silent: options.silent,
                        skipOnlineToast: true
                    });
                }

                return { ok: true, pushed: pendingTotal };
            }

            if (!options.silent && toastId) toast.error('Error en servidor al recibir datos', { id: toastId });
            return { ok: false, pushed: 0 };
        } catch (error) {
            console.error('[Sync] Error en syncUp:', error);
            if (!options.silent && toastId) toast.error('Error de sincronizacion', { id: toastId });
            return { ok: false, pushed: 0 };
        } finally {
            this.isSyncing = false;
        }
    },

    async syncDown(options: SyncOptions = {}) {
        if (!hasApiConfig()) {
            if (!options.silent) toast.error('Configura URL y token para sincronizar');
            return { ok: false, pulled: 0 };
        }

        if (!navigator.onLine) {
            if (!options.skipOnlineToast) notifyError('Sin conexion a internet', options);
            return { ok: false, pulled: 0 };
        }

        let toastId: string | undefined;

        try {
            const data = await ApiService.getData();
            const localComprobantesCount = await db.comprobantes.count();
            const localTercerosCount = await db.terceros.count();

            const remoteComprobantesCount = Array.isArray(data.comprobantes) ? data.comprobantes.length : 0;
            const remoteTercerosCount = Array.isArray(data.terceros) ? data.terceros.length : 0;
            const hasPotentialNewData =
                remoteComprobantesCount > localComprobantesCount || remoteTercerosCount > localTercerosCount;

            if (!options.silent) {
                toastId = toast.loading('Descargando datos del servidor...');
            } else if (options.notifyUser && hasPotentialNewData) {
                toastId = toast.loading('Sincronizando nuevos datos encontrados...');
            }

            let pulledComprobantes = 0;
            let pulledTerceros = 0;

            await db.transaction('rw', db.comprobantes, db.terceros, async () => {
                if (Array.isArray(data.terceros)) {
                    for (const tercero of data.terceros) {
                        const local = await db.terceros.get(tercero.id);
                        if (!local || local.sync === 0) {
                            await db.terceros.put({
                                ...tercero,
                                sync: 0,
                                deleted: 0
                            });
                            pulledTerceros += 1;
                        }
                    }
                }

                if (Array.isArray(data.comprobantes)) {
                    for (const comprobante of data.comprobantes) {
                        const local = await db.comprobantes.get(comprobante.id);
                        if (!local || local.sync === 0) {
                            const cleanFecha = String(comprobante.fecha || '').includes('T')
                                ? String(comprobante.fecha).split('T')[0]
                                : comprobante.fecha;

                            await db.comprobantes.put({
                                ...comprobante,
                                fecha: cleanFecha,
                                sync: 0,
                                deleted: 0
                            });
                            pulledComprobantes += 1;
                        }
                    }
                }
            });

            const pulledTotal = pulledComprobantes + pulledTerceros;

            if (!options.silent && toastId) {
                toast.success('Sincronizacion completa', { id: toastId });
            } else if (options.notifyUser && toastId) {
                if (pulledTotal > 0) {
                    toast.success(`Sincronizacion completa. ${pulledTotal} registros actualizados.`, { id: toastId });
                } else {
                    toast.dismiss(toastId);
                }
            }

            return { ok: true, pulled: pulledTotal };
        } catch (error) {
            console.error('[SyncDown] Error:', error);
            if (!options.silent && toastId) toast.error('Error al descargar datos', { id: toastId });
            if (options.silent && options.notifyUser && toastId) {
                toast.error('Error al sincronizar datos nuevos', { id: toastId });
            }
            return { ok: false, pulled: 0 };
        }
    },

    async syncAll(options: SyncOptions = {}) {
        if (this.isSyncing) return { ok: false, pushed: 0, pulled: 0 };
        const upResult = await this.syncUp({ ...options, pullAfterPush: false });
        if (!upResult.ok && !navigator.onLine) return { ok: false, pushed: 0, pulled: 0 };
        const downResult = await this.syncDown(options);
        return {
            ok: upResult.ok && downResult.ok,
            pushed: upResult.pushed,
            pulled: downResult.pulled
        };
    },

    async autoSync({ minIntervalMs = 15000, notifyUser = false } = {}) {
        const now = Date.now();
        if (now - this.lastAutoSyncAt < minIntervalMs) {
            return { ok: false, skipped: true, pushed: 0, pulled: 0 };
        }
        this.lastAutoSyncAt = now;
        return this.syncAll({
            silent: true,
            skipOnlineToast: true,
            pullAfterPush: false,
            notifyUser
        });
    },

    async resetSyncStatus() {
        try {
            await db.transaction('rw', db.comprobantes, db.terceros, async () => {
                await db.comprobantes.toCollection().modify({ sync: 1 });
                await db.terceros.toCollection().modify({ sync: 1 });
            });
            return true;
        } catch (error) {
            console.error('Error resetting sync status', error);
            return false;
        }
    }
};
