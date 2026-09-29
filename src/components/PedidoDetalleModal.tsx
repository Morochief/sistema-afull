import React, {useState} from 'react';
import {Pedido, Sucursal} from '../types.ts';
import {Camera, FileText, Upload, ExternalLink, CheckCircle2, Image as ImageIcon} from 'lucide-react';
import {authFetchJSON} from '../authFetch.ts';

interface PedidoDetalleModalProps {
  pedido: Pedido;
  sucursales: Sucursal[];
  onClose: () => void;
  onUpdate: (id: string, cambios: Partial<Pedido>) => Promise<void>;
}

const ESTADOS = ['Pendiente', 'En Proceso', 'Completado', 'Entregado'];
const PRIORIDADES = ['Alta', 'Media', 'Baja'];

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-PY', {day: '2-digit', month: '2-digit', year: 'numeric'});
  } catch {
    return iso;
  }
}

export default function PedidoDetalleModal({pedido, sucursales, onClose, onUpdate}: PedidoDetalleModalProps) {
  const [subiendoFoto, setSubiendoFoto] = useState<'remision' | 'entrega' | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleSubirFoto = (tipo: 'remision' | 'entrega') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        const maxDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        let compressedBase64 = base64;
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        }

        setSubiendoFoto(tipo);
        setUploadError(null);
        try {
          const res = await authFetchJSON<{success: boolean; data: any}>(
            `/api/admin/pedidos/${pedido.id}/fotos-entrega`,
            {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                tipo,
                fotoBase64: compressedBase64,
                receptorNombre: pedido.receptorNombre || '',
              }),
            }
          );
          if (res.success && res.data) {
            await onUpdate(pedido.id, {
              ...(tipo === 'remision' ? {fotoRemisionUrl: res.data.fotoRemisionUrl} : {fotoEntregaUrl: res.data.fotoEntregaUrl}),
              estado: res.data.estado || pedido.estado,
            });
          }
        } catch (err: any) {
          setUploadError(err.message || 'Error al subir foto');
        } finally {
          setSubiendoFoto(null);
        }
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  const inputCls = 'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/60';
  const labelCls = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="glass-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-md p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{pedido.clienteNombre} — {pedido.local}</h2>
            <p className="text-xs text-slate-400">ID: {pedido.id}</p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-sm text-slate-300 hover:bg-white/10">
            ✕
          </button>
        </div>

        {pedido.fotoUrl && (
          <img src={pedido.fotoUrl} alt="Foto del pedido" className="mb-4 h-48 w-full rounded-xl border border-white/10 object-cover" />
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={labelCls}>Fecha Inicio</label>
              <input
                type="date"
                className={inputCls}
                defaultValue={new Date(pedido.fechaSolicitud).toISOString().substring(0, 10)}
                onChange={(e) => e.target.value && onUpdate(pedido.id, {fechaSolicitud: e.target.value})}
              />
            </div>
            <div>
              <label className={labelCls}>Local (Sucursal)</label>
              <select
                className={inputCls}
                value={pedido.sucursalId}
                onChange={(e) => onUpdate(pedido.id, {sucursalId: e.target.value})}
              >
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900">{s.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Descripción</label>
            <textarea
              className={inputCls}
              rows={2}
              defaultValue={pedido.descripcion}
              onBlur={(e) => e.target.value.trim() !== pedido.descripcion && onUpdate(pedido.id, {descripcion: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={labelCls}>Cantidad</label>
              <input
                type="number"
                min={1}
                className={inputCls}
                defaultValue={pedido.cantidad}
                onBlur={(e) => Number(e.target.value) !== pedido.cantidad && onUpdate(pedido.id, {cantidad: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className={labelCls}>Marca</label>
              <input
                className={inputCls}
                defaultValue={pedido.marca || ''}
                onBlur={(e) => e.target.value !== (pedido.marca || '') && onUpdate(pedido.id, {marca: e.target.value})}
                placeholder="Ej: McDonald's"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={labelCls}>Tipo</label>
              <input
                className={inputCls}
                defaultValue={pedido.tipo || ''}
                onBlur={(e) => e.target.value !== (pedido.tipo || '') && onUpdate(pedido.id, {tipo: e.target.value})}
                placeholder="Ej: Cartelería"
              />
            </div>
            <div>
              <label className={labelCls}>Prioridad</label>
              <select
                className={inputCls}
                value={pedido.prioridad || 'Media'}
                onChange={(e) => onUpdate(pedido.id, {prioridad: e.target.value})}
              >
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p} className="bg-slate-900">{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={labelCls}>Estado</label>
              <select
                className={inputCls}
                value={pedido.estado}
                onChange={(e) => onUpdate(pedido.id, {estado: e.target.value})}
              >
                {ESTADOS.map((es) => (
                  <option key={es} value={es} className="bg-slate-900">{es}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Factura #</label>
              <input
                className={inputCls}
                defaultValue={pedido.facturaNumero || ''}
                onBlur={(e) => e.target.value !== (pedido.facturaNumero || '') && onUpdate(pedido.id, {facturaNumero: e.target.value})}
                placeholder="Número de factura"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Fecha fin</label>
            <input
              type="date"
              className={inputCls}
              defaultValue={pedido.fechaFin ? new Date(pedido.fechaFin).toISOString().substring(0, 10) : ''}
              onChange={(e) => onUpdate(pedido.id, {fechaFin: e.target.value || null})}
            />
          </div>

          {/* Comprobantes de Entrega / Remisión */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Comprobantes de Entrega & Remisión
              </span>
              {pedido.fechaEntrega && (
                <span className="text-[11px] text-slate-400 font-mono">
                  Entregado: {formatFecha(pedido.fechaEntrega)}
                </span>
              )}
            </div>

            {uploadError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
                {uploadError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Receptor / Quien Recibió</label>
                <input
                  className={inputCls}
                  defaultValue={pedido.receptorNombre || ''}
                  onBlur={(e) => e.target.value !== (pedido.receptorNombre || '') && onUpdate(pedido.id, {receptorNombre: e.target.value})}
                  placeholder="Nombre y apellido"
                />
              </div>
              <div>
                <label className={labelCls}>Fecha Entrega</label>
                <input
                  type="date"
                  className={inputCls}
                  defaultValue={pedido.fechaEntrega ? new Date(pedido.fechaEntrega).toISOString().substring(0, 10) : ''}
                  onChange={(e) => onUpdate(pedido.id, {fechaEntrega: e.target.value || null})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Remisión firmada */}
              <div className="rounded-lg border border-white/10 bg-black/20 p-3 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-orange-400" />
                    Remisión Firmada
                  </span>
                  {pedido.fotoRemisionUrl ? (
                    <a
                      href={pedido.fotoRemisionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-orange-400 hover:underline inline-flex items-center gap-1"
                    >
                      Ver <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-500">Pendiente</span>
                  )}
                </div>
                {pedido.fotoRemisionUrl && (
                  <img
                    src={pedido.fotoRemisionUrl}
                    alt="Remisión"
                    className="h-24 w-full rounded border border-white/10 object-cover"
                  />
                )}
                <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10 transition">
                  <Upload className="w-3.5 h-3.5" />
                  {subiendoFoto === 'remision' ? 'Subiendo...' : pedido.fotoRemisionUrl ? 'Reemplazar Remisión' : 'Subir Remisión'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={subiendoFoto !== null}
                    onChange={handleSubirFoto('remision')}
                  />
                </label>
              </div>

              {/* Foto de Entrega / Producto */}
              <div className="rounded-lg border border-white/10 bg-black/20 p-3 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    Foto Instalación / Entrega
                  </span>
                  {pedido.fotoEntregaUrl ? (
                    <a
                      href={pedido.fotoEntregaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                      Ver <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-500">Pendiente</span>
                  )}
                </div>
                {pedido.fotoEntregaUrl && (
                  <img
                    src={pedido.fotoEntregaUrl}
                    alt="Entrega"
                    className="h-24 w-full rounded border border-white/10 object-cover"
                  />
                )}
                <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10 transition">
                  <Upload className="w-3.5 h-3.5" />
                  {subiendoFoto === 'entrega' ? 'Subiendo...' : pedido.fotoEntregaUrl ? 'Reemplazar Foto' : 'Subir Foto'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={subiendoFoto !== null}
                    onChange={handleSubirFoto('entrega')}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-400">
            {pedido.registroId ? (
              <>Convertido al registro <span className="font-mono text-orange-300">{pedido.registroId}</span></>
            ) : (
              'Este pedido todavía no fue convertido a registro.'
            )}
          </div>

          {pedido.presupuestoEstado && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Presupuesto vinculado</span>
                  <p className="mt-1 text-sm font-semibold text-slate-200">{pedido.presupuestoEstado}</p>
                </div>
                {pedido.presupuestoTotal != null && (
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Total</span>
                    <p className="text-sm font-bold text-orange-300">Gs. {Math.round(pedido.presupuestoTotal).toLocaleString('es-PY')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
