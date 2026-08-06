import {useCallback, useEffect, useState} from 'react';
import {authFetchJSON} from '../authFetch.ts';
import {Cliente, Pedido} from '../types.ts';
import PedidoDetalleModal from './PedidoDetalleModal.tsx';

interface PedidosAdminProps {
  clientes: Cliente[];
  onConvertido: () => void;
}

const ESTADOS = ['Pendiente', 'En Proceso', 'Completado', 'Entregado'];
const PRIORIDADES = ['Alta', 'Media', 'Baja'];

const badgeEstado = (estado: string) => {
  const map: Record<string, string> = {
    Pendiente: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    'En Proceso': 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    Completado: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    Entregado: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  };
  return map[estado] || 'bg-slate-500/15 text-slate-300 border-slate-500/30';
};

const badgePrioridad = (p: string | null | undefined) => {
  const map: Record<string, string> = {
    Alta: 'bg-red-500/15 text-red-300 border-red-500/30',
    Media: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    Baja: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  };
  return map[p || ''] || 'bg-slate-500/15 text-slate-300 border-slate-500/30';
};

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-PY', {day: '2-digit', month: '2-digit', year: 'numeric'});
  } catch {
    return iso;
  }
}

export default function PedidosAdmin({clientes, onConvertido}: PedidosAdminProps) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [detalle, setDetalle] = useState<Pedido | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPedidos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.set('estado', filtroEstado);
      if (filtroCliente) params.set('clienteId', filtroCliente);
      const qs = params.toString();
      const json = await authFetchJSON<{success: boolean; data: Pedido[]}>(`/api/admin/pedidos${qs ? `?${qs}` : ''}`);
      setPedidos(json.data || []);
    } catch (e: any) {
      setError(e.message || 'Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, filtroCliente]);

  useEffect(() => {
    loadPedidos();
  }, [loadPedidos]);

  const updatePedido = async (id: string, cambios: Partial<Pedido>) => {
    try {
      await authFetchJSON(`/api/admin/pedidos/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(cambios),
      });
      loadPedidos();
    } catch (e: any) {
      setError(e.message || 'Error al actualizar pedido');
    }
  };

  const convertir = async (id: string) => {
    try {
      await authFetchJSON(`/api/admin/pedidos/${id}/convertir`, {method: 'POST'});
      onConvertido();
      loadPedidos();
    } catch (e: any) {
      setError(e.message || 'Error al convertir pedido');
    }
  };

  const copiarLink = async (p: Pedido) => {
    const base = window.location.origin;
    const cliente = clientes.find((c) => c.id === p.clienteId);
    const token = cliente?.tokenPortal;
    if (!token) {
      setError('El cliente no tiene el portal activado. Activá el portal desde Administración → Clientes.');
      return;
    }
    try {
      await navigator.clipboard.writeText(`${base}/portal/${token}`);
      setError(null);
    } catch {
      setError('No se pudo copiar el link');
    }
  };

  const selectCls = 'rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500/60';

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <select className={selectCls} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <select className={selectCls} value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
          <option value="">Todos los clientes</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <button onClick={() => loadPedidos()} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10">
          Refrescar
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Local</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3 text-center">Cant.</th>
                <th className="px-4 py-3">Prioridad</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">Cargando pedidos...</td>
                </tr>
              )}
              {!loading && pedidos.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">No hay pedidos con los filtros seleccionados.</td>
                </tr>
              )}
              {pedidos.map((p) => (
                <tr key={p.id} className="bg-white/[0.02] transition hover:bg-white/[0.05]">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatFecha(p.fechaSolicitud)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{p.clienteNombre}</td>
                  <td className="whitespace-nowrap px-4 py-3">{p.local}</td>
                  <td className="max-w-[16rem]">
                    <button
                      onClick={() => setDetalle(p)}
                      className="block w-full truncate px-4 py-3 text-left text-slate-300 hover:text-blue-400"
                      title={p.descripcion}
                    >
                      {p.descripcion}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">{p.cantidad}</td>
                  <td className="px-4 py-3">
                    <select
                      value={p.prioridad || 'Media'}
                      onChange={(e) => updatePedido(p.id, {prioridad: e.target.value})}
                      className="rounded-lg border border-white/10 bg-slate-800 px-2 py-1 text-xs text-slate-200 outline-none"
                    >
                      {PRIORIDADES.map((pr) => (
                        <option key={pr} value={pr}>{pr}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.estado}
                      onChange={(e) => updatePedido(p.id, {estado: e.target.value})}
                      className={`rounded-lg border px-2 py-1 text-xs font-medium outline-none ${badgeEstado(p.estado)}`}
                    >
                      {ESTADOS.map((es) => (
                        <option key={es} value={es} className="bg-slate-900 text-slate-200">{es}</option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <button
                        onClick={() => setDetalle(p)}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-white/10"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => copiarLink(p)}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-white/10"
                        title="Copiar link del portal del cliente"
                      >
                        Link
                      </button>
                      {!p.registroId && (
                        <button
                          onClick={() => convertir(p.id)}
                          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300 transition hover:bg-emerald-500/20"
                        >
                          Convertir
                        </button>
                      )}
                      {p.registroId && (
                        <span className="inline-flex items-center rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-300">
                          Registro ✓
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detalle && <PedidoDetalleModal pedido={detalle} onClose={() => setDetalle(null)} onUpdate={updatePedido} />}
    </div>
  );
}
