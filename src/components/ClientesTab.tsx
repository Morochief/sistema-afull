import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Building2, Search, Link2, ExternalLink, Edit2, Trash2, X, Check } from 'lucide-react';
import { DatabaseState, Cliente } from '../types.ts';
import { useNotif } from '../context/NotifContext.tsx';
import { useSortAndPaginate, getSortIcon, sortableHeaderClass } from '../lib/tableUtils.ts';
import Pagination from './Pagination.tsx';

export interface ClientesTabProps {
  data: DatabaseState;
  newClientName: string;
  setNewClientName: (name: string) => void;
  newClientCode: string;
  setNewClientCode: (code: string) => void;
  onCreateClient: (e: React.FormEvent) => void;
  onEditCliente: (id: string, data: Partial<Cliente>) => Promise<void>;
  onDeleteCliente: (id: string) => Promise<void>;
}

export default function ClientesTab({
  data,
  newClientName,
  setNewClientName,
  newClientCode,
  setNewClientCode,
  onCreateClient,
  onEditCliente,
  onDeleteCliente,
}: ClientesTabProps) {
  const { requestConfirm, showToast } = useNotif();
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editCodigo, setEditCodigo] = useState('');
  const [searchText, setSearchText] = useState('');

  const filteredClientes = useMemo(() => {
    if (!searchText) return data.clientes;
    const q = searchText.toLowerCase();
    return data.clientes.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      (c.codigo || '').toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    );
  }, [data.clientes, searchText]);

  type ClienteSortField = 'nombre' | 'codigo' | 'id';
  const table = useSortAndPaginate<Cliente, ClienteSortField>(filteredClientes, {
    defaultSortField: 'nombre',
    defaultSortOrder: 'asc',
    defaultItemsPerPage: 15,
    resetDeps: [searchText],
  });

  const startEdit = (c: Cliente) => {
    setEditingCliente(c);
    setEditNombre(c.nombre);
    setEditCodigo(c.codigo || '');
  };

  const submitEdit = async () => {
    if (!editingCliente || !editNombre.trim()) return;
    await onEditCliente(editingCliente.id, { nombre: editNombre.trim(), codigo: editCodigo.trim() });
    setEditingCliente(null);
  };

  const portalLink = (c: Cliente) => c.tokenPortal ? `${window.location.origin}/portal/${c.tokenPortal}` : null;

  const copiarPortalLink = async (c: Cliente) => {
    const link = portalLink(c);
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      showToast('Enlace de portal copiado al portapapeles', 'success');
    } catch {
      window.prompt('Link del portal del cliente:', link);
    }
  };

  const handleSubmitNuevo = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateClient(e);
    setModalNuevoOpen(false);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Barra de herramientas superior */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-md border border-white/10 bg-[#111318]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por razón social, código o ID..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full bg-[#090a0f] border border-white/10 rounded-md pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            {filteredClientes.length} {filteredClientes.length === 1 ? 'cliente' : 'clientes'}
          </span>
          <button
            onClick={() => setModalNuevoOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold cursor-pointer transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* Tabla de alta densidad */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111318]/80 backdrop-blur-sm shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[850px] border-collapse">
            <thead className="bg-[#090a0f] text-slate-400 uppercase font-mono text-[11px] border-b border-white/10">
              <tr>
                <th
                  onClick={() => table.handleSort('nombre')}
                  className={`px-4 py-3.5 ${sortableHeaderClass('nombre', table.sortField)}`}
                >
                  <div className="flex items-center gap-1">
                    <span>Razón Social</span>
                    <span>{getSortIcon('nombre', table.sortField, table.sortOrder)}</span>
                  </div>
                </th>
                <th
                  onClick={() => table.handleSort('codigo')}
                  className={`px-4 py-3.5 whitespace-nowrap ${sortableHeaderClass('codigo', table.sortField)}`}
                >
                  <div className="flex items-center gap-1">
                    <span>Código</span>
                    <span>{getSortIcon('codigo', table.sortField, table.sortOrder)}</span>
                  </div>
                </th>
                <th
                  onClick={() => table.handleSort('id')}
                  className={`px-4 py-3.5 font-mono whitespace-nowrap ${sortableHeaderClass('id', table.sortField)}`}
                >
                  <div className="flex items-center gap-1">
                    <span>ID Sistema</span>
                    <span>{getSortIcon('id', table.sortField, table.sortOrder)}</span>
                  </div>
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">Portal Clientes</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {table.paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 font-mono text-xs">
                    No se encontraron clientes que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                table.paginatedData.map(c => (
                  <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-slate-200 align-middle">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-orange-400 shrink-0" />
                        <span className="truncate max-w-[280px]">{c.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-300 align-middle whitespace-nowrap">
                      {c.codigo ? (
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 font-medium">
                          {c.codigo}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-400 text-[11px] align-middle whitespace-nowrap">
                      {c.id}
                    </td>
                    <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                      {c.tokenPortal ? (
                        <div className="inline-flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium">
                            Portal Activo
                          </span>
                          <button
                            onClick={() => copiarPortalLink(c)}
                            className="p-1 rounded border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Copiar link del portal del cliente"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-600 font-mono">Sin activar</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right align-middle whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => startEdit(c)}
                          className="px-2.5 py-1 rounded border border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                          title="Editar cliente y portal"
                        >
                          <Edit2 className="w-3 h-3" />
                          Editar
                        </button>
                        <button
                          onClick={() =>
                            requestConfirm(
                              '¿Eliminar cliente?',
                              `Se eliminarán todos los proyectos y registros asociados a "${c.nombre}".`,
                              'danger',
                              () => onDeleteCliente(c.id),
                              'Eliminar'
                            )
                          }
                          className="px-2 py-1 rounded border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs transition cursor-pointer"
                          title="Eliminar cliente"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {filteredClientes.length > 0 && (
          <div className="border-t border-white/10 px-4 py-3">
            <Pagination
              currentPage={table.currentPage}
              totalPages={table.totalPages}
              itemsPerPage={table.itemsPerPage}
              totalItems={filteredClientes.length}
              pageNumbers={table.pageNumbers}
              onPageChange={table.setCurrentPage}
              onItemsPerPageChange={table.setItemsPerPage}
            />
          </div>
        )}
      </div>

      {/* Modal: Nuevo Cliente */}
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
                  <Building2 className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-bold text-white">Registrar Nuevo Cliente</h3>
                </div>
                <button
                  onClick={() => setModalNuevoOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-sm hover:bg-white/10 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitNuevo} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-mono">Razón Social / Nombre *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Unilever Paraguay S.A."
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full bg-[#090a0f] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-mono">Código Identificador (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej: UNIL"
                    value={newClientCode}
                    onChange={(e) => setNewClientCode(e.target.value)}
                    className="w-full bg-[#090a0f] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60 font-mono"
                  />
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
                    Crear Cliente
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Editar Cliente & Portal */}
      <AnimatePresence>
        {editingCliente && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-md border border-orange-500/30 bg-[#111318] p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-bold text-white">Editar Cliente</h3>
                </div>
                <button
                  onClick={() => setEditingCliente(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-sm hover:bg-white/10 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-mono">Razón Social *</label>
                  <input
                    value={editNombre}
                    onChange={e => setEditNombre(e.target.value)}
                    placeholder="Nombre o Razón Social"
                    className="w-full bg-[#090a0f] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-mono">Código</label>
                  <input
                    value={editCodigo}
                    onChange={e => setEditCodigo(e.target.value)}
                    placeholder="Código Identificador"
                    className="w-full bg-[#090a0f] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60 font-mono"
                  />
                </div>

                {/* Sección de Portal de Pedidos */}
                <div className="rounded-md border border-white/10 bg-white/[0.02] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-bold">
                      <Link2 className="w-3.5 h-3.5 text-orange-400" /> Portal de Autoservicio
                    </p>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border ${
                      editingCliente.tokenPortal 
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
                        : 'bg-white/5 border-white/10 text-slate-500'
                    }`}>
                      {editingCliente.tokenPortal ? 'Habilitado' : 'Desactivado'}
                    </span>
                  </div>

                  {editingCliente.tokenPortal ? (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-400 font-mono break-all bg-[#090a0f] p-2 rounded-sm border border-white/5">
                        {portalLink(editingCliente)}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => copiarPortalLink(editingCliente)}
                          className="px-2.5 py-1.5 bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 rounded-sm border border-orange-500/30 text-xs transition flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Copiar Enlace
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await onEditCliente(editingCliente.id, { nombre: editNombre.trim() || editingCliente.nombre, revocarPortal: true });
                            setEditingCliente(null);
                          }}
                          className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-sm border border-rose-500/20 text-xs transition"
                        >
                          Revocar Acceso
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        await onEditCliente(editingCliente.id, { nombre: editNombre.trim() || editingCliente.nombre, activarPortal: true });
                        setEditingCliente(null);
                      }}
                      className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded-sm border border-emerald-500/30 text-xs transition flex items-center gap-1.5 font-medium"
                    >
                      <Check className="w-3.5 h-3.5" /> Generar Portal de Pedidos
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingCliente(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/5 rounded-md transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submitEdit}
                  className="px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-md transition"
                >
                  Guardar Cambios
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
