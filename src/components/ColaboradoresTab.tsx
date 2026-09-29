/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Users, Search, Edit2, Trash2, Shield, Key, X } from 'lucide-react';
import { DatabaseState, Colaborador } from '../types.ts';
import { useNotif } from '../context/NotifContext.tsx';
import { AdminSection, DataCard } from './AdminShared.tsx';
import { useSortAndPaginate, getSortIcon, sortableHeaderClass } from '../lib/tableUtils.ts';
import Pagination from './Pagination';

export interface ColaboradoresTabProps {
  data: DatabaseState;
  onAddColaborador: (data: any) => Promise<void>;
  onEditColaborador: (id: string, data: any) => Promise<void>;
  onDeleteColaborador: (id: string) => Promise<void>;
}

export default function ColaboradoresTab({
  data,
  onAddColaborador,
  onEditColaborador,
  onDeleteColaborador,
}: ColaboradoresTabProps) {
  const { requestConfirm, showToast } = useNotif();
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  
  // Creation local states
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('Operario');
  const [tarifaSugerida, setTarifaSugerida] = useState('350');
  const [ci, setCi] = useState('');
  const [cargo, setCargo] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [jefeInmediato, setJefeInmediato] = useState('');
  const [crearAcceso, setCrearAcceso] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rolAcceso, setRolAcceso] = useState<'Admin' | 'Operario' | 'Visor'>('Operario');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editing local states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingColab, setEditingColab] = useState<Colaborador | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editRol, setEditRol] = useState('');
  const [editCi, setEditCi] = useState('');
  const [editCargo, setEditCargo] = useState('');
  const [editDepartamento, setEditDepartamento] = useState('');
  const [editJefeInmediato, setEditJefeInmediato] = useState('');
  const [editTarifa, setEditTarifa] = useState('');
  const [editHasAcceso, setEditHasAcceso] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRolAcceso, setEditRolAcceso] = useState<'Admin' | 'Operario' | 'Visor'>('Operario');
  const [editEmail, setEditEmail] = useState('');
  const [editActivoAcceso, setEditActivoAcceso] = useState(true);
  const [searchText, setSearchText] = useState('');

  const filteredColaboradores = useMemo(() => {
    if (!searchText) return data.colaboradores;
    const q = searchText.toLowerCase();
    return data.colaboradores.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      (c.rol || '').toLowerCase().includes(q) ||
      (c.usuario?.username || '').toLowerCase().includes(q)
    );
  }, [data.colaboradores, searchText]);

  type ColaboradorSortField = 'nombre' | 'rol' | 'tarifaSugerida';
  const table = useSortAndPaginate<Colaborador, ColaboradorSortField>(filteredColaboradores, {
    defaultSortField: 'nombre',
    defaultSortOrder: 'asc',
    defaultItemsPerPage: 10,
    resetDeps: [searchText],
  });
  const paginatedColaboradores = table.paginatedData;

  const startEdit = (c: Colaborador) => { 
    setEditingId(c.id); 
    setEditingColab(c);
    setEditNombre(c.nombre); 
    setEditRol(c.rol || ''); 
    setEditCi(c.ci || ''); 
    setEditCargo(c.cargo || ''); 
    setEditDepartamento(c.departamento || ''); 
    setEditJefeInmediato(c.jefeInmediato || ''); 
    setEditTarifa(String(c.tarifaSugerida || 350)); 
    if (c.usuario) {
      setEditHasAcceso(true);
      setEditUsername(c.usuario.username);
      setEditRolAcceso(c.usuario.rol);
      setEditEmail(c.usuario.email || '');
      setEditActivoAcceso(c.usuario.activo);
    } else {
      setEditHasAcceso(false);
      setEditUsername('');
      setEditRolAcceso('Operario');
      setEditEmail('');
      setEditActivoAcceso(true);
    }
    setEditPassword('');
  };
  
  const cancelEdit = () => {
    setEditingId(null);
    setEditingColab(null);
  };
  
  const submitEdit = async () => {
    if (!editNombre.trim()) return;
    setIsSubmitting(true);
    try {
      const payload: any = {
        nombre: editNombre.trim(),
        rol: editRol.trim(),
        tarifaSugerida: parseFloat(editTarifa) || 350,
        ci: editCi.trim() || null,
        cargo: editCargo.trim() || null,
        departamento: editDepartamento.trim() || null,
        jefeInmediato: editJefeInmediato.trim() || null,
        hasAcceso: editHasAcceso,
        username: editUsername.trim(),
        rolAcceso: editRolAcceso,
        email: editEmail.trim() || null,
        activoAcceso: editActivoAcceso
      };
      if (editPassword) {
        payload.password = editPassword;
      }
      await onEditColaborador(editingId!, payload);
      setEditingId(null);
      setEditingColab(null);
      showToast('Colaborador actualizado correctamente', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setIsSubmitting(true);
    try {
      const payload: any = {
        nombre: nombre.trim(),
        rol: rol.trim(),
        tarifaSugerida: parseFloat(tarifaSugerida) || 350,
        ci: ci.trim() || null,
        cargo: cargo.trim() || null,
        departamento: departamento.trim() || null,
        jefeInmediato: jefeInmediato.trim() || null,
        crearAcceso,
        username: username.trim(),
        password,
        rolAcceso,
        email: email.trim() || null
      };
      await onAddColaborador(payload);
      // Reset creation state
      setNombre('');
      setRol('Operario');
      setTarifaSugerida('350');
      setCi('');
      setCargo('');
      setDepartamento('');
      setJefeInmediato('');
      setCrearAcceso(false);
      setUsername('');
      setPassword('');
      setRolAcceso('Operario');
      setEmail('');
      setModalNuevoOpen(false);
      showToast('Colaborador registrado con éxito', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al registrar', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Barra de herramientas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-md border border-white/10 bg-[#111318]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, C.I., cargo o usuario..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full bg-[#090a0f] border border-white/10 rounded-md pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50"
          />
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <span className="text-xs text-slate-400 font-mono">
            {filteredColaboradores.length} {filteredColaboradores.length === 1 ? 'colaborador' : 'colaboradores'}
          </span>
          <button
            onClick={() => setModalNuevoOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold cursor-pointer transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Colaborador</span>
          </button>
        </div>
      </div>

      {/* Tabla de Colaboradores Enterprise */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111318]/80 backdrop-blur-sm shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[950px] border-collapse">
            <thead className="bg-[#090a0f] text-slate-400 uppercase font-mono text-[11px] border-b border-white/10">
              <tr>
                <th
                  onClick={() => table.handleSort('nombre')}
                  className={`px-4 py-3.5 ${sortableHeaderClass('nombre', table.sortField)}`}
                >
                  <div className="flex items-center gap-1">
                    <span>Nombre Completo</span>
                    <span>{getSortIcon('nombre', table.sortField, table.sortOrder)}</span>
                  </div>
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">C.I.</th>
                <th
                  onClick={() => table.handleSort('rol')}
                  className={`px-4 py-3.5 whitespace-nowrap ${sortableHeaderClass('rol', table.sortField)}`}
                >
                  <div className="flex items-center gap-1">
                    <span>Especialidad / Cargo</span>
                    <span>{getSortIcon('rol', table.sortField, table.sortOrder)}</span>
                  </div>
                </th>
                <th
                  onClick={() => table.handleSort('tarifaSugerida')}
                  className={`px-4 py-3.5 text-right whitespace-nowrap ${sortableHeaderClass('tarifaSugerida', table.sortField)}`}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Tarifa/min</span>
                    <span>{getSortIcon('tarifaSugerida', table.sortField, table.sortOrder)}</span>
                  </div>
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">Acceso al Sistema</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {table.paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-mono text-xs">
                    No se encontraron colaboradores registrados.
                  </td>
                </tr>
              ) : (
                table.paginatedData.map(c => (
                  <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-slate-200 align-middle">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-orange-400 shrink-0" />
                        <span className="truncate max-w-[240px]">{c.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-300 align-middle whitespace-nowrap">
                      {c.ci || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-slate-300 align-middle whitespace-nowrap">
                      <div className="space-y-0.5">
                        <p className="font-medium text-white">{c.rol || 'Operario'}</p>
                        {c.cargo && <p className="text-[10px] text-slate-400 font-mono">{c.cargo}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-orange-400 font-bold align-middle whitespace-nowrap">
                      Gs. {Number(c.tarifaSugerida || 350).toLocaleString('es-PY')}
                    </td>
                    <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                      {c.usuario ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-mono font-semibold ${
                            c.usuario.activo 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {c.usuario.username} ({c.usuario.rol})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-[10px] font-mono">Sin cuenta</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right align-middle whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => startEdit(c)}
                          className="px-2.5 py-1 rounded border border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                          title="Editar colaborador y credenciales"
                        >
                          <Edit2 className="w-3 h-3" />
                          Editar
                        </button>
                        <button
                          onClick={() =>
                            requestConfirm(
                              '¿Eliminar colaborador?',
                              `Se eliminará el perfil de "${c.nombre}".`,
                              'danger',
                              () => onDeleteColaborador(c.id),
                              'Eliminar'
                            )
                          }
                          className="px-2 py-1 rounded border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs transition cursor-pointer"
                          title="Eliminar colaborador"
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
        {filteredColaboradores.length > 0 && (
          <div className="border-t border-white/10 px-4 py-3">
            <Pagination
              currentPage={table.currentPage}
              totalPages={table.totalPages}
              itemsPerPage={table.itemsPerPage}
              totalItems={filteredColaboradores.length}
              pageNumbers={table.pageNumbers}
              onPageChange={table.setCurrentPage}
              onItemsPerPageChange={table.setItemsPerPage}
            />
          </div>
        )}
      </div>

      {/* Modal: Nuevo Colaborador */}
      <AnimatePresence>
        {modalNuevoOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-md border border-orange-500/30 bg-[#111318] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-bold text-white">Registrar Nuevo Colaborador</h3>
                </div>
                <button
                  onClick={() => setModalNuevoOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-sm hover:bg-white/10 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                {/* Datos Principales */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-mono">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Marcelo Spósito"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full bg-[#090a0f] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-mono">Especialidad / Rol</label>
                    <input
                      type="text"
                      placeholder="Ej: Montador de Estructuras"
                      value={rol}
                      onChange={(e) => setRol(e.target.value)}
                      className="w-full bg-[#090a0f] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-mono">Tarifa por Minuto (Gs.) *</label>
                    <input
                      type="number"
                      required
                      value={tarifaSugerida}
                      onChange={(e) => setTarifaSugerida(e.target.value)}
                      className="w-full bg-[#090a0f] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60 font-mono"
                    />
                  </div>
                </div>

                {/* Datos RR.HH. */}
                <div className="p-3.5 rounded-md bg-white/[0.02] border border-white/10 space-y-3">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-orange-400" /> Datos de Legajo (RR.HH.)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-mono">C.I. Nro.</label>
                      <input
                        type="text"
                        placeholder="Ej: 4888986"
                        value={ci}
                        onChange={(e) => setCi(e.target.value)}
                        className="w-full bg-[#090a0f] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/60 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-mono">Cargo</label>
                      <input
                        type="text"
                        placeholder="Ej: Operario"
                        value={cargo}
                        onChange={(e) => setCargo(e.target.value)}
                        className="w-full bg-[#090a0f] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/60"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-mono">Departamento</label>
                      <input
                        type="text"
                        placeholder="Ej: Producción"
                        value={departamento}
                        onChange={(e) => setDepartamento(e.target.value)}
                        className="w-full bg-[#090a0f] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/60"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-mono">Jefe Inmediato</label>
                      <input
                        type="text"
                        placeholder="Ej: Eduardo"
                        value={jefeInmediato}
                        onChange={(e) => setJefeInmediato(e.target.value)}
                        className="w-full bg-[#090a0f] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/60"
                      />
                    </div>
                  </div>
                </div>

                {/* Credenciales de Acceso */}
                <div className="p-3.5 rounded-md bg-white/[0.02] border border-white/10 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={crearAcceso}
                      onChange={(e) => setCrearAcceso(e.target.checked)}
                      className="rounded-sm border-white/10 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-orange-400" /> Habilitar Usuario de Inicio de Sesión
                    </span>
                  </label>

                  {crearAcceso && (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-white/5">
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 font-mono">Usuario *</label>
                        <input
                          type="text"
                          required={crearAcceso}
                          placeholder="Ej: 4888986"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-[#090a0f] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/60 font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 font-mono">Contraseña *</label>
                        <input
                          type="password"
                          required={crearAcceso}
                          placeholder="Contraseña"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-[#090a0f] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/60"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 font-mono">Rol de Sistema *</label>
                        <select
                          value={rolAcceso}
                          onChange={(e) => setRolAcceso(e.target.value as any)}
                          className="w-full bg-[#090a0f] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/60 cursor-pointer"
                        >
                          <option value="Operario">Operario</option>
                          <option value="Admin">Administrador</option>
                          <option value="Visor">Visor</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 font-mono">Email (Opcional)</label>
                        <input
                          type="email"
                          placeholder="correo@afull.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-[#090a0f] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/60"
                        />
                      </div>
                    </div>
                  )}
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
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-md transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isSubmitting ? 'Guardando...' : 'Guardar Colaborador'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Editar Colaborador */}
      <AnimatePresence>
        {editingColab && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-md border border-orange-500/30 bg-[#111318] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-bold text-white">Editar Perfil de Colaborador</h3>
                </div>
                <button
                  onClick={() => setEditingColab(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-sm hover:bg-white/10 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-mono">Nombre Completo *</label>
                    <input
                      value={editNombre}
                      onChange={e => setEditNombre(e.target.value)}
                      placeholder="Nombre"
                      className="w-full bg-[#090a0f] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-mono">Rol de Trabajo</label>
                    <input
                      value={editRol}
                      onChange={e => setEditRol(e.target.value)}
                      placeholder="Rol"
                      className="w-full bg-[#090a0f] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-mono">Tarifa por Minuto (Gs.)</label>
                    <input
                      type="number"
                      value={editTarifa}
                      onChange={e => setEditTarifa(e.target.value)}
                      placeholder="Tarifa"
                      className="w-full bg-[#090a0f] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60 font-mono"
                    />
                  </div>
                </div>

                {/* Datos RR.HH. */}
                <div className="p-3.5 rounded-md bg-white/[0.02] border border-white/10 space-y-3">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-orange-400" /> Datos de Legajo
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-mono">C.I.</label>
                      <input
                        value={editCi}
                        onChange={e => setEditCi(e.target.value)}
                        placeholder="C.I."
                        className="w-full bg-[#090a0f] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/60 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-mono">Cargo</label>
                      <input
                        value={editCargo}
                        onChange={e => setEditCargo(e.target.value)}
                        placeholder="Cargo"
                        className="w-full bg-[#090a0f] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/60"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-mono">Departamento</label>
                      <input
                        value={editDepartamento}
                        onChange={e => setEditDepartamento(e.target.value)}
                        placeholder="Departamento"
                        className="w-full bg-[#090a0f] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/60"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-mono">Jefe Inmediato</label>
                      <input
                        value={editJefeInmediato}
                        onChange={e => setEditJefeInmediato(e.target.value)}
                        placeholder="Jefe"
                        className="w-full bg-[#090a0f] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/60"
                      />
                    </div>
                  </div>
                </div>

                {/* Credenciales */}
                <div className="p-3.5 rounded-md bg-white/[0.02] border border-white/10 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editHasAcceso}
                      onChange={(e) => setEditHasAcceso(e.target.checked)}
                      className="rounded-sm border-white/10 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-orange-400" /> Habilitar Login al Sistema
                    </span>
                  </label>

                  {editHasAcceso && (
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-mono">Usuario *</label>
                          <input
                            value={editUsername}
                            onChange={e => setEditUsername(e.target.value)}
                            placeholder="Usuario"
                            className="w-full bg-[#090a0f] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/60 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-mono">Nueva Contraseña</label>
                          <input
                            type="password"
                            value={editPassword}
                            onChange={e => setEditPassword(e.target.value)}
                            placeholder="En blanco = mantener"
                            className="w-full bg-[#090a0f] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/60"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-mono">Rol de Sistema</label>
                          <select
                            value={editRolAcceso}
                            onChange={(e) => setEditRolAcceso(e.target.value as any)}
                            className="w-full bg-[#090a0f] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/60 cursor-pointer"
                          >
                            <option value="Operario">Operario</option>
                            <option value="Admin">Administrador</option>
                            <option value="Visor">Visor</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-mono">Email</label>
                          <input
                            value={editEmail}
                            onChange={e => setEditEmail(e.target.value)}
                            placeholder="Email"
                            className="w-full bg-[#090a0f] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/60"
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                        <input
                          type="checkbox"
                          checked={editActivoAcceso}
                          onChange={(e) => setEditActivoAcceso(e.target.checked)}
                          className="rounded-sm border-white/10 text-orange-600 focus:ring-orange-500 cursor-pointer"
                        />
                        <span className="text-xs text-slate-300">Cuenta de Acceso Activa</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingColab(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/5 rounded-md transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submitEdit}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-md transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* System Users without Collaborator (e.g. Administrative) */}
      {data.usuariosSinColaborador && data.usuariosSinColaborador.length > 0 && (
        <AdminSection
          title="Usuarios de Sistema (Administración)"
          icon={<Shield className="w-5 h-5 text-orange-400" />}
          description="Usuarios que tienen acceso administrativo al sistema sin ser colaboradores en campo"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {data.usuariosSinColaborador.map(u => (
              <DataCard
                key={u.id}
                title={u.nombre}
                subtitle={`@${u.username}`}
                badge={{ label: u.rol, color: u.rol === 'Admin' ? 'rose' : u.rol === 'Visor' ? 'amber' : 'blue' }}
                icon={<Shield className="w-4 h-4" />}
              >
                <div className="text-[10px] text-slate-400 font-mono mt-2">
                  Email: {u.email || 'No asignado'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Estado: {u.activo ? 'Activo' : 'Suspendido'}
                </div>
              </DataCard>
            ))}
          </div>
        </AdminSection>
      )}
    </motion.div>
  );
}
