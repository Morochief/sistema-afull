import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PackageCheck,
  Calculator,
  Search,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  Building2,
  FolderGit2,
  User,
  Calendar,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Check,
  X,
  Database,
  ShieldCheck,
  Tag,
  DollarSign,
  FileText,
} from 'lucide-react';
import { DatabaseState, Cliente, Proyecto, Colaborador } from '../types.ts';
import { useNotif } from '../context/NotifContext.tsx';
import { authFetchJSON } from '../authFetch.ts';
import { calcularLonaYDesperdicio, parseNumeroSeguro } from '../lib/lonaCalculo.ts';
import { PiezaItem, InsumoItemCatalogo } from './CalculadoraAdhesivoModal.tsx';
import { useSortAndPaginate } from '../lib/tableUtils.ts';
import Pagination from './Pagination.tsx';

interface InsumosAdminProps {
  data: DatabaseState;
  onAddRegistro: (registro: any) => Promise<boolean>;
  onRefresh?: () => Promise<void>;
}

export default function InsumosAdmin({ data, onAddRegistro, onRefresh }: InsumosAdminProps) {
  const { showToast, requestConfirm } = useNotif();
  const [activeTab, setActiveTab] = useState<'catalogo' | 'calculadora'>('catalogo');

  // Estado del catálogo
  const [insumos, setInsumos] = useState<InsumoItemCatalogo[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('Todas');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');

  // Estado de modales CRUD
  const [showModalCrear, setShowModalCrear] = useState(false);
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [insumoEditando, setInsumoEditando] = useState<InsumoItemCatalogo | null>(null);

  // Form fields para crear/editar
  const [formNombre, setFormNombre] = useState('');
  const [formCategoria, setFormCategoria] = useState('');
  const [formNuevaCategoria, setFormNuevaCategoria] = useState('');
  const [formProveedor, setFormProveedor] = useState('');
  const [formUnidad, setFormUnidad] = useState('m2');
  const [formCosto, setFormCosto] = useState('');
  const [formCostoDesperdicio, setFormCostoDesperdicio] = useState('');
  const [formEsLona, setFormEsLona] = useState(false);
  const [formEsImpresion, setFormEsImpresion] = useState(false);
  const [formNotas, setFormNotas] = useState('');
  const [guardandoInsumo, setGuardandoInsumo] = useState(false);

  // Estado de la calculadora
  const [unidadMedida, setUnidadMedida] = useState<'cm' | 'm'>('cm');
  const [materialSeleccionado, setMaterialSeleccionado] = useState<string>('Lona x m (impresión) Serimax');
  const [tarifaImpresion, setTarifaImpresion] = useState<string>('63000');
  const [tarifaDesperdicio, setTarifaDesperdicio] = useState<string>('15500');

  // Lona comprada
  const [anchoLona, setAnchoLona] = useState('108');
  const [altoLona, setAltoLona] = useState('169');
  const [cantLonas, setCantLonas] = useState('1');

  // Piezas a imprimir
  const [piezas, setPiezas] = useState<PiezaItem[]>([
    { id: '1', nombre: 'Trabajo / Impresión 1', ancho: '55', alto: '165', cantidad: '1' }
  ]);

  // Imputación a Proyecto (en caso de que Eduardo no lo cargue)
  const [clienteId, setClienteId] = useState('');
  const [proyectoId, setProyectoId] = useState('');
  const [colaboradorId, setColaboradorId] = useState(() => {
    // Buscar a Eduardo Méndez por defecto con comprobación defensiva
    const edu = (data?.colaboradores || []).find(c => {
      if (!c?.nombre) return false;
      const n = c.nombre.toLowerCase();
      return n.includes('eduardo') || n.includes('mendez');
    });
    return edu ? edu.id : '';
  });
  const [fecha, setFecha] = useState(new Date().toISOString().substring(0, 10));
  const [guardandoRegistro, setGuardandoRegistro] = useState(false);

  // Cargar catálogo de insumos desde PostgreSQL mediante authFetchJSON
  const cargarInsumos = async () => {
    setLoading(true);
    try {
      const json = await authFetchJSON<{ success: boolean; data: any }>('/api/insumos?activo=all');
      if (json.success && json.data) {
        setInsumos(json.data.insumos || []);
        setCategorias(json.data.categorias || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Error al consultar catálogo de insumos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarInsumos();
  }, []);

  // Forzar sincronización desde insumos.xlsx hacia PostgreSQL mediante authFetchJSON con CSRF
  const handleSyncExcel = async () => {
    setSyncing(true);
    try {
      const json = await authFetchJSON<{ success: boolean; message?: string; error?: any }>('/api/insumos/sync', {
        method: 'POST'
      });
      if (json.success) {
        showToast(json.message || 'Catálogo sincronizado exitosamente con la base de datos', 'success');
        await cargarInsumos();
      } else {
        showToast(json.error?.message || 'Error al sincronizar', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error de conexión al sincronizar Excel', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Abrir modal de creación
  const handleAbrirCrear = () => {
    setFormNombre('');
    setFormCategoria(categorias[0] || 'Impresiones');
    setFormNuevaCategoria('');
    setFormProveedor('');
    setFormUnidad('m2');
    setFormCosto('');
    setFormCostoDesperdicio('');
    setFormEsLona(false);
    setFormEsImpresion(false);
    setFormNotas('');
    setShowModalCrear(true);
  };

  // Abrir modal de edición
  const handleAbrirEditar = (ins: InsumoItemCatalogo) => {
    setInsumoEditando(ins);
    setFormNombre(ins.nombre);
    setFormCategoria(ins.categoria);
    setFormNuevaCategoria('');
    setFormProveedor(ins.proveedor || '');
    setFormUnidad(ins.unidadMedida || 'm2');
    setFormCosto(String(ins.costo || 0));
    setFormCostoDesperdicio(ins.costoDesperdicio != null ? String(ins.costoDesperdicio) : '');
    setFormEsLona(Boolean(ins.esLona));
    setFormEsImpresion(Boolean(ins.esImpresion));
    setFormNotas(ins.notas || '');
    setShowModalEditar(true);
  };

  // Guardar nuevo insumo en PostgreSQL
  const handleGuardarNuevoInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) {
      showToast('El nombre del insumo es obligatorio', 'warning');
      return;
    }
    const catFinal = formNuevaCategoria.trim() ? formNuevaCategoria.trim() : formCategoria;
    if (!catFinal) {
      showToast('Seleccioná o indicá una categoría para el insumo', 'warning');
      return;
    }
    const costoNum = parseFloat(formCosto);
    if (isNaN(costoNum) || costoNum < 0) {
      showToast('Ingresá un costo válido mayor o igual a 0', 'warning');
      return;
    }

    setGuardandoInsumo(true);
    try {
      const res = await authFetchJSON<{ success: boolean; message?: string; data?: any }>('/api/insumos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formNombre.trim(),
          categoria: catFinal,
          proveedor: formProveedor.trim() || undefined,
          unidad: formUnidad,
          costo: costoNum,
          costoDesperdicio: formCostoDesperdicio ? parseFloat(formCostoDesperdicio) : undefined,
          esLona: formEsLona,
          esImpresion: formEsImpresion,
          notas: formNotas.trim() || undefined,
        })
      });

      if (res.success) {
        showToast(res.message || 'Insumo creado exitosamente en la base de datos', 'success');
        setShowModalCrear(false);
        await cargarInsumos();
      } else {
        showToast('Error al crear insumo', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error al crear insumo', 'error');
    } finally {
      setGuardandoInsumo(false);
    }
  };

  // Guardar edición de insumo en PostgreSQL
  const handleGuardarEdicionInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!insumoEditando) return;
    if (!formNombre.trim()) {
      showToast('El nombre del insumo es obligatorio', 'warning');
      return;
    }
    const catFinal = formNuevaCategoria.trim() ? formNuevaCategoria.trim() : formCategoria;
    const costoNum = parseFloat(formCosto);
    if (isNaN(costoNum) || costoNum < 0) {
      showToast('Ingresá un costo válido mayor o igual a 0', 'warning');
      return;
    }

    setGuardandoInsumo(true);
    try {
      const res = await authFetchJSON<{ success: boolean; message?: string; data?: any }>(`/api/insumos/${insumoEditando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formNombre.trim(),
          categoria: catFinal,
          proveedor: formProveedor.trim() || null,
          unidad: formUnidad,
          costo: costoNum,
          costoDesperdicio: formCostoDesperdicio ? parseFloat(formCostoDesperdicio) : null,
          esLona: formEsLona,
          esImpresion: formEsImpresion,
          notas: formNotas.trim() || null,
        })
      });

      if (res.success) {
        showToast(res.message || 'Insumo actualizado exitosamente', 'success');
        setShowModalEditar(false);
        setInsumoEditando(null);
        await cargarInsumos();
      } else {
        showToast('Error al actualizar insumo', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar insumo', 'error');
    } finally {
      setGuardandoInsumo(false);
    }
  };

  // Alternar estado activo/inactivo (Soft delete)
  const handleToggleActivo = (ins: InsumoItemCatalogo) => {
    const accion = ins.activo === false ? 'activar' : 'desactivar';
    const titulo = ins.activo === false ? '¿Activar Insumo?' : '¿Desactivar Insumo?';
    const msg = ins.activo === false
      ? `¿Deseas volver a activar "${ins.nombre}" en el catálogo?`
      : `¿Estás seguro de que deseas desactivar "${ins.nombre}"? Ya no aparecerá en los selectores operativos de taller.`;

    requestConfirm(
      titulo,
      msg,
      ins.activo === false ? 'info' : 'warning',
      async () => {
        try {
          const res = await authFetchJSON<{ success: boolean; message?: string }>(`/api/insumos/${ins.id}`, {
            method: 'DELETE'
          });
          if (res.success) {
            showToast(res.message || `Insumo ${accion}do exitosamente`, 'success');
            await cargarInsumos();
          }
        } catch (err: any) {
          showToast(err.message || 'Error al modificar estado', 'error');
        }
      },
      accion === 'activar' ? 'Activar Insumo' : 'Desactivar Insumo'
    );
  };

  // Filtrado de insumos
  const insumosFiltrados = useMemo(() => {
    return insumos.filter(i => {
      const matchCat = categoriaSeleccionada === 'Todas' || i.categoria === categoriaSeleccionada;
      if (!matchCat) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        i.nombre.toLowerCase().includes(q) ||
        (i.proveedor && i.proveedor.toLowerCase().includes(q)) ||
        i.categoria.toLowerCase().includes(q)
      );
    });
  }, [insumos, categoriaSeleccionada, searchTerm]);

  // Paginación y ordenamiento de catálogo
  type InsumoSortField = 'nombre' | 'categoria' | 'costo';
  const table = useSortAndPaginate<InsumoItemCatalogo, InsumoSortField>(insumosFiltrados, {
    defaultSortField: 'nombre',
    defaultSortOrder: 'asc',
    defaultItemsPerPage: 12,
    resetDeps: [searchTerm, categoriaSeleccionada],
  });

  // Selección de insumo para la calculadora
  const handleUsarInsumoEnCalculadora = (ins: InsumoItemCatalogo) => {
    setMaterialSeleccionado(ins.nombre);
    setTarifaImpresion(String(ins.costo || 0));
    setTarifaDesperdicio(String(ins.costoDesperdicio || 0));
    setActiveTab('calculadora');
  };

  // Proyectos filtrados por cliente
  const proyectosFiltrados = useMemo(() => {
    if (!clienteId) return [];
    return data.proyectos.filter(p => p.clienteId === clienteId && p.activo !== false);
  }, [clienteId, data.proyectos]);

  // Cálculo en vivo de la lona
  const calculo = calcularLonaYDesperdicio({
    unidad: unidadMedida,
    lona: {
      ancho: parseNumeroSeguro(anchoLona),
      alto: parseNumeroSeguro(altoLona),
      cantidad: parseNumeroSeguro(cantLonas) || 1,
    },
    piezas: piezas.map(p => ({
      id: p.id,
      nombre: p.nombre,
      ancho: parseNumeroSeguro(p.ancho),
      alto: parseNumeroSeguro(p.alto),
      cantidad: parseNumeroSeguro(p.cantidad) || 1,
    })),
    tarifas: {
      nombreInsumo: materialSeleccionado,
      costoImpresionPorM2: parseNumeroSeguro(tarifaImpresion),
      costoDesperdicioPorM2: parseNumeroSeguro(tarifaDesperdicio),
    }
  });

  // Manejo de piezas
  const agregarPieza = () => {
    const nextIdx = piezas.length + 1;
    setPiezas([
      ...piezas,
      {
        id: Math.random().toString(36).substring(2, 9),
        nombre: `Trabajo / Impresión ${nextIdx}`,
        ancho: unidadMedida === 'cm' ? '50' : '0.50',
        alto: unidadMedida === 'cm' ? '50' : '0.50',
        cantidad: '1',
      }
    ]);
  };

  const duplicarPieza = (idx: number) => {
    const p = piezas[idx];
    setPiezas([
      ...piezas.slice(0, idx + 1),
      { ...p, id: Math.random().toString(36).substring(2, 9), nombre: `${p.nombre} (copia)` },
      ...piezas.slice(idx + 1)
    ]);
  };

  const eliminarPieza = (id: string) => {
    if (piezas.length <= 1) return;
    setPiezas(piezas.filter(p => p.id !== id));
  };

  const actualizarPieza = (id: string, campo: keyof PiezaItem, valor: string) => {
    setPiezas(piezas.map(p => p.id === id ? { ...p, [campo]: valor } : p));
  };

  // Imputar a Proyecto en nombre del Operario (Eduardo Méndez u otro)
  const handleImputarAProyecto = async () => {
    if (!clienteId || !proyectoId) {
      showToast('Seleccioná el Cliente y Proyecto para registrar el gasto', 'warning');
      return;
    }
    if (calculo.areaTotalLonaM2 <= 0 && calculo.areaTotalImpresaM2 <= 0) {
      showToast('Completá las medidas de la lona y del trabajo antes de imputar', 'warning');
      return;
    }

    setGuardandoRegistro(true);
    try {
      const operario = data.colaboradores.find(c => c.id === colaboradorId);
      const operarioNombre = operario ? operario.nombre : 'Operario Taller';

      const ok = await onAddRegistro({
        clienteId,
        proyectoId,
        fecha,
        concepto: 'Insumo',
        descripcion: `${calculo.resumenTexto} (Imputado por Admin p/ ${operarioNombre})`,
        cantidad: calculo.areaTotalLonaM2 > 0 ? calculo.areaTotalLonaM2 : calculo.areaTotalImpresaM2,
        precioUnitario: calculo.areaTotalLonaM2 > 0 ? Math.round(calculo.costoTotalGs / calculo.areaTotalLonaM2) : parseNumeroSeguro(tarifaImpresion),
        total: calculo.costoTotalGs,
        colaboradorId: colaboradorId || undefined,
      });

      if (ok) {
        showToast(`Lona y merma registradas exitosamente para ${operarioNombre}`, 'success');
        if (onRefresh) await onRefresh();
      } else {
        showToast('Error al registrar el insumo en el proyecto', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error al imputar a proyecto', 'error');
    } finally {
      setGuardandoRegistro(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header Corporativo del Módulo */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 rounded-md border border-white/10 bg-[#0d0e14]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-orange-600/15 border border-orange-500/20 text-orange-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
              Catálogo de Insumos & Taller
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Base de Datos PostgreSQL ({insumos.length} ítems)
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Gestión directa de materiales, tarifas, corte de lonas y mermas sin depender de archivos Excel.
            </p>
          </div>
        </div>

        {/* Acciones y Selector de Pestañas */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleAbrirCrear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo Insumo
          </button>

          <div className="flex bg-[#090a0f] border border-white/10 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('catalogo')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
                activeTab === 'catalogo'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              Catálogo ({insumos.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('calculadora')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
                activeTab === 'calculadora'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              Calculadora de Lonas & Merma
            </button>
          </div>

          <button
            type="button"
            onClick={handleSyncExcel}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white text-xs font-medium transition cursor-pointer disabled:opacity-50"
            title="Sincronizar o importar datos desde insumos.xlsx hacia la base de datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-orange-400' : ''}`} />
            Sincronizar Excel
          </button>
        </div>
      </div>

      {/* PESTAÑA 1: CATÁLOGO DE INSUMOS */}
      {activeTab === 'catalogo' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-md border border-white/10 bg-[#111318]">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar insumo por nombre, proveedor (Serimax, Altatec)..."
                className="w-full rounded-md border border-white/10 bg-[#090a0f] pl-9 pr-3 py-2 text-xs text-white focus:border-orange-500 outline-none transition"
              />
            </div>

            {/* Filtro de Estado (Activos / Todos / Inactivos) */}
            <div className="flex bg-[#090a0f] border border-white/10 rounded-md p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setFiltroEstado('todos')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                  filtroEstado === 'todos' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado('activos')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                  filtroEstado === 'activos' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Activos
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado('inactivos')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                  filtroEstado === 'inactivos' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Inactivos
              </button>
            </div>

            {/* Categorías pill */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs max-w-xl">
              <button
                type="button"
                onClick={() => setCategoriaSeleccionada('Todas')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition shrink-0 ${
                  categoriaSeleccionada === 'Todas'
                    ? 'bg-orange-600 text-white'
                    : 'border border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                Todas ({insumos.length})
              </button>
              {categorias.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoriaSeleccionada(cat)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition shrink-0 ${
                    categoriaSeleccionada === cat
                      ? 'bg-orange-600 text-white'
                      : 'border border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de Insumos */}
          <div className="rounded-xl border border-white/10 bg-[#111318]/80 backdrop-blur-sm overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 min-w-[950px] border-collapse">
                <thead className="bg-[#090a0f] text-slate-400 font-mono uppercase text-[11px] tracking-wider border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3.5 min-w-[220px]">Insumo / Descripción</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Categoría</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap">Unidad</th>
                    <th className="px-4 py-3.5 text-right whitespace-nowrap">Costo (Gs.)</th>
                    <th className="px-4 py-3.5 text-right whitespace-nowrap">Tarifa Merma (Gs.)</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap">Estado</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {table.paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-500 font-mono italic">
                        No se encontraron insumos con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    table.paginatedData.map(ins => (
                      <tr key={ins.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-4 py-3.5 font-medium text-white align-middle min-w-[220px]">
                          <div className="flex items-center gap-2">
                            <span>{ins.nombre}</span>
                            {ins.esLona && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-500/15 border border-orange-500/30 text-orange-300">
                                Lona
                              </span>
                            )}
                            {ins.proveedor && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                                {ins.proveedor}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 font-mono align-middle whitespace-nowrap">{ins.categoria}</td>
                        <td className="px-4 py-3.5 text-center text-slate-400 font-mono align-middle whitespace-nowrap">{ins.unidadMedida || 'm2'}</td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-white align-middle whitespace-nowrap">
                          Gs. {ins.costo.toLocaleString('es-PY')}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-amber-300 align-middle whitespace-nowrap">
                          {ins.costoDesperdicio ? `Gs. ${ins.costoDesperdicio.toLocaleString('es-PY')}` : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-center align-middle whitespace-nowrap">
                          {ins.activo !== false ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <Check className="w-3 h-3" /> Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Inactivo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center align-middle whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUsarInsumoEnCalculadora(ins)}
                              title="Usar en calculadora de taller"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 text-xs font-semibold transition cursor-pointer"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Calcular</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAbrirEditar(ins)}
                              title="Editar insumo y precios"
                              className="p-1.5 rounded border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActivo(ins)}
                              title={ins.activo !== false ? 'Desactivar insumo' : 'Activar insumo'}
                              className={`p-1.5 rounded border transition cursor-pointer ${
                                ins.activo !== false
                                  ? 'border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                                  : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                              }`}
                            >
                              {ins.activo !== false ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
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
            {insumosFiltrados.length > table.itemsPerPage && (
              <div className="p-3 border-t border-white/10 bg-[#090a0f] flex justify-between items-center text-xs text-slate-400">
                <span>Mostrando {table.paginatedData.length} de {insumosFiltrados.length} insumos</span>
                <Pagination
                  currentPage={table.currentPage}
                  totalPages={table.totalPages}
                  itemsPerPage={table.itemsPerPage}
                  totalItems={insumosFiltrados.length}
                  pageNumbers={table.pageNumbers}
                  onPageChange={table.setCurrentPage}
                  onItemsPerPageChange={table.setItemsPerPage}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 2: CALCULADORA DE TALLER & ASIGNACIÓN A PROYECTO */}
      {activeTab === 'calculadora' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Columna Izquierda: Parámetros y Medidas (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Panel de Insumo y Unidad */}
            <div className="rounded-md border border-white/10 bg-[#111318] p-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    Parámetros de Lona / Material
                  </h3>
                  <p className="text-xs text-slate-400">
                    Material actual: <strong className="text-orange-300">{materialSeleccionado}</strong>
                  </p>
                </div>
                <div className="flex bg-[#090a0f] border border-white/10 rounded-md p-0.5">
                  <button
                    type="button"
                    onClick={() => setUnidadMedida('cm')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                      unidadMedida === 'cm' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400'
                    }`}
                  >
                    Centímetros (cm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnidadMedida('m')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                      unidadMedida === 'm' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400'
                    }`}
                  >
                    Metros (m)
                  </button>
                </div>
              </div>

              {/* Tarifas de impresión y merma */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Tarifa Impresión (Gs./m²)
                  </label>
                  <input
                    type="number"
                    value={tarifaImpresion}
                    onChange={(e) => setTarifaImpresion(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-1.5 text-xs font-mono text-white focus:border-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Tarifa Merma / Desperdicio (Gs./m²)
                  </label>
                  <input
                    type="number"
                    value={tarifaDesperdicio}
                    onChange={(e) => setTarifaDesperdicio(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-1.5 text-xs font-mono text-white focus:border-orange-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Medidas de Lona Comprada */}
            <div className="rounded-md border border-white/10 bg-[#111318] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono">
                  1. Medidas Lona Comprada / Retazo
                </span>
                <span className="text-sm font-bold text-amber-300 font-mono">
                  {calculo.areaTotalLonaM2.toFixed(3)} m²
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 bg-[#090a0f] border border-white/5 rounded-md p-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-mono block mb-1">Ancho ({unidadMedida})</label>
                  <input
                    type="number"
                    value={anchoLona}
                    onChange={(e) => setAnchoLona(e.target.value)}
                    placeholder="108"
                    className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs font-mono text-center text-white focus:border-amber-500 outline-none"
                  />
                  <span className="text-[9px] text-slate-500 block text-center mt-0.5">={calculo.anchoLonaM}m</span>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono block mb-1">Largo/Alto ({unidadMedida})</label>
                  <input
                    type="number"
                    value={altoLona}
                    onChange={(e) => setAltoLona(e.target.value)}
                    placeholder="169"
                    className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs font-mono text-center text-white focus:border-amber-500 outline-none"
                  />
                  <span className="text-[9px] text-slate-500 block text-center mt-0.5">={calculo.altoLonaM}m</span>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono block mb-1">Cantidad</label>
                  <input
                    type="number"
                    value={cantLonas}
                    onChange={(e) => setCantLonas(e.target.value)}
                    min="1"
                    className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs font-mono text-center text-white focus:border-amber-500 outline-none"
                  />
                  <span className="text-[9px] text-slate-500 block text-center mt-0.5">{cantLonas} unid.</span>
                </div>
              </div>
            </div>

            {/* Medidas del Trabajo a Imprimir */}
            <div className="rounded-md border border-white/10 bg-[#111318] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-300 font-mono">
                  2. Piezas / Trabajos Impresos
                </span>
                <span className="text-sm font-bold text-orange-300 font-mono">
                  {calculo.areaTotalImpresaM2.toFixed(3)} m²
                </span>
              </div>
              <div className="space-y-2">
                {calculo.piezas.map((pieza, idx) => (
                  <div key={pieza.id} className="grid grid-cols-12 gap-2 items-center bg-[#090a0f] border border-white/5 rounded-md p-2">
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={piezas[idx]?.nombre || ''}
                        onChange={(e) => actualizarPieza(pieza.id, 'nombre', e.target.value)}
                        className="w-full bg-transparent text-xs text-white placeholder-slate-600 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={piezas[idx]?.ancho || ''}
                        onChange={(e) => actualizarPieza(pieza.id, 'ancho', e.target.value)}
                        placeholder="55"
                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-mono text-center text-white focus:border-orange-500 outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={piezas[idx]?.alto || ''}
                        onChange={(e) => actualizarPieza(pieza.id, 'alto', e.target.value)}
                        placeholder="165"
                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-mono text-center text-white focus:border-orange-500 outline-none"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="number"
                        value={piezas[idx]?.cantidad || '1'}
                        onChange={(e) => actualizarPieza(pieza.id, 'cantidad', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded px-1 py-1 text-xs font-mono text-center text-white focus:border-orange-500 outline-none"
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-xs font-mono font-bold text-orange-400">
                        {pieza.areaTotalM2.toFixed(3)} m²
                      </span>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {piezas.length > 1 && (
                        <button type="button" onClick={() => eliminarPieza(pieza.id)} className="text-slate-500 hover:text-rose-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={agregarPieza}
                className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar otra pieza
              </button>
            </div>
          </div>

          {/* Columna Derecha: Resultados & Imputación a Proyecto (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Tarjeta de Resumen Técnico y Merma */}
            <div className="rounded-md border border-white/10 bg-[#111318] p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono border-b border-white/5 pb-2">
                Resultado de Cálculo y Desperdicio
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded bg-[#090a0f] border border-white/5">
                  <span className="text-slate-400 text-[10px] block">LONA TOTAL</span>
                  <span className="text-white font-bold text-sm">{calculo.areaTotalLonaM2.toFixed(3)} m²</span>
                </div>
                <div className="p-2.5 rounded bg-[#090a0f] border border-white/5">
                  <span className="text-slate-400 text-[10px] block">IMPRESO NETO</span>
                  <span className="text-orange-400 font-bold text-sm">{calculo.areaTotalImpresaM2.toFixed(3)} m²</span>
                </div>
              </div>

              {/* Indicador de Merma */}
              <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-amber-300 block">DESPERDICIO (MERMA)</span>
                  <span className="text-lg font-bold font-mono text-white">{calculo.desperdicioM2.toFixed(3)} m²</span>
                </div>
                <span className={`text-base font-bold font-mono ${calculo.porcentajeDesperdicio > 40 ? 'text-rose-400' : 'text-amber-300'}`}>
                  {calculo.porcentajeDesperdicio.toFixed(1)}%
                </span>
              </div>

              {/* Desglose Económico */}
              <div className="space-y-1.5 text-xs font-mono pt-2 border-t border-white/5">
                <div className="flex justify-between text-slate-300">
                  <span>Costo Impresión:</span>
                  <span className="font-bold text-white">Gs. {calculo.costoImpresionGs.toLocaleString('es-PY')}</span>
                </div>
                <div className="flex justify-between text-amber-300">
                  <span>Costo Merma:</span>
                  <span className="font-bold">Gs. {calculo.costoDesperdicioGs.toLocaleString('es-PY')}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-emerald-300 pt-2 border-t border-emerald-500/20">
                  <span>TOTAL ESTIMADO:</span>
                  <span>Gs. {calculo.costoTotalGs.toLocaleString('es-PY')}</span>
                </div>
              </div>
            </div>

            {/* Formulario de Imputación a Proyecto */}
            <div className="rounded-md border border-orange-500/30 bg-orange-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-orange-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-orange-300 font-mono">
                  Imputar Gasto a Proyecto (En Nombre de Operario)
                </h4>
              </div>
              <p className="text-[11px] text-slate-400">
                Usá esta sección si Eduardo Méndez no realizó la carga en su jornada. El gasto quedará auditado en el proyecto.
              </p>

              {/* Selector de Cliente */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Cliente *</label>
                <select
                  value={clienteId}
                  onChange={(e) => {
                    setClienteId(e.target.value);
                    setProyectoId('');
                  }}
                  className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
                >
                  <option value="">Seleccioná un cliente...</option>
                  {data.clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Selector de Proyecto */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Proyecto *</label>
                <select
                  value={proyectoId}
                  onChange={(e) => setProyectoId(e.target.value)}
                  disabled={!clienteId}
                  className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-xs text-white focus:border-orange-500 outline-none disabled:opacity-50"
                >
                  <option value="">Seleccioná un proyecto...</option>
                  {proyectosFiltrados.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Selector de Operario (Eduardo Méndez) */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Operario Asignado *</label>
                <select
                  value={colaboradorId}
                  onChange={(e) => setColaboradorId(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
                >
                  <option value="">Seleccioná un colaborador...</option>
                  {data.colaboradores.map(col => (
                    <option key={col.id} value={col.id}>
                      {col.nombre} {col.rol ? `(${col.rol})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Fecha de Ejecución *</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-1.5 text-xs font-mono text-white focus:border-orange-500 outline-none"
                />
              </div>

              {/* Botón de Imputación */}
              <button
                type="button"
                onClick={handleImputarAProyecto}
                disabled={guardandoRegistro || !clienteId || !proyectoId}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                {guardandoRegistro ? 'Imputando...' : `Guardar en Proyecto (Gs. ${calculo.costoTotalGs.toLocaleString('es-PY')})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR INSUMO */}
      <AnimatePresence>
        {showModalCrear && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111318] border border-white/10 rounded-lg p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Nuevo Insumo (PostgreSQL)</h3>
                    <p className="text-[11px] text-slate-400">Crear registro directamente en la base de datos</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModalCrear(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleGuardarNuevoInsumo} className="space-y-3.5">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Nombre / Descripción *</label>
                  <input
                    type="text"
                    required
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    placeholder="Ej: Lona Frontlight 440g 1.60m"
                    className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">Categoría *</label>
                    <select
                      value={formCategoria}
                      onChange={(e) => setFormCategoria(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
                    >
                      {categorias.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="__nueva__">+ Nueva categoría...</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">Unidad de Medida *</label>
                    <select
                      value={formUnidad}
                      onChange={(e) => setFormUnidad(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
                    >
                      <option value="m2">m2 (Metro Cuadrado)</option>
                      <option value="ml">ml (Metro Lineal)</option>
                      <option value="unidad">Unidad / Pieza</option>
                      <option value="kg">kg (Kilogramo)</option>
                      <option value="plancha">Plancha</option>
                      <option value="hoja">Hoja</option>
                      <option value="litro">Litro</option>
                    </select>
                  </div>
                </div>

                {formCategoria === '__nueva__' && (
                  <div>
                    <label className="text-[10px] font-mono text-orange-400 block mb-1">Nombre de la Nueva Categoría *</label>
                    <input
                      type="text"
                      required
                      value={formNuevaCategoria}
                      onChange={(e) => setFormNuevaCategoria(e.target.value)}
                      placeholder="Ej: Acrílicos Especiales"
                      className="w-full rounded-md border border-orange-500/40 bg-[#090a0f] px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Proveedor (Opcional)</label>
                  <input
                    type="text"
                    value={formProveedor}
                    onChange={(e) => setFormProveedor(e.target.value)}
                    placeholder="Ej: Serimax, Altatec, etc."
                    className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">Costo Base (Gs.) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={formCosto}
                      onChange={(e) => setFormCosto(e.target.value)}
                      placeholder="Ej: 35000"
                      className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-xs font-mono text-white focus:border-orange-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-amber-400 block mb-1">Tarifa Merma/Desperdicio (Gs.)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formCostoDesperdicio}
                      onChange={(e) => setFormCostoDesperdicio(e.target.value)}
                      placeholder="Opcional (toma costo base si vacío)"
                      className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-xs font-mono text-white focus:border-orange-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formEsLona}
                      onChange={(e) => setFormEsLona(e.target.checked)}
                      className="rounded border-white/20 bg-[#090a0f] text-orange-500 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <span>Es Lona / Sustrato para Impresión</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formEsImpresion}
                      onChange={(e) => setFormEsImpresion(e.target.checked)}
                      className="rounded border-white/20 bg-[#090a0f] text-orange-500 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <span>Es Servicio de Impresión</span>
                  </label>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Notas / Observaciones (Opcional)</label>
                  <textarea
                    rows={2}
                    value={formNotas}
                    onChange={(e) => setFormNotas(e.target.value)}
                    placeholder="Detalles sobre bobinas, gramaje o especificaciones..."
                    className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-xs text-white focus:border-orange-500 outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowModalCrear(false)}
                    className="px-3 py-1.5 rounded-md border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 text-xs font-medium transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoInsumo}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition shadow-lg shadow-orange-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {guardandoInsumo ? 'Guardando...' : 'Crear Insumo'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL EDITAR INSUMO */}
      <AnimatePresence>
        {showModalEditar && insumoEditando && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111318] border border-white/10 rounded-lg p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Editar Insumo</h3>
                    <p className="text-[11px] text-slate-400 font-mono">ID: {insumoEditando.id}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModalEditar(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleGuardarEdicionInsumo} className="space-y-3.5">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Nombre / Descripción *</label>
                  <input
                    type="text"
                    required
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">Categoría *</label>
                    <select
                      value={formCategoria}
                      onChange={(e) => setFormCategoria(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
                    >
                      {categorias.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="__nueva__">+ Nueva categoría...</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">Unidad de Medida *</label>
                    <select
                      value={formUnidad}
                      onChange={(e) => setFormUnidad(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
                    >
                      <option value="m2">m2 (Metro Cuadrado)</option>
                      <option value="ml">ml (Metro Lineal)</option>
                      <option value="unidad">Unidad / Pieza</option>
                      <option value="kg">kg (Kilogramo)</option>
                      <option value="plancha">Plancha</option>
                      <option value="hoja">Hoja</option>
                      <option value="litro">Litro</option>
                    </select>
                  </div>
                </div>

                {formCategoria === '__nueva__' && (
                  <div>
                    <label className="text-[10px] font-mono text-orange-400 block mb-1">Nombre de la Nueva Categoría *</label>
                    <input
                      type="text"
                      required
                      value={formNuevaCategoria}
                      onChange={(e) => setFormNuevaCategoria(e.target.value)}
                      placeholder="Ej: Acrílicos Especiales"
                      className="w-full rounded-md border border-orange-500/40 bg-[#090a0f] px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Proveedor (Opcional)</label>
                  <input
                    type="text"
                    value={formProveedor}
                    onChange={(e) => setFormProveedor(e.target.value)}
                    placeholder="Ej: Serimax, Altatec, etc."
                    className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">Costo Base (Gs.) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={formCosto}
                      onChange={(e) => setFormCosto(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-xs font-mono text-white focus:border-orange-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-amber-400 block mb-1">Tarifa Merma/Desperdicio (Gs.)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formCostoDesperdicio}
                      onChange={(e) => setFormCostoDesperdicio(e.target.value)}
                      placeholder="Opcional"
                      className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-xs font-mono text-white focus:border-orange-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formEsLona}
                      onChange={(e) => setFormEsLona(e.target.checked)}
                      className="rounded border-white/20 bg-[#090a0f] text-orange-500 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <span>Es Lona / Sustrato para Impresión</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formEsImpresion}
                      onChange={(e) => setFormEsImpresion(e.target.checked)}
                      className="rounded border-white/20 bg-[#090a0f] text-orange-500 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <span>Es Servicio de Impresión</span>
                  </label>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Notas / Observaciones (Opcional)</label>
                  <textarea
                    rows={2}
                    value={formNotas}
                    onChange={(e) => setFormNotas(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-xs text-white focus:border-orange-500 outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowModalEditar(false)}
                    className="px-3 py-1.5 rounded-md border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 text-xs font-medium transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoInsumo}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {guardandoInsumo ? 'Actualizando...' : 'Guardar Cambios'}
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
