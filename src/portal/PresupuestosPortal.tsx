import { useEffect, useState } from 'react';

type PresupuestoCategoria = 'Insumo' | 'Adquisicion' | 'ManoDeObra' | 'Entrega';

const CATEGORIA_LABEL: Record<PresupuestoCategoria, string> = {
  Insumo: 'Insumos',
  Adquisicion: 'Costo de Adquisición',
  ManoDeObra: 'Mano de Obra',
  Entrega: 'Costo de Entrega',
};

const CATEGORIAS: PresupuestoCategoria[] = ['Insumo', 'Adquisicion', 'ManoDeObra', 'Entrega'];

interface PresupuestoItemPortal {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  categoria?: PresupuestoCategoria;
  horas?: number | null;
  tarifa?: number | null;
}

interface PresupuestoPortal {
  id: string;
  proyecto: string;
  contacto?: string | null;
  fechaInicio?: string | null;
  fechaTope?: string | null;
  estado: 'Enviado' | 'Aprobado' | 'Rechazado';
  total: number;
  venta1?: number | null;
  venta2?: number | null;
  comentarioCliente?: string | null;
  respuestaCliente?: string | null;
  fotos?: string[];
  fechaEnvio?: string | null;
  fechaRespuesta?: string | null;
  createdAt: string;
  items: PresupuestoItemPortal[];
}

interface Props {
  token: string;
}

function formatGs(value: number): string {
  return 'Gs. ' + Math.round(value).toLocaleString('es-PY');
}

