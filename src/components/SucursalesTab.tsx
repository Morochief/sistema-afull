import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, Plus, Search, Filter, Trash2, X, Power, Building2 } from 'lucide-react';
import { authFetchJSON } from '../authFetch.ts';
import { Sucursal } from '../types.ts';
import { useSortAndPaginate, getSortIcon, sortableHeaderClass } from '../lib/tableUtils.ts';
import Pagination from './Pagination.tsx';

interface SucursalesTabProps {
  clientes: { id: string; nombre: string }[];
}

export default function SucursalesTab({ clientes }: SucursalesTabProps) {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [searchText, setSearchText] = useState('');
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [nuevoClienteId, setNuevoClienteId] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filtroCliente ? `?clienteId=${encodeURIComponent(filtroCliente)}` : '';
      const json = await authFetchJSON<{ success: boolean; data: Sucursal[] }>(`/api/admin/sucursales${qs}`);
      setSucursales(json.data || []);
    } catch (e: any) {
      setError(e.message || 'Error al cargar sucursales');
    } finally {
      setLoading(false);
    }
  }, [filtroCliente]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredSucursales = useMemo(() => {
    if (!searchText) return sucursales;
    const q = searchText.toLowerCase();
    return sucursales.filter(s =>
      s.nombre.toLowerCase().includes(q) ||
      (s.clienteNombre || '').toLowerCase().includes(q) ||
      (s.ciudad || '').toLowerCase().includes(q)
    );
  }, [sucursales, searchText]);

  type SucursalSortField = 'nombre' | 'clienteNombre' | 'ciudad' | 'activo';
  const table = useSortAndPaginate<Sucursal, SucursalSortField>(filteredSucursales, {
    defaultSortField: 'nombre',
    defaultSortOrder: 'asc',
    defaultItemsPerPage: 15,
    resetDeps: [filtroCliente, searchText],
  });

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId: nuevoClienteId, nombre: nuevoNombre.trim() }),
      });
      setNuevoNombre('');
      setModalNuevoOpen(false);
      load();
    } catch (e: any) {
      setError(e.message || 'Error al crear sucursal');
    }
  };

  const desactivar = async (id: string) => {
    try {
      await authFetchJSON(`/api/admin/sucursales/${id}`, { method: 'DELETE' });
      load();
    } catch (e: any) {
      setError(e.message || 'Error al desactivar sucursal');
    }
  };

  const reactivar = async (s: Sucursal) => {
    try {
      await authFetchJSON(`/api/admin/sucursales/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: true }),
      });
      load();
    } catch (e: any) {
      setError(e.message || 'Error al reactivar sucursal');
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Barra de herramientas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-md border border-white/10 bg-[#111318]">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por local, cliente o ciudad..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="w-full bg-[#090a0f] border border-white/10 rounded-md pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500 hidden sm:inline" />
            <select
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="bg-[#090a0f] border border-white/10 rounded-md px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500/50 cursor-pointer"
            >
              <option value="">Todos los clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <span className="text-xs text-slate-400 font-mono">
            {filteredSucursales.length} {filteredSucursales.length === 1 ? 'sucursal' : 'sucursales'}
          </span>
          <button
            onClick={() => setModalNuevoOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold cursor-pointer transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Sucursal</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300 font-medium">
          {error}
        </div>
      )}

      {/* Tabla de Sucursales Enterprise */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111318]/80 backdrop-blur-sm shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[850px] border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase font-mono text-[11px]">
                <th
                  onClick={() => table.handleSort('nombre')}
                  className={`px-4 py-3.5 ${sortableHeaderClass('nombre', table.sortField)}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nombre del Local</span>
                    <span>{getSortIcon('nombre', table.sortField, table.sortOrder)}</span>
                  </div>
                </th>
                <th
                  onClick={() => table.handleSort('clienteNombre')}
                  className={`px-4 py-3.5 ${sortableHeaderClass('clienteNombre', table.sortField)}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Razón Social (Cliente)</span>
                    <span>{getSortIcon('clienteNombre', table.sortField, table.sortOrder)}</span>
                  </div>
                </th>
                <th
                  onClick={() => table.handleSort('ciudad')}
                  className={`px-4 py-3.5 ${sortableHeaderClass('ciudad', table.sortField)}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Ciudad / Ubicación</span>
                    <span>{getSortIcon('ciudad', table.sortField, table.sortOrder)}</span>
                  </div>
                </th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-mono">
                    Cargando sucursales...
                  </td>
                </tr>
              ) : table.paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-mono">
                    No se encontraron sucursales registradas.
                  </td>
                </tr>
              ) : (
                table.paginatedData.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-slate-200">
                      <div className="flex items-center gap-2">
                        <Store className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span>{s.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        <span>{s.clienteNombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {s.ciudad || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {s.activo ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-[10px] font-medium">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-white/10 bg-white/5 text-slate-500 text-[10px] font-medium">
                          Desactivado
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {s.activo ? (
                        <button
                          onClick={() => desactivar(s.id)}
                          className="px-2.5 py-1 rounded-md border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs transition"
                          title="Desactivar sucursal para el cliente"
                        >
                          Desactivar
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivar(s)}
                          className="px-2.5 py-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs transition"
                          title="Reactivar sucursal"
                        >
                          Activar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {filteredSucursales.length > 0 && (
          <div className="border-t border-white/10 px-4 py-3">
            <Pagination
              currentPage={table.currentPage}
              totalPages={table.totalPages}
              itemsPerPage={table.itemsPerPage}
              totalItems={filteredSucursales.length}
              pageNumbers={table.pageNumbers}
              onPageChange={table.setCurrentPage}
              onItemsPerPageChange={table.setItemsPerPage}
            />
          </div>
        )}
      </div>

      {/* Modal: Nueva Sucursal */}
      <AnimatePresence>
        {modalNuevoOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-md border border-orange-500/30 bg-[#111318] p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-bold text-white">Registrar Nueva Sucursal / Local</h3>
                </div>
                <button
                  onClick={() => setModalNuevoOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-sm hover:bg-white/10 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={crear} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-mono">Cliente / Razón Social *</label>
                  <select
                    required
                    className="w-full bg-[#090a0f] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60 cursor-pointer"
                    value={nuevoClienteId}
                    onChange={(e) => setNuevoClienteId(e.target.value)}
                  >
                    <option value="">-- Seleccionar Cliente --</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-mono">Nombre del Local / Sucursal *</label>
                  <input
                    required
                    className="w-full bg-[#090a0f] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60"
                    placeholder="Ej: Luque - Superseis"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                  />
                  <p className="text-[11px] text-slate-500">Este nombre aparecerá en el portal de pedidos del cliente.</p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setModalNuevoOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/5 rounded-md transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-md transition flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar Sucursal
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
