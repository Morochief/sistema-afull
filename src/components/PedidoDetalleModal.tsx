import {Pedido, Sucursal} from '../types.ts';

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
  const inputCls = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/60';
  const labelCls = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="glass-panel max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6"
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

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-400">
            {pedido.registroId ? (
              <>Convertido al registro <span className="font-mono text-blue-300">{pedido.registroId}</span></>
            ) : (
              'Este pedido todavía no fue convertido a registro.'
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
