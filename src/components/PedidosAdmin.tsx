import {useCallback, useEffect, useState, useMemo} from 'react';
import {authFetchJSON} from '../authFetch.ts';
import {Cliente, Pedido, Sucursal} from '../types.ts';
import PedidoDetalleModal from './PedidoDetalleModal.tsx';
import ModalDetalleEntrega from '../portal/ModalDetalleEntrega.tsx';
import { useSortAndPaginate, getSortIcon, sortableHeaderClass } from '../lib/tableUtils.ts';
import Pagination from './Pagination.tsx';
import { Eye, ExternalLink, Copy, CheckCircle, Clock, CheckCircle2, AlertCircle, MapPin, Tag } from 'lucide-react';

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

  // Contadores para chips KPI
  const counts = useMemo(() => {
    const res = { total: pedidos.length, pendiente: 0, enProceso: 0, completado: 0, entregado: 0 };
    pedidos.forEach(p => {
      if (p.estado === 'Pendiente') res.pendiente++;
      else if (p.estado === 'En Proceso') res.enProceso++;
      else if (p.estado === 'Completado') res.completado++;
      else if (p.estado === 'Entregado') res.entregado++;
    });
    return res;
  }, [pedidos]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {/* KPI Chips de Estado (Filtros en 1 Click) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <button
          type="button"
          onClick={() => setFiltroEstado('')}
          className={`flex items-center justify-between p-2.5 rounded-md border cursor-pointer transition-all ${
            filtroEstado === ''
              ? 'bg-orange-500/15 border-orange-500/40 text-orange-200 shadow-xs'
              : 'bg-[#111318] border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="text-xs font-semibold">Todos</span>
          <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-white/10">{counts.total}</span>
        </button>

        <button
          type="button"
          onClick={() => setFiltroEstado('Pendiente')}
          className={`flex items-center justify-between p-2.5 rounded-md border cursor-pointer transition-all ${
            filtroEstado === 'Pendiente'
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 shadow-xs'
              : 'bg-[#111318] border-white/10 text-slate-400 hover:text-amber-300 hover:bg-white/5'
          }`}
        >
          <span className="text-xs font-semibold">Pendientes</span>
          <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">{counts.pendiente}</span>
        </button>

        <button
          type="button"
          onClick={() => setFiltroEstado('En Proceso')}
          className={`flex items-center justify-between p-2.5 rounded-md border cursor-pointer transition-all ${
            filtroEstado === 'En Proceso'
              ? 'bg-blue-500/20 border-orange-500/50 text-orange-200 shadow-xs'
              : 'bg-[#111318] border-white/10 text-slate-400 hover:text-orange-300 hover:bg-white/5'
          }`}
        >
          <span className="text-xs font-semibold">En Proceso</span>
          <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">{counts.enProceso}</span>
        </button>

        <button
          type="button"
          onClick={() => setFiltroEstado('Completado')}
          className={`flex items-center justify-between p-2.5 rounded-md border cursor-pointer transition-all ${
            filtroEstado === 'Completado'
              ? 'bg-orange-500/20 border-orange-500/50 text-orange-200 shadow-xs'
              : 'bg-[#111318] border-white/10 text-slate-400 hover:text-orange-300 hover:bg-white/5'
          }`}
        >
          <span className="text-xs font-semibold">Completados</span>
          <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">{counts.completado}</span>
        </button>

        <button
          type="button"
          onClick={() => setFiltroEstado('Entregado')}
          className={`flex items-center justify-between p-2.5 rounded-md border cursor-pointer transition-all ${
            filtroEstado === 'Entregado'
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200 shadow-xs'
              : 'bg-[#111318] border-white/10 text-slate-400 hover:text-emerald-300 hover:bg-white/5'
          }`}
        >
          <span className="text-xs font-semibold">Entregados</span>
          <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">{counts.entregado}</span>
        </button>
      </div>

      {/* Barra de Filtro de Cliente y Actualización */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111318] p-3 rounded-md border border-white/10">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
          <select 
            className="rounded-md border border-white/10 bg-[#090a0f] px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-orange-500 transition min-w-[200px]"
            value={filtroCliente} 
            onChange={(e) => setFiltroCliente(e.target.value)}
          >
            <option value="">Todos los clientes</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          {filtroCliente && (
            <button
              type="button"
              onClick={() => setFiltroCliente('')}
              className="text-xs text-orange-400 hover:underline px-2 py-1"
            >
              Limpiar filtro cliente
            </button>
          )}
        </div>

        <button 
          type="button" 
          onClick={() => loadPedidos()} 
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white cursor-pointer"
        >
          Refrescar Datos
        </button>
      </div>

      {/* Tabla Compacta Enterprise (100% Ancho Sin Scroll Forzado) */}
      <div className="overflow-hidden rounded-md border border-white/10 bg-[#111318] shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#090a0f] text-[11px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/10">
              <tr>
                <th className={`px-3.5 py-3 whitespace-nowrap w-[90px] ${sortableHeaderClass('fechaSolicitud', table.sortField)}`} onClick={() => table.handleSort('fechaSolicitud')}>
                  Fecha {getSortIcon('fechaSolicitud', table.sortField, table.sortOrder)}
                </th>
                <th className={`px-3.5 py-3 min-w-[160px] max-w-[220px] ${sortableHeaderClass('clienteNombre', table.sortField)}`} onClick={() => table.handleSort('clienteNombre')}>
                  Cliente / Local {getSortIcon('clienteNombre', table.sortField, table.sortOrder)}
                </th>
                <th className={`px-3.5 py-3 ${sortableHeaderClass('descripcion', table.sortField)}`} onClick={() => table.handleSort('descripcion')}>
                  Pedido / Detalle {getSortIcon('descripcion', table.sortField, table.sortOrder)}
                </th>
                <th className={`px-3.5 py-3 whitespace-nowrap w-[130px] ${sortableHeaderClass('estado', table.sortField)}`} onClick={() => table.handleSort('estado')}>
                  Estado & Prioridad {getSortIcon('estado', table.sortField, table.sortOrder)}
                </th>
                <th className="px-3.5 py-3 whitespace-nowrap w-[140px]">
                  Comercial / Fac.
                </th>
                <th className="px-3.5 py-3 text-right whitespace-nowrap w-[140px]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-xs text-slate-400 font-mono">Cargando pedidos...</td>
                </tr>
              )}
              {!loading && pedidos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-xs text-slate-400 font-mono">No hay pedidos con los filtros seleccionados.</td>
                </tr>
              )}
              {table.paginatedData.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                  {/* 1. Fecha */}
                  <td className="whitespace-nowrap px-3.5 py-3 text-slate-300 font-mono align-top text-[11px]">
                    <div>{formatFecha(p.fechaSolicitud)}</div>
                  </td>

                  {/* 2. Cliente & Local Combinado */}
                  <td className="px-3.5 py-3 align-top min-w-[160px] max-w-[220px]">
                    <div className="font-semibold text-white truncate leading-snug" title={p.clienteNombre}>
                      {p.clienteNombre}
                    </div>
                    {p.local && (
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400 truncate" title={p.local}>
                        <MapPin className="w-3 h-3 text-orange-400/80 shrink-0" />
                        <span className="truncate">{p.local}</span>
                      </div>
                    )}
                  </td>

                  {/* 3. Descripción + Marca + Cantidad Combinados */}
                  <td className="px-3.5 py-3 align-top">
                    <button
                      type="button"
                      onClick={() => setDetalle(p)}
                      className="block text-left text-slate-200 hover:text-orange-400 text-xs leading-relaxed transition cursor-pointer font-medium line-clamp-2"
                      title={p.descripcion}
                    >
                      {p.descripcion}
                    </button>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                      {p.cantidad && (
                        <span className="rounded bg-white/5 border border-white/5 px-1.5 py-0.2 font-mono text-slate-300">
                          Cant: <strong>{p.cantidad}</strong>
                        </span>
                      )}
                      {p.marca && (
                        <span className="rounded bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.2 font-mono text-orange-300">
                          {p.marca}
                        </span>
                      )}
                      {(p.fotoRemisionUrl || p.fotoEntregaUrl) && (
                        <button
                          type="button"
                          onClick={() => setPedidoEntrega(p)}
                          className="inline-flex items-center gap-1 rounded bg-sky-500/15 border border-sky-500/30 px-1.5 py-0.2 text-sky-300 hover:bg-sky-500/25 transition cursor-pointer"
                          title="Ver fotos de entrega / remisión"
                        >
                          <Eye className="w-2.5 h-2.5" /> Entrega
                        </button>
                      )}
                    </div>
                  </td>

                  {/* 4. Estado & Prioridad Combinados */}
                  <td className="px-3.5 py-3 align-top whitespace-nowrap">
                    <div className="space-y-1">
                      <div>
                        <select
                          value={p.estado}
                          onChange={(e) => updatePedido(p.id, {estado: e.target.value})}
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold outline-none cursor-pointer ${badgeEstado(p.estado)}`}
                        >
                          {ESTADOS.map((es) => (
                            <option key={es} value={es} className="bg-[#111318] text-slate-200">{es}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-mono">Prio:</span>
                        <select
                          value={p.prioridad || 'Media'}
                          onChange={(e) => updatePedido(p.id, {prioridad: e.target.value})}
                          className={`rounded border px-1.5 py-0.2 text-[10px] font-mono outline-none cursor-pointer bg-[#090a0f] border-white/10 text-slate-300`}
                        >
                          {PRIORIDADES.map((pr) => (
                            <option key={pr} value={pr} className="bg-[#111318] text-slate-200">{pr}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </td>

                  {/* 5. Comercial / Presupuesto / Factura */}
                  <td className="px-3.5 py-3 align-top whitespace-nowrap">
                    <div className="space-y-1">
                      {p.presupuestoEstado ? (
                        <div className="flex flex-col gap-0.5">
                          <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${badgePresupuesto(p.presupuestoEstado)}`} title={p.presupuestoTotal != null ? `Gs. ${Math.round(p.presupuestoTotal).toLocaleString('es-PY')}` : undefined}>
                            {p.presupuestoEstado}
                          </span>
                          {p.presupuestoProyecto && (
                            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]" title={p.presupuestoProyecto}>
                              {p.presupuestoProyecto}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-600 font-mono">Sin presup.</span>
                      )}

                      <div className="text-[10px] font-mono text-slate-400">
                        {p.facturaNumero ? (
                          <span className="text-slate-300">Fac: #{p.facturaNumero}</span>
                        ) : (
                          <span className="text-slate-600">Sin factura</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 6. Acciones Limpias */}
                  <td className="whitespace-nowrap px-3.5 py-3 align-top text-right">
                    <div className="inline-flex flex-col items-end gap-1">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDetalle(p)}
                          className="rounded-md border border-white/10 bg-white/5 hover:bg-white/10 px-2 py-1 text-[11px] font-medium text-slate-200 transition cursor-pointer"
                          title="Ver y editar detalles completos del pedido"
                        >
                          Ver Detalle
                        </button>

                        {!p.registroId ? (
                          <button
                            type="button"
                            onClick={() => convertir(p.id)}
                            className="rounded-md border border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/25 px-2 py-1 text-[11px] font-semibold text-emerald-300 transition cursor-pointer"
                            title="Convertir a registro operativo"
                          >
                            Convertir
                          </button>
                        ) : (
                          <span className="inline-flex items-center rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-[10px] font-mono text-orange-300">
                            Registro ✓
                          </span>
                        )}
                      </div>

                      {/* Enlaces de portal compactos */}
                      <div className="inline-flex items-center gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => abrirLink(p)}
                          className="text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-0.5 cursor-pointer"
                          title="Abrir portal del cliente"
                        >
                          <ExternalLink className="w-2.5 h-2.5" /> Portal
                        </button>
                        <button
                          type="button"
                          onClick={() => copiarLink(p)}
                          className="text-slate-400 hover:text-white flex items-center gap-0.5 cursor-pointer"
                          title="Copiar link del portal"
                        >
                          <Copy className="w-2.5 h-2.5" /> Copiar
                        </button>
                      </div>
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
