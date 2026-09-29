import React, { useState, useEffect } from 'react';
import { Plus, Calculator, FileText, Percent, Ruler, Layers, AlertCircle, ShoppingCart } from 'lucide-react';
import { authFetchJSON } from '../authFetch.ts';
import {
  ModoInsumo,
  calcularCostoPorUnidad,
  calcularCostoPorMetro,
  calcularCostoPorDimension,
  calcularCostoPorPorcentaje,
} from '../lib/insumosCosteo.ts';
import { FacturaCompraItem } from '../types.ts';

export interface InsumoAgregado {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  modoInsumo: ModoInsumo;
  unidad: string;
  anchoCm?: number;
  altoCm?: number;
  desperdicioCalculado?: boolean;
  porcentajeUsado?: number;
  facturaCompraId?: string;
  facturaNumero?: string;
}

interface InsumosCosteoTabsProps {
  isOperario: boolean;
  onAgregar: (insumo: InsumoAgregado) => void;
}

const BOBINAS_ESTANDAR = [
  { label: '1.05 m (105 cm)', val: 105 },
  { label: '1.22 m (122 cm)', val: 122 },
  { label: '1.27 m (127 cm)', val: 127 },
  { label: '1.52 m (152 cm)', val: 152 },
  { label: '1.60 m (160 cm)', val: 160 },
  { label: 'Plancha (15% merma)', val: 0 },
];

