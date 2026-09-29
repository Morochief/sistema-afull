/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  PenTool,
  CheckCircle2,
  Clock,
  Calculator,
  FileText,
  AlertOctagon,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { DatabaseState } from '../types.ts';
import { AdminSection, FormSectionHeader } from './AdminShared.tsx';
import CalculadoraAdhesivoModal, { CalculoAdhesivoResultado } from './CalculadoraAdhesivoModal.tsx';

export interface RegistroManualFormProps {
  data: DatabaseState;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitPending: boolean;
  formError: string | null;
  selectedClienteId: string;
  setSelectedClienteId: (id: string) => void;
  selectedProyectoId: string;
  setSelectedProyectoId: (id: string) => void;
  concepto: 'MO' | 'Insumo' | 'Otros';
  setConcepto: (c: 'MO' | 'Insumo' | 'Otros') => void;
  fecha: string;
  setFecha: (f: string) => void;
  descripcion: string;
  setDescripcion: (d: string) => void;
  selectedColaboradorId: string;
  handleColaboradorSelect: (id: string) => void;
  hours: string;
  setHours: (h: string) => void;
  quantity: string;
  setQuantity: (q: string) => void;
  precioUnitario: string;
  setPrecioUnitario: (p: string) => void;
}

export default function RegistroManualForm({
  data,
  onSubmit,
  isSubmitPending,
  formError,
  selectedClienteId,
  setSelectedClienteId,
  selectedProyectoId,
  setSelectedProyectoId,
  concepto,
  setConcepto,
  fecha,
  setFecha,
  descripcion,
  setDescripcion,
  selectedColaboradorId,
  handleColaboradorSelect,
  hours,
  setHours,
  quantity,
  setQuantity,
  precioUnitario,
  setPrecioUnitario
}: RegistroManualFormProps) {

  const filteredProjects = useMemo(() => {
    if (!selectedClienteId) return [];
    return data.proyectos.filter(p => p.clienteId === selectedClienteId);
  }, [selectedClienteId, data.proyectos]);

  // Real-time calculation
  const totalLiquidacion = useMemo(() => {
    const finalCantidad = concepto === 'MO' ? parseFloat(hours) * 60 : parseFloat(quantity);
    const finalPrecio = parseFloat(precioUnitario) || 0;
    return Math.round(finalCantidad * finalPrecio);
  }, [concepto, hours, quantity, precioUnitario]);

  const [showCalculadora, setShowCalculadora] = useState(false);

  const handleAplicarCalculo = (res: CalculoAdhesivoResultado) => {
    setQuantity(String(res.areaTotalM2));
    if (res.precioUnitarioGs) {
      setPrecioUnitario(String(res.precioUnitarioGs));
    }
    setDescripcion(res.resumenTexto);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <AdminSection
        title="Carga Manual Directa (Contingencia / Ajuste)"
        icon={<PenTool className="w-4 h-4 text-orange-400" />}
        description="Registrá partes diarios individuales, horas de mano de obra o insumos específicos fuera de importaciones masivas."
      >
        <form onSubmit={onSubmit} className="space-y-5">
          
          {/* SECTION 1: Contexto del Registro */}
          <div className="space-y-3">
            <FormSectionHeader 
              step={1} 
              title="Contexto del Registro" 
              icon={<Building2 className="w-4 h-4" />}
              required
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-9">
              {/* Cliente */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  Cliente
                  <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={selectedClienteId}
                  onChange={(e) => {
                    setSelectedClienteId(e.target.value);
                    setSelectedProyectoId('');
                  }}
                  className="w-full bg-[#090a0f] border border-white/10 text-white rounded-md px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                >
                  <option value="">Seleccionar cliente...</option>
                  {data.clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Proyecto */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  Proyecto Asociado
                  <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  disabled={!selectedClienteId}
                  value={selectedProyectoId}
                  onChange={(e) => setSelectedProyectoId(e.target.value)}
                  className="w-full bg-[#090a0f] border border-white/10 text-white rounded-md px-3 py-2 text-xs focus:outline-none focus:border-orange-500 disabled:opacity-50"
                >
                  <option value="">{selectedClienteId ? 'Seleccionar proyecto...' : 'Seleccione cliente primero'}</option>
                  {filteredProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Fecha */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  Fecha del Registro
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full bg-[#090a0f] border border-white/10 text-white rounded-md px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Tipo de Operación */}
          <div className="space-y-3">
            <FormSectionHeader 
              step={2} 
              title="Tipo de Operación" 
              icon={<Calculator className="w-4 h-4" />}
              required
            />
            
            <div className="pl-9">
              <label className="text-[11px] font-mono text-slate-400 mb-1.5 block">Concepto del Gasto</label>
              <div className="grid grid-cols-3 gap-2.5 max-w-md">
                {(['MO', 'Insumo', 'Otros'] as const).map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setConcepto(option);
                      if (option !== 'MO') {
                        setPrecioUnitario('12500');
                      } else {
                        setPrecioUnitario('350');
                      }
                    }}
                    className={`text-xs font-bold py-2.5 px-3 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 border ${
                      concepto === option 
                        ? 'bg-orange-600 text-white border-orange-500' 
                        : 'bg-[#090a0f] text-slate-400 hover:text-white border-white/10 hover:border-white/20'
                    }`}
                  >
                    {concepto === option && <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>{option === 'MO' ? 'Mano de Obra' : option === 'Insumo' ? 'Insumos / Mat.' : 'Otros Gastos'}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 3: Detalles Específicos */}
          <div className="space-y-3">
            <FormSectionHeader 
              step={3} 
              title="Detalles Específicos" 
              icon={<FileText className="w-4 h-4" />}
              required
            />
            
            <AnimatePresence mode="wait">
              <motion.div 
                key={concepto}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-9"
              >
                {concepto === 'MO' ? (
                  <>
                    {/* Colaborador */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-slate-400">Colaborador Técnico</label>
                      <select
                        value={selectedColaboradorId}
                        onChange={(e) => handleColaboradorSelect(e.target.value)}
                        className="w-full bg-[#090a0f] border border-white/10 text-white rounded-md px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                      >
                        <option value="">Operario no clasificado</option>
                        {data.colaboradores.map(col => (
                          <option key={col.id} value={col.id}>{col.nombre} ({col.rol})</option>
                        ))}
                      </select>
                    </div>

                    {/* Horas */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-slate-400">Dedicación (Horas)</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          step="0.5"
                          required
                          value={hours}
                          onChange={(e) => setHours(e.target.value)}
                          className="w-full bg-[#090a0f] border border-white/10 text-white rounded-md px-3 py-2 text-xs text-right focus:outline-none focus:border-orange-500"
                        />
                        <span className="text-slate-500 font-mono text-xs select-none shrink-0">hs</span>
                      </div>
                    </div>

                    {/* Precio por Minuto */}
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[11px] font-mono text-slate-400">Precio por Minuto (Tarifa Gs.)</label>
                      <div className="flex gap-2 items-center">
                        <span className="text-slate-500 font-mono text-xs font-semibold shrink-0">Gs.</span>
                        <input
                          type="number"
                          required
                          value={precioUnitario}
                          onChange={(e) => setPrecioUnitario(e.target.value)}
                          className="w-full bg-[#090a0f] border border-white/10 text-white rounded-md px-3 py-2 text-xs text-right focus:outline-none focus:border-orange-500 font-mono"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {concepto === 'Insumo' && (
                      <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-orange-500/10 border border-orange-500/20 rounded-md p-2.5 mb-1">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
                          <span className="text-xs text-orange-200">¿Trabajás con lonas, adhesivos o mermas de impresión?</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCalculadora(true)}
                          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-mono text-xs rounded transition-colors flex items-center justify-center gap-1.5 shadow cursor-pointer shrink-0"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          <span>📐 Calcular Lona / Desperdicio</span>
                        </button>
                      </div>
                    )}

                    {/* Cantidad */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-slate-400">Cantidad (Metros / Unidades / Kilos)</label>
                      <input
                        type="number"
                        required
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full bg-[#090a0f] border border-white/10 text-white rounded-md px-3 py-2 text-xs text-right focus:outline-none focus:border-orange-500 font-mono"
                      />
                    </div>

                    {/* Precio Unitario */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-slate-400">Precio Unitario de Venta (Gs.)</label>
                      <div className="flex gap-2 items-center">
                        <span className="text-slate-500 font-mono text-xs font-semibold shrink-0">Gs.</span>
                        <input
                          type="number"
                          required
                          value={precioUnitario}
                          onChange={(e) => setPrecioUnitario(e.target.value)}
                          className="w-full bg-[#090a0f] border border-white/10 text-white rounded-md px-3 py-2 text-xs text-right focus:outline-none focus:border-orange-500 font-mono"
                        />
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* SECTION 4: Resumen y Confirmación */}
          <div className="space-y-3">
            <FormSectionHeader 
              step={4} 
              title="Resumen y Confirmación" 
              icon={<CheckCircle2 className="w-4 h-4" />}
              required
            />
            
            <div className="space-y-3 pl-9">
              {/* Total Liquidación - DESTACADO */}
              <div className="bg-[#090a0f] p-4 rounded-md border border-orange-500/30">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-orange-400" />
                      <span className="text-[10px] uppercase font-mono tracking-wider text-orange-400 font-bold">Total Liquidación Estimado</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {concepto === 'MO' 
                        ? `${hours} hs × 60 min × Gs. ${precioUnitario}/min`
                        : `${quantity} unidades × Gs. ${precioUnitario} c/u`
                      }
                    </p>
                  </div>
                  <div className="text-xl font-mono font-bold text-white">
                    Gs. {totalLiquidacion.toLocaleString('es-PY')}
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  Descripción detallada del Trabajo
                  <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  placeholder="Ej: Retiro de vinilos y ploteado del panel frontal..."
                  rows={2}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full bg-[#090a0f] border border-white/10 text-white rounded-md px-3 py-2 text-xs focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>
            </div>
          </div>

          {formError && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-md flex items-center gap-2"
            >
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </motion.div>
          )}

          <div className="pl-9 pt-2">
            <button
              type="submit"
              disabled={isSubmitPending}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-md cursor-pointer flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isSubmitPending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando registro...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirmar y Guardar en Historial</span>
                </>
              )}
            </button>
          </div>
        </form>
      </AdminSection>

      {/* Calculadora de Lonas, Impresión y Desperdicio */}
      <CalculadoraAdhesivoModal
        isOpen={showCalculadora}
        onClose={() => setShowCalculadora(false)}
        onAplicar={handleAplicarCalculo}
        titulo="Calculadora de Lonas, Impresión y Desperdicio"
      />
    </motion.div>
  );
}
