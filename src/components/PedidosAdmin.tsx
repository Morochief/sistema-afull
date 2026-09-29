import {useCallback, useEffect, useState} from 'react';
import {authFetchJSON} from '../authFetch.ts';
import {Cliente, Pedido, Sucursal} from '../types.ts';
import PedidoDetalleModal from './PedidoDetalleModal.tsx';
import ModalDetalleEntrega from '../portal/ModalDetalleEntrega.tsx';
import { useSortAndPaginate, getSortIcon, sortableHeaderClass } from '../lib/tableUtils.ts';
import Pagination from './Pagination.tsx';
import { Eye } from 'lucide-react';

interface PedidosAdminProps {
  clientes: Cliente[];
  onConvertido: () => void;
}

const ESTADOS = ['Pendiente', 'En Proceso', 'Completado', 'Entregado'];
const PRIORIDADES = ['Alta', 'Media', 'Baja'];

const badgePresupuesto = (estado: string | null | undefined) => {
  if (!estado) return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  const map: Record<string, string> = {
    Borrador: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    Enviado: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    Aprobado: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    Rechazado: 'bg-red-500/15 text-red-300 border-red-500/30',
  };
  return map[estado] || 'bg-slate-500/15 text-slate-300 border-slate-500/30';
};

const badgeEstado = (estado: string) => {
  const map: Record<string, string> = {
    Pendiente: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    'En Proceso': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    Completado: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
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
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [detalle, setDetalle] = useState<Pedido | null>(null);
  const [pedidoEntrega, setPedidoEntrega] = useState<Pedido | null>(null);
  const [error, setError] = useState<string | null>(null);

  type PedidoSortField = 'fechaSolicitud' | 'clienteNombre' | 'local' | 'descripcion' | 'cantidad' | 'prioridad' | 'estado';
  const table = useSortAndPaginate<Pedido, PedidoSortField>(pedidos, {
    defaultSortField: 'fechaSolicitud',
    defaultSortOrder: 'desc',
    resetDeps: [filtroEstado, filtroCliente],
  });

  const loadPedidos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.set('estado', filtroEstado);
      if (filtroCliente) params.set('clienteId', filtroCliente);
      const qs = params.toString();
      const [pedidosJson, sucursalesJson] = await Promise.all([
        authFetchJSON<{success: boolean; data: Pedido[]}>(`/api/admin/pedidos${qs ? `?${qs}` : ''}`),
        authFetchJSON<{success: boolean; data: Sucursal[]}>(`/api/admin/sucursales${filtroCliente ? `?clienteId=${encodeURIComponent(filtroCliente)}` : ''}`),
      ]);
      setPedidos(pedidosJson.data || []);
      setSucursales(sucursalesJson.data || []);
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

  const abrirLink = (p: Pedido) => {
    const base = window.location.origin;
    const cliente = clientes.find((c) => c.id === p.clienteId);
    const token = cliente?.tokenPortal;
    if (!token) {
      setError('El cliente no tiene el portal activado. Activá el portal desde Administración → Clientes.');
      return;
    }
    window.open(`${base}/portal/${token}`, '_blank');
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

  const selectCls = 'rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-sm text-slate-200 outline-none focus:border-orange-500 transition';

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
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
        <button type="button" onClick={() => loadPedidos()} className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10">
          Refrescar
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111318]/80 backdrop-blur-sm shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[1150px] border-collapse">
            <thead className="bg-[#090a0f] text-[11px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/10">
              <tr>
                <th className={`px-4 py-3.5 whitespace-nowrap ${sortableHeaderClass('fechaSolicitud', table.sortField)}`} onClick={() => table.handleSort('fechaSolicitud')}>Fecha {getSortIcon('fechaSolicitud', table.sortField, table.sortOrder)}</th>
                <th className={`px-4 py-3.5 min-w-[180px] ${sortableHeaderClass('clienteNombre', table.sortField)}`} onClick={() => table.handleSort('clienteNombre')}>Cliente {getSortIcon('clienteNombre', table.sortField, table.sortOrder)}</th>
                <th className="px-4 py-3.5 whitespace-nowrap w-[110px]">Marca</th>
                <th className={`px-4 py-3.5 min-w-[140px] ${sortableHeaderClass('local', table.sortField)}`} onClick={() => table.handleSort('local')}>Local {getSortIcon('local', table.sortField, table.sortOrder)}</th>
                <th className={`px-4 py-3.5 min-w-[240px] ${sortableHeaderClass('descripcion', table.sortField)}`} onClick={() => table.handleSort('descripcion')}>Descripción {getSortIcon('descripcion', table.sortField, table.sortOrder)}</th>
                <th className={`px-4 py-3.5 text-center whitespace-nowrap w-[90px] ${sortableHeaderClass('cantidad', table.sortField)}`} onClick={() => table.handleSort('cantidad')}>Cant. {getSortIcon('cantidad', table.sortField, table.sortOrder)}</th>
                <th className={`px-4 py-3.5 whitespace-nowrap w-[120px] ${sortableHeaderClass('prioridad', table.sortField)}`} onClick={() => table.handleSort('prioridad')}>Prioridad {getSortIcon('prioridad', table.sortField, table.sortOrder)}</th>
                <th className={`px-4 py-3.5 whitespace-nowrap w-[140px] ${sortableHeaderClass('estado', table.sortField)}`} onClick={() => table.handleSort('estado')}>Estado {getSortIcon('estado', table.sortField, table.sortOrder)}</th>
                <th className="px-4 py-3.5 whitespace-nowrap w-[110px]">Factura #</th>
                <th className="px-4 py-3.5 whitespace-nowrap w-[100px]">Presup.</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap w-[140px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {loading && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-xs text-slate-400 font-mono">Cargando pedidos...</td>
                </tr>
              )}
              {!loading && pedidos.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-xs text-slate-400 font-mono">No hay pedidos con los filtros seleccionados.</td>
                </tr>
              )}
              {table.paginatedData.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="whitespace-nowrap px-4 py-3.5 text-slate-300 font-mono align-middle">{formatFecha(p.fechaSolicitud)}</td>
                  <td className="px-4 py-3.5 font-medium text-white align-middle min-w-[180px]">
                    <div className="truncate max-w-[200px]" title={p.clienteNombre}>{p.clienteNombre}</div>
                  </td>
                  <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                    <input
                      defaultValue={p.marca || ''}
                      onBlur={(e) => e.target.value !== (p.marca || '') && updatePedido(p.id, {marca: e.target.value})}
                      placeholder="—"
                      className="w-24 rounded-md border border-white/10 bg-[#090a0f] px-2 py-1 text-xs text-slate-200 outline-none focus:border-orange-500 transition"
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-slate-300 align-middle min-w-[140px]">{p.local}</td>
                  <td className="px-4 py-3.5 align-middle min-w-[240px]">
                    <button
                      type="button"
                      onClick={() => setDetalle(p)}
                      className="block w-full text-left text-slate-300 hover:text-orange-400 text-xs break-words line-clamp-2 transition cursor-pointer"
                      title={p.descripcion}
                    >
                      {p.descripcion}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono font-medium text-slate-300 align-middle whitespace-nowrap">{p.cantidad}</td>
                  <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                    <select
                      value={p.prioridad || 'Media'}
                      onChange={(e) => updatePedido(p.id, {prioridad: e.target.value})}
                      className="rounded-md border border-white/10 bg-[#090a0f] px-2 py-1 text-xs text-slate-200 outline-none focus:border-orange-500 transition cursor-pointer"
                    >
                      {PRIORIDADES.map((pr) => (
                        <option key={pr} value={pr} className="bg-[#111318] text-slate-200">{pr}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                    <select
                      value={p.estado}
                      onChange={(e) => updatePedido(p.id, {estado: e.target.value})}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium outline-none cursor-pointer ${badgeEstado(p.estado)}`}
                    >
                      {ESTADOS.map((es) => (
                        <option key={es} value={es} className="bg-[#111318] text-slate-200">{es}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                    <input
                      defaultValue={p.facturaNumero || ''}
                      onBlur={(e) => e.target.value !== (p.facturaNumero || '') && updatePedido(p.id, {facturaNumero: e.target.value})}
                      placeholder="Sin Fac."
                      className="w-24 rounded-md border border-white/10 bg-[#090a0f] px-2 py-1 text-xs text-slate-200 outline-none focus:border-orange-500 transition font-mono"
                    />
                  </td>
                  <td className="px-4 py-3">
                    {p.presupuestoEstado ? (
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center rounded-lg border px-2 py-1 text-xs font-medium ${badgePresupuesto(p.presupuestoEstado)}`} title={p.presupuestoTotal != null ? `Gs. ${Math.round(p.presupuestoTotal).toLocaleString('es-PY')}` : undefined}>
                          {p.presupuestoEstado}
                        </span>
                        {p.presupuestoProyecto && (
                          <span className="text-xs text-slate-400" title={`Proyecto del presupuesto: ${p.presupuestoProyecto}`}>
                            {p.presupuestoProyecto}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPedidoEntrega(p)}
                        className={`rounded-md border p-1.5 text-xs transition ${
                          (p.fotoRemisionUrl || p.fotoEntregaUrl)
                            ? 'border-sky-500/40 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25'
                            : 'border-white/10 bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300'
                        }`}
                        title={(p.fotoRemisionUrl || p.fotoEntregaUrl) ? 'Ver fotos de remisión y entrega' : 'Sin fotos de entrega (click para ver)'}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetalle(p)}
                        className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-white/10"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirLink(p)}
                        className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300 transition hover:bg-amber-500/20"
                        title="Abrir portal del cliente en nueva pestaña"
                      >
                        Abrir
                      </button>
                      <button
                        type="button"
                        onClick={() => copiarLink(p)}
                        className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-white/10"
                        title="Copiar link del portal del cliente"
                      >
                        Copiar
                      </button>
                      {!p.registroId && (
                        <button
                          type="button"
                          onClick={() => convertir(p.id)}
                          className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300 transition hover:bg-emerald-500/20"
                        >
                          Convertir
                        </button>
                      )}
                      {p.registroId && (
                        <span className="inline-flex items-center rounded-md border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs text-orange-300">
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

      {!loading && pedidos.length > 0 && (
        <Pagination
          currentPage={table.currentPage}
          totalPages={table.totalPages}
          itemsPerPage={table.itemsPerPage}
          totalItems={pedidos.length}
          pageNumbers={table.pageNumbers}
          onPageChange={table.setCurrentPage}
          onItemsPerPageChange={table.setItemsPerPage}
        />
      )}

      {detalle && (
        <PedidoDetalleModal
          pedido={detalle}
          sucursales={sucursales.filter((s) => s.clienteId === detalle.clienteId)}
          onClose={() => setDetalle(null)}
          onUpdate={updatePedido}
        />
      )}

      {pedidoEntrega && (
        <ModalDetalleEntrega
          pedido={pedidoEntrega}
          onClose={() => {
            setPedidoEntrega(null);
            loadPedidos();
          }}
        />
      )}
    </div>
  );
}
