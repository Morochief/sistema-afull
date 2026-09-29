import { useState } from 'react';
import { Eye, FileText } from 'lucide-react';
import { badgeEstado } from './PedidoForm.tsx';
import ModalDetalleEntrega, { PedidoEntregaInfo } from './ModalDetalleEntrega.tsx';

interface HistorialPedido {
  id: string;
  local: string;
  descripcion: string;
  cantidad: number;
  estado: string;
  prioridad?: string | null;
  fotoUrl?: string | null;
  fechaSolicitud: string;
  fechaFin?: string | null;
  facturaNumero?: string | null;
  fotoRemisionUrl?: string | null;
  fotoEntregaUrl?: string | null;
  fechaEntrega?: string | null;
  receptorNombre?: string | null;
}

interface PedidoHistorialProps {
  pedidos: HistorialPedido[];
  sucursales?: { id: string; nombre: string }[];
  pagina: number;
  totalPaginas: number;
  total: number;
  cargando: boolean;
  filtroSearch?: string;
  filtroEstado?: string;
  filtroSucursal?: string;
  onCambioPagina: (pagina: number) => void;
  onFiltrosChange?: (search: string, estado: string, sucursal: string) => void;
}

const ESTADOS = ['Pendiente', 'En Proceso', 'Completado', 'Entregado'];

function formatFecha(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function PedidoHistorial({
  pedidos,
  sucursales = [],
  pagina,
  totalPaginas,
  total,
  cargando,
  filtroSearch = '',
  filtroEstado = '',
  filtroSucursal = '',
  onCambioPagina,
  onFiltrosChange,
}: PedidoHistorialProps) {
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);
  const [pedidoEntregaSeleccionado, setPedidoEntregaSeleccionado] = useState<PedidoEntregaInfo | null>(null);
  const [localSearch, setLocalSearch] = useState(filtroSearch);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onFiltrosChange) {
      onFiltrosChange(localSearch, filtroEstado, filtroSucursal);
    }
  };

  const handleEstadoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onFiltrosChange) {
      onFiltrosChange(localSearch, e.target.value, filtroSucursal);
    }
  };

  const handleSucursalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onFiltrosChange) {
      onFiltrosChange(localSearch, filtroEstado, e.target.value);
    }
  };

  const inputCls = 'rounded-md border border-white/10 bg-[#090a0f] px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-orange-500 transition';
  const btnCls = 'rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <section className="mt-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Mis Pedidos</h2>
          <span className="text-xs text-slate-500">{total} {total === 1 ? 'pedido' : 'pedidos'} registrados</span>
        </div>

        {/* Filtros para escalabilidad */}
        {onFiltrosChange && (
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Buscar descripción, local o factura..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className={`${inputCls} w-44 sm:w-60`}
            />
            {sucursales.length > 1 && (
              <select value={filtroSucursal} onChange={handleSucursalChange} className={inputCls}>
                <option value="">Todos los locales</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            )}
            <select value={filtroEstado} onChange={handleEstadoChange} className={inputCls}>
              <option value="">Todos los estados</option>
              {ESTADOS.map((est) => (
                <option key={est} value={est}>{est}</option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-300 transition hover:bg-orange-500/20"
            >
              Filtrar
            </button>
          </form>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111318]/80 backdrop-blur-sm shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[950px]">
            <thead className="border-b border-white/10 bg-[#090a0f] text-xs font-mono uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3.5">Fecha</th>
                <th className="px-4 py-3.5">Local</th>
                <th className="px-4 py-3.5">Descripción</th>
                <th className="px-4 py-3.5 text-center">Cant.</th>
                <th className="px-4 py-3.5">Factura #</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5 text-center">Foto Pedido</th>
                <th className="px-4 py-3.5 text-center">Entrega / Remisión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cargando && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">
                    <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                    Cargando pedidos...
                  </td>
                </tr>
              )}
              {!cargando && pedidos.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                    No se encontraron pedidos con los filtros aplicados.
                  </td>
                </tr>
              )}
              {!cargando && pedidos.map((p) => (
                <tr key={p.id} className="transition hover:bg-white/[0.02]">
                  <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-slate-400">{formatFecha(p.fechaSolicitud)}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-white text-xs">{p.local}</td>
                  <td className="px-4 py-3.5 text-slate-300 text-xs min-w-[200px]" title={p.descripcion}>
                    <p className="line-clamp-2 hover:line-clamp-none transition-all">{p.descripcion}</p>
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-200 whitespace-nowrap">{p.cantidad}</td>
                  <td className="px-4 py-3.5 font-mono text-xs whitespace-nowrap">
                    {p.facturaNumero ? (
                      <span className="font-semibold text-orange-300">{p.facturaNumero}</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badgeEstado(p.estado)}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center whitespace-nowrap">
                    {p.fotoUrl ? (
                      <button
                        onClick={() => setFotoAmpliada(p.fotoUrl!)}
                        className="inline-block overflow-hidden rounded-md border border-white/10 transition hover:border-orange-500/50"
                        title="Ver foto del pedido"
                        aria-label="Ver foto"
                      >
                        <img src={p.fotoUrl} alt={`Foto del pedido ${p.descripcion}`} className="h-9 w-12 object-cover" />
                      </button>
                    ) : (
                      <span className="text-xs text-slate-600 font-mono">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setPedidoEntregaSeleccionado(p)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border transition cursor-pointer ${
                        (p.fotoRemisionUrl || p.fotoEntregaUrl)
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                      title="Ver fotos de remisión y entrega"
                      aria-label="Ver fotos de remisión y entrega"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{(p.fotoRemisionUrl || p.fotoEntregaUrl) ? 'Ver Fotos' : 'Ver'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            className={btnCls}
            disabled={pagina <= 1 || cargando}
            onClick={() => onCambioPagina(pagina - 1)}
          >
            ← Anterior
          </button>
          <span className="text-xs font-mono text-slate-400">
            Página {pagina} de {totalPaginas}
          </span>
          <button
            className={btnCls}
            disabled={pagina >= totalPaginas || cargando}
            onClick={() => onCambioPagina(pagina + 1)}
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Modal Foto ampliada del pedido original */}
      {fotoAmpliada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setFotoAmpliada(null)}
        >
          <div className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-md border border-white/10 shadow-2xl bg-[#111318]" onClick={(e) => e.stopPropagation()}>
            <img src={fotoAmpliada} alt="Foto del pedido" className="max-h-[90vh] w-auto object-contain" />
            <button
              onClick={() => setFotoAmpliada(null)}
              className="absolute right-3 top-3 rounded-md border border-white/20 bg-black/60 px-2.5 py-1 text-sm text-white hover:bg-black/80 transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Modal Detalle de Entrega y Remisión (Botón Ojito) */}
      {pedidoEntregaSeleccionado && (
        <ModalDetalleEntrega
          pedido={pedidoEntregaSeleccionado}
          onClose={() => setPedidoEntregaSeleccionado(null)}
        />
      )}
    </section>
  );
}
