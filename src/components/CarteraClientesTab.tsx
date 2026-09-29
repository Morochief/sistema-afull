import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ChevronDown, ChevronRight, Tag, Users, Edit2, Trash2, Save, X } from 'lucide-react';
import { authFetchJSON } from '../authFetch.ts';
import { useNotif } from '../context/NotifContext.tsx';
import { CarteraCliente, CarteraContacto, CarteraMarca } from '../types.ts';
import { useSortAndPaginate } from '../lib/tableUtils.ts';
import Pagination from './Pagination.tsx';

// ============================================================================
// HELPERS
// ============================================================================

const inputCls = 'w-full bg-[#090a0f] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60';
const btnCls = 'text-[10px] px-2 py-1 rounded-sm border transition-all cursor-pointer';
const smallInputCls = 'w-full rounded-sm border border-white/10 bg-[#090a0f] px-2.5 py-1.5 text-xs text-white outline-none focus:border-orange-500/60';

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

// ============================================================================
// EDITABLE INLINE ROW (contacto / marca)
// ============================================================================

interface EditableRowProps {
  nombre: string;
  detalle?: string | null;
  email?: string | null;
  onSave: (data: { nombre: string; cargo?: string; telefono?: string; email?: string }) => Promise<void>;
  onDelete: () => void;
}

