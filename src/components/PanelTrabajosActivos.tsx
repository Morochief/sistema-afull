import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Clock, Play, Pause, AlertCircle, CheckCircle, Briefcase, RefreshCw, CheckSquare, Calendar, Plus, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { authFetchJSON } from '../authFetch.ts';

interface TimerActivoItem {
  id: string;
  usuario: string;
  colaboradorNombre: string;
  clienteNombre: string;
  proyectoNombre: string;
  descripcion: string;
  checklistProgress?: {
    completados: number;
    total: number;
    porcentaje: number;
    pasoActual?: string;
    pasos?: Array<{ id: string; texto: string; completado: boolean; duracionSegundos?: number }>;
  } | null;
  inicio: string;
  isPaused: boolean;
  currentPauseType: string | null;
  pausedTime: number;
}

interface MarcacionHoyItem {
  id: string;
  usuario: string;
  tipo: string;
  timestamp: string;
}

interface TareaConcluidaItem {
  id: string;
  colaboradorId: string | null;
  colaboradorNombre: string;
  clienteId: string;
  clienteNombre: string;
  proyectoId: string;
  proyectoNombre: string;
  descripcion: string;
  hsInicio: string | null;
  hsFin: string | null;
  hsTotal: number | null;
  minutos: number;
  fecha: string;
  desglosePasos: string[];
}

import { DatabaseState, Cliente, Proyecto, Colaborador } from '../types.ts';

interface PanelTrabajosActivosProps {
  data?: DatabaseState;
  onRefresh?: () => Promise<void>;
}

