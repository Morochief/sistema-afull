import {useCallback, useEffect, useState} from 'react';
import {authFetchJSON} from '../authFetch.ts';
import {Sucursal} from '../types.ts';

interface SucursalesTabProps {
  clientes: {id: string; nombre: string}[];
}

const inputCls = 'w-full glass-input rounded-xl px-3 py-2 text-sm';
const btnCls = 'text-[10px] px-2 py-1 rounded-lg border transition-all';

export default function SucursalesTab({clientes}: SucursalesTabProps) {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [nuevoClienteId, setNuevoClienteId] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filtroCliente ? `?clienteId=${encodeURIComponent(filtroCliente)}` : '';
      const json = await authFetchJSON<{success: boolean; data: Sucursal[]}>(`/api/admin/sucursales${qs}`);
      setSucursales(json.data || []);
    } catch (e: any) {
      setError(e.message || 'Error al cargar sucursales');
    } finally {
      setLoading(false);
    }
  }, [filtroCliente]);

  useEffect(() => { load(); }, [load]);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nuevoClienteId || !nuevoNombre.trim()) {
      setError('Seleccioná un cliente y escribí el nombre del local');
      return;
    }
    try {
      await authFetchJSON('/api/admin/sucursales', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({clienteId: nuevoClienteId, nombre: nuevoNombre.trim()}),
      });
      setNuevoNombre('');
      load();
    } catch (e: any) {
      setError(e.message || 'Error al crear sucursal');
    }
  };

  const desactivar = async (id: string) => {
    try {
      await authFetchJSON(`/api/admin/sucursales/${id}`, {method: 'DELETE'});
      load();
    } catch (e: any) {
      setError(e.message || 'Error al desactivar sucursal');
    }
  };

  const reactivar = async (s: Sucursal) => {
    try {
      await authFetchJSON(`/api/admin/sucursales/${s.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({activo: true}),
      });
      load();
    } catch (e: any) {
      setError(e.message || 'Error al reactivar sucursal');
    }
  };

  const selectCls = 'glass-select rounded-lg px-3 py-2 text-xs';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
        <p className="text-sm font-semibold text-slate-200">Registrar Nueva Sucursal / Local</p>
        <p className="text-xs text-slate-400">
          Las sucursales son los locales físicos del cliente (ej: Mariano Roque Alonso, Luque). El cliente las ve en su portal de pedidos.
        </p>
        <form onSubmit={crear} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            className={selectCls}
            value={nuevoClienteId}
            onChange={(e) => setNuevoClienteId(e.target.value)}
          >
            <option value="">Cliente...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <input
            className={inputCls}
            placeholder="Nombre del local (ej: Luque)"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
          />
          <button
            type="submit"
            className="w-full py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 font-bold text-xs text-white rounded-xl cursor-pointer transition-all"
          >
            + Agregar Sucursal
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-200">Sucursales ({sucursales.length})</p>
          <select className={selectCls} value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
            <option value="">Todos los clientes</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Cargando...</p>
        ) : sucursales.length === 0 ? (
          <p className="text-sm text-slate-400">No hay sucursales cargadas.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sucursales.map((s) => (
              <div key={s.id} className={`p-3 rounded-xl border ${s.activo ? 'bg-white/[0.03] border-white/10' : 'bg-white/[0.01] border-white/5 opacity-60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{s.nombre}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{s.clienteNombre}</p>
                    {s.ciudad && <p className="text-[10px] text-slate-500">Ciudad: {s.ciudad}</p>}
                  </div>
                  {s.activo ? (
                    <button onClick={() => desactivar(s.id)} className={`${btnCls} bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/20`}>
                      Desactivar
                    </button>
                  ) : (
                    <button onClick={() => reactivar(s)} className={`${btnCls} bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20`}>
                      Activar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
