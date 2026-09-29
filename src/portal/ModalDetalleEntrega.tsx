import React, { useState } from 'react';
import { Eye, Download, X, CheckCircle2, Clock, FileText, UserCheck, Image as ImageIcon } from 'lucide-react';
import { badgeEstado } from './PedidoForm.tsx';

export interface PedidoEntregaInfo {
  id: string;
  local: string;
  descripcion: string;
  estado: string;
  facturaNumero?: string | null;
  fechaFin?: string | null;
  fotoRemisionUrl?: string | null;
  fotoEntregaUrl?: string | null;
  fechaEntrega?: string | null;
  receptorNombre?: string | null;
}

interface ModalDetalleEntregaProps {
  pedido: PedidoEntregaInfo;
  onClose: () => void;
}

function formatFecha(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function ModalDetalleEntrega({ pedido, onClose }: ModalDetalleEntregaProps) {
  const [fotoZoom, setFotoZoom] = useState<{ url: string; titulo: string } | null>(null);

  const tieneRemision = Boolean(pedido.fotoRemisionUrl);
  const tieneEntrega = Boolean(pedido.fotoEntregaUrl);

  const handleDescargar = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch {
      window.open(url, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-3xl rounded-xl border border-white/10 bg-[#111318] p-5 sm:p-7 shadow-2xl space-y-6 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Comprobante de Entrega y Remisión</h2>
                <p className="text-xs text-slate-400">Local: <span className="font-semibold text-slate-200">{pedido.local}</span> · ID: <span className="font-mono text-slate-400">{pedido.id}</span></p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tarea / Descripción */}
        <div className="bg-white/5 rounded-lg p-3.5 border border-white/5 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Descripción del Pedido</span>
          <p className="text-xs text-slate-200 leading-relaxed">{pedido.descripcion}</p>
        </div>

        {/* Metadatos de Despacho */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Estado */}
          <div className="rounded-lg border border-white/10 bg-[#090a0f] p-3 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Estado del Despacho</span>
            <div className="flex items-center gap-2">
              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeEstado(pedido.estado)}`}>
                {pedido.estado}
              </span>
            </div>
          </div>

          {/* Factura */}
          <div className="rounded-lg border border-white/10 bg-[#090a0f] p-3 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Número de Factura</span>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-400 shrink-0" />
              <span className="font-mono font-bold text-sm text-white">
                {pedido.facturaNumero ? pedido.facturaNumero : 'Pendiente'}
              </span>
            </div>
          </div>

          {/* Fecha / Receptor */}
          <div className="rounded-lg border border-white/10 bg-[#090a0f] p-3 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Fecha y Recepción</span>
            <div className="space-y-0.5">
              <p className="font-mono text-xs text-slate-200">{formatFecha(pedido.fechaEntrega || pedido.fechaFin)}</p>
              {pedido.receptorNombre && (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                  <UserCheck className="w-3.5 h-3.5" />
                  {pedido.receptorNombre}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Galería de Evidencias (2 Tarjetas) */}
        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block">Documentación Visual de Entrega</span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Remisión Firmada */}
            <div className="rounded-xl border border-white/10 bg-[#090a0f] p-4 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">Remisión Firmada con Sello</span>
                </div>
                {tieneRemision && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    ✓ Cargada
                  </span>
                )}
              </div>

              {tieneRemision ? (
                <div className="space-y-3">
                  <div
                    onClick={() => setFotoZoom({ url: pedido.fotoRemisionUrl!, titulo: `Remisión Firmada - ${pedido.local}` })}
                    className="relative group cursor-pointer overflow-hidden rounded-lg border border-white/10 bg-black/40 h-52 flex items-center justify-center transition hover:border-orange-500/50"
                  >
                    <img
                      src={pedido.fotoRemisionUrl!}
                      alt="Remisión firmada"
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                      <span className="text-xs font-semibold text-white px-3 py-1.5 rounded-md bg-black/70 border border-white/20 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" /> Ver en Grande
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDescargar(pedido.fotoRemisionUrl!, `remision_${pedido.id}.jpg`)}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar Remisión (JPG)
                  </button>
                </div>
              ) : (
                <div className="h-52 rounded-lg border border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center p-4 text-center">
                  <Clock className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-xs font-medium text-slate-400">Remisión en proceso</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                    El equipo logístico cargará la foto de la remisión firmada con sello en cuanto se complete la entrega física.
                  </p>
                </div>
              )}
            </div>

            {/* 2. Foto de Entrega / Montaje */}
            <div className="rounded-xl border border-white/10 bg-[#090a0f] p-4 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-bold text-white">Foto de Entrega / Instalación</span>
                </div>
                {tieneEntrega && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    ✓ Cargada
                  </span>
                )}
              </div>

              {tieneEntrega ? (
                <div className="space-y-3">
                  <div
                    onClick={() => setFotoZoom({ url: pedido.fotoEntregaUrl!, titulo: `Foto de Entrega - ${pedido.local}` })}
                    className="relative group cursor-pointer overflow-hidden rounded-lg border border-white/10 bg-black/40 h-52 flex items-center justify-center transition hover:border-orange-500/50"
                  >
                    <img
                      src={pedido.fotoEntregaUrl!}
                      alt="Foto de entrega"
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                      <span className="text-xs font-semibold text-white px-3 py-1.5 rounded-md bg-black/70 border border-white/20 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" /> Ver en Grande
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDescargar(pedido.fotoEntregaUrl!, `entrega_${pedido.id}.jpg`)}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar Foto de Entrega (JPG)
                  </button>
                </div>
              ) : (
                <div className="h-52 rounded-lg border border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center p-4 text-center">
                  <Clock className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-xs font-medium text-slate-400">Foto de entrega pendiente</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                    El operario o técnico subirá la foto del trabajo entregado o instalado en el local.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/10 px-5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Lightbox / Zoom modal */}
      {fotoZoom && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setFotoZoom(null)}
        >
          <div className="relative max-h-[95vh] max-w-5xl overflow-hidden rounded-xl bg-[#090a0f] border border-white/20 shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 mb-2">
              <span className="text-xs font-semibold text-white">{fotoZoom.titulo}</span>
              <button
                type="button"
                onClick={() => setFotoZoom(null)}
                className="p-1 text-slate-400 hover:text-white transition rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={fotoZoom.url}
              alt={fotoZoom.titulo}
              className="max-h-[85vh] w-auto max-w-full object-contain mx-auto rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
}