export default function PanelTrabajosActivos({ data, onRefresh }: PanelTrabajosActivosProps = {}) {
  const [timers, setTimers] = useState<TimerActivoItem[]>([]);
  const [marcacionesHoy, setMarcacionesHoy] = useState<MarcacionHoyItem[]>([]);
  const [tareasTerminadas, setTareasTerminadas] = useState<TareaConcluidaItem[]>([]);
  const [horasTerminadasTotal, setHorasTerminadasTotal] = useState<number>(0);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // Usuarios del sistema para mapear username a colaborador
  const [usuariosSistema, setUsuariosSistema] = useState<Array<{ id: string; username: string; nombre: string; rol: string; colaboradorId?: string | null }>>([]);

  // Estado para modal / input rápido de agregar paso en vivo a un operario existente
  const [operarioDestino, setOperarioDestino] = useState<TimerActivoItem | null>(null);
  const [nuevoPasoTexto, setNuevoPasoTexto] = useState('');
  const [agregandoPaso, setAgregandoPaso] = useState(false);
  const [mensajePasoOk, setMensajePasoOk] = useState<string | null>(null);

  // Estado para Modal de Asignación Directa de Tarea (sin Hoja de Ruta)
  const [modalAsignarOpen, setModalAsignarOpen] = useState(false);
  const [asignarUsuario, setAsignarUsuario] = useState('');
  const [asignarClienteId, setAsignarClienteId] = useState('');
  const [asignarProyectoId, setAsignarProyectoId] = useState('');
  const [asignarDescripcion, setAsignarDescripcion] = useState('');
  const [asignarPasosTexto, setAsignarPasosTexto] = useState('');
  const [asignandoTarea, setAsignandoTarea] = useState(false);
  const [asignarFeedback, setAsignarFeedback] = useState<{ tipo: 'ok' | 'error'; msg: string } | null>(null);

  // Actualizar segundero cada segundo
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [timersRes, marcacionesRes, terminadosRes] = await Promise.all([
        authFetchJSON<{ success: boolean; data: TimerActivoItem[] }>('/api/timer/activos').catch(() => ({ success: false, data: [] })),
        authFetchJSON<{ success: boolean; data: any[] }>('/api/marcacion/admin/timeline?limite=100').catch(() => ({ success: false, data: [] })),
        authFetchJSON<{ success: boolean; data: { fecha: string; totalTareas: number; horasTotales: number; tareas: TareaConcluidaItem[] } }>(`/api/timer/terminados?fecha=${fechaSeleccionada}`).catch(() => ({ success: false, data: { fecha: fechaSeleccionada, totalTareas: 0, horasTotales: 0, tareas: [] } })),
      ]);

      if (timersRes.success) setTimers(timersRes.data || []);
      if (marcacionesRes.success) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const hoyItems = (marcacionesRes.data || []).filter((m: any) => new Date(m.timestamp) >= hoy);
        setMarcacionesHoy(hoyItems);
      }
      if (terminadosRes.success && terminadosRes.data) {
        setTareasTerminadas(terminadosRes.data.tareas || []);
        setHorasTerminadasTotal(terminadosRes.data.horasTotales || 0);
      }

      // Cargar lista de usuarios del sistema para mapeo a colaboradores si está vacía
      if (usuariosSistema.length === 0) {
        authFetchJSON<{ success: boolean; data: any[] }>('/api/users')
          .then(res => {
            if (res.success && Array.isArray(res.data)) {
              setUsuariosSistema(res.data);
            }
          })
          .catch(() => {});
      }
    } catch (e: any) {
      setError(e.message || 'Error al cargar datos en vivo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Polling cada 15s
    return () => clearInterval(interval);
  }, [fechaSeleccionada]);

  function formatDuration(inicioIso: string, pausedSeconds: number = 0) {
    const start = new Date(inicioIso).getTime();
    const totalSec = Math.max(0, Math.floor((now - start) / 1000) - pausedSeconds);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // Operarios que marcaron ENTRADA hoy
  const entradasHoy = marcacionesHoy.filter(m => m.tipo === 'ENTRADA');
  const salidasHoy = new Set(marcacionesHoy.filter(m => m.tipo === 'SALIDA').map(m => m.usuario));
  const presentesHoy = [...new Set(entradasHoy.map(m => m.usuario))].filter(u => !salidasHoy.has(u));

  const usuariosConTimer = new Set(timers.map(t => t.usuario));
  const presentesSinTarea = presentesHoy.filter(u => !usuariosConTimer.has(u));

  // Abrir modal de asignación directa pre-seleccionando un usuario
  const abrirModalAsignacion = (usuarioInicial?: string) => {
    setAsignarUsuario(usuarioInicial || (presentesSinTarea[0] || ''));
    setAsignarClienteId(data?.clientes?.[0]?.id || '');
    setAsignarProyectoId('');
    setAsignarDescripcion('');
    setAsignarPasosTexto('');
    setAsignarFeedback(null);
    setModalAsignarOpen(true);
  };

  // Enviar inicio de tarea directa (Gerardo a Operario)
  const handleIniciarTareaDirecta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asignarUsuario) {
      setAsignarFeedback({ tipo: 'error', msg: 'Seleccioná un operario' });
      return;
    }
    if (!asignarClienteId || !asignarProyectoId) {
      setAsignarFeedback({ tipo: 'error', msg: 'Seleccioná Cliente y Proyecto' });
      return;
    }

    // Resolver colaboradorId
    const uObj = usuariosSistema.find(u => u.username.toLowerCase() === asignarUsuario.toLowerCase());
    let colId = uObj?.colaboradorId;
    if (!colId && data?.colaboradores) {
      const matchCol = data.colaboradores.find(c =>
        c.nombre.toLowerCase().includes(asignarUsuario.toLowerCase()) ||
        asignarUsuario.toLowerCase().includes(c.nombre.toLowerCase())
      );
      if (matchCol) colId = matchCol.id;
    }

    // Si aún no hay colaboradorId, usar el primero disponible o id ficticio seguro
    if (!colId && data?.colaboradores && data.colaboradores.length > 0) {
      colId = data.colaboradores[0].id;
    }

    if (!colId) {
      setAsignarFeedback({ tipo: 'error', msg: 'No se encontró un colaborador asociado a este usuario' });
      return;
    }

    // Construir checklist inicial si Gerardo escribió pasos
    const pasosParsed: Array<{ id: string; texto: string; completado: boolean }> = [];
    if (asignarPasosTexto.trim()) {
      const lineas = asignarPasosTexto.split('\n').map(l => l.trim()).filter(Boolean);
      lineas.forEach(l => {
        pasosParsed.push({
          id: `chk_${Math.random().toString(36).substring(2, 9)}`,
          texto: l,
          completado: false,
        });
      });
    }

    // Construir descripción enriquecida con tag si hay pasos
    let baseDesc = asignarDescripcion.trim() || 'Tarea asignada por supervisor';
    let descFinal = baseDesc;
    if (pasosParsed.length > 0) {
      const tag = `[Checklist: 0/${pasosParsed.length} · Paso: ${pasosParsed[0].texto.slice(0, 40)}]`;
      const jsonPayload = encodeURIComponent(JSON.stringify(pasosParsed));
      descFinal = `${baseDesc} ${tag} <!--CHK:${jsonPayload}-->`;
    }

    setAsignandoTarea(true);
    setAsignarFeedback(null);

    try {
      const colObj = (data?.colaboradores || []).find(c => c.id === colId);
      const precioUnitario = colObj ? colObj.tarifaSugerida : 0;

      const res = await authFetchJSON<{ success: boolean; data?: any; error?: any }>('/api/timer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: asignarUsuario,
          colaboradorId: colId,
          clienteId: asignarClienteId,
          proyectoId: asignarProyectoId,
          descripcion: descFinal,
          precioUnitario: precioUnitario || 0,
        })
      });

      if (res.success) {
        setAsignarFeedback({ tipo: 'ok', msg: `✓ Tarea asignada exitosamente a ${asignarUsuario}. Su cronómetro ya está corriendo.` });
        setTimeout(() => {
          setModalAsignarOpen(false);
          setAsignarFeedback(null);
        }, 1200);
        await fetchData();
        if (onRefresh) await onRefresh();
      } else {
        setAsignarFeedback({ tipo: 'error', msg: res.error?.message || 'No se pudo asignar la tarea' });
      }
    } catch (err: any) {
      setAsignarFeedback({ tipo: 'error', msg: err?.message || 'Error de conexión' });
    } finally {
      setAsignandoTarea(false);
    }
  };

  // Enviar un nuevo paso en vivo al checklist de un operario
  const handleEnviarNuevoPaso = async () => {
    if (!operarioDestino || !nuevoPasoTexto.trim()) return;
    setAgregandoPaso(true);
    try {
      const res = await authFetchJSON<{ success: boolean; data?: any; error?: any }>('/api/timer/add-paso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: operarioDestino.usuario,
          texto: nuevoPasoTexto.trim(),
        }),
      });

      if (res.success) {
        setMensajePasoOk(`Paso asignado a ${operarioDestino.colaboradorNombre}`);
        setNuevoPasoTexto('');
        setTimeout(() => {
          setOperarioDestino(null);
          setMensajePasoOk(null);
        }, 1200);
        await fetchData();
      } else {
        alert(res.error?.message || 'Error al agregar paso al operario');
      }
    } catch (e: any) {
      alert(e.message || 'Error de conexión');
    } finally {
      setAgregandoPaso(false);
    }
  };

  const esHoy = fechaSeleccionada === new Date().toISOString().substring(0, 10);

  return (
    <div className="space-y-6">
      {/* Header con Controles y Calendario */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Control en Vivo de Operarios & Rendimiento Diario
          </h3>
          <p className="text-xs text-slate-400">
            Monitoreo en tiempo real de asistencia, cronómetros y auditoría de tareas completadas
          </p>
        </div>

        {/* Selector de Fecha / Calendario Histórico */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#111318] border border-white/10 rounded-md px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-orange-400" />
            <input
              type="date"
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              className="bg-transparent text-white text-xs outline-none cursor-pointer font-mono"
            />
            {!esHoy && (
              <button
                type="button"
                onClick={() => setFechaSeleccionada(new Date().toISOString().substring(0, 10))}
                className="ml-1 text-[10px] text-orange-400 hover:text-orange-300 font-semibold underline cursor-pointer"
              >
                Hoy
              </button>
            )}
          </div>

          <button
            onClick={() => abrirModalAsignacion()}
            className="px-3 py-1.5 rounded-md bg-orange-600 hover:bg-orange-500 text-xs text-white font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            title="Asignar e iniciar tarea directa a un operario sin Hoja de Ruta"
          >
            <Plus className="w-3.5 h-3.5" />
            Asignar Tarea Directa
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-semibold flex items-center gap-1.5 border border-white/10 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
        </div>
      </div>

      {/* 4 KPI Cards (Incluyendo Tareas Terminadas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-panel p-4 rounded-md border border-white/10 bg-[#090a0f]/60">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>En Tarea Activa</span>
            <Play className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1">{timers.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Operarios con cronómetro corriendo</p>
        </div>

        <div className="glass-panel p-4 rounded-md border border-white/10 bg-[#090a0f]/60">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Presentes Hoy</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{presentesHoy.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Con entrada activa sin salida</p>
        </div>

        <div className="glass-panel p-4 rounded-md border border-white/10 bg-[#090a0f]/60">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Presentes sin Tarea</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-400 mt-1">{presentesSinTarea.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Marcaron entrada pero aún no iniciaron tarea</p>
        </div>

        {/* 4ta KPI Card: Tareas Terminadas */}
        <div className="glass-panel p-4 rounded-md border border-white/10 bg-gradient-to-br from-emerald-500/10 to-transparent">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold text-emerald-300">Tareas Concluidas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-bold font-mono text-white">{tareasTerminadas.length}</p>
            <span className="text-xs text-slate-400 font-mono">({horasTerminadasTotal.toFixed(1)} hs totales)</span>
          </div>
          <p className="text-[10px] text-emerald-400/80 mt-0.5">
            {esHoy ? 'Concluidas en el día de hoy' : `Concluidas el ${fechaSeleccionada}`}
          </p>
        </div>
      </div>

      {/* Alerta de presentes sin tarea con botón de asignación directa */}
      {presentesSinTarea.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Operarios presentes que aún no iniciaron tareas:</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {presentesSinTarea.map(u => (
              <div key={u} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 rounded-md text-[11px] font-mono text-amber-200">
                <span className="font-semibold">{u}</span>
                <button
                  type="button"
                  onClick={() => abrirModalAsignacion(u)}
                  className="ml-1 px-1.5 py-0.5 bg-orange-600 hover:bg-orange-500 text-white rounded text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                  title={`Asignar tarea e iniciar timer a ${u}`}
                >
                  <Play className="w-2.5 h-2.5 fill-white" />
                  Asignar Tarea
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECCIÓN 1: TRABAJOS ACTIVOS (EN VIVO) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
            Cronómetros en Ejecución ({timers.length})
          </h4>
        </div>

        {timers.length === 0 ? (
          <div className="text-center py-8 bg-[#090a0f] rounded-md border border-white/5 text-xs text-slate-500">
            No hay operarios con tareas activas en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {timers.map(t => (
              <div key={t.id} className="glass-panel p-4 rounded-md border border-white/10 space-y-3 bg-[#0d0f15]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse" />
                    <span className="font-bold text-white text-sm">{t.colaboradorNombre}</span>
                    <span className="text-[10px] font-mono text-slate-500">({t.usuario})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      t.isPaused ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    }`}>
                      {t.isPaused ? 'PAUSADO' : 'EN VIVO'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOperarioDestino(t)}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-500/15 text-orange-300 border border-orange-500/30 hover:bg-orange-500/25 transition cursor-pointer flex items-center gap-1"
                      title="Asignar una tarea / paso adicional en vivo a este operario"
                    >
                      <Plus className="w-3 h-3" />
                      Agregar Paso
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-200 font-medium">
                  {t.descripcion}
                </div>

                {/* Checklist en Vivo */}
                {t.checklistProgress && (
                  <div className="p-2.5 rounded bg-black/40 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 font-semibold text-orange-400">
                        <CheckSquare className="w-3.5 h-3.5" />
                        Checklist ({t.checklistProgress.completados}/{t.checklistProgress.total})
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 font-bold">
                        {t.checklistProgress.porcentaje}%
                      </span>
                    </div>

                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          t.checklistProgress.porcentaje === 100 ? 'bg-emerald-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${t.checklistProgress.porcentaje}%` }}
                      />
                    </div>

                    {/* Lista detallada de pasos con tiempos */}
                    {t.checklistProgress.pasos && t.checklistProgress.pasos.length > 0 ? (
                      <div className="pt-2 border-t border-white/5 space-y-1.5">
                        <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                          Seguimiento de Tareas / Checklist:
                        </span>
                        <div className="space-y-1">
                          {t.checklistProgress.pasos.map((p, idx) => {
                            const isCurrent = !p.completado && t.checklistProgress?.pasos?.slice(0, idx).every(prevP => prevP.completado);
                            const secs = p.duracionSegundos || 0;
                            const mins = Math.floor(secs / 60);
                            const remSecs = secs % 60;
                            const duracionTexto = mins >= 60 
                              ? `${Math.floor(mins / 60)}h ${mins % 60}m` 
                              : mins > 0
                              ? `${mins}m ${remSecs > 0 ? `${remSecs}s` : ''}`.trim()
                              : `${secs}s`;

                            return (
                              <div
                                key={p.id || idx}
                                className={`flex items-center justify-between px-2.5 py-1 rounded text-xs border ${
                                  p.completado
                                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                                    : isCurrent
                                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-200'
                                    : 'bg-white/5 border-white/5 text-slate-400'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate pr-2">
                                  <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-bold ${
                                    p.completado ? 'bg-emerald-500 text-black' : 'border border-white/20 text-slate-500'
                                  }`}>
                                    {p.completado ? '✓' : idx + 1}
                                  </span>
                                  <span className={`truncate ${p.completado ? 'line-through text-slate-400' : ''}`}>
                                    {p.texto}
                                  </span>
                                </div>

                                <div className="shrink-0 font-mono text-[11px]">
                                  {p.completado && p.duracionSegundos !== undefined ? (
                                    <span className="px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      ⏱ {duracionTexto}
                                    </span>
                                  ) : isCurrent ? (
                                    <span className="px-1.5 py-0.5 rounded font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30 animate-pulse flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                      En curso
                                    </span>
                                  ) : (
                                    <span className="text-slate-600 text-[10px]">Pendiente</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      t.checklistProgress.pasoActual && (
                        <p className="text-[10px] text-slate-400 truncate">
                          <span className="text-orange-400 font-semibold">Paso en curso:</span> {t.checklistProgress.pasoActual}
                        </p>
                      )
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5 font-mono">
                  <span>{t.clienteNombre} · {t.proyectoNombre}</span>
                  <span className="text-orange-400 font-bold text-xs">
                    ⏱ {formatDuration(t.inicio, t.pausedTime)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECCIÓN 2: HISTÓRICO DE TAREAS CONCLUIDAS (AUDITORÍA DIARIA) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Histórico de Tareas Concluidas ({tareasTerminadas.length}) — {fechaSeleccionada}
            </h4>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400">
            {horasTerminadasTotal.toFixed(2)} hs acumuladas
          </span>
        </div>

        {tareasTerminadas.length === 0 ? (
          <div className="text-center py-8 bg-[#090a0f] rounded-md border border-white/5 text-xs text-slate-500">
            No hay registros de tareas concluidas en la fecha {fechaSeleccionada}.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {tareasTerminadas.map(t => (
              <div key={t.id} className="p-3.5 rounded-md bg-[#111318] border border-white/10 hover:border-white/20 transition space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">{t.colaboradorNombre}</span>
                    <span className="text-[10px] text-slate-400 font-mono">· {t.clienteNombre} ({t.proyectoNombre})</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-slate-400">{t.hsInicio || '--:--'} a {t.hsFin || '--:--'}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                      {t.hsTotal != null ? `${t.hsTotal.toFixed(2)} hs` : `${t.minutos} min`}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300">{t.descripcion}</p>

                {/* Desglose de subtareas y tiempos por paso si existe */}
                {t.desglosePasos && t.desglosePasos.length > 0 && (
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[10px] font-mono text-slate-400 block mb-1">
                      Desglose de subtareas dedicadas:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {t.desglosePasos.map((paso, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
                          ⏱ {paso}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal / Diálogo para agregar tarea o paso en vivo */}
      <AnimatePresence>
        {operarioDestino && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-md border border-white/10 bg-[#090a0f] p-5 shadow-2xl space-y-4 text-slate-200"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Agregar Tarea en Vivo</h3>
                    <p className="text-[11px] text-slate-400">
                      Asignar paso a <span className="text-orange-300 font-semibold">{operarioDestino.colaboradorNombre}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOperarioDestino(null)}
                  className="text-slate-500 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-mono uppercase text-slate-400 block">
                  Descripción del paso o tarea
                </label>
                <input
                  type="text"
                  value={nuevoPasoTexto}
                  onChange={(e) => setNuevoPasoTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleEnviarNuevoPaso();
                    }
                  }}
                  placeholder="ej: Revisar fijación y embalaje antes de enviar..."
                  className="w-full rounded-md border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
                  autoFocus
                />
                <p className="text-[10px] text-slate-500 italic">
                  Este paso aparecerá de inmediato en la pantalla del operario sin necesidad de que refresque.
                </p>

                {mensajePasoOk && (
                  <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded text-xs text-emerald-300 text-center font-medium">
                    ✓ {mensajePasoOk}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setOperarioDestino(null)}
                  className="px-3 py-1.5 rounded-md text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleEnviarNuevoPaso}
                  disabled={agregandoPaso || !nuevoPasoTexto.trim()}
                  className="px-4 py-1.5 rounded-md bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-xs font-semibold text-white transition flex items-center gap-1.5 cursor-pointer"
                >
                  {agregandoPaso ? 'Enviando...' : 'Asignar Paso'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL: ASIGNACIÓN DIRECTA DE TAREA A OPERARIO (Sin Hoja de Ruta) */}
        {modalAsignarOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#0e1017] border border-white/15 rounded-md p-5 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-orange-400 fill-orange-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Asignar e Iniciar Tarea en Vivo</h4>
                    <p className="text-[11px] text-slate-400">
                      Arranca el cronómetro directamente al operario sin necesidad de Hoja de Ruta
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalAsignarOpen(false)}
                  className="text-slate-500 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleIniciarTareaDirecta} className="space-y-4">
                {/* Selector de Operario */}
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                    Operario Responsable <span className="text-orange-400">*</span>
                  </label>
                  <select
                    value={asignarUsuario}
                    onChange={(e) => setAsignarUsuario(e.target.value)}
                    required
                    className="w-full rounded-md border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
                  >
                    <option value="">— Seleccionar Operario —</option>
                    {presentesHoy.length > 0 && (
                      <optgroup label="Presentes Hoy (Marcación Activa)">
                        {presentesHoy.map(u => (
                          <option key={`p_${u}`} value={u}>
                            {u} {presentesSinTarea.includes(u) ? '(Sin tarea activa)' : '(En tarea)'}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Todos los Operarios / Usuarios">
                      {usuariosSistema
                        .filter(u => !presentesHoy.includes(u.username))
                        .map(u => (
                          <option key={u.id} value={u.username}>
                            {u.nombre} ({u.username})
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>

                {/* Cliente */}
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                    Cliente <span className="text-orange-400">*</span>
                  </label>
                  <select
                    value={asignarClienteId}
                    onChange={(e) => {
                      setAsignarClienteId(e.target.value);
                      setAsignarProyectoId('');
                    }}
                    required
                    className="w-full rounded-md border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
                  >
                    <option value="">— Seleccionar Cliente —</option>
                    {(data?.clientes || []).map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Proyecto */}
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                    Proyecto <span className="text-orange-400">*</span>
                  </label>
                  <select
                    value={asignarProyectoId}
                    onChange={(e) => setAsignarProyectoId(e.target.value)}
                    required
                    disabled={!asignarClienteId}
                    className="w-full rounded-md border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white focus:border-orange-500 outline-none disabled:opacity-40"
                  >
                    <option value="">— Seleccionar Proyecto —</option>
                    {(data?.proyectos || [])
                      .filter(p => p.clienteId === asignarClienteId && p.activo !== false)
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                  </select>
                </div>

                {/* Descripción Base */}
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                    Descripción del Trabajo <span className="text-orange-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={asignarDescripcion}
                    onChange={(e) => setAsignarDescripcion(e.target.value)}
                    required
                    placeholder="ej: Mecanizado y pulido de acrílicos para marquesina"
                    className="w-full rounded-md border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
                  />
                </div>

                {/* Checklist Inicial Opcional */}
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1 flex items-center justify-between">
                    <span>Pasos de Checklist Inicial (opcional)</span>
                    <span className="text-[10px] text-slate-500 font-sans">1 paso por línea</span>
                  </label>
                  <textarea
                    value={asignarPasosTexto}
                    onChange={(e) => setAsignarPasosTexto(e.target.value)}
                    rows={3}
                    placeholder="Corte de planchas según plano&#10;Desbaste y lijado de bordes&#10;Pulido y control dimensional"
                    className="w-full rounded-md border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white focus:border-orange-500 outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    El operario verá estos pasos en su pantalla con casillas para tildar mientras avanza.
                  </p>
                </div>

                {/* Feedback */}
                {asignarFeedback && (
                  <div className={`p-2.5 rounded-md text-xs font-medium ${
                    asignarFeedback.tipo === 'ok'
                      ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
                  }`}>
                    {asignarFeedback.msg}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setModalAsignarOpen(false)}
                    className="px-3 py-1.5 rounded-md text-xs text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={asignandoTarea || !asignarUsuario || !asignarClienteId || !asignarProyectoId || !asignarDescripcion.trim()}
                    className="px-4 py-2 rounded-md bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-xs font-semibold text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    {asignandoTarea ? 'Iniciando Tarea...' : 'Asignar e Iniciar Timer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