export default function InsumosCosteoTabs({ isOperario, onAgregar }: InsumosCosteoTabsProps) {
  const [tabActivo, setTabActivo] = useState<ModoInsumo>('UNIDAD');

  // Facturas de compra disponibles
  const [facturas, setFacturas] = useState<FacturaCompraItem[]>([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  const [showModalNuevaFactura, setShowModalNuevaFactura] = useState(false);

  // Estados Form: Por unidad
  const [descUnidad, setDescUnidad] = useState('');
  const [cantUnidad, setCantUnidad] = useState('1');
  const [precioUnidad, setPrecioUnidad] = useState('0');

  // Estados Form: Por metro
  const [descMetro, setDescMetro] = useState('');
  const [metros, setMetros] = useState('1.2');
  const [precioMetro, setPrecioMetro] = useState('0');

  // Estados Form: Por dimensión (AxA)
  const [descDimension, setDescDimension] = useState('');
  const [anchoCm, setAnchoCm] = useState('122');
  const [altoCm, setAltoCm] = useState('252');
  const [precioPorM2, setPrecioPorM2] = useState('0');
  const [calcDesperdicio, setCalcDesperdicio] = useState(false);
  const [bobinaSeleccionada, setBobinaSeleccionada] = useState(127);

  // Estados Form: Por porcentaje
  const [descPorcentaje, setDescPorcentaje] = useState('');
  const [porcentajeUsado, setPorcentajeUsado] = useState('20');
  const [precioTotalInsumo, setPrecioTotalInsumo] = useState('0');

  // Estados Form: Desde factura
  const [facturaSeleccionadaId, setFacturaSeleccionadaId] = useState('');
  const [cantidadFacturaUsada, setCantidadFacturaUsada] = useState('0.5');

  // Cargar facturas disponibles al montar o al cambiar al tab FACTURA
  useEffect(() => {
    if (tabActivo === 'FACTURA') {
      cargarFacturas();
    }
  }, [tabActivo]);

  const cargarFacturas = async () => {
    setLoadingFacturas(true);
    try {
      const res = await authFetchJSON<{ success: boolean; data: FacturaCompraItem[] }>('/api/facturas-compra?disponibles=true');
      if (res.success && res.data) {
        setFacturas(res.data);
        if (!facturaSeleccionadaId && res.data.length > 0) {
          setFacturaSeleccionadaId(res.data[0].id);
        }
      }
    } catch {
      // Silencioso en caso de error
    } finally {
      setLoadingFacturas(false);
    }
  };

  const handleAgregar = (e: React.FormEvent) => {
    e.preventDefault();

    const id = `ins_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    if (tabActivo === 'UNIDAD') {
      const c = parseFloat(cantUnidad) || 1;
      const p = parseFloat(precioUnidad) || 0;
      const desc = descUnidad.trim() || 'Insumo por unidad';
      onAgregar({
        id,
        descripcion: desc,
        cantidad: c,
        precioUnitario: p,
        total: calcularCostoPorUnidad(c, p),
        modoInsumo: 'UNIDAD',
        unidad: 'u',
      });
      setDescUnidad('');
      setCantUnidad('1');
    } else if (tabActivo === 'METRO') {
      const m = parseFloat(metros) || 1;
      const p = parseFloat(precioMetro) || 0;
      const desc = descMetro.trim() || 'Material por metro lineal';
      onAgregar({
        id,
        descripcion: `${desc} (${m} m)`,
        cantidad: m,
        precioUnitario: p,
        total: calcularCostoPorMetro(m, p),
        modoInsumo: 'METRO',
        unidad: 'm',
      });
      setDescMetro('');
    } else if (tabActivo === 'DIMENSION') {
      const w = parseFloat(anchoCm) || 0;
      const h = parseFloat(altoCm) || 0;
      const p = parseFloat(precioPorM2) || 0;
      const desc = descDimension.trim() || 'Material impreso / placa';
      const resCalc = calcularCostoPorDimension({
        anchoCm: w,
        altoCm: h,
        precioPorM2: p,
        calcularDesperdicio: calcDesperdicio,
        anchoBobinaCm: calcDesperdicio && bobinaSeleccionada > 0 ? bobinaSeleccionada : undefined,
      });

      const textoDesperdicio = calcDesperdicio ? ' (con desperdicio de bobina)' : '';
      onAgregar({
        id,
        descripcion: `${desc} [${w}×${h} cm — ${resCalc.areaEfectivaM2} m²${textoDesperdicio}]`,
        cantidad: resCalc.areaEfectivaM2,
        precioUnitario: p,
        total: resCalc.subtotalGs,
        modoInsumo: 'DIMENSION',
        unidad: 'm2',
        anchoCm: w,
        altoCm: h,
        desperdicioCalculado: calcDesperdicio,
      });
      setDescDimension('');
    } else if (tabActivo === 'PORCENTAJE') {
      const pct = parseFloat(porcentajeUsado) || 0;
      const pTotal = parseFloat(precioTotalInsumo) || 0;
      const desc = descPorcentaje.trim() || 'Insumo fraccionado';
      const totalGs = calcularCostoPorPorcentaje(pct, pTotal);
      onAgregar({
        id,
        descripcion: `${desc} [${pct}% de ${isOperario ? 'envase' : `Gs. ${Math.round(pTotal).toLocaleString('es-PY')}`}]`,
        cantidad: pct / 100,
        precioUnitario: pTotal,
        total: totalGs,
        modoInsumo: 'PORCENTAJE',
        unidad: '%',
        porcentajeUsado: pct,
      });
      setDescPorcentaje('');
    } else if (tabActivo === 'FACTURA') {
      const fac = facturas.find((f) => f.id === facturaSeleccionadaId);
      const c = parseFloat(cantidadFacturaUsada) || 0;
      if (!fac) return;
      const p = fac.precioUnitario;
      const totalGs = Math.round(c * p);
      onAgregar({
        id,
        descripcion: `${fac.descripcion} [Fac. #${fac.facturaNumero} — ${fac.proveedor}]`,
        cantidad: c,
        precioUnitario: p,
        total: totalGs,
        modoInsumo: 'FACTURA',
        unidad: fac.unidad,
        facturaCompraId: fac.id,
        facturaNumero: fac.facturaNumero,
      });
      setCantidadFacturaUsada('1');
    }
  };

  const pillClass = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
      active
        ? 'bg-amber-500 text-black font-semibold shadow-md shadow-amber-500/20'
        : 'bg-[#181a20] text-slate-300 hover:bg-white/10 hover:text-white border border-white/5'
    }`;

  const inputCls =
    'rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500 transition w-full font-sans';
  const labelCls = 'text-[11px] font-mono text-slate-400 block mb-1';

  return (
    <div className="rounded-lg border border-white/10 bg-[#111318]/90 p-4 space-y-3.5 backdrop-blur-sm shadow-xl">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          Insumo / costo del trabajo
        </label>
        {isOperario && (
          <span className="text-[10px] text-amber-400/90 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            Modo Operario: tarifas protegidas
          </span>
        )}
      </div>

      {/* Tabs / Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTabActivo('UNIDAD')}
          className={pillClass(tabActivo === 'UNIDAD')}
        >
          Por unidad
        </button>
        <button
          type="button"
          onClick={() => setTabActivo('METRO')}
          className={pillClass(tabActivo === 'METRO')}
        >
          Por metro
        </button>
        <button
          type="button"
          onClick={() => setTabActivo('DIMENSION')}
          className={pillClass(tabActivo === 'DIMENSION')}
        >
          Por dimensión (AxA)
        </button>
        <button
          type="button"
          onClick={() => setTabActivo('PORCENTAJE')}
          className={pillClass(tabActivo === 'PORCENTAJE')}
        >
          Por porcentaje
        </button>
        <button
          type="button"
          onClick={() => setTabActivo('FACTURA')}
          className={pillClass(tabActivo === 'FACTURA')}
        >
          Desde factura
        </button>
      </div>

      {/* Formulario según pestaña activa */}
      <div className="pt-1">
        {/* PESTAÑA 1: POR UNIDAD */}
        {tabActivo === 'UNIDAD' && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <label className={labelCls}>Descripción</label>
              <input
                type="text"
                value={descUnidad}
                onChange={(e) => setDescUnidad(e.target.value)}
                placeholder="Ej: Plancha acrílico 3mm"
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-3">
              <label className={labelCls}>Cantidad</label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={cantUnidad}
                onChange={(e) => setCantUnidad(e.target.value)}
                className={inputCls}
              />
            </div>
            {!isOperario && (
              <div className="sm:col-span-2">
                <label className={labelCls}>Precio unitario (Gs.)</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={precioUnidad}
                  onChange={(e) => setPrecioUnidad(e.target.value)}
                  className={inputCls}
                />
              </div>
            )}
            <div className={isOperario ? 'sm:col-span-4' : 'sm:col-span-2'}>
              <button
                type="button"
                onClick={handleAgregar}
                disabled={!descUnidad.trim()}
                className="w-full py-2 px-3 rounded-md bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-xs flex items-center justify-center gap-1 transition shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: POR METRO */}
        {tabActivo === 'METRO' && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <label className={labelCls}>Descripción</label>
              <input
                type="text"
                value={descMetro}
                onChange={(e) => setDescMetro(e.target.value)}
                placeholder="Ej: Barra de metal, perfil, tira LED"
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-3">
              <label className={labelCls}>Metros lineales</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={metros}
                onChange={(e) => setMetros(e.target.value)}
                placeholder="1.2"
                className={inputCls}
              />
            </div>
            {!isOperario && (
              <div className="sm:col-span-2">
                <label className={labelCls}>Precio por metro (Gs.)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={precioMetro}
                  onChange={(e) => setPrecioMetro(e.target.value)}
                  className={inputCls}
                />
              </div>
            )}
            <div className={isOperario ? 'sm:col-span-4' : 'sm:col-span-2'}>
              <button
                type="button"
                onClick={handleAgregar}
                disabled={!descMetro.trim()}
                className="w-full py-2 px-3 rounded-md bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-xs flex items-center justify-center gap-1 transition shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: POR DIMENSIÓN (AxA) */}
        {tabActivo === 'DIMENSION' && (
          <div className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-4">
                <label className={labelCls}>Descripción (impreso/placa)</label>
                <input
                  type="text"
                  value={descDimension}
                  onChange={(e) => setDescDimension(e.target.value)}
                  placeholder="Ej: Adhesivo impreso / Lona"
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Ancho (cm)</label>
                <input
                  type="number"
                  min="1"
                  value={anchoCm}
                  onChange={(e) => setAnchoCm(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Alto (cm)</label>
                <input
                  type="number"
                  min="1"
                  value={altoCm}
                  onChange={(e) => setAltoCm(e.target.value)}
                  className={inputCls}
                />
              </div>
              {!isOperario && (
                <div className="sm:col-span-2">
                  <label className={labelCls}>Precio por m² (Gs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={precioPorM2}
                    onChange={(e) => setPrecioPorM2(e.target.value)}
                    className={inputCls}
                  />
                </div>
              )}
              <div className={isOperario ? 'sm:col-span-4' : 'sm:col-span-2'}>
                <button
                  type="button"
                  onClick={handleAgregar}
                  disabled={!descDimension.trim()}
                  className="w-full py-2 px-3 rounded-md bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-xs flex items-center justify-center gap-1 transition shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar
                </button>
              </div>
            </div>

            {/* Checkbox de desperdicio */}
            <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-white/5">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={calcDesperdicio}
                  onChange={(e) => setCalcDesperdicio(e.target.checked)}
                  className="rounded border-white/20 bg-black/40 text-amber-500 focus:ring-amber-500/30"
                />
                <span>Calcular desperdicio del material (lo que sobra del rollo/plancha)</span>
              </label>

              {calcDesperdicio && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-mono">Bobina:</span>
                  <select
                    value={bobinaSeleccionada}
                    onChange={(e) => setBobinaSeleccionada(Number(e.target.value))}
                    className="rounded border border-white/10 bg-[#090a0f] px-2 py-1 text-xs text-slate-200 outline-none"
                  >
                    {BOBINAS_ESTANDAR.map((b) => (
                      <option key={b.val} value={b.val}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA 4: POR PORCENTAJE */}
        {tabActivo === 'PORCENTAJE' && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <label className={labelCls}>Descripción</label>
              <input
                type="text"
                value={descPorcentaje}
                onChange={(e) => setDescPorcentaje(e.target.value)}
                placeholder="Ej: Bidón de pintura, solvente, masilla"
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-3">
              <label className={labelCls}>Porcentaje usado (%)</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={porcentajeUsado}
                  onChange={(e) => setPorcentajeUsado(e.target.value)}
                  className={inputCls}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">%</span>
              </div>
            </div>
            {!isOperario && (
              <div className="sm:col-span-2">
                <label className={labelCls}>Precio total insumo (Gs.)</label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={precioTotalInsumo}
                  onChange={(e) => setPrecioTotalInsumo(e.target.value)}
                  placeholder="150000"
                  className={inputCls}
                />
              </div>
            )}
            <div className={isOperario ? 'sm:col-span-4' : 'sm:col-span-2'}>
              <button
                type="button"
                onClick={handleAgregar}
                disabled={!descPorcentaje.trim()}
                className="w-full py-2 px-3 rounded-md bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-xs flex items-center justify-center gap-1 transition shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            </div>
          </div>
        )}

        {/* PESTAÑA 5: DESDE FACTURA */}
        {tabActivo === 'FACTURA' && (
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-6">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono text-slate-400">Factura / insumo comprado</label>
                  {!isOperario && (
                    <button
                      type="button"
                      onClick={() => setShowModalNuevaFactura(true)}
                      className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"
                    >
                      + Nueva compra
                    </button>
                  )}
                </div>
                {loadingFacturas ? (
                  <div className="text-xs text-slate-400 py-2 font-mono">Cargando facturas...</div>
                ) : facturas.length === 0 ? (
                  <div className="text-xs text-slate-400 py-2 border border-white/5 rounded-md px-3 bg-black/20">
                    No hay facturas con saldo cargadas en el sistema.
                  </div>
                ) : (
                  <select
                    value={facturaSeleccionadaId}
                    onChange={(e) => setFacturaSeleccionadaId(e.target.value)}
                    className={inputCls}
                  >
                    {facturas.map((f) => (
                      <option key={f.id} value={f.id} className="bg-[#111318] text-slate-200">
                        {f.proveedor} — {f.descripcion} (Saldo: {f.cantidadDisponible} {f.unidad})
                        {!isOperario ? ` — Gs. ${Math.round(f.precioUnitario).toLocaleString('es-PY')}/${f.unidad}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="sm:col-span-3">
                <label className={labelCls}>Cantidad usada</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={cantidadFacturaUsada}
                  onChange={(e) => setCantidadFacturaUsada(e.target.value)}
                  placeholder="0.5"
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-3">
                <button
                  type="button"
                  onClick={handleAgregar}
                  disabled={!facturaSeleccionadaId || facturas.length === 0}
                  className="w-full py-2 px-3 rounded-md bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-xs flex items-center justify-center gap-1 transition shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Rápido: Cargar Factura de Compra (Admin) */}
      {showModalNuevaFactura && (
        <NuevaFacturaCompraModal
          onClose={() => setShowModalNuevaFactura(false)}
          onSuccess={() => {
            setShowModalNuevaFactura(false);
            cargarFacturas();
          }}
        />
      )}
    </div>
  );
}

