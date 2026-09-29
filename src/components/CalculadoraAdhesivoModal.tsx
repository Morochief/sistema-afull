import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, X, Sparkles, Plus, Trash2, Copy, Search, Layers, Check } from 'lucide-react';
import { calcularLonaYDesperdicio, parseNumeroSeguro } from '../lib/lonaCalculo.ts';

export interface PiezaItem {
  id: string;
  nombre: string;
  ancho: string;
  alto: string;
  cantidad: string;
}

export interface InsumoItemCatalogo {
  id: string;
  nombre: string;
  costo: number;
  unidadMedida: string;
  categoria: string;
  proveedor?: string;
  costoDesperdicio?: number;
  esLona?: boolean;
  esImpresion?: boolean;
  activo?: boolean;
  notas?: string;
}

export interface CalculoAdhesivoResultado {
  piezas: Array<{
    id: string;
    nombre: string;
    anchoM: number;
    altoM: number;
    cantidad: number;
    areaM2: number;
  }>;
  areaTotalPiezasM2: number;
  areaBrutaMaterialM2: number;
  desperdicioM2: number;
  porcentajeDesperdicio: number;
  tipoMaterial: string;
  resumenTexto: string;
  areaTotalM2: number;
  areaImpresaM2: number;
  anchoTotalCm: number;
  altoTotalCm: number;
  anchoImpresoCm: number;
  altoImpresoCm: number;
  // Campos económicos extendidos
  costoImpresionGs: number;
  costoDesperdicioGs: number;
  costoTotalGs: number;
  precioUnitarioGs: number;
  lineasDesglosadas?: Array<{
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    total: number;
  }>;
}

interface CalculadoraAdhesivoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAplicar: (resultado: CalculoAdhesivoResultado) => void;
  titulo?: string;
  defaultMaterial?: string;
  defaultUnidad?: 'cm' | 'm';
  ocultarPrecios?: boolean;
}

