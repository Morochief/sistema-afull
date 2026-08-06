import {badgeEstado} from './PedidoForm.tsx';

interface HistorialPedido {
  id: string;
  local: string;
  descripcion: string;
  cantidad: number;
  estado: string;
  prioridad?: string | null;
  fotoUrl?: string | null;
  fechaSolicitud: string;
}

interface PedidoHistorialProps {
  pedidos: HistorialPedido[];
  pagina: number;
  totalPaginas: number;
  total: number;
  cargando: boolean;
  onCambioPagina: (pagina: number) => void;
}

function formatFecha(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-PY', {day: '2-digit', month: '2-digit', year: 'numeric'});
  } catch {
    return iso;
  }
}

export default function PedidoHistorial({pedidos, pagina, totalPaginas, total, cargando, onCambioPagina}: PedidoHistorialProps) {
  if (!cargando && pedidos.length === 0) {
    return (
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Mis Pedidos</h2>
        <div className="glass-panel rounded-2xl p-8 text-center text-sm text-slate-400">
          Todavía no hay pedidos. ¡Envía tu primer pedido arriba!
        </div>
      </section>
    );
  }

  const btnCls = 'rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mis Pedidos</h2>
        <span className="text-xs text-slate-500">{total} pedidos en total</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Local</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3 text-center">Cant.</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cargando && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">Cargando...</td>
                </tr>
              )}
              {!cargando && pedidos.map((p) => (
                <tr key={p.id} className="bg-white/[0.02] transition hover:bg-white/[0.05]">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatFecha(p.fechaSolicitud)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{p.local}</td>
                  <td className="max-w-[16rem] truncate px-4 py-3 text-slate-300" title={p.descripcion}>
                    {p.descripcion}
                  </td>
                  <td className="px-4 py-3 text-center">{p.cantidad}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeEstado(p.estado)}`}>
                      {p.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            className={btnCls}
            disabled={pagina <= 1 || cargando}
            onClick={() => onCambioPagina(pagina - 1)}
          >
            ← Anterior
          </button>
          <span className="text-xs text-slate-400">
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
    </section>
  );
}
