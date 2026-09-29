import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, AlertTriangle, CheckCircle, XCircle, ChevronDown, History, Home, Users, X } from 'lucide-react';
import { authFetchJSON } from '../authFetch.ts';

interface Marcacion {
  id: string;
  tipo: 'ENTRADA' | 'SALIDA';
  timestamp: string;
  lat: number | null;
  lng: number | null;
  precision: number | null;
  origen?: string;
  motivoRemoto?: string | null;
  hojaRutaId?: string | null;
  marcadoPor?: string | null;
}

interface HojaRuta {
  id: string;
  nombre: string;
  descripcion?: string | null;
  estado: string;
  operarios: { usuario: string; rol: string }[];
}

interface MarcacionesUIProps {
  usuario: string;
  showToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

export default function MarcacionesUI({ usuario, showToast }: MarcacionesUIProps) {
  const [loading, setLoading] = useState(false);
  const [ultima, setUltima] = useState<Marcacion | null>(null);
  const [historial, setHistorial] = useState<Marcacion[]>([]);
  const [showHistorial, setShowHistorial] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [modoRemoto, setModoRemoto] = useState(false);
  const [motivoRemoto, setMotivoRemoto] = useState('');
  const [showRemotoPanel, setShowRemotoPanel] = useState(false);
  const [hojasRuta, setHojasRuta] = useState<HojaRuta[]>([]);
  const [hojaRutaSel, setHojaRutaSel] = useState<string>('');
  const [showHojaPanel, setShowHojaPanel] = useState(false);

  const tieneEntradaActiva = ultima?.tipo === 'ENTRADA';

  useEffect(() => {
    fetchUltimaMarcacion();
    fetchHojasRuta();
  }, [usuario]);

  async function fetchUltimaMarcacion() {
    try {
      const res = await authFetchJSON('/api/marcacion/mis-marcaciones?limite=5');
      if (res.success && res.data?.length > 0) {
        setUltima(res.data[0]);
        setHistorial(res.data);
      }
    } catch {}
  }

  async function fetchHojasRuta() {
    try {
      const res = await authFetchJSON('/api/marcacion/hojas-ruta');
      if (res.success && res.data) {
        // Solo mostrar hojas activas (case-insensitive para consistencia con 'Activa' y 'ACTIVA')
        setHojasRuta(res.data.filter((h: HojaRuta) => h.estado?.toUpperCase() === 'ACTIVA'));
      }
    } catch {}
  }

  function getGPS(): Promise<{ lat: number; lng: number; precision: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no disponible'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precision: Math.round(pos.coords.accuracy),
        }),
        (err) => {
          const msgs: Record<number, string> = {
            1: 'Permiso de ubicación denegado',
            2: 'Señal GPS no disponible',
            3: 'Tiempo de espera agotado',
          };
          reject(new Error(msgs[err.code] || 'Error de GPS'));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
      );
    });
  }

  async function handleMarcar() {
    // Si es remoto, validar motivo
    if (modoRemoto && !motivoRemoto.trim()) {
      showToast('Indicá un motivo para la marcación remota', 'warning');
      return;
    }

    setLoading(true);
    setGeoError(null);
    try {
      const gps = await getGPS();
      const endpoint = tieneEntradaActiva ? '/api/marcacion/salida' : '/api/marcacion/entrada';
      const body: any = {
        ...gps,
        modo: modoRemoto ? 'REMOTO' : 'APP',
        ...(modoRemoto ? { motivoRemoto: motivoRemoto.trim() } : {}),
        ...(hojaRutaSel ? { hojaRutaId: hojaRutaSel } : {}),
      };
      const res = await authFetchJSON(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.success) {
        const replicados = res.data?.replicados || [];
        let msg = tieneEntradaActiva ? 'Salida registrada' : 'Entrada registrada';
        if (replicados.length > 0) {
          msg += ` (replicada a ${replicados.length} operario${replicados.length > 1 ? 's' : ''})`;
        }
        showToast(msg, 'success');
        setShowRemotoPanel(false);
        setModoRemoto(false);
        setMotivoRemoto('');
        await fetchUltimaMarcacion();
      }
    } catch (err: any) {
      const msg = err.message || 'Error al marcar';
      if (msg.includes('GPS') || msg.includes('Geolocalización') || msg.includes('Permiso') || msg.includes('denegado')) {
        setGeoError(msg);
      }
      // Si el error es de fuera de zona, sugerir remoto
      if (msg.includes('FUERA_DE_ZONA') || msg.includes('Fuera de zona')) {
        setGeoError('Fuera de zona. Activá modo remoto.');
        showToast('Fuera de zona. Activá el modo remoto para marcar desde otra ubicación.', 'warning');
      } else {
        showToast(msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  function formatTime(ts: string) {
    try { return new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
  }
  function formatDate(ts: string) {
    try { return new Date(ts).toLocaleDateString('es', { day: '2-digit', month: '2-digit' }); } catch { return ''; }
  }

  function origenBadge(m: Marcacion) {
    if (m.origen === 'REMOTO') return <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1 rounded uppercase">Remoto</span>;
    if (m.origen === 'HOJA_RUTA') return <span className="text-[8px] bg-orange-500/20 text-orange-400 px-1 rounded uppercase">Hoja</span>;
    return null;
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        {/* Botón principal de marcación */}
        <motion.button
          onClick={handleMarcar}
          disabled={loading}
          whileTap={{ scale: 0.95 }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${
            tieneEntradaActiva
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
              : 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'
          } ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          title={tieneEntradaActiva ? 'Marcar salida' : 'Marcar entrada'}
        >
          {loading ? (
            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          ) : (
            <Clock className="w-3 h-3" />
          )}
          <span>{tieneEntradaActiva ? 'SALIDA' : 'ENTRADA'}</span>
        </motion.button>

        {/* Botón modo remoto */}
        <motion.button
          onClick={() => { setModoRemoto(!modoRemoto); setShowRemotoPanel(!modoRemoto); }}
          whileTap={{ scale: 0.95 }}
          className={`p-1.5 rounded-md cursor-pointer transition-all ${
            modoRemoto
              ? 'bg-amber-500/30 text-amber-400 border border-amber-500/40'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
          }`}
          title="Modo remoto — marcar desde fuera de la zona laboral"
        >
          <Home className="w-3 h-3" />
        </motion.button>

        {/* Botón hoja de ruta */}
        {hojasRuta.length > 0 && (
          <motion.button
            onClick={() => setShowHojaPanel(!showHojaPanel)}
            whileTap={{ scale: 0.95 }}
            className={`p-1.5 rounded-md cursor-pointer transition-all ${
              hojaRutaSel
                ? 'bg-orange-500/30 text-orange-400 border border-orange-500/40'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
            }`}
            title="Hoja de ruta compartida — marcar para varios operarios"
          >
            <Users className="w-3 h-3" />
          </motion.button>
        )}

        {/* Historial */}
        {historial.length > 0 && (
          <motion.button
            onClick={() => setShowHistorial(!showHistorial)}
            className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 cursor-pointer"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${showHistorial ? 'rotate-180' : ''}`} />
          </motion.button>
        )}
      </div>

      {/* Panel modo remoto */}
      <AnimatePresence>
        {showRemotoPanel && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full right-0 mt-1 bg-slate-900 border border-amber-500/30 rounded-xl shadow-2xl z-50 w-[280px] overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Home className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Modo Remoto</span>
              </div>
              <button onClick={() => { setShowRemotoPanel(false); setModoRemoto(false); }} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="px-3 py-2">
              <p className="text-[10px] text-slate-400 mb-2">
                Para marcar desde fuera de la zona laboral (ej: arrancas desde casa con el camión).
              </p>
              <input
                type="text"
                value={motivoRemoto}
                onChange={(e) => setMotivoRemoto(e.target.value)}
                placeholder="Motivo (ej: Arranque desde casa)"
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/40"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel hoja de ruta */}
      <AnimatePresence>
        {showHojaPanel && hojasRuta.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full right-0 mt-1 bg-slate-900 border border-orange-500/30 rounded-md shadow-2xl z-50 w-[280px] overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="w-3 h-3 text-orange-400" />
                <span className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider">Hoja de Ruta</span>
              </div>
              <button onClick={() => { setShowHojaPanel(false); setHojaRutaSel(''); }} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              {hojasRuta.map((h) => (
                <button
                  key={h.id}
                  onClick={() => { setHojaRutaSel(hojaRutaSel === h.id ? '' : h.id); setShowHojaPanel(false); }}
                  className={`w-full text-left px-3 py-2 hover:bg-white/5 transition-colors border-b border-white/5 ${
                    hojaRutaSel === h.id ? 'bg-orange-500/10' : ''
                  }`}
                >
                  <div className="text-[11px] text-slate-200 font-medium">{h.nombre}</div>
                  <div className="text-[9px] text-slate-500">
                    {h.operarios.length} operario{h.operarios.length !== 1 ? 's' : ''}: {h.operarios.map(o => o.usuario).join(', ')}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {geoError && (
        <div className="absolute top-full right-0 mt-1 bg-red-500/10 border border-red-500/30 rounded-md px-2 py-1 text-[10px] text-red-400 whitespace-nowrap z-40 flex items-center gap-1">
          <MapPin className="w-3 h-3 shrink-0" />
          {geoError}
        </div>
      )}

      {/* Indicadores activos */}
      {(modoRemoto || hojaRutaSel) && (
        <div className="absolute top-full left-0 mt-1 flex gap-1 z-40">
          {modoRemoto && (
            <div className="flex items-center gap-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase">
              <Home className="w-2.5 h-2.5" />
              Remoto
            </div>
          )}
          {hojaRutaSel && (
            <div className="flex items-center gap-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase">
              <Users className="w-2.5 h-2.5" />
              Hoja
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showHistorial && historial.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full right-0 mt-1 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 min-w-[220px] overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-white/5 flex items-center gap-1.5">
              <History className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Últimas</span>
            </div>
            {historial.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-white/5 text-[11px]">
                <div className="flex items-center gap-1.5">
                  {m.tipo === 'ENTRADA' ? (
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-400" />
                  )}
                  <span className={m.tipo === 'ENTRADA' ? 'text-emerald-300' : 'text-red-300'}>{m.tipo}</span>
                  {origenBadge(m)}
                </div>
                <div className="text-slate-500">
                  {formatDate(m.timestamp)} {formatTime(m.timestamp)}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
