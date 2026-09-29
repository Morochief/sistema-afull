import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Trash2, X, MapPin, Clock } from 'lucide-react';
import { authFetchJSON } from '../authFetch.ts';

interface HojaRuta {
  id: string;
  nombre: string;
  descripcion?: string | null;
  estado: string;
  creadaPor?: string;
  operarios: { usuario: string; rol: string }[];
}

interface UsuarioDB {
  username: string;
  nombre: string;
}

export default function HojasRutaAdmin() {
  const [hojas, setHojas] = useState<HojaRuta[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [operariosSel, setOperariosSel] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHojas();
    fetchUsuarios();
  }, []);

  async function fetchHojas() {
    setLoading(true);
    try {
      const res = await authFetchJSON('/api/marcacion/hojas-ruta');
      if (res.success) setHojas(res.data || []);
    } catch (e: any) {
      setError(e.message || 'Error al cargar hojas de ruta');
    } finally { setLoading(false); }
  }

  async function fetchUsuarios() {
    try {
      const res = await authFetchJSON('/api/auth/users');
      if (res.success && res.data) setUsuarios(res.data);
    } catch {}
  }

  function resetForm() {
    setNombre('');
    setDescripcion('');
    setOperariosSel([]);
    setEditId(null);
    setShowForm(false);
  }

  function startEdit(h: HojaRuta) {
    setEditId(h.id);
    setNombre(h.nombre);
    setDescripcion(h.descripcion || '');
    setOperariosSel(h.operarios.map(o => o.usuario));
    setShowForm(true);
  }

  async function handleSave() {
    if (!nombre.trim()) { setError('Nombre requerido'); return; }
    if (operariosSel.length === 0) { setError('Asigná al menos un operario'); return; }
    setSaving(true);
    setError(null);
    try {
      const body = { nombre: nombre.trim(), descripcion: descripcion.trim(), operarios: operariosSel };
      if (editId) {
        await authFetchJSON(`/api/marcacion/hojas-ruta/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        await authFetchJSON('/api/marcacion/hojas-ruta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      resetForm();
      await fetchHojas();
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta hoja de ruta?')) return;
    try {
      await authFetchJSON(`/api/marcacion/hojas-ruta/${id}`, { method: 'DELETE' });
      await fetchHojas();
    } catch (e: any) {
      setError(e.message || 'Error al eliminar');
    }
  }

  function toggleOperario(username: string) {
    setOperariosSel(prev => prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-orange-400" />
          <h3 className="text-sm font-bold text-white">Hojas de Ruta</h3>
          <span className="text-[10px] text-slate-500">({hojas.length})</span>
        </div>
        <motion.button
          onClick={() => { resetForm(); setShowForm(true); }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-md cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva Hoja
        </motion.button>
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-md text-xs text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400/50 hover:text-red-400 cursor-pointer"><X className="w-3 h-3" /></button>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-900/50 border border-orange-500/30 rounded-md p-4 space-y-3 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                {editId ? 'Editar Hoja de Ruta' : 'Nueva Hoja de Ruta'}
              </h4>
              <button onClick={resetForm} className="text-slate-500 hover:text-slate-300 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Nombre *</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Ruta Norte — Lunes"
                className="w-full mt-1 bg-slate-800 border border-white/10 rounded-md px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Descripción</label>
              <input
                type="text"
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Ej: Ruta de distribución zona norte"
                className="w-full mt-1 bg-slate-800 border border-white/10 rounded-md px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Operarios asignados * <span className="text-slate-500 normal-case">({operariosSel.length} seleccionados)</span>
              </label>
              <p className="text-[10px] text-slate-500 mt-1 mb-2">
                Cuando el conductor marque entrada/salida, se replicará automáticamente a todos los operarios de esta hoja.
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto">
                {usuarios.map(u => (
                  <button
                    key={u.username}
                    onClick={() => toggleOperario(u.username)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-all cursor-pointer border ${
                      operariosSel.includes(u.username)
                        ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                        : 'bg-slate-800 border-white/10 text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${operariosSel.includes(u.username) ? 'bg-orange-400' : 'bg-slate-600'}`} />
                    <span className="truncate">{u.nombre}</span>
                    <span className="text-[9px] text-slate-500 ml-auto">@{u.username}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-md cursor-pointer transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Crear Hoja'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold rounded-md cursor-pointer transition-colors"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin w-6 h-6 text-orange-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        </div>
      ) : hojas.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-xs">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No hay hojas de ruta creadas. Creá una para que los operarios puedan marcar en conjunto.
        </div>
      ) : (
        <div className="space-y-2">
          {hojas.map(h => (
            <div key={h.id} className="bg-white/5 border border-white/10 rounded-md p-3 hover:bg-white/8 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-xs">{h.nombre}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      h.estado === 'ACTIVA' ? 'bg-emerald-500/20 text-emerald-400' :
                      h.estado === 'CERRADA' ? 'bg-slate-500/20 text-slate-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>{h.estado}</span>
                  </div>
                  {h.descripcion && <p className="text-[10px] text-slate-500 mt-1">{h.descripcion}</p>}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {h.operarios.map(o => (
                      <span key={o.usuario} className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-[10px] text-orange-300">
                        <Users className="w-2.5 h-2.5" />
                        {o.usuario}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(h)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 cursor-pointer transition-colors"
                    title="Editar"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button
                    onClick={() => handleDelete(h.id)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-orange-500/5 border border-orange-500/20 rounded-md p-3 text-[10px] text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 text-orange-400 font-bold uppercase tracking-wider text-[10px] mb-1">
          <MapPin className="w-3 h-3" />
          Cómo funciona
        </div>
        <p>• El operario selecciona la hoja de ruta antes de marcar entrada/salida.</p>
        <p>• Al marcar, se crea la marcación para él y se replica automáticamente a todos los operarios de la hoja.</p>
        <p>• Las marcaciones replicadas aparecen con badge "Hoja" en el timeline, indicando quién marcó.</p>
        <p>• <Clock className="w-2.5 h-2.5 inline" /> Si un operario ya tiene entrada sin salida, no se le replica otra.</p>
      </div>
    </motion.div>
  );
}