function EditableRow({ nombre, detalle, email, onSave, onDelete }: EditableRowProps) {
  const { requestConfirm } = useNotif();
  const [editing, setEditing] = useState(false);
  const [editNombre, setEditNombre] = useState(nombre);
  const [editDetalle, setEditDetalle] = useState(detalle || '');
  const [editEmail, setEditEmail] = useState(email || '');
  const [guardando, setGuardando] = useState(false);

  const save = async () => {
    if (!editNombre.trim()) return;
    setGuardando(true);
    try {
      await onSave({
        nombre: editNombre.trim(),
        cargo: editDetalle.trim() || undefined,
        email: editEmail.trim() || undefined,
      });
      setEditing(false);
    } finally {
      setGuardando(false);
    }
  };

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2">
        <input className={`${smallInputCls} flex-1 min-w-[8rem]`} value={editNombre} onChange={(e) => setEditNombre(e.target.value)} placeholder="Nombre" />
        <input className={`${smallInputCls} flex-1 min-w-[8rem]`} value={editDetalle} onChange={(e) => setEditDetalle(e.target.value)} placeholder="Cargo / detalle" />
        <input className={`${smallInputCls} flex-1 min-w-[10rem]`} value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Correo" />
        <div className="flex gap-1.5">
          <button onClick={save} disabled={guardando} className={`${btnCls} bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20`}>
            <Save className="w-3 h-3" />
          </button>
          <button onClick={() => setEditing(false)} className={`${btnCls} bg-white/5 hover:bg-white/10 text-slate-300 border-white/10`}>
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-200">{nombre}</p>
        {(detalle || email) && (
          <p className="truncate text-[10px] text-slate-500">
            {detalle}
            {detalle && email ? ' · ' : ''}
            {email}
          </p>
        )}
      </div>
      <div className="flex gap-1.5">
        <button onClick={() => setEditing(true)} className={`${btnCls} bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border-orange-500/20`}>
          <Edit2 className="w-3 h-3" />
        </button>
        <button
          onClick={() => requestConfirm('¿Eliminar?', `¿Eliminar "${nombre}"?`, 'danger', onDelete, 'Eliminar')}
          className={`${btnCls} bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/20`}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// CLIENTE CARD (expandible: marcas + contactos)
// ============================================================================

interface ClienteCardProps {
  cliente: CarteraCliente;
  onRefresh: () => Promise<void>;
}

function ClienteCard({ cliente, onRefresh }: ClienteCardProps) {
  const { showToast } = useNotif();
  const [expandido, setExpandido] = useState(false);
  const [cargandoHijos, setCargandoHijos] = useState(false);
  const [marcas, setMarcas] = useState<CarteraMarca[]>([]);
  const [contactos, setContactos] = useState<CarteraContacto[]>([]);
  const [errorHijos, setErrorHijos] = useState<string | null>(null);

  // Nueva marca
  const [nuevaMarca, setNuevaMarca] = useState('');

  // Nuevo contacto
  const [nuevoContacto, setNuevoContacto] = useState({ nombre: '', cargo: '', email: '' });

  const cargarHijos = useCallback(async () => {
    setCargandoHijos(true);
    setErrorHijos(null);
    try {
      const [marcasJson, contactosJson] = await Promise.all([
        authFetchJSON<{ success: boolean; data: CarteraMarca[] }>(`/api/admin/cartera/${cliente.id}/marcas`),
        authFetchJSON<{ success: boolean; data: CarteraContacto[] }>(`/api/admin/cartera/${cliente.id}/contactos`),
      ]);
      setMarcas(marcasJson.data || []);
      setContactos(contactosJson.data || []);
    } catch (e: any) {
      setErrorHijos(e.message || 'Error al cargar marcas y contactos');
    } finally {
      setCargandoHijos(false);
    }
  }, [cliente.id]);

  useEffect(() => {
    if (expandido) cargarHijos();
  }, [expandido, cargarHijos]);

  const agregarMarca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaMarca.trim()) return;
    try {
      await authFetchJSON(`/api/admin/cartera/${cliente.id}/marcas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevaMarca.trim() }),
      });
      setNuevaMarca('');
      showToast('Marca agregada', 'success');
      await cargarHijos();
      await onRefresh();
    } catch (e: any) {
      showToast(e.message || 'Error al agregar marca', 'error');
    }
  };

  const actualizarMarca = async (id: string, data: { nombre: string }) => {
    try {
      await authFetchJSON(`/api/admin/cartera/marcas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      showToast('Marca actualizada', 'success');
      await cargarHijos();
    } catch (e: any) {
      showToast(e.message || 'Error al actualizar marca', 'error');
    }
  };

  const eliminarMarca = async (id: string) => {
    try {
      await authFetchJSON(`/api/admin/cartera/marcas/${id}`, { method: 'DELETE' });
      showToast('Marca eliminada', 'success');
      await cargarHijos();
      await onRefresh();
    } catch (e: any) {
      showToast(e.message || 'Error al eliminar marca', 'error');
    }
  };

  const agregarContacto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoContacto.nombre.trim()) return;
    try {
      await authFetchJSON(`/api/admin/cartera/${cliente.id}/contactos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nuevoContacto.nombre.trim(),
          cargo: nuevoContacto.cargo.trim() || undefined,
          email: nuevoContacto.email.trim() || undefined,
        }),
      });
      setNuevoContacto({ nombre: '', cargo: '', email: '' });
      showToast('Contacto agregado', 'success');
      await cargarHijos();
      await onRefresh();
    } catch (e: any) {
      showToast(e.message || 'Error al agregar contacto', 'error');
    }
  };

  const actualizarContacto = async (id: string, data: { nombre: string; cargo?: string; email?: string }) => {
    try {
      await authFetchJSON(`/api/admin/cartera/contactos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      showToast('Contacto actualizado', 'success');
      await cargarHijos();
    } catch (e: any) {
      showToast(e.message || 'Error al actualizar contacto', 'error');
    }
  };

  const eliminarContacto = async (id: string) => {
    try {
      await authFetchJSON(`/api/admin/cartera/contactos/${id}`, { method: 'DELETE' });
      showToast('Contacto eliminado', 'success');
      await cargarHijos();
      await onRefresh();
    } catch (e: any) {
      showToast(e.message || 'Error al eliminar contacto', 'error');
    }
  };

  return (
    <div className={`rounded-md border p-4 transition-all ${cliente.activo ? 'bg-[#111318] border-white/10' : 'bg-[#111318]/40 border-white/5 opacity-60'}`}>
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={() => setExpandido(!expandido)}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <span className="mt-0.5 shrink-0 text-slate-500">
            {expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-100">{cliente.nombre}</span>
              {cliente.ruc && (
                <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                  RUC {cliente.ruc}
                </span>
              )}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
              <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{cliente._count?.contactos ?? 0} contactos</span>
              <span className="inline-flex items-center gap-1"><Tag className="w-3 h-3" />{cliente._count?.marcas ?? 0} marcas</span>
            </span>
          </span>
        </button>
        {!cliente.activo && (
          <span className="shrink-0 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">Inactivo</span>
        )}
      </div>

      <AnimatePresence initial={false}>
        {expandido && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4 border-t border-white/5 pt-4">
              {errorHijos && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{errorHijos}</div>
              )}

              {/* Marcas */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <Tag className="w-3.5 h-3.5" /> Marcas
                </p>
                {cargandoHijos ? (
                  <p className="text-xs text-slate-500">Cargando...</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {marcas.map((m) => (
                      <EditableRow
                        key={m.id}
                        nombre={m.nombre}
                        onSave={(data) => actualizarMarca(m.id, { nombre: data.nombre })}
                        onDelete={() => eliminarMarca(m.id)}
                      />
                    ))}
                  </div>
                )}
                <form onSubmit={agregarMarca} className="mt-2 flex gap-2">
                  <input
                    className={`${smallInputCls} max-w-[14rem]`}
                    placeholder="Nueva marca..."
                    value={nuevaMarca}
                    onChange={(e) => setNuevaMarca(e.target.value)}
                  />
                  <button type="submit" className={`${btnCls} bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20`}>
                    <Plus className="w-3 h-3" /> Agregar
                  </button>
                </form>
              </div>

              {/* Contactos */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <Users className="w-3.5 h-3.5" /> Contactos
                </p>
                {cargandoHijos ? (
                  <p className="text-xs text-slate-500">Cargando...</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {contactos.map((c) => (
                      <EditableRow
                        key={c.id}
                        nombre={c.nombre}
                        detalle={c.cargo}
                        email={c.email}
                        onSave={(data) => actualizarContacto(c.id, data)}
                        onDelete={() => eliminarContacto(c.id)}
                      />
                    ))}
                  </div>
                )}
                <form onSubmit={agregarContacto} className="mt-2 flex flex-wrap gap-2">
                  <input
                    className={`${smallInputCls} flex-1 min-w-[8rem]`}
                    placeholder="Nombre del contacto"
                    value={nuevoContacto.nombre}
                    onChange={(e) => setNuevoContacto({ ...nuevoContacto, nombre: e.target.value })}
                  />
                  <input
                    className={`${smallInputCls} flex-1 min-w-[8rem]`}
                    placeholder="Cargo"
                    value={nuevoContacto.cargo}
                    onChange={(e) => setNuevoContacto({ ...nuevoContacto, cargo: e.target.value })}
                  />
                  <input
                    className={`${smallInputCls} flex-1 min-w-[10rem]`}
                    placeholder="Correo"
                    value={nuevoContacto.email}
                    onChange={(e) => setNuevoContacto({ ...nuevoContacto, email: e.target.value })}
                  />
                  <button type="submit" className={`${btnCls} bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border-orange-500/20`}>
                    <Plus className="w-3 h-3" /> Agregar
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// CARTERA CLIENTES TAB
// ============================================================================

export default function CarteraClientesTab() {
  const { showToast } = useNotif();
  const [clientes, setClientes] = useState<CarteraCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [soloActivos, setSoloActivos] = useState(false);

  type CarteraSortField = 'nombre' | 'fechaCreacion' | 'ruc';
  const table = useSortAndPaginate<CarteraCliente, CarteraSortField>(clientes, {
    defaultSortField: 'nombre',
    defaultSortOrder: 'asc',
    defaultItemsPerPage: 25,
    resetDeps: [search, soloActivos],
  });

  // Formulario de creación
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoRuc, setNuevoRuc] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (soloActivos) params.set('activo', 'true');
      const qs = params.toString();
      const json = await authFetchJSON<{ success: boolean; data: CarteraCliente[] }>(`/api/admin/cartera${qs ? `?${qs}` : ''}`);
      setClientes(json.data || []);
    } catch (e: any) {
      setError(e.message || 'Error al cargar clientes de cartera');
    } finally {
      setLoading(false);
    }
  }, [search, soloActivos]);

  useEffect(() => { load(); }, [load]);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nuevoNombre.trim()) {
      setError('Escribí el nombre del cliente');
      return;
    }
    try {
      await authFetchJSON('/api/admin/cartera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevoNombre.trim(), ruc: nuevoRuc.trim() || undefined }),
      });
      setNuevoNombre('');
      setNuevoRuc('');
      showToast('Cliente de cartera creado', 'success');
      await load();
    } catch (e: any) {
      setError(e.message || 'Error al crear cliente de cartera');
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="rounded-md bg-[#111318] border border-white/10 p-5 space-y-3">
        <p className="text-sm font-semibold text-slate-200">Registrar Nuevo Cliente de Cartera</p>
        <p className="text-xs text-slate-400">
          Base de datos de empresas, marcas y contactos comerciales (independiente de los clientes operativos).
        </p>
        <form onSubmit={crear} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            className={inputCls}
            placeholder="Razón Social (ej: Gloria S.A.C.E.I.)"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
          />
          <input
            className={inputCls}
            placeholder="RUC (ej: 80002010-3)"
            value={nuevoRuc}
            onChange={(e) => setNuevoRuc(e.target.value)}
          />
          <button
            type="submit"
            className="w-full py-2 bg-orange-600 hover:bg-orange-500 font-bold text-xs text-white rounded-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Cliente</span>
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300 font-medium">{error}</div>
      )}

      <div className="rounded-md bg-[#111318] border border-white/10 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-200">Clientes de Cartera ({clientes.length})</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className={`${inputCls} max-w-[16rem]`}
              placeholder="Buscar por nombre o RUC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={soloActivos}
                onChange={(e) => setSoloActivos(e.target.checked)}
                className="accent-teal-500"
              />
              Solo activos
            </label>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Cargando...</p>
        ) : clientes.length === 0 ? (
          <p className="text-sm text-slate-400">No hay clientes de cartera cargados.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {table.paginatedData.map((c) => (
              <ClienteCard key={c.id} cliente={c} onRefresh={load} />
            ))}
          </div>
        )}
        {!loading && clientes.length > 0 && (
          <Pagination
            currentPage={table.currentPage}
            totalPages={table.totalPages}
            itemsPerPage={table.itemsPerPage}
            totalItems={clientes.length}
            pageNumbers={table.pageNumbers}
            onPageChange={table.setCurrentPage}
            onItemsPerPageChange={table.setItemsPerPage}
          />
        )}
      </div>
    </div>
  );
}
