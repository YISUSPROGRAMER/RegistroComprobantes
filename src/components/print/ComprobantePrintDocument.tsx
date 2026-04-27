import React from 'react';
import type { Comprobante } from '../../types';
import { formatCurrency, formatDate } from '../../utils/format';

interface ComprobantePrintDocumentProps {
    comprobantes: Comprobante[];
    includeSignature?: boolean;
    signatureName?: string;
}

const ComprobanteCard: React.FC<{
    comprobante: Comprobante;
    index: number;
    includeSignature: boolean;
    signatureName?: string;
}> = ({ comprobante, index, includeSignature, signatureName }) => {
    const isIngreso = comprobante.tipo === 'CI';

    return (
        <article className={`doc-card ${index > 0 ? 'page-break-before' : ''}`}>
            <header className="doc-header">
                <div>
                    <p className="brand">REGISTRO COMPROBANTES</p>
                    <p className="subtitle">Documento de soporte contable</p>
                </div>

                <div className="header-right">
                    <p className={`doc-type ${isIngreso ? 'ingreso' : 'egreso'}`}>
                        COMPROBANTE DE {isIngreso ? 'INGRESO' : 'EGRESO'}
                    </p>
                    <p className="doc-id">No. {comprobante.id}</p>
                </div>
            </header>

            <section className="meta-grid">
                <div className="meta-item">
                    <p className="label">Fecha</p>
                    <p className="value">{formatDate(comprobante.fecha)}</p>
                </div>

                <div className="meta-item">
                    <p className="label">Tipo</p>
                    <p className="value">{comprobante.tipo}</p>
                </div>

                <div className="meta-item span-2">
                    <p className="label">Recibido de</p>
                    <p className="value">{comprobante.recibidoDe}</p>
                </div>
            </section>

            <section className="amount-box">
                <p className="label">Valor del comprobante</p>
                <p className="amount">{formatCurrency(comprobante.valor)}</p>
            </section>

            <section className="concept-box">
                <p className="label">Por concepto de</p>
                <p className="concept">{comprobante.concepto}</p>
            </section>

            <footer className="doc-footer">
                <div className="legal-note">Soporte emitido por Registro Comprobantes.</div>

                {includeSignature ? (
                    <div className="signature-wrap">
                        <div className="signature-line" />
                        <p className="signature-text">Firma autorizada{signatureName ? `: ${signatureName}` : ''}</p>
                    </div>
                ) : (
                    <div className="signature-wrap">
                        <p className="signature-text muted">Documento válido sin firma autógrafa.</p>
                    </div>
                )}
            </footer>
        </article>
    );
};

export const ComprobantePrintDocument = React.forwardRef<HTMLDivElement, ComprobantePrintDocumentProps>(
    ({ comprobantes, includeSignature = false, signatureName = '' }, ref) => {
        return (
            <div ref={ref} className="print-root">
                <style>
                    {`
                    .print-root {
                      font-family: 'Manrope', Arial, sans-serif;
                      color: #0f172a;
                    }

                    .doc-card {
                      border: 1px solid #cbd5e1;
                      border-radius: 12px;
                      background: #ffffff;
                      padding: 18px;
                      margin-bottom: 14px;
                    }

                    .doc-header {
                      display: flex;
                      justify-content: space-between;
                      align-items: flex-start;
                      gap: 12px;
                      border-bottom: 1px solid #e2e8f0;
                      padding-bottom: 10px;
                      margin-bottom: 12px;
                    }

                    .brand {
                      font-size: 12px;
                      font-weight: 800;
                      letter-spacing: 0.08em;
                      color: #0369a1;
                    }

                    .subtitle {
                      margin-top: 3px;
                      font-size: 11px;
                      color: #64748b;
                      font-weight: 600;
                    }

                    .header-right {
                      text-align: right;
                    }

                    .doc-type {
                      display: inline-block;
                      font-size: 11px;
                      font-weight: 800;
                      letter-spacing: 0.05em;
                      border-radius: 9999px;
                      padding: 4px 10px;
                      margin-bottom: 4px;
                    }

                    .doc-type.ingreso {
                      background: #dcfce7;
                      color: #166534;
                    }

                    .doc-type.egreso {
                      background: #ffedd5;
                      color: #9a3412;
                    }

                    .doc-id {
                      font-size: 13px;
                      font-weight: 800;
                      color: #1e293b;
                    }

                    .meta-grid {
                      display: grid;
                      grid-template-columns: 1fr 1fr;
                      gap: 8px;
                      margin-bottom: 10px;
                    }

                    .meta-item {
                      border: 1px solid #e2e8f0;
                      border-radius: 8px;
                      padding: 8px 10px;
                    }

                    .span-2 {
                      grid-column: span 2;
                    }

                    .label {
                      font-size: 10px;
                      text-transform: uppercase;
                      letter-spacing: 0.06em;
                      color: #64748b;
                      font-weight: 700;
                    }

                    .value {
                      margin-top: 4px;
                      font-size: 13px;
                      font-weight: 700;
                      color: #0f172a;
                    }

                    .amount-box {
                      border: 1px solid #bae6fd;
                      background: #f0f9ff;
                      border-radius: 10px;
                      padding: 10px 12px;
                      margin-bottom: 10px;
                    }

                    .amount {
                      margin-top: 4px;
                      font-size: 24px;
                      font-weight: 800;
                      color: #0c4a6e;
                    }

                    .concept-box {
                      border: 1px solid #e2e8f0;
                      border-radius: 10px;
                      padding: 10px 12px;
                      min-height: 120px;
                    }

                    .concept {
                      margin-top: 6px;
                      white-space: pre-wrap;
                      font-size: 13px;
                      line-height: 1.45;
                      color: #1e293b;
                    }

                    .doc-footer {
                      margin-top: 12px;
                      display: flex;
                      justify-content: space-between;
                      align-items: flex-end;
                      gap: 12px;
                    }

                    .legal-note {
                      font-size: 10px;
                      color: #64748b;
                      font-weight: 600;
                    }

                    .signature-wrap {
                      min-width: 220px;
                      text-align: center;
                    }

                    .signature-line {
                      height: 1px;
                      background: #475569;
                      margin-bottom: 6px;
                    }

                    .signature-text {
                      font-size: 11px;
                      color: #334155;
                      font-weight: 700;
                    }

                    .signature-text.muted {
                      font-weight: 600;
                      color: #64748b;
                    }

                    @page {
                      size: A4;
                      margin: 10mm;
                    }

                    @media print {
                      .doc-card {
                        break-inside: avoid;
                      }

                      .page-break-before {
                        break-before: page;
                      }
                    }
                    `}
                </style>

                {comprobantes.map((item, index) => (
                    <ComprobanteCard
                        key={item.id}
                        comprobante={item}
                        index={index}
                        includeSignature={includeSignature}
                        signatureName={signatureName}
                    />
                ))}
            </div>
        );
    }
);

ComprobantePrintDocument.displayName = 'ComprobantePrintDocument';
