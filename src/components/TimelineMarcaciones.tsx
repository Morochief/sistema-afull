import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Clock, MapPin, AlertTriangle, Users, Search, ShieldAlert, Home, UserCheck } from 'lucide-react';
import { authFetchJSON } from '../authFetch.ts';

interface MarcacionTimeline {
  id: string;
  usuario: string;
  tipo: 'ENTRADA' | 'SALIDA';
  timestamp: string;
  lat: number | null;
  lng: number | null;
  ip: string | null;
  dispositivoHash: string | null;
  origen: string;
  motivoRemoto?: string | null;
  hojaRutaId?: string | null;
  marcadoPor?: string | null;
  alertas: string[];
}

export default function TimelineMarcaciones() {
  const [data, setData] = useState<MarcacionTimeline[]>([]);
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => { fetchTimeline(); }, []);
  useEffect(() => { setCurrentPage(1); }, [itemsPerPage]);

  async function fetchTimeline() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filtroUsuario) params.set('usuario', filtroUsuario);
      const res = await authFetchJSON(`/api/marcacion/admin/timeline?${params}`);
      if (res.success) setData(res.data || []);
      else setError('Error al obtener timeline');
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally { setLoading(false); }
  }

  function formatDateTime(ts: string) {
    try { return new Date(ts).toLocaleString('es', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return ts; }
  }

  const totalPages = Math.max(1, Math.ceil(data.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return data.slice(start, start + itemsPerPage);
  }, [data, safePage, itemsPerPage]);

  const usuariosUnicos = [...new Set(data.map(m => m.usuario))];
  const usuariosConAlertas = [...new Set(data.filter(m => m.alertas.length > 0).map(m => m.usuario))];

  function OrigenBadge({ m }: { m: MarcacionTimeline }) {
    if (m.origen === 'REMOTO') {
      return (
        <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded text-[9px] font-bold flex items-center gap-1" title={m.motivoRemoto || 'Remoto'}>
          <Home className="w-2.5 h-2.5" />
          Remoto
        </span>
      );
    }
    if (m.origen === 'HOJA_RUTA') {
      return (
        <span className="px-1.5 py-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded text-[9px] font-bold flex items-center gap-1" title={`Marcada por ${m.marcadoPor}`}>
          <Users className="w-2.5 h-2.5" />
          Hoja
        </span>
      );
    }
    if (m.origen === 'API') {
      return <span className="px-1 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[9px] font-mono">API</span>;
    }
    return null;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Clock className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Timeline de Asistencia & Marcaciones</h3>
            <p className="text-[11px] text-slate-400">Control de entradas, salidas y anomalías de geocerca</p>
          </div>
        </div>
        {usuariosConAlertas.length > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-md">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono">
              {usuariosConAlertas.length} Anomalías detectadas
            </span>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Filtrar por usuario..."
            value={filtroUsuario}
            onChange={e => setFiltroUsuario(e.target.value)}
            list="usuarios-list"
            className="w-full bg-[#090a0f] border border-white/10 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
          <datalist id="usuarios-list">
            {usuariosUnicos.map(u => <option key={u} value={u} />)}
          </datalist>
        </div>
        <button
          onClick={fetchTimeline}
          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-md cursor-pointer transition-colors"
        >
          Filtrar
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/30 rounded-md text-xs text-rose-400">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-xs bg-[#090a0f] border border-white/5 rounded-md">
          No hay marcaciones registradas
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedData.map((m) => {
            const tieneAlertas = m.alertas.length > 0;
            return (
              <div key={m.id} className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs transition-all border ${
                tieneAlertas 
                  ? 'bg-amber-500/[0.04] border-amber-500/30 hover:border-amber-500/50' 
                  : 'bg-[#111318]/80 backdrop-blur-sm border-white/10 hover:border-white/20 shadow-sm'
              }`}>
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  m.tipo === 'ENTRADA' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-rose-400 shadow-sm shadow-rose-400/50'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-xs truncate">{m.usuario}</span>
                    <span className={`font-bold font-mono text-[11px] px-2 py-0.5 rounded-full border ${
                      m.tipo === 'ENTRADA' 
                        ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' 
                        : 'text-rose-300 bg-rose-500/10 border-rose-500/20'
                    }`}>{m.tipo}</span>
                    <span className="text-slate-300 font-mono text-xs">{formatDateTime(m.timestamp)}</span>
                    <OrigenBadge m={m} />
                    {m.marcadoPor && m.origen === 'HOJA_RUTA' && (
                      <span className="flex items-center gap-1 text-[10px] text-orange-400/90 font-mono bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                        <UserCheck className="w-3 h-3" />
                        por {m.marcadoPor}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                    {m.lat && m.lng && (
                      <span className="flex items-center gap-1 font-mono">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {m.lat.toFixed(4)}, {m.lng.toFixed(4)}
                      </span>
                    )}
                    {m.ip && <span className="font-mono text-slate-400 bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/5">IP: {m.ip}</span>}
                    {m.motivoRemoto && (
                      <span className="text-amber-400/90 italic truncate max-w-[240px]" title={m.motivoRemoto}>
                        "{m.motivoRemoto}"
                      </span>
                    )}
                  </div>
                </div>
                {tieneAlertas && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {m.alertas.includes('MULTIPLES_IPS') && (
                      <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded text-[10px] font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        IPs distintas
                      </span>
                    )}
                    {m.alertas.includes('MULTIPLES_DISPOSITIVOS') && (
                      <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded text-[10px] font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        Disp. distintos
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {data.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2">
            <select 
              value={itemsPerPage} 
              onChange={e => setItemsPerPage(Number(e.target.value))} 
              className="bg-[#090a0f] border border-white/10 text-white rounded-md px-2 py-1 text-xs focus:outline-none focus:border-orange-500"
            >
              <option value={25}>25 por pág.</option>
              <option value={50}>50 por pág.</option>
              <option value={100}>100 por pág.</option>
            </select>
            <span className="text-xs text-slate-500 font-mono">{data.length} marcaciones</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={safePage <= 1}
              className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold disabled:opacity-30 disabled:cursor-not-allowed bg-[#090a0f] hover:bg-white/5 text-slate-400 hover:text-white border border-white/10"
            >
              ‹
            </button>
            {(() => {
              const pages = [];
              const start = Math.max(1, safePage - 3);
              const end = Math.min(totalPages, start + 6);
              for (let p = start; p <= end; p++) pages.push(p);
              return pages;
            })().map(page => (
              <button 
                key={page} 
                onClick={() => setCurrentPage(page)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold ${
                  page === safePage 
                    ? 'bg-orange-600 text-white border border-orange-500' 
                    : 'bg-[#090a0f] hover:bg-white/5 text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                {page}
              </button>
            ))}
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={safePage >= totalPages}
              className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold disabled:opacity-30 disabled:cursor-not-allowed bg-[#090a0f] hover:bg-white/5 text-slate-400 hover:text-white border border-white/10"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
