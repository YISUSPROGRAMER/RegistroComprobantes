import Dexie, { type Table } from 'dexie';
import type { Comprobante, Tercero } from '../types';

export class RegistroComprobantesDB extends Dexie {
    comprobantes!: Table<Comprobante, string>;
    terceros!: Table<Tercero, string>;

    constructor() {
        super('RegistroComprobantesDB');
        this.version(1).stores({
            comprobantes: 'id, tipo, fecha, recibidoDe, sync, deleted',
            terceros: 'id, codigo, nombre, sync, deleted'
        });
        this.version(2).stores({
            comprobantes: 'id, tipo, fecha, recibidoDe, incluirFirma, sync, deleted',
            terceros: 'id, codigo, nombre, sync, deleted'
        });
    }
}

export const db = new RegistroComprobantesDB();

const getTableByPrefix = (prefix: 'COM' | 'TER') => {
    if (prefix === 'COM') return db.comprobantes as Table<{ id: string }, string>;
    return db.terceros as Table<{ id: string }, string>;
};

export async function generateNextId(prefix: 'COM' | 'TER'): Promise<string> {
    const table = getTableByPrefix(prefix);
    const records = await table.toArray();
    const maxNum = records.reduce((max, item) => {
        if (!item.id?.startsWith(prefix)) return max;
        const parsed = Number.parseInt(item.id.slice(prefix.length), 10);
        return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
    }, 0);

    return `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
}

export async function generateNextTerceroCodigo(): Promise<string> {
    const terceros = await db.terceros.toArray();
    const maxNum = terceros.reduce((max, tercero) => {
        const parsed = Number.parseInt(String(tercero.codigo || '').replace(/^TER/i, ''), 10);
        return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
    }, 0);

    return `TER${String(maxNum + 1).padStart(4, '0')}`;
}