function formatFecha(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

const badgeEstado: Record<string, string> = {
  Enviado: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  Aprobado: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Rechazado: 'bg-red-500/15 text-red-300 border-red-500/30',
};

export default function PresupuestosPortal({ token }: Props) {
  const [presupuestos, setPresupuestos] = useState<PresupuestoPortal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [respondiendo, setRespondiendo] = useState<string | null>(null);
  const [comentario, setComentario] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/${encodeURIComponent(token)}/presupuestos`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Error');
      }
      setPresupuestos(json.data || []);
    } catch (e: any) {
      setError(e.message || 'Error al cargar presupuestos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const responder = async (id: string, respuesta: 'Aprobado' | 'Rechazado') => {
    setSaving(true);
    try {
      const res = await fetch(`/api/portal/${encodeURIComponent(token)}/presupuestos/${id}/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respuesta, comentario }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Error');
      }
      setRespondiendo(null);
      setComentario('');
      load();
    } catch (e: any) {
      setError(e.message || 'Error al responder');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel rounded-md p-8 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        <p className="text-slate-400">Cargando presupuestos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel rounded-md border border-red-500/30 p-6 text-center">
        <p className="text-red-300">{error}</p>
        <button onClick={load} className="mt-4 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10">
          Reintentar
        </button>
      </div>
    );
  }

  if (presupuestos.length === 0) {
    return null; // No mostrar la sección si no hay presupuestos
  }

  return (
    <div className="glass-panel rounded-md p-5 mb-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
        <span className="text-xl">📄</span> Presupuestos
      </h2>

      <div className="space-y-3">
        {presupuestos.map((p) => (
          <div key={p.id} className="rounded-md border border-white/10 bg-white/[0.02] overflow-hidden">
            {/* Header clickeable */}
            <button
              onClick={() => setExpandido(expandido === p.id ? null : p.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-100">{p.proyecto}</p>
                <p className="text-xs text-slate-400">Enviado: {formatFecha(p.fechaEnvio)}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-sm font-bold text-emerald-300">{formatGs(p.venta2 ?? p.venta1 ?? p.total)}</span>
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${badgeEstado[p.estado]}`}>
                  {p.estado}
                </span>
              </div>
            </button>

            {/* Detalle expandido */}
            {expandido === p.id && (
              <div className="border-t border-white/10 p-4 space-y-3">
                {/* Items agrupados por categoría */}
                <div className="space-y-3">
                  {CATEGORIAS.map((cat) => {
                    const itemsCat = p.items.filter((it) => (it.categoria || 'Insumo') === cat);
                    if (itemsCat.length === 0) return null;
                    const subtotalCat = itemsCat.reduce((sum, it) => sum + it.total, 0);
                    return (
                      <div key={cat} className="overflow-hidden rounded-xl border border-white/10 bg-[#090a0f]">
                        <div className="bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-orange-300 border-b border-white/10">
                          {CATEGORIA_LABEL[cat]}
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse min-w-[550px]">
                            <thead className="text-[11px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/5 bg-white/[0.01]">
                              <tr>
                                <th className="px-4 py-2.5">Descripción</th>
                                {cat === 'ManoDeObra' ? (
                                  <>
                                    <th className="px-4 py-2.5 text-center">Horas</th>
                                    <th className="px-4 py-2.5 text-right">Tarifa</th>
                                  </>
                                ) : (
                                  <>
                                    <th className="px-4 py-2.5 text-center">Cant.</th>
                                    <th className="px-4 py-2.5 text-right">P. Unit.</th>
                                  </>
                                )}
                                <th className="px-4 py-2.5 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {itemsCat.map((it) => (
                                <tr key={it.id} className="bg-white/[0.01] hover:bg-white/[0.03] transition-colors">
                                  <td className="px-4 py-2.5 text-slate-200">{it.descripcion}</td>
                                  {cat === 'ManoDeObra' ? (
                                    <>
                                      <td className="px-4 py-2.5 text-center text-slate-300 font-mono whitespace-nowrap">{it.horas ?? it.cantidad}</td>
                                      <td className="px-4 py-2.5 text-right font-mono text-slate-300 whitespace-nowrap">{formatGs(it.tarifa ?? it.precioUnitario)}</td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="px-4 py-2.5 text-center text-slate-300 font-mono whitespace-nowrap">{it.cantidad}</td>
                                      <td className="px-4 py-2.5 text-right font-mono text-slate-300 whitespace-nowrap">{formatGs(it.precioUnitario)}</td>
                                    </>
                                  )}
                                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-200 whitespace-nowrap">{formatGs(it.total)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-white/10 bg-white/5">
                                <td colSpan={3} className="px-4 py-2.5 text-right text-xs text-slate-400 font-medium">Subtotal</td>
                                <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-200 whitespace-nowrap">{formatGs(subtotalCat)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Precio final */}
                <div className="space-y-1.5 rounded-md border border-white/10 bg-white/5 p-3">
                  {p.venta2 != null ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-orange-300 font-medium">Precio final</span>
                      <span className="font-mono font-bold text-orange-300">{formatGs(p.venta2)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300 font-medium">Precio</span>
                      <span className="font-mono font-bold text-slate-100">{formatGs(p.venta1 ?? p.total)}</span>
                    </div>
                  )}
                </div>

                {/* Fechas */}
                {(p.fechaInicio || p.fechaTope) && (
                  <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                    {p.fechaInicio && <span>Inicio: <strong className="text-slate-200">{formatFecha(p.fechaInicio)}</strong></span>}
                    {p.fechaTope && <span>Tope: <strong className="text-slate-200">{formatFecha(p.fechaTope)}</strong></span>}
                  </div>
                )}

                {/* Comentario de aFull */}
                {p.comentarioCliente && (
                  <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
                    <span className="text-xs text-slate-400">Mensaje de aFull: </span>{p.comentarioCliente}
                  </div>
                )}

                {/* Respuesta del cliente */}
                {p.respuestaCliente && (
                  <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
                    <span className="text-xs text-slate-400">Tu respuesta: </span>{p.respuestaCliente}
                  </div>
                )}

                {/* Galería de fotos */}
                {p.fotos && p.fotos.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs text-slate-400">Fotos del presupuesto</span>
                    <div className="grid grid-cols-3 gap-2">
                      {p.fotos.map((foto, fi) => {
                        const fullUrl = foto.startsWith('http') ? foto : foto.startsWith('/') ? `${window.location.origin}${foto}` : foto;
                        return (
                          <a key={fi} href={fullUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border border-white/10 hover:border-orange-500/40 transition">
                            <img src={fullUrl} alt={`Foto ${fi + 1}`} className="h-24 w-full object-cover" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Acciones del cliente */}
                {p.estado === 'Enviado' && (
                  <div className="space-y-3">
                    {respondiendo === p.id ? (
                      <>
                        <textarea
                          value={comentario}
                          onChange={(e) => setComentario(e.target.value)}
                          placeholder="Comentario opcional..."
                          className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-sm text-slate-200 outline-none focus:border-orange-500/60"
                          rows={2}
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setRespondiendo(null); setComentario(''); }}
                            className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => responder(p.id, 'Rechazado')}
                            disabled={saving}
                            className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                          >
                            Rechazar
                          </button>
                          <button
                            onClick={() => responder(p.id, 'Aprobado')}
                            disabled={saving}
                            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                          >
                            Aprobar
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setRespondiendo(p.id); setComentario(''); }}
                          className="rounded-md border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300 hover:bg-orange-500/20"
                        >
                          Responder
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {p.estado === 'Aprobado' && (
                  <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-300">
                    ✓ Presupuesto aprobado{p.fechaRespuesta ? ` el ${formatFecha(p.fechaRespuesta)}` : ''}
                  </div>
                )}

                {p.estado === 'Rechazado' && (
                  <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">
                    ✕ Presupuesto rechazado{p.fechaRespuesta ? ` el ${formatFecha(p.fechaRespuesta)}` : ''}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
