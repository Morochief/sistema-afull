/**
 * MisTareas — Vista del operario (rol OPERADOR)
 * El operario ve solo SUS tareas, marca progreso (Pendiente/EnProgreso/Completada/Omitida),
 * agrega notas y foto de evidencia.
 * Filtros: por día (hoy / fecha específica) y por estado. Paginación.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { authFetchJSON } from '../authFetch.ts';
import { CheckSquare, Clock, Play, X, Camera, Calendar } from 'lucide-react';
import Pagination from './Pagination.tsx';
import SubirFotoEntregaModal from './SubirFotoEntregaModal.tsx';

interface Tarea {
  id: string;
  hojaRutaId: string;
  descripcion: string;
  categoria: string;
  cantidad: number | null;
  unidad: string | null;
  estado: string;
  tiempoEstimado?: string | null;
  fechaAsignada: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  notasOperario: string | null;
  fotoUrl: string | null;
  hojaRuta: {
    id: string;
    clienteNombre: string;
    proyecto: string;
    fecha: string;
    estado: string;
  };
}

const ESTADOS = ['Pendiente', 'EnProgreso', 'Completada', 'Omitida'];
const ESTADO_LABELS: Record<string, string> = {
  'Pendiente': 'Pendiente',
  'EnProgreso': 'En Progreso',
  'Completada': 'Completada',
  'Omitida': 'Omitida',
};

function calcularPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

export default function MisTareas() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filtroFecha, setFiltroFecha] = useState('hoy'); // 'hoy' | 'fecha' | 'todas'
  const [fechaEspecifica, setFechaEspecifica] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);

  // Modal de notas/foto
  const [tareaActiva, setTareaActiva] = useState<Tarea | null>(null);
  const [notasInput, setNotasInput] = useState('');
  const [fotoInput, setFotoInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSubirEntrega, setShowSubirEntrega] = useState(false);

  const totalPages = Math.ceil(total / limit);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '/api/operario/tareas';
      const params = new URLSearchParams();

      if (filtroFecha === 'hoy') {
        endpoint = '/api/operario/tareas/hoy';
      } else if (filtroFecha === 'fecha' && fechaEspecifica) {
        params.set('fecha', fechaEspecifica);
      }

      if (filtroEstado) params.set('estado', filtroEstado);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const json = await authFetchJSON<{ success: boolean; data: Tarea[]; pagination?: any }>(`${endpoint}?${params}`);
      setTareas(json.data || []);
      setTotal(json.pagination?.total || json.data?.length || 0);
    } catch (e: any) {
      setError(e.message || 'Error al cargar tus tareas');
    } finally {
      setLoading(false);
    }
  }, [filtroFecha, fechaEspecifica, filtroEstado, page, limit]);

  useEffect(() => { load(); }, [load]);

  const handleCambiarEstado = async (tarea: Tarea, nuevoEstado: string) => {
    setSaving(true);
    setError(null);
    try {
      await authFetchJSON(`/api/operario/tareas/${tarea.id}`, {
        method: 'PUT',
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      load();
    } catch (e: any) {
      setError(e.message || 'Error al actualizar tarea');
    } finally {
      setSaving(false);
    }
  };

  const handleGuardarNotas = async () => {
    if (!tareaActiva) return;
    setSaving(true);
    try {
      await authFetchJSON(`/api/operario/tareas/${tareaActiva.id}`, {
        method: 'PUT',
        body: JSON.stringify({ notasOperario: notasInput, fotoUrl: fotoInput }),
      });
      setTareaActiva(null);
      setNotasInput('');
      setFotoInput('');
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const abrirNotas = (tarea: Tarea) => {
    setTareaActiva(tarea);
    setNotasInput(tarea.notasOperario || '');
    setFotoInput(tarea.fotoUrl || '');
  };

  const pageNumbers = calcularPageNumbers(page, totalPages);

  const estadoColor = (estado: string) => {
    if (estado === 'Completada') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
    if (estado === 'EnProgreso') return 'bg-orange-500/10 text-orange-300 border-orange-500/30';
    if (estado === 'Omitida') return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
  };

  const estadoIcon = (estado: string) => {
    if (estado === 'Completada') return <CheckSquare className="w-4 h-4" />;
    if (estado === 'EnProgreso') return <Play className="w-4 h-4" />;
    if (estado === 'Omitida') return <X className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-orange-400" />
          <h2 className="text-lg font-bold text-white">Mis Tareas</h2>
          <span className="text-xs font-mono text-slate-500">({total})</span>
        </div>

        <button
          type="button"
          onClick={() => setShowSubirEntrega(true)}
          className="flex items-center gap-1.5 rounded-lg border border-orange-500/40 bg-orange-500/15 hover:bg-orange-500/25 px-3 py-1.5 text-xs font-semibold text-orange-300 transition shadow-sm cursor-pointer"
          title="Subir foto de remisión o entrega física"
        >
          <Camera className="w-4 h-4" />
          <span>Subir Remisión / Entrega</span>
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-white/10 bg-[#111318] px-3 py-2">
        <Calendar className="w-3.5 h-3.5 text-slate-400" />
        <select
          value={filtroFecha}
          onChange={(e) => { setFiltroFecha(e.target.value); setPage(1); }}
          className="rounded-md border border-white/10 bg-[#090a0f] px-2 py-1 text-xs text-slate-200 focus:border-orange-500 transition"
        >
          <option value="hoy">Hoy</option>
          <option value="fecha">Fecha específica</option>
          <option value="todas">Todas</option>
        </select>
        {filtroFecha === 'fecha' && (
          <input
            type="date"
            value={fechaEspecifica}
            onChange={(e) => { setFechaEspecifica(e.target.value); setPage(1); }}
            className="rounded-md border border-white/10 bg-[#090a0f] px-2 py-1 text-xs text-slate-200 focus:border-orange-500 transition"
          />
        )}
        <select
          value={filtroEstado}
          onChange={(e) => { setFiltroEstado(e.target.value); setPage(1); }}
          className="rounded-md border border-white/10 bg-[#090a0f] px-2 py-1 text-xs text-slate-200 focus:border-orange-500 transition"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABELS[e]}</option>)}
        </select>
      </div>

      {/* Lista de tareas */}
      <div className="space-y-2">
        {loading ? (
          <p className="rounded-md border border-white/10 bg-[#111318] px-4 py-8 text-center text-sm text-slate-500">Cargando tus tareas...</p>
        ) : tareas.length === 0 ? (
          <div className="rounded-md border border-white/10 bg-[#111318] px-4 py-8 text-center">
            <CheckSquare className="mx-auto mb-2 w-8 h-8 text-slate-600" />
            <p className="text-sm text-slate-400">No tenés tareas asignadas para este filtro.</p>
          </div>
        ) : tareas.map(t => (
          <div key={t.id} className="rounded-md border border-white/10 bg-[#111318] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${estadoColor(t.estado)}`}>
                    {estadoIcon(t.estado)}
                    {ESTADO_LABELS[t.estado] || t.estado}
                  </span>
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">{t.categoria}</span>
                  {t.tiempoEstimado && (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
                      <Clock className="w-2.5 h-2.5" /> {t.tiempoEstimado}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">{t.descripcion}</p>
                <p className="mt-1 text-[11px] font-mono text-slate-500">
                  {t.hojaRuta.clienteNombre} · {t.hojaRuta.proyecto}
                  {t.cantidad && ` · Cant: ${t.cantidad} ${t.unidad || 'u'}`}
                </p>
                {t.notasOperario && (
                  <p className="mt-1 rounded bg-white/5 px-2 py-1 text-[11px] text-slate-400">📝 {t.notasOperario}</p>
                )}
                {t.fotoUrl && (
                  <a href={t.fotoUrl} target="_blank" rel="noopener" className="mt-1 inline-flex items-center gap-1 text-[11px] text-orange-300 hover:underline">
                    <Camera className="w-3 h-3" /> Ver foto
                  </a>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                {/* Acciones rápidas de estado */}
                <div className="flex gap-1">
                  {t.estado !== 'EnProgreso' && t.estado !== 'Completada' && (
                    <button onClick={() => handleCambiarEstado(t, 'EnProgreso')} disabled={saving} title="Iniciar" className="rounded border border-orange-500/30 bg-orange-500/10 p-1.5 text-orange-300 hover:bg-orange-500/20 disabled:opacity-50">
                      <Play className="w-3 h-3" />
                    </button>
                  )}
                  {t.estado !== 'Completada' && (
                    <button onClick={() => handleCambiarEstado(t, 'Completada')} disabled={saving} title="Completar" className="rounded border border-emerald-500/30 bg-emerald-500/10 p-1.5 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50">
                      <CheckSquare className="w-3 h-3" />
                    </button>
                  )}
                  {t.estado !== 'Omitida' && (
                    <button onClick={() => handleCambiarEstado(t, 'Omitida')} disabled={saving} title="Omitir" className="rounded border border-slate-500/30 bg-slate-500/10 p-1.5 text-slate-400 hover:bg-slate-500/20 disabled:opacity-50">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button onClick={() => abrirNotas(t)} className="text-[10px] text-slate-400 hover:text-orange-300">+ notas/foto</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Paginación */}
      {filtroFecha !== 'hoy' && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          itemsPerPage={limit}
          totalItems={total}
          pageNumbers={pageNumbers}
          onPageChange={(p) => setPage(p)}
          onItemsPerPageChange={() => {}}
        />
      )}

      {/* Modal Notas/Foto */}
      {tareaActiva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-md border border-orange-500/20 bg-[#111318] p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Notas y Evidencia</h3>
                <p className="text-xs text-slate-400">{tareaActiva.descripcion}</p>
              </div>
              <button onClick={() => setTareaActiva(null)} className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10">Cerrar ✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-mono text-slate-500">Notas</label>
                <textarea
                  value={notasInput}
                  onChange={(e) => setNotasInput(e.target.value)}
                  rows={3}
                  placeholder="Agregar comentarios sobre la tarea..."
                  className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-sm text-slate-200 focus:border-orange-500 transition outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-mono text-slate-400">Foto de Montaje / Evidencia</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const base64 = ev.target?.result as string;
                        const img = new Image();
                        img.onload = () => {
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
                          if (ctx) {
                            ctx.drawImage(img, 0, 0, w, h);
                            setFotoInput(canvas.toDataURL('image/jpeg', 0.8));
                          } else {
                            setFotoInput(base64);
                          }
                        };
                        img.src = base64;
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-orange-500/20 file:text-orange-300 hover:file:bg-orange-500/30 cursor-pointer"
                  />
                  {fotoInput && (
                    <div className="relative mt-2 rounded-md overflow-hidden border border-white/10 max-h-44 bg-black/40 flex items-center justify-center">
                      <img src={fotoInput} alt="Preview" className="max-h-44 object-contain" />
                      <button
                        type="button"
                        onClick={() => setFotoInput('')}
                        className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80"
                        title="Quitar foto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setTareaActiva(null)} className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10">Cancelar</button>
              <button onClick={handleGuardarNotas} disabled={saving} className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-500 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para subir remisión o entrega */}
      {showSubirEntrega && (
        <SubirFotoEntregaModal
          onClose={() => setShowSubirEntrega(false)}
          onSuccess={() => load()}
        />
      )}
    </div>
  );
}
