import { db } from '../db/db';
import { ApiService, getSettings } from './api';
import { toast } from 'react-hot-toast';

interface SyncOptions {
    silent?: boolean;
    skipOnlineToast?: boolean;
    pullAfterPush?: boolean;
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
        if (this.isSyncing) return false;

        if (!hasApiConfig()) {
            if (!options.silent) {
                toast.error('Configura URL y token para sincronizar');
            }
            return false;
        }

        if (!navigator.onLine) {
            if (!options.skipOnlineToast) notifyError('Sin conexion a internet', options);
            return false;
        }

        this.isSyncing = true;
        const toastId = options.silent ? undefined : toast.loading('Iniciando sincronizacion...');

        try {
            const pendingComprobantes = await db.comprobantes.where('sync').equals(1).toArray();
            const pendingTerceros = await db.terceros.where('sync').equals(1).toArray();

            if (pendingComprobantes.length === 0 && pendingTerceros.length === 0) {
                if (!options.silent && toastId) toast.success('Todo al dia (subida)', { id: toastId });
                return true;
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

                return true;
            }

            if (!options.silent && toastId) toast.error('Error en servidor al recibir datos', { id: toastId });
            return false;
        } catch (error) {
            console.error('[Sync] Error en syncUp:', error);
            if (!options.silent && toastId) toast.error('Error de sincronizacion', { id: toastId });
            return false;
        } finally {
            this.isSyncing = false;
        }
    },

    async syncDown(options: SyncOptions = {}) {
        if (!hasApiConfig()) {
            if (!options.silent) toast.error('Configura URL y token para sincronizar');
            return false;
        }

        if (!navigator.onLine) {
            if (!options.skipOnlineToast) notifyError('Sin conexion a internet', options);
            return false;
        }

        const toastId = options.silent ? undefined : toast.loading('Descargando datos del servidor...');

        try {
            const data = await ApiService.getData();

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
                        }
                    }
                }
            });

            if (!options.silent && toastId) toast.success('Sincronizacion completa', { id: toastId });
            return true;
        } catch (error) {
            console.error('[SyncDown] Error:', error);
            if (!options.silent && toastId) toast.error('Error al descargar datos', { id: toastId });
            return false;
        }
    },

    async syncAll(options: SyncOptions = {}) {
        if (this.isSyncing) return false;
        const upOk = await this.syncUp({ ...options, pullAfterPush: false });
        if (!upOk && !navigator.onLine) return false;
        return this.syncDown(options);
    },

    async autoSync({ minIntervalMs = 15000 } = {}) {
        const now = Date.now();
        if (now - this.lastAutoSyncAt < minIntervalMs) return false;
        this.lastAutoSyncAt = now;
        return this.syncAll({ silent: true, skipOnlineToast: true, pullAfterPush: false });
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
