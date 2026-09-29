import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { LogIn, LogOut, Search, ShieldAlert } from 'lucide-react';
import { authFetchJSON } from '../authFetch.ts';

interface AuditEvent {
  id: string;
  usuario: string;
  accion: string;
  recurso: string | null;
  resultado: string;
  ip: string | null;
  createdAt: string;
}

export default function AuditLogTab() {
  const [data, setData] = useState<AuditEvent[]>([]);
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => { fetchLogins(); }, []);

  useEffect(() => { setCurrentPage(1); }, [filtroUsuario, itemsPerPage]);

  async function fetchLogins() {
    setLoading(true);
    setCurrentPage(1);
    try {
      const params = new URLSearchParams();
      if (filtroUsuario) params.set('usuario', filtroUsuario);
      params.set('limite', '200');
      const res = await authFetchJSON(`/api/audit/logins?${params}`);
      if (res.success) setData(res.data || []);
    } catch {} finally { setLoading(false); }
  }

  const totalPages = Math.max(1, Math.ceil(data.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return data.slice(start, start + itemsPerPage);
  }, [data, safePage, itemsPerPage]);

  function formatDateTime(ts: string) {
    try { return new Date(ts).toLocaleString('es', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
    catch { return ts; }
  }

  const failedLogins = data.filter(e => e.accion === 'login' && e.resultado === 'failure');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <LogIn className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Historial de Accesos & Autenticación</h3>
            <p className="text-[11px] text-slate-400">Auditoría de inicios y cierres de sesión de usuarios</p>
          </div>
        </div>
        {failedLogins.length > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 rounded-md">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[10px] font-bold text-rose-400 font-mono">{failedLogins.length} accesos fallidos</span>
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
            className="w-full bg-[#090a0f] border border-white/10 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" 
          />
        </div>
        <button 
          onClick={fetchLogins}
          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-md cursor-pointer transition-colors"
        >
          Filtrar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-xs bg-[#090a0f] border border-white/5 rounded-md">
          Sin actividad de inicio de sesión registrada
        </div>
      ) : (
        <div className="space-y-1.5">
          {paginatedData.map(e => (
            <div key={e.id} className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs transition-colors border ${
              e.resultado === 'failure' 
                ? 'bg-rose-500/[0.04] border-rose-500/20' 
                : 'bg-[#111318] border-white/5 hover:border-white/10'
            }`}>
              {e.accion === 'login' ? (
                e.resultado === 'success'
                  ? <LogIn className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  : <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              ) : (
                <LogOut className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white">{e.usuario}</span>
                  <span className={`font-semibold ${
                    e.accion === 'login' && e.resultado === 'success' ? 'text-emerald-400' :
                    e.accion === 'login' && e.resultado === 'failure' ? 'text-rose-400' :
                    'text-slate-400'
                  }`}>
                    {e.accion === 'login' ? (e.resultado === 'success' ? 'Ingreso Autorizado' : 'Ingreso Fallido / Rechazado') : 'Cierre de Sesión'}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">{formatDateTime(e.createdAt)}</span>
                </div>
                {e.ip && <div className="text-[10px] text-slate-500 font-mono mt-0.5">IP de Conexión: {e.ip}</div>}
              </div>
            </div>
          ))}
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
            <span className="text-xs text-slate-500 font-mono">{data.length} registros</span>
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
