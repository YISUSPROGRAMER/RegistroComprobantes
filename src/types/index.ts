export const TipoComprobante = {
    INGRESO: "CI",
    EGRESO: "CE"
} as const;

export type TipoComprobante = typeof TipoComprobante[keyof typeof TipoComprobante];

export interface Tercero {
    id: string;
    codigo: string;
    nombre: string;
    sync?: number;
    deleted?: number;
}

export interface Comprobante {
    id: string;
    tipo: TipoComprobante;
    fecha: string;
    valor: number;
    terceroId?: string;
    recibidoDe: string;
    concepto: string;
    sync?: number;
    deleted?: number;
}

export interface SyncPayload {
    token: string;
    action: "TEST_CONNECTION" | "SYNC_DATA" | "GET_DATA";
    payload?: {
        comprobantes?: Comprobante[];
        terceros?: Tercero[];
    };
}
