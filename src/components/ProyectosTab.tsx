import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FolderGit2, Plus, Search, Edit2, Trash2, X, Check, Filter } from 'lucide-react';
import { DatabaseState, Proyecto } from '../types.ts';
import { useNotif } from '../context/NotifContext.tsx';
import { useSortAndPaginate, getSortIcon, sortableHeaderClass } from '../lib/tableUtils.ts';
import Pagination from './Pagination.tsx';

export interface ProyectosTabProps {
  data: DatabaseState;
  newProjClientId: string;
  setNewProjClientId: (id: string) => void;
  newProjName: string;
  setNewProjName: (name: string) => void;
  onCreateProject: (e: React.FormEvent) => void;
  onEditProyecto: (id: string, data: Partial<Proyecto>) => Promise<void>;
  onDeleteProyecto: (id: string) => Promise<void>;
}

export default function ProyectosTab({
  data,
  newProjClientId,
  setNewProjClientId,
  newProjName,
  setNewProjName,
  onCreateProject,
  onEditProyecto,
  onDeleteProyecto,
}: ProyectosTabProps) {
  const { requestConfirm } = useNotif();
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [editingProyecto, setEditingProyecto] = useState<Proyecto | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editEstado, setEditEstado] = useState<'Pendiente' | 'En Proceso' | 'Completado'>('En Proceso');
  const [editActivo, setEditActivo] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filteredProyectos = useMemo(() => {
    let items = data.proyectos;
    if (searchText) {
      const q = searchText.toLowerCase();
      const clientes = data.clientes;
      items = items.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        clientes.find(c => c.id === p.clienteId)?.nombre.toLowerCase().includes(q)
      );
    }
    if (filterStatus) {
      if (filterStatus === 'Inactivo') {
        items = items.filter(p => p.activo === false);
      } else {
        items = items.filter(p => p.estado === filterStatus && p.activo !== false);
      }
    }
    return items;
  }, [data.proyectos, data.clientes, searchText, filterStatus]);

  type ProyectoSortField = 'nombre' | 'estado' | 'clienteId';
  const table = useSortAndPaginate<Proyecto, ProyectoSortField>(filteredProyectos, {
    defaultSortField: 'nombre',
    defaultSortOrder: 'asc',
    defaultItemsPerPage: 15,
    resetDeps: [searchText, filterStatus],
  });

  const startEdit = (p: Proyecto) => { 
    setEditingProyecto(p); 
    setEditNombre(p.nombre); 
    setEditEstado(p.estado); 
    setEditActivo(p.activo !== false);
  };

  const submitEdit = async () => {
    if (!editingProyecto || !editNombre.trim()) return;
    await onEditProyecto(editingProyecto.id, { nombre: editNombre.trim(), estado: editEstado, activo: editActivo });
    setEditingProyecto(null);
  };

  const handleSubmitNuevo = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateProject(e);
    setModalNuevoOpen(false);
  };

  const getBadgeClass = (estado: string, activo: boolean) => {
    if (!activo) return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
    if (estado === 'En Proceso') return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
    if (estado === 'Completado') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Barra de herramientas superior */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-md border border-white/10 bg-[#111318]">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por proyecto, cliente o ID..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="w-full bg-[#090a0f] border border-white/10 rounded-md pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500 hidden sm:inline" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-[#090a0f] border border-white/10 rounded-md px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500/50 cursor-pointer"
            >
              <option value="">Todos los estados</option>
              <option value="En Proceso">En Proceso</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Completado">Completado</option>
              <option value="Inactivo">Finalizado / Inactivo</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <span className="text-xs text-slate-400 font-mono">
            {filteredProyectos.length} {filteredProyectos.length === 1 ? 'proyecto' : 'proyectos'}
          </span>
          <button
            onClick={() => setModalNuevoOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold cursor-pointer transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Proyecto</span>
          </button>
        </div>
      </div>

      {/* Tabla de Proyectos Enterprise */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111318]/80 backdrop-blur-sm shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[900px] border-collapse">
            <thead className="bg-[#090a0f] text-slate-400 uppercase font-mono text-[11px] border-b border-white/10">
              <tr>
                <th
                  onClick={() => table.handleSort('nombre')}
                  className={`px-4 py-3.5 ${sortableHeaderClass('nombre', table.sortField)}`}
                >
                  <div className="flex items-center gap-1">
                    <span>Proyecto</span>
                    <span>{getSortIcon('nombre', table.sortField, table.sortOrder)}</span>
                  </div>
                </th>
                <th className="px-4 py-3.5 min-w-[200px]">Cliente Mapeado</th>
                <th
                  onClick={() => table.handleSort('estado')}
                  className={`px-4 py-3.5 whitespace-nowrap ${sortableHeaderClass('estado', table.sortField)}`}
                >
                  <div className="flex items-center gap-1">
                    <span>Estado</span>
                    <span>{getSortIcon('estado', table.sortField, table.sortOrder)}</span>
                  </div>
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">Visibilidad</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {table.paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 font-mono text-xs">
                    No se encontraron proyectos registrados.
                  </td>
                </tr>
              ) : (
                table.paginatedData.map(p => {
                  const client = data.clientes.find(c => c.id === p.clienteId);
                  const activo = p.activo !== false;
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-slate-200 align-middle">
                        <div className="flex items-center gap-2">
                          <FolderGit2 className="w-4 h-4 text-orange-400 shrink-0" />
                          <span className="truncate max-w-[280px]">{p.nombre}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300 align-middle min-w-[200px]">
                        {client ? (
                          <div className="font-medium text-white text-xs">{client.nombre}</div>
                        ) : (
                          <span className="text-slate-500 italic">Sin Cliente</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[10px] font-medium ${getBadgeClass(p.estado, activo)}`}>
                          {!activo ? 'Finalizado' : p.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] align-middle whitespace-nowrap">
                        {activo ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                            Activo
                          </span>
                        ) : (
                          <span className="text-slate-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block" />
                            Oculto
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right align-middle whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => startEdit(p)}
                            className="px-2.5 py-1 rounded border border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                            title="Editar proyecto"
                          >
                            <Edit2 className="w-3 h-3" />
                            Editar
                          </button>
                          <button
                            onClick={() =>
                              requestConfirm(
                                '¿Eliminar proyecto?',
                                `Se eliminarán todos los registros asociados a "${p.nombre}".`,
                                'danger',
                                () => onDeleteProyecto(p.id),
                                'Eliminar'
                              )
                            }
                            className="px-2 py-1 rounded border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs transition cursor-pointer"
                            title="Eliminar proyecto"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {filteredProyectos.length > 0 && (
          <div className="border-t border-white/10 px-4 py-3">
            <Pagination
              currentPage={table.currentPage}
              totalPages={table.totalPages}
              itemsPerPage={table.itemsPerPage}
              totalItems={filteredProyectos.length}
              pageNumbers={table.pageNumbers}
              onPageChange={table.setCurrentPage}
              onItemsPerPageChange={table.setItemsPerPage}
            />
          </div>
        )}
      </div>

      {/* Modal: Nuevo Proyecto */}
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
                  <FolderGit2 className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-bold text-white">Registrar Nuevo Proyecto</h3>
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
                  <label className="text-xs text-slate-400 font-mono">Cliente Asociado *</label>
                  <select
                    required
                    value={newProjClientId}
                    onChange={(e) => setNewProjClientId(e.target.value)}
                    className="w-full bg-[#090a0f] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60 cursor-pointer"
                  >
                    <option value="">-- Seleccionar Cliente --</option>
                    {data.clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-mono">Nombre exacto del Proyecto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Mantenimiento Estructura 2026"
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    className="w-full bg-[#090a0f] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60"
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
                    Abrir Proyecto
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Editar Proyecto */}
      <AnimatePresence>
        {editingProyecto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-md border border-orange-500/30 bg-[#111318] p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-bold text-white">Editar Proyecto</h3>
                </div>
                <button
                  onClick={() => setEditingProyecto(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-sm hover:bg-white/10 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-mono">Nombre del Proyecto *</label>
                  <input
                    value={editNombre}
                    onChange={e => setEditNombre(e.target.value)}
                    placeholder="Nombre del proyecto"
                    className="w-full bg-[#090a0f] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-mono">Estado</label>
                  <select
                    value={editEstado}
                    onChange={e => setEditEstado(e.target.value as any)}
                    className="w-full bg-[#090a0f] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60 cursor-pointer"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Proceso">En Proceso</option>
                    <option value="Completado">Completado</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input 
                    type="checkbox" 
                    id="editActivoModal" 
                    checked={editActivo} 
                    onChange={e => setEditActivo(e.target.checked)} 
                    className="rounded-sm border-white/10 text-orange-600 focus:ring-orange-500 cursor-pointer" 
                  />
                  <label htmlFor="editActivoModal" className="text-xs text-slate-300 font-mono cursor-pointer select-none">
                    Proyecto Activo (disponible en selector de registros)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingProyecto(null)}
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