export default function CalculadoraAdhesivoModal({
  isOpen,
  onClose,
  onAplicar,
  titulo = 'Calculadora de Lonas, Impresión y Desperdicio',
  defaultMaterial = 'Lona x m (impresión) Serimax',
  defaultUnidad = 'cm',
  ocultarPrecios = false,
}: CalculadoraAdhesivoModalProps) {
  const [material, setMaterial] = useState(defaultMaterial);
  const [unidadMedida, setUnidadMedida] = useState<'m' | 'cm'>(defaultUnidad);
  
  // Lista de piezas a imprimir (por defecto en cm para taller de Eduardo)
  const [piezas, setPiezas] = useState<PiezaItem[]>([
    { id: '1', nombre: 'Trabajo / Impresión 1', ancho: '55', alto: '165', cantidad: '1' },
  ]);

  // Medida de lona / material bruto comprado
  const [usarPlanchaBobina, setUsarPlanchaBobina] = useState(true);
  const [anchoMaterial, setAnchoMaterial] = useState('108');
  const [altoMaterial, setAltoMaterial] = useState('169');
  const [cantidadPlanchas, setCantidadPlanchas] = useState('1');

  // Catálogo de Insumos desde insumos.xlsx
  const [catalogoInsumos, setCatalogoInsumos] = useState<InsumoItemCatalogo[]>([]);
  const [insumoSeleccionado, setInsumoSeleccionado] = useState<InsumoItemCatalogo | null>(null);
  const [busquedaInsumo, setBusquedaInsumo] = useState('');
  const [mostrarDropdownInsumos, setMostrarDropdownInsumos] = useState(false);
  const [costoImpresionManual, setCostoImpresionManual] = useState<string>('63000');
  const [costoDesperdicioManual, setCostoDesperdicioManual] = useState<string>('15500');

  const [modoInsercion, setModoInsercion] = useState<'total_con_desperdicio' | 'neto_piezas'>('total_con_desperdicio');

  // Cargar insumos desde la API
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/insumos', { credentials: 'include' })
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data?.insumos) {
          setCatalogoInsumos(json.data.insumos);
          // Buscar insumo por defecto (Serimax o defaultMaterial)
          const def = json.data.insumos.find((i: InsumoItemCatalogo) =>
            i.nombre.toLowerCase().includes('serimax') || i.nombre.toLowerCase().includes('lona')
          );
          if (def) {
            setInsumoSeleccionado(def);
            setMaterial(def.nombre);
            setCostoImpresionManual(String(def.costo || 0));
            setCostoDesperdicioManual(String(def.costoDesperdicio || 0));
          }
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Filtrar catálogo según búsqueda
  const insumosFiltrados = useMemo(() => {
    if (!busquedaInsumo.trim()) {
      // Priorizar lonas e impresiones
      return catalogoInsumos.filter(i => i.esLona || i.esImpresion || i.categoria === 'Impresiones').slice(0, 15);
    }
    const q = busquedaInsumo.toLowerCase();
    return catalogoInsumos.filter(i =>
      i.nombre.toLowerCase().includes(q) ||
      (i.proveedor && i.proveedor.toLowerCase().includes(q)) ||
      i.categoria.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [catalogoInsumos, busquedaInsumo]);

  if (!isOpen) return null;

  // Realizar cálculo usando el motor puro
  const resultado = calcularLonaYDesperdicio({
    unidad: unidadMedida,
    lona: {
      ancho: parseNumeroSeguro(anchoMaterial),
      alto: parseNumeroSeguro(altoMaterial),
      cantidad: parseNumeroSeguro(cantidadPlanchas) || 1,
    },
    piezas: piezas.map(p => ({
      id: p.id,
      nombre: p.nombre,
      ancho: parseNumeroSeguro(p.ancho),
      alto: parseNumeroSeguro(p.alto),
      cantidad: parseNumeroSeguro(p.cantidad) || 1,
    })),
    tarifas: {
      nombreInsumo: material,
      costoImpresionPorM2: parseNumeroSeguro(costoImpresionManual),
      costoDesperdicioPorM2: parseNumeroSeguro(costoDesperdicioManual),
    }
  });

  // Manejadores de piezas
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
      },
    ]);
  };

  const duplicarPieza = (idx: number) => {
    const p = piezas[idx];
    setPiezas([
      ...piezas.slice(0, idx + 1),
      {
        ...p,
        id: Math.random().toString(36).substring(2, 9),
        nombre: `${p.nombre || 'Trabajo'} (copia)`,
      },
      ...piezas.slice(idx + 1),
    ]);
  };

  const eliminarPieza = (id: string) => {
    if (piezas.length <= 1) return;
    setPiezas(piezas.filter((p) => p.id !== id));
  };

  const actualizarPieza = (id: string, campo: keyof PiezaItem, valor: string) => {
    setPiezas(piezas.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));
  };

  // Presets de material comunes en taller
  const aplicarPresetMaterial = (nombre: string, w: string, h: string, costoImp?: number, costoDesp?: number) => {
    setMaterial(nombre);
    setAnchoMaterial(unidadMedida === 'cm' ? String(parseFloat(w) * 100) : w);
    setAltoMaterial(unidadMedida === 'cm' ? String(parseFloat(h) * 100) : h);
    setUsarPlanchaBobina(true);
    if (costoImp !== undefined) setCostoImpresionManual(String(costoImp));
    if (costoDesp !== undefined) setCostoDesperdicioManual(String(costoDesp));
  };

  const seleccionarInsumoCatalogo = (ins: InsumoItemCatalogo) => {
    setInsumoSeleccionado(ins);
    setMaterial(ins.nombre);
    setCostoImpresionManual(String(ins.costo || 0));
    setCostoDesperdicioManual(String(ins.costoDesperdicio || 0));
    setMostrarDropdownInsumos(false);
  };

  const handleAplicar = () => {
    if (resultado.areaTotalImpresaM2 <= 0 && resultado.areaTotalLonaM2 <= 0) return;

    const cantidadElegida = modoInsercion === 'total_con_desperdicio' && usarPlanchaBobina
      ? resultado.areaTotalLonaM2
      : resultado.areaTotalImpresaM2;

    const precioUnitario = cantidadElegida > 0 ? Math.round(resultado.costoTotalGs / cantidadElegida) : 0;

    const lineasDesglosadas = [
      {
        descripcion: `${material} — Impresión Neta (${resultado.areaTotalImpresaM2.toFixed(3)} m²)`,
        cantidad: resultado.areaTotalImpresaM2,
        precioUnitario: parseNumeroSeguro(costoImpresionManual),
        total: resultado.costoImpresionGs,
      },
    ];

    if (resultado.desperdicioM2 > 0 && resultado.costoDesperdicioGs > 0) {
      lineasDesglosadas.push({
        descripcion: `${material} — Merma/Desperdicio (${resultado.desperdicioM2.toFixed(3)} m²)`,
        cantidad: resultado.desperdicioM2,
        precioUnitario: parseNumeroSeguro(costoDesperdicioManual),
        total: resultado.costoDesperdicioGs,
      });
    }

    onAplicar({
      piezas: resultado.piezas.map(p => ({
        id: p.id,
        nombre: p.nombre,
        anchoM: p.anchoM,
        altoM: p.altoM,
        cantidad: p.cantidad,
        areaM2: p.areaTotalM2,
      })),
      areaTotalPiezasM2: resultado.areaTotalImpresaM2,
      areaBrutaMaterialM2: resultado.areaTotalLonaM2,
      desperdicioM2: resultado.desperdicioM2,
      porcentajeDesperdicio: resultado.porcentajeDesperdicio,
      tipoMaterial: material,
      resumenTexto: resultado.resumenTexto,
      areaTotalM2: cantidadElegida,
      areaImpresaM2: resultado.areaTotalImpresaM2,
      anchoTotalCm: Number((resultado.anchoLonaM * 100).toFixed(1)),
      altoTotalCm: Number((resultado.altoLonaM * 100).toFixed(1)),
      anchoImpresoCm: Number((resultado.piezas[0]?.anchoM * 100 || 0).toFixed(1)),
      altoImpresoCm: Number((resultado.piezas[0]?.altoM * 100 || 0).toFixed(1)),
      costoImpresionGs: resultado.costoImpresionGs,
      costoDesperdicioGs: resultado.costoDesperdicioGs,
      costoTotalGs: resultado.costoTotalGs,
      precioUnitarioGs: precioUnitario,
      lineasDesglosadas,
    });

    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 md:p-6 overflow-y-auto" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-4xl rounded-md border border-white/10 bg-[#090a0f] p-5 md:p-6 shadow-2xl space-y-4 text-slate-200 my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {titulo}
                </h3>
                <p className="text-xs text-slate-400">
                  {ocultarPrecios
                    ? 'Cálculo técnico en centímetros para taller con conversión a m² y rendimiento de corte'
                    : <>Cálculo en centímetros para taller con conversión a m² y tarifas de <span className="text-orange-300 font-mono">insumos.xlsx</span></>
                  }
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Configuración de Insumo y Unidad */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
            {/* Buscador de Insumo */}
            <div className="md:col-span-7 space-y-1 relative">
              <label className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
                <span>Insumo / Material ({catalogoInsumos.length} disponibles)</span>
                {insumoSeleccionado?.proveedor && (
                  <span className="text-orange-400 font-bold">Proveedor: {insumoSeleccionado.proveedor}</span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={material}
                  onChange={(e) => {
                    setMaterial(e.target.value);
                    setBusquedaInsumo(e.target.value);
                    setMostrarDropdownInsumos(true);
                  }}
                  onFocus={() => setMostrarDropdownInsumos(true)}
                  placeholder="Escribí para buscar: Lona Serimax, Altatec, Vinilo, PVC..."
                  className="w-full rounded-md border border-white/10 bg-[#111318] px-3 py-2 text-sm text-white focus:border-orange-500 outline-none transition pr-8"
                />
                <Search className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Dropdown flotante de sugerencias */}
              {mostrarDropdownInsumos && insumosFiltrados.length > 0 && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-[#111318] border border-white/15 rounded-md shadow-2xl max-h-56 overflow-y-auto p-1 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-mono text-slate-400 uppercase border-b border-white/5 flex justify-between">
                    <span>Sugerencias de catálogo</span>
                    <button type="button" onClick={() => setMostrarDropdownInsumos(false)} className="text-slate-400 hover:text-white">✕</button>
                  </div>
                  {insumosFiltrados.map((ins) => (
                    <button
                      key={ins.id}
                      type="button"
                      onClick={() => seleccionarInsumoCatalogo(ins)}
                      className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-orange-500/15 transition flex items-center justify-between gap-2 text-xs group"
                    >
                      <div className="truncate">
                        <span className="text-white group-hover:text-orange-300 font-medium block truncate">{ins.nombre}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {ins.categoria} • {ocultarPrecios ? `Unidad: ${ins.unidadMedida}` : `Gs. ${ins.costo.toLocaleString('es-PY')}/${ins.unidadMedida}`}
                          {!ocultarPrecios && ins.costoDesperdicio ? ` (Merma: Gs. ${ins.costoDesperdicio.toLocaleString('es-PY')})` : ''}
                        </span>
                      </div>
                      {ins.proveedor && (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300 font-mono border border-white/10">
                          {ins.proveedor}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selector de Unidad de Entrada */}
            <div className="md:col-span-5 space-y-1">
              <label className="text-[11px] font-mono uppercase text-slate-400">Unidad de Entrada (Taller)</label>
              <div className="flex bg-[#111318] border border-white/10 rounded-md p-0.5">
                <button
                  type="button"
                  onClick={() => setUnidadMedida('cm')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
                    unidadMedida === 'cm' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Centímetros (108 × 169 cm)
                </button>
                <button
                  type="button"
                  onClick={() => setUnidadMedida('m')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
                    unidadMedida === 'm' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Metros (1.08 × 1.69 m)
                </button>
              </div>
            </div>
          </div>

          {/* Tarifas Unitarias en Gs. (Solo visible para Admin) */}
          {!ocultarPrecios && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-md bg-[#111318] border border-white/5">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Tarifa Impresión (Gs. por m² / metro)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={costoImpresionManual}
                    onChange={(e) => setCostoImpresionManual(e.target.value)}
                    placeholder="63000"
                    className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-1.5 text-xs font-mono text-white focus:border-orange-500 outline-none"
                  />
                  <span className="text-xs font-mono text-slate-400 shrink-0">Gs.</span>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Tarifa Merma / Desperdicio (Gs. por m² / metro)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="500"
                    min="0"
                    value={costoDesperdicioManual}
                    onChange={(e) => setCostoDesperdicioManual(e.target.value)}
                    placeholder="15500"
                    className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-1.5 text-xs font-mono text-white focus:border-orange-500 outline-none"
                  />
                  <span className="text-xs font-mono text-slate-400 shrink-0">Gs.</span>
                </div>
              </div>
            </div>
          )}

          {/* Presets Rápidos de Taller */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
            <span className="text-slate-500 font-mono text-[10px] uppercase mr-1">Presets comunes:</span>
            <button
              type="button"
              onClick={() => aplicarPresetMaterial('Lona x m (impresión) Serimax', '1.08', '1.69', 63000, 15500)}
              className="px-2.5 py-1 rounded-md border border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 transition cursor-pointer font-medium"
            >
              ⭐ Caso Eduardo: Lona 108×169 cm (Serimax)
            </button>
            <button
              type="button"
              onClick={() => aplicarPresetMaterial('Lona x m (impresión) Altatec', '2.20', '1.00', 85000, 38000)}
              className="px-2 py-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
            >
              Lona 2.20m (Altatec)
            </button>
            <button
              type="button"
              onClick={() => aplicarPresetMaterial('Lona Front Bobina 1.60m', '1.60', '1.00', 63000, 15500)}
              className="px-2 py-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
            >
              Lona 1.60m
            </button>
            <button
              type="button"
              onClick={() => aplicarPresetMaterial('Adhesivo Vinilo Bobina 1.37m', '1.37', '1.00', 63000, 15500)}
              className="px-2 py-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
            >
              Vinilo 1.37m
            </button>
            <button
              type="button"
              onClick={() => aplicarPresetMaterial('Plancha PVC 5mm', '1.22', '2.44', 41000, 0)}
              className="px-2 py-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
            >
              PVC 1.22×2.44m
            </button>
          </div>

          {/* SECCIÓN 1: TRABAJO / PIEZAS A IMPRIMIR */}
          <div className="rounded-md border border-white/10 bg-[#111318] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-orange-300 font-mono">
                  1. Trabajo / Piezas a Imprimir
                </h4>
                <span className="text-xs text-slate-500 font-mono">({piezas.length} {piezas.length === 1 ? 'corte' : 'cortes'})</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-mono block uppercase">Total Impreso</span>
                <span className="text-sm font-bold text-orange-300 font-mono">
                  {resultado.areaTotalImpresaM2.toFixed(3)} m²
                </span>
              </div>
            </div>

            {/* Cabecera tabla piezas */}
            <div className="grid grid-cols-12 gap-2 text-[10px] font-mono text-slate-400 uppercase tracking-wider px-2">
              <span className="col-span-4">Detalle / Ítem</span>
              <span className="col-span-2 text-center">Ancho ({unidadMedida})</span>
              <span className="col-span-2 text-center">Alto/Largo ({unidadMedida})</span>
              <span className="col-span-1 text-center">Cant.</span>
              <span className="col-span-2 text-right">Área (m²)</span>
              <span className="col-span-1 text-center"></span>
            </div>

            {/* Lista dinámica de piezas */}
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {resultado.piezas.map((pieza, idx) => (
                <div
                  key={pieza.id}
                  className="grid grid-cols-12 gap-2 items-center bg-[#090a0f] border border-white/5 hover:border-white/15 rounded-md p-1.5 transition"
                >
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={piezas[idx]?.nombre || ''}
                      onChange={(e) => actualizarPieza(pieza.id, 'nombre', e.target.value)}
                      placeholder={`Trabajo ${idx + 1}`}
                      className="w-full bg-transparent text-xs text-white placeholder-slate-600 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step={unidadMedida === 'cm' ? '1' : '0.01'}
                      min="0"
                      value={piezas[idx]?.ancho || ''}
                      onChange={(e) => actualizarPieza(pieza.id, 'ancho', e.target.value)}
                      placeholder={unidadMedida === 'cm' ? '55' : '0.55'}
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-mono text-center text-white focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step={unidadMedida === 'cm' ? '1' : '0.01'}
                      min="0"
                      value={piezas[idx]?.alto || ''}
                      onChange={(e) => actualizarPieza(pieza.id, 'alto', e.target.value)}
                      placeholder={unidadMedida === 'cm' ? '165' : '1.65'}
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-mono text-center text-white focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={piezas[idx]?.cantidad || '1'}
                      onChange={(e) => actualizarPieza(pieza.id, 'cantidad', e.target.value)}
                      placeholder="1"
                      className="w-full bg-white/5 border border-white/10 rounded px-1.5 py-1 text-xs font-mono text-center text-white focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-xs font-mono font-semibold text-orange-400">
                      {pieza.areaTotalM2.toFixed(3)} m²
                    </span>
                    <span className="text-[9px] text-slate-500 block font-mono">
                      ={pieza.anchoM.toFixed(2)}×{pieza.altoM.toFixed(2)}m
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => duplicarPieza(idx)}
                      title="Duplicar"
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {piezas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => eliminarPieza(pieza.id)}
                        title="Eliminar"
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      >
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
              className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 font-semibold px-2.5 py-1.5 rounded-md border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar otra pieza / trabajo
            </button>
          </div>

          {/* SECCIÓN 2: MEDIDAS DE LA LONA COMPRADA / CORTE BRUTO */}
          <div className="rounded-md border border-white/10 bg-[#111318] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={usarPlanchaBobina}
                  onChange={(e) => setUsarPlanchaBobina(e.target.checked)}
                  className="rounded border-white/20 text-orange-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono">
                  2. Medidas de la Lona Comprada / Retazo (Para calcular Merma)
                </span>
              </label>
              {usarPlanchaBobina && (
                <span className="text-sm font-bold text-amber-300 font-mono">
                  {resultado.areaTotalLonaM2.toFixed(3)} m²
                </span>
              )}
            </div>

            {usarPlanchaBobina && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#090a0f] border border-white/5 rounded-md p-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-mono block mb-1">
                    Ancho Lona ({unidadMedida})
                  </label>
                  <input
                    type="number"
                    step={unidadMedida === 'cm' ? '1' : '0.01'}
                    min="0"
                    value={anchoMaterial}
                    onChange={(e) => setAnchoMaterial(e.target.value)}
                    placeholder={unidadMedida === 'cm' ? '108' : '1.08'}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-2.5 py-1.5 text-xs font-mono text-center text-white focus:border-amber-500 outline-none"
                  />
                  <span className="text-[9px] text-slate-500 italic block mt-0.5 text-center">
                    = {resultado.anchoLonaM.toFixed(2)} m
                  </span>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-mono block mb-1">
                    Largo/Alto Lona ({unidadMedida})
                  </label>
                  <input
                    type="number"
                    step={unidadMedida === 'cm' ? '1' : '0.01'}
                    min="0"
                    value={altoMaterial}
                    onChange={(e) => setAltoMaterial(e.target.value)}
                    placeholder={unidadMedida === 'cm' ? '169' : '1.69'}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-2.5 py-1.5 text-xs font-mono text-center text-white focus:border-amber-500 outline-none"
                  />
                  <span className="text-[9px] text-slate-500 italic block mt-0.5 text-center">
                    = {resultado.altoLonaM.toFixed(2)} m
                  </span>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-mono block mb-1">
                    Cantidad de Lonas / Tiradas
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={cantidadPlanchas}
                    onChange={(e) => setCantidadPlanchas(e.target.value)}
                    placeholder="1"
                    className="w-full bg-white/5 border border-white/10 rounded-md px-2.5 py-1.5 text-xs font-mono text-center text-white focus:border-amber-500 outline-none"
                  />
                  <span className="text-[9px] text-slate-500 italic block mt-0.5 text-center">
                    {resultado.cantidadLonas} unidad(es)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN 3: RESULTADOS TÉCNICOS Y ECONÓMICOS */}
          {ocultarPrecios ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Tarjeta 1: Área Impresa Neta */}
              <div className="rounded-md border border-orange-500/30 bg-orange-500/10 p-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-orange-400 block tracking-wider font-semibold">
                    Área Impresa Neta
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-bold font-mono text-white">
                      {resultado.areaTotalImpresaM2.toFixed(3)}
                    </span>
                    <span className="text-xs text-orange-400 font-mono">m²</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-orange-500/20 flex justify-between items-center text-xs font-mono text-slate-400">
                  <span>Cortes:</span>
                  <span className="text-slate-200 font-medium">
                    {resultado.piezas.length} {resultado.piezas.length === 1 ? 'corte' : 'cortes'}
                  </span>
                </div>
              </div>

              {/* Tarjeta 2: Lona Total Utilizada */}
              <div className="rounded-md border border-white/10 bg-[#111318] p-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block tracking-wider font-semibold">
                    Lona Total Requerida
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-bold font-mono text-white">
                      {resultado.areaTotalLonaM2.toFixed(3)}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">m²</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-white/10 flex justify-between items-center text-xs font-mono text-slate-400">
                  <span>Plancha / Bobina:</span>
                  <span className="text-slate-200 font-medium">
                    {resultado.anchoLonaM.toFixed(2)}m × {resultado.altoLonaM.toFixed(2)}m
                  </span>
                </div>
              </div>

              {/* Tarjeta 3: Desperdicio / Merma */}
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-amber-300 block tracking-wider font-semibold">
                    Desperdicio / Merma
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-bold font-mono text-white">
                      {resultado.desperdicioM2.toFixed(3)}
                    </span>
                    <span className="text-xs text-amber-300 font-mono">m²</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-amber-500/20 flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">% Merma:</span>
                  <span className={`font-bold ${resultado.porcentajeDesperdicio > 40 ? 'text-rose-400' : 'text-amber-300'}`}>
                    {resultado.porcentajeDesperdicio.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Tarjeta Desperdicio */}
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-amber-300 block tracking-wider font-semibold">
                    Desperdicio / Merma
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-bold font-mono text-white">
                      {resultado.desperdicioM2.toFixed(3)}
                    </span>
                    <span className="text-xs text-amber-300 font-mono">m²</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-amber-500/20 flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">% Merma:</span>
                  <span className={`font-bold ${resultado.porcentajeDesperdicio > 40 ? 'text-rose-400' : 'text-amber-300'}`}>
                    {resultado.porcentajeDesperdicio.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Tarjeta Costo Impresión */}
              <div className="rounded-md border border-white/10 bg-[#111318] p-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block tracking-wider">
                    Costo Impresión Neta
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-bold font-mono text-white">
                      Gs. {resultado.costoImpresionGs.toLocaleString('es-PY')}
                    </span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-white/10 text-[10px] font-mono text-slate-400">
                  {resultado.areaTotalImpresaM2.toFixed(2)} m² × Gs. {parseNumeroSeguro(costoImpresionManual).toLocaleString('es-PY')}
                </div>
              </div>

              {/* Tarjeta Costo Total Combinado */}
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-emerald-400 block tracking-wider font-semibold">
                    Costo Total Estimado
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-bold font-mono text-emerald-300">
                      Gs. {resultado.costoTotalGs.toLocaleString('es-PY')}
                    </span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-emerald-500/20 text-[10px] font-mono text-slate-300 flex justify-between">
                  <span>Impresión + Merma</span>
                  {resultado.costoDesperdicioGs > 0 && (
                    <span className="text-amber-300">(Merma: Gs. {resultado.costoDesperdicioGs.toLocaleString('es-PY')})</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Selector de modo de inserción */}
          <div className="flex flex-wrap items-center justify-between text-xs bg-[#111318] rounded-md px-3.5 py-2 gap-2 border border-white/5">
            <span className="text-slate-300 font-medium">Cantidad a imputar al formulario:</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="modoInsercion"
                  checked={modoInsercion === 'total_con_desperdicio'}
                  onChange={() => setModoInsercion('total_con_desperdicio')}
                  className="text-orange-500 focus:ring-0"
                />
                <span className="text-white">
                  Total Lona ({resultado.areaTotalLonaM2.toFixed(3)} m²)
                </span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="modoInsercion"
                  checked={modoInsercion === 'neto_piezas'}
                  onChange={() => setModoInsercion('neto_piezas')}
                  className="text-orange-500 focus:ring-0"
                />
                <span className="text-white">
                  Neto Impreso ({resultado.areaTotalImpresaM2.toFixed(3)} m²)
                </span>
              </label>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs rounded-md border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAplicar}
              disabled={resultado.areaTotalImpresaM2 <= 0 && resultado.areaTotalLonaM2 <= 0}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-md bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {ocultarPrecios
                ? `Insertar Insumo (${modoInsercion === 'total_con_desperdicio' && usarPlanchaBobina ? resultado.areaTotalLonaM2.toFixed(3) : resultado.areaTotalImpresaM2.toFixed(3)} m²)`
                : `Insertar Insumo (${modoInsercion === 'total_con_desperdicio' && usarPlanchaBobina ? resultado.areaTotalLonaM2.toFixed(3) : resultado.areaTotalImpresaM2.toFixed(3)} m² — Gs. ${resultado.costoTotalGs.toLocaleString('es-PY')})`
              }
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
