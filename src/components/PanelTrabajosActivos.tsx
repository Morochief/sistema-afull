import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, Clock, Play, Pause, AlertCircle, CheckCircle, Briefcase, RefreshCw, CheckSquare } from 'lucide-react';
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

export default function PanelTrabajosActivos() {
  const [timers, setTimers] = useState<TimerActivoItem[]>([]);
  const [marcacionesHoy, setMarcacionesHoy] = useState<MarcacionHoyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // Actualizar segundero cada segundo
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [timersRes, marcacionesRes] = await Promise.all([
        authFetchJSON<{ success: boolean; data: TimerActivoItem[] }>('/api/timer/activos').catch(() => ({ success: false, data: [] })),
        authFetchJSON<{ success: boolean; data: any[] }>('/api/marcacion/admin/timeline?limite=100').catch(() => ({ success: false, data: [] })),
      ]);

      if (timersRes.success) setTimers(timersRes.data || []);
      if (marcacionesRes.success) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const hoyItems = (marcacionesRes.data || []).filter((m: any) => new Date(m.timestamp) >= hoy);
        setMarcacionesHoy(hoyItems);
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
  }, []);

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Control en Vivo de Operarios & Tareas Activas
          </h3>
          <p className="text-[11px] text-slate-400">
            Monitoreo en tiempo real de asistencia, cronómetros y proyectos en ejecución
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-semibold flex items-center gap-1.5 border border-white/10 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refrescar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-panel p-4 rounded-md border border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>En Tarea Activa</span>
            <Play className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1">{timers.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Operarios con cronómetro corriendo</p>
        </div>

        <div className="glass-panel p-4 rounded-md border border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Presentes Hoy</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{presentesHoy.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Con entrada activa sin salida</p>
        </div>

        <div className="glass-panel p-4 rounded-md border border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Presentes sin Tarea</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-400 mt-1">{presentesSinTarea.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Marcaron entrada pero aún no iniciaron tarea</p>
        </div>
      </div>

      {/* Alerta de presentes sin tarea */}
      {presentesSinTarea.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Operarios presentes que aún no iniciaron tareas:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {presentesSinTarea.map(u => (
              <span key={u} className="px-2 py-0.5 bg-amber-500/20 rounded text-[11px] font-mono text-amber-200">
                {u}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Trabajos Activos */}
      <div className="space-y-3">
        <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
          Cronómetros en Ejecución ({timers.length})
        </h4>

        {timers.length === 0 ? (
          <div className="text-center py-10 bg-[#090a0f] rounded-md border border-white/5 text-xs text-slate-500">
            No hay operarios con tareas activas en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {timers.map(t => (
              <div key={t.id} className="glass-panel p-4 rounded-md border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                    <span className="font-bold text-white text-xs">{t.colaboradorNombre}</span>
                    <span className="text-[10px] font-mono text-slate-500">({t.usuario})</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    t.isPaused ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  }`}>
                    {t.isPaused ? 'PAUSADO' : 'EN VIVO'}
                  </span>
                </div>

                <div className="text-xs text-slate-300 font-medium">
                  {t.descripcion.replace(/\s*\[Checklist:[^\]]*\]/g, '').trim() || t.descripcion}
                </div>

                {/* Checklist en Vivo */}
                {t.checklistProgress && (
                  <div className="p-2.5 rounded bg-black/40 border border-white/5 space-y-1.5">
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

                    {t.checklistProgress.pasoActual && (
                      <p className="text-[10px] text-slate-400 truncate">
                        <span className="text-slate-500">En curso:</span> {t.checklistProgress.pasoActual}
                      </p>
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
    </div>
  );
}
