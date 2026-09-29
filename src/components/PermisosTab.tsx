/**
 * PermisosTab — Gestión de Solicitudes de Permiso (RR.HH.)
 * Flujo: listar, crear, aprobar (jefe), validar (RR.HH.), imprimir PDF.
 * Diseño Enterprise: Tabla compacta de alta densidad, filtros reactivos, modal para nueva solicitud.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Printer, 
  Trash2, 
  Shield, 
  X,
  Search,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { AdminSection } from './AdminShared.tsx';
import { useNotif } from '../context/NotifContext.tsx';
import { useSortAndPaginate, getSortIcon, sortableHeaderClass } from '../lib/tableUtils';
import { authFetch } from '../authFetch.ts';
import Pagination from './Pagination';
import { DatabaseState, Permiso } from '../types.ts';

export interface PermisosTabProps {
  data: DatabaseState;
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; badgeClass: string }> = {
  Pendiente: { 
    label: 'Pendiente', 
    color: 'text-amber-400', 
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30', 
    icon: <Clock className="w-3 h-3 text-amber-400" /> 
  },
  AprobadoJefe: { 
    label: 'Aprobado Jefe', 
    color: 'text-orange-400', 
    badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30', 
    icon: <CheckCircle2 className="w-3 h-3 text-orange-400" /> 
  },
  Aprobado: { 
    label: 'Aprobado', 
    color: 'text-emerald-400', 
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', 
    icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 
  },
  Rechazado: { 
    label: 'Rechazado', 
    color: 'text-rose-400', 
    badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30', 
    icon: <XCircle className="w-3 h-3 text-rose-400" /> 
  },
};

const TIPOS_PERMISO = [
  'Permiso para retirarme antes de horario',
  'Licencia por nacimiento (Art. 62 "j"; Ley 5508/16)',
  'Permiso por razones de estudios',
  'Licencia por matrimonio (Ley 3384/07)',
  'Permiso para llegar fuera de mi horario',
  'Licencia por fallecimiento familiar directo',
  'Licencia por motivos de salud',
  'Licencia por defunción (Ley 3384/07)',
  'Otros',
  'Licencia por maternidad/lactancia (Art. 133 CT) Ley 5508/16',
];

export default function PermisosTab({ data }: PermisosTabProps) {
  const { showToast, requestConfirm } = useNotif();

  // Lista de permisos
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal crear
  const [showCreate, setShowCreate] = useState(false);
  const [selColaborador, setSelColaborador] = useState('');
  const [tipoPermiso, setTipoPermiso] = useState(TIPOS_PERMISO[0]);
  const [motivo, setMotivo] = useState('');
  const [modoTiempo, setModoTiempo] = useState<'horas' | 'dias'>('horas');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [fechaHora, setFechaHora] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal RR.HH.
  const [rrhhModalId, setRrhhModalId] = useState<string | null>(null);
  const [rrhhDecision, setRrhhDecision] = useState<'Aprobado' | 'Rechazado'>('Aprobado');
  const [rrhhComentario, setRrhhComentario] = useState('');
  const [rrhhDescontar, setRrhhDescontar] = useState(false);

  const fetchPermisos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/permisos${filtroEstado ? `?estado=${filtroEstado}` : ''}`);
      const json = await res.json();
      if (json.success) setPermisos(json.data);
    } catch {
      showToast('Error al cargar permisos', 'error');
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, showToast]);

  useEffect(() => { fetchPermisos(); }, [fetchPermisos]);

  const colaboradorSeleccionado = useMemo(
    () => data.colaboradores.find(c => c.id === selColaborador),
    [data.colaboradores, selColaborador]
  );

  // Filtered by search term
  const filteredPermisos = useMemo(() => {
    if (!searchTerm.trim()) return permisos;
    const term = searchTerm.toLowerCase();
    return permisos.filter(p => 
      p.nombreSolicitante.toLowerCase().includes(term) ||
      p.tipoPermiso.toLowerCase().includes(term) ||
      (p.motivo && p.motivo.toLowerCase().includes(term))
    );
  }, [permisos, searchTerm]);

  type PermisoSortField = 'nombreSolicitante' | 'tipoPermiso' | 'estado' | 'createdAt';

  const table = useSortAndPaginate<Permiso, PermisoSortField>(filteredPermisos, {
    defaultSortField: 'createdAt',
    defaultSortOrder: 'desc',
    defaultItemsPerPage: 10,
    resetDeps: [filtroEstado, searchTerm],
  });

  const handleCreate = async () => {
    if (!selColaborador) { showToast('Seleccioná un colaborador', 'error'); return; }
    setIsSubmitting(true);
    try {
      const res = await authFetch('/api/permisos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colaboradorId: selColaborador,
          tipoPermiso,
          motivo: motivo.trim() || null,
          modoTiempo,
          horaInicio: modoTiempo === 'horas' ? horaInicio : null,
          horaFin: modoTiempo === 'horas' ? horaFin : null,
          fechaHora: modoTiempo === 'horas' ? fechaHora || null : null,
          fechaDesde: modoTiempo === 'dias' ? fechaDesde || null : null,
          fechaHasta: modoTiempo === 'dias' ? fechaHasta || null : null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Solicitud de permiso creada con éxito', 'success');
        setShowCreate(false);
        setSelColaborador(''); setTipoPermiso(TIPOS_PERMISO[0]); setMotivo('');
        setHoraInicio(''); setHoraFin(''); setFechaHora(''); setFechaDesde(''); setFechaHasta('');
        fetchPermisos();
      } else {
        showToast(json.error?.message || 'Error al crear solicitud', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJefeDecision = async (id: string, decision: 'Aprobado' | 'Rechazado') => {
    try {
      const res = await authFetch(`/api/permisos/${id}/jefe`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Permiso ${decision === 'Aprobado' ? 'aprobado por jefe' : 'rechazado'}`, 'success');
        fetchPermisos();
      } else {
        showToast(json.error?.message || 'Error al procesar decisión', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    }
  };

  const handleRrhhSubmit = async () => {
    if (!rrhhModalId) return;
    setIsSubmitting(true);
    try {
      const res = await authFetch(`/api/permisos/${rrhhModalId}/rrhh`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: rrhhDecision,
          comentario: rrhhComentario.trim() || null,
          descontarSalario: rrhhDescontar,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Permiso ${rrhhDecision === 'Aprobado' ? 'aprobado por RR.HH.' : 'rechazado por RR.HH.'}`, 'success');
        setRrhhModalId(null); setRrhhComentario(''); setRrhhDescontar(false);
        fetchPermisos();
      } else {
        showToast(json.error?.message || 'Error', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = (id: string) => {
    window.open(`/api/permisos/${id}/pdf`, '_blank');
  };

  const handleDelete = (id: string) => {
    requestConfirm(
      '¿Eliminar solicitud de permiso?',
      'La solicitud será eliminada permanentemente. Solo se pueden eliminar permisos pendientes.',
      'danger',
      async () => {
        try {
          const res = await authFetch(`/api/permisos/${id}`, { method: 'DELETE' });
          const json = await res.json();
          if (json.success) { showToast('Solicitud eliminada', 'success'); fetchPermisos(); }
          else showToast(json.error?.message || 'Error al eliminar', 'error');
        } catch { showToast('Error de conexión', 'error'); }
      },
      'Eliminar'
    );
  };

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <AdminSection
        title="Gestión de Permisos (RR.HH.)"
        icon={<FileText className="w-4 h-4 text-orange-400" />}
        description="Aprobación y control de solicitudes de ausencia, licencias laborales y permisos de salida."
      >
        {/* Barra superior de herramientas: Búsqueda, Filtro Estado y Nueva Solicitud */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por colaborador, tipo o motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md bg-[#090a0f] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            
            <div className="flex gap-1 overflow-x-auto py-0.5">
              <button
                onClick={() => setFiltroEstado('')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors border ${
                  !filtroEstado 
                    ? 'bg-orange-600 text-white border-orange-500' 
                    : 'bg-[#090a0f] text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                Todos ({permisos.length})
              </button>
              {Object.entries(ESTADO_CONFIG).map(([key, cfg]) => {
                const count = permisos.filter(p => p.estado === key).length;
                return (
                  <button
                    key={key}
                    onClick={() => setFiltroEstado(key)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors border ${
                      filtroEstado === key 
                        ? 'bg-orange-600/20 text-orange-300 border-orange-500/50' 
                        : 'bg-[#090a0f] text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {cfg.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-md cursor-pointer transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Solicitud</span>
          </button>
        </div>

        {/* Tabla Enterprise de Solicitudes */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <span>Cargando solicitudes de permiso...</span>
          </div>
        ) : filteredPermisos.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs border border-white/5 rounded-md bg-[#090a0f]/50">
            No se encontraron solicitudes de permiso registradas.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111318]/80 backdrop-blur-sm shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[950px]">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th 
                      className={`px-4 py-3.5 ${sortableHeaderClass('nombreSolicitante', table.sortField)}`}
                      onClick={() => table.handleSort('nombreSolicitante')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Solicitante</span>
                        {getSortIcon('nombreSolicitante', table.sortField, table.sortOrder)}
                      </div>
                    </th>
                    <th 
                      className={`px-4 py-3.5 ${sortableHeaderClass('tipoPermiso', table.sortField)}`}
                      onClick={() => table.handleSort('tipoPermiso')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Tipo / Motivo</span>
                        {getSortIcon('tipoPermiso', table.sortField, table.sortOrder)}
                      </div>
                    </th>
                    <th className="px-4 py-3.5">Tiempo Solicitado</th>
                    <th 
                      className={`px-4 py-3.5 ${sortableHeaderClass('estado', table.sortField)}`}
                      onClick={() => table.handleSort('estado')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Estado</span>
                        {getSortIcon('estado', table.sortField, table.sortOrder)}
                      </div>
                    </th>
                    <th className="px-4 py-3.5">Resolución / Dictamen</th>
                    <th className="px-4 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {table.paginatedData.map((p) => {
                    const cfg = ESTADO_CONFIG[p.estado] || ESTADO_CONFIG.Pendiente;
                    const tiempoStr = p.modoTiempo === 'horas'
                      ? `${p.horaInicio || '?'} a ${p.horaFin || '?'} (${formatDate(p.fechaHora)})`
                      : `${formatDate(p.fechaDesde)} a ${formatDate(p.fechaHasta)}`;

                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                        {/* Solicitante */}
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-white">{p.nombreSolicitante}</div>
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Calendar className="w-2.5 h-2.5" />
                            <span>Solicitado: {formatDate(p.createdAt)}</span>
                          </div>
                        </td>

                        {/* Tipo / Motivo */}
                        <td className="px-4 py-3.5 max-w-xs">
                          <div className="text-slate-300 font-medium truncate" title={p.tipoPermiso}>
                            {p.tipoPermiso}
                          </div>
                          {p.motivo && (
                            <div className="text-[11px] text-slate-400 italic truncate mt-0.5" title={p.motivo}>
                              "{p.motivo}"
                            </div>
                          )}
                        </td>

                        {/* Tiempo Solicitado */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-mono text-xs text-amber-300/90 bg-amber-500/5 px-2.5 py-1 rounded-md border border-amber-500/20">
                            {tiempoStr}
                          </span>
                        </td>

                        {/* Estado */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cfg.badgeClass}`}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        </td>

                        {/* Resolución / Dictamen */}
                        <td className="px-4 py-3.5 text-[11px]">
                          {p.jefeDecision && (
                            <div className="text-slate-400">
                              Jefe: <span className={p.jefeDecision === 'Aprobado' ? 'text-orange-400 font-semibold' : 'text-rose-400 font-semibold'}>{p.jefeDecision}</span>
                            </div>
                          )}
                          {p.rrhhDecision && (
                            <div className="text-slate-400 mt-0.5">
                              RR.HH.: <span className={p.rrhhDecision === 'Aprobado' ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>{p.rrhhDecision}</span>
                              {p.rrhhDescontarSalario != null && (
                                <span className="text-[10px] text-slate-500 ml-1">
                                  ({p.rrhhDescontarSalario ? 'Descuenta' : 'Sin descuento'})
                                </span>
                              )}
                            </div>
                          )}
                          {!p.jefeDecision && !p.rrhhDecision && (
                            <span className="text-slate-500 italic">En evaluación</span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Jefe: aprobar/rechazar */}
                            {p.estado === 'Pendiente' && (
                              <>
                                <button 
                                  onClick={() => handleJefeDecision(p.id, 'Aprobado')} 
                                  className="px-2 py-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 rounded text-[11px] font-medium border border-orange-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Aprobar como Jefe"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Aprobar</span>
                                </button>
                                <button 
                                  onClick={() => handleJefeDecision(p.id, 'Rechazado')} 
                                  className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded text-[11px] font-medium border border-rose-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Rechazar como Jefe"
                                >
                                  <XCircle className="w-3 h-3" />
                                  <span>Rechazar</span>
                                </button>
                              </>
                            )}

                            {/* RR.HH.: validar */}
                            {p.estado === 'AprobadoJefe' && (
                              <button 
                                onClick={() => { setRrhhModalId(p.id); setRrhhDecision('Aprobado'); setRrhhComentario(''); setRrhhDescontar(false); }} 
                                className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded text-[11px] font-medium border border-emerald-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Validar Dictamen RR.HH."
                              >
                                <Shield className="w-3 h-3" />
                                <span>Validar RR.HH.</span>
                              </button>
                            )}

                            {/* Imprimir PDF */}
                            <button 
                              onClick={() => handlePrint(p.id)} 
                              className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded border border-white/10 transition-colors cursor-pointer"
                              title="Descargar/Imprimir PDF"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Eliminar (solo pendientes) */}
                            {p.estado === 'Pendiente' && (
                              <button 
                                onClick={() => handleDelete(p.id)} 
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded border border-rose-500/20 transition-colors cursor-pointer"
                                title="Eliminar solicitud"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Paginación */}
        {filteredPermisos.length > 0 && (
          <div className="mt-3">
            <Pagination
              currentPage={table.currentPage}
              totalPages={table.totalPages}
              itemsPerPage={table.itemsPerPage}
              totalItems={filteredPermisos.length}
              pageNumbers={table.pageNumbers}
              onPageChange={table.setCurrentPage}
              onItemsPerPageChange={table.setItemsPerPage}
            />
          </div>
        )}
      </AdminSection>

      {/* MODAL: Nueva Solicitud de Permiso */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs" onClick={() => setShowCreate(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#111318] border border-white/10 rounded-md p-6 max-w-lg w-full space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-bold text-white">Nueva Solicitud de Permiso</h3>
                </div>
                <button 
                  onClick={() => setShowCreate(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Colaborador & Tipo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-mono text-[11px]">Colaborador *</label>
                    <select
                      value={selColaborador}
                      onChange={(e) => setSelColaborador(e.target.value)}
                      className="w-full px-3 py-2 text-xs text-white bg-[#090a0f] border border-white/10 rounded-md focus:outline-none focus:border-orange-500"
                    >
                      <option value="">Seleccionar colaborador...</option>
                      {data.colaboradores.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre} {c.ci ? `— CI: ${c.ci}` : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 font-mono text-[11px]">Tipo de Permiso *</label>
                    <select
                      value={tipoPermiso}
                      onChange={(e) => setTipoPermiso(e.target.value)}
                      className="w-full px-3 py-2 text-xs text-white bg-[#090a0f] border border-white/10 rounded-md focus:outline-none focus:border-orange-500"
                    >
                      {TIPOS_PERMISO.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {/* Preview de datos del colaborador */}
                {colaboradorSeleccionado && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-md bg-[#090a0f] border border-white/5 text-[11px]">
                    <div><span className="text-slate-500">Cargo:</span> <span className="text-slate-200 font-medium block truncate">{colaboradorSeleccionado.cargo || colaboradorSeleccionado.rol || '—'}</span></div>
                    <div><span className="text-slate-500">C.I.:</span> <span className="text-slate-200 font-medium block truncate">{colaboradorSeleccionado.ci || '—'}</span></div>
                    <div><span className="text-slate-500">Depto:</span> <span className="text-slate-200 font-medium block truncate">{colaboradorSeleccionado.departamento || '—'}</span></div>
                    <div><span className="text-slate-500">Jefe:</span> <span className="text-slate-200 font-medium block truncate">{colaboradorSeleccionado.jefeInmediato || '—'}</span></div>
                  </div>
                )}

                {/* Motivo */}
                <div className="space-y-1">
                  <label className="text-slate-400 font-mono text-[11px]">Motivo / Aclaración</label>
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Especificar el motivo de la solicitud..."
                    rows={2}
                    className="w-full px-3 py-2 text-xs text-white bg-[#090a0f] border border-white/10 rounded-md focus:outline-none focus:border-orange-500 resize-none"
                  />
                </div>

                {/* Modalidad de tiempo */}
                <div className="p-3 rounded-md bg-[#090a0f] border border-white/5 space-y-3">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input 
                        type="radio" 
                        checked={modoTiempo === 'horas'} 
                        onChange={() => setModoTiempo('horas')} 
                        className="text-orange-600 focus:ring-orange-500 accent-orange-500" 
                      />
                      <span>Por Horas</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input 
                        type="radio" 
                        checked={modoTiempo === 'dias'} 
                        onChange={() => setModoTiempo('dias')} 
                        className="text-orange-600 focus:ring-orange-500 accent-orange-500" 
                      />
                      <span>Por Días</span>
                    </label>
                  </div>

                  {modoTiempo === 'horas' ? (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-mono">Día</label>
                        <input 
                          type="date" 
                          value={fechaHora} 
                          onChange={(e) => setFechaHora(e.target.value)} 
                          className="w-full px-2.5 py-1.5 text-xs text-white bg-[#111318] border border-white/10 rounded-md focus:outline-none focus:border-orange-500" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-mono">Hora Inicio</label>
                        <input 
                          type="time" 
                          value={horaInicio} 
                          onChange={(e) => setHoraInicio(e.target.value)} 
                          className="w-full px-2.5 py-1.5 text-xs text-white bg-[#111318] border border-white/10 rounded-md focus:outline-none focus:border-orange-500" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-mono">Hora Fin</label>
                        <input 
                          type="time" 
                          value={horaFin} 
                          onChange={(e) => setHoraFin(e.target.value)} 
                          className="w-full px-2.5 py-1.5 text-xs text-white bg-[#111318] border border-white/10 rounded-md focus:outline-none focus:border-orange-500" 
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-mono">Desde</label>
                        <input 
                          type="date" 
                          value={fechaDesde} 
                          onChange={(e) => setFechaDesde(e.target.value)} 
                          className="w-full px-2.5 py-1.5 text-xs text-white bg-[#111318] border border-white/10 rounded-md focus:outline-none focus:border-orange-500" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-mono">Hasta</label>
                        <input 
                          type="date" 
                          value={fechaHasta} 
                          onChange={(e) => setFechaHasta(e.target.value)} 
                          className="w-full px-2.5 py-1.5 text-xs text-white bg-[#111318] border border-white/10 rounded-md focus:outline-none focus:border-orange-500" 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2 justify-end pt-3 border-t border-white/10">
                <button 
                  type="button"
                  onClick={() => setShowCreate(false)} 
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-semibold rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={handleCreate} 
                  disabled={isSubmitting} 
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-xs font-bold text-white rounded-md cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Solicitud</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Validación de RR.HH. */}
      <AnimatePresence>
        {rrhhModalId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs" onClick={() => setRrhhModalId(null)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#111318] border border-white/10 rounded-md p-6 max-w-md w-full space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Validación Final RR.HH.</span>
                </h3>
                <button 
                  onClick={() => setRrhhModalId(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input 
                      type="radio" 
                      checked={rrhhDecision === 'Aprobado'} 
                      onChange={() => setRrhhDecision('Aprobado')} 
                      className="text-emerald-600 focus:ring-emerald-500 accent-emerald-500" 
                    />
                    <span className="font-semibold text-emerald-400">Aprobar Permiso</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input 
                      type="radio" 
                      checked={rrhhDecision === 'Rechazado'} 
                      onChange={() => setRrhhDecision('Rechazado')} 
                      className="text-rose-600 focus:ring-rose-500 accent-rose-500" 
                    />
                    <span className="font-semibold text-rose-400">Rechazar Permiso</span>
                  </label>
                </div>

                {rrhhDecision === 'Aprobado' && (
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 p-2.5 rounded-md bg-[#090a0f] border border-white/5">
                    <input 
                      type="checkbox" 
                      checked={rrhhDescontar} 
                      onChange={(e) => setRrhhDescontar(e.target.checked)} 
                      className="rounded border-white/10 text-orange-600 focus:ring-orange-500 accent-orange-500" 
                    />
                    <span className="text-[11px]">¿Descontar horas/días del salario del colaborador?</span>
                  </label>
                )}

                <div className="space-y-1">
                  <label className="text-slate-400 font-mono text-[11px]">Comentario / Dictamen de RR.HH.</label>
                  <textarea
                    value={rrhhComentario}
                    onChange={(e) => setRrhhComentario(e.target.value)}
                    placeholder="Observación opcional para el legajo..."
                    rows={3}
                    className="w-full px-3 py-2 text-xs text-white bg-[#090a0f] border border-white/10 rounded-md focus:outline-none focus:border-orange-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-white/10">
                <button 
                  type="button"
                  onClick={() => setRrhhModalId(null)} 
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-semibold rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={handleRrhhSubmit} 
                  disabled={isSubmitting} 
                  className={`px-4 py-2 text-xs font-bold text-white rounded-md cursor-pointer transition-colors ${
                    rrhhDecision === 'Aprobado' 
                      ? 'bg-emerald-600 hover:bg-emerald-500' 
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  Confirmar Dictamen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