/**
 * Modal rápido para registrar factura de compra sin salir del flujo
 */
function NuevaFacturaCompraModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [facturaNumero, setFacturaNumero] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cantidadComprada, setCantidadComprada] = useState('10');
  const [unidad, setUnidad] = useState('u');
  const [precioUnitario, setPrecioUnitario] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facturaNumero.trim() || !proveedor.trim() || !descripcion.trim()) {
      setError('Completá número de factura, proveedor y descripción');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      const res = await authFetchJSON<{ success: boolean; message?: string }>('/api/facturas-compra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facturaNumero: facturaNumero.trim(),
          proveedor: proveedor.trim(),
          descripcion: descripcion.trim(),
          cantidadComprada: parseFloat(cantidadComprada) || 1,
          unidad: unidad.trim() || 'u',
          precioUnitario: parseFloat(precioUnitario) || 0,
        }),
      });

      if (res.success) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar factura');
    } finally {
      setGuardando(false);
    }
  };

  const inputCls =
    'rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500 transition w-full';
  const labelCls = 'text-[11px] font-mono text-slate-400 block mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="rounded-xl border border-white/15 bg-[#111318] p-5 w-full max-w-md shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-amber-400" /> Cargar Factura de Compra
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-sm">
            ✕
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Factura #</label>
              <input
                type="text"
                placeholder="001-002-1234"
                value={facturaNumero}
                onChange={(e) => setFacturaNumero(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Proveedor</label>
              <input
                type="text"
                placeholder="Ej: Luminum / Ferretería"
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                className={inputCls}
                required
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Descripción del insumo comprado</label>
            <input
              type="text"
              placeholder="Ej: Perfil aluminio 20x20 o Tubos PVC"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className={inputCls}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelCls}>Cantidad</label>
              <input
                type="number"
                step="any"
                value={cantidadComprada}
                onChange={(e) => setCantidadComprada(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Unidad</label>
              <input
                type="text"
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                placeholder="u, m, rollo"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Precio unit. (Gs.)</label>
              <input
                type="number"
                step="1000"
                value={precioUnitario}
                onChange={(e) => setPrecioUnitario(e.target.value)}
                placeholder="45000"
                className={inputCls}
                required
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md border border-white/10 bg-white/5 text-xs text-slate-300 hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-4 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs flex items-center gap-1.5"
            >
              {guardando ? 'Guardando...' : 'Guardar Factura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
