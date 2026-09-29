/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MisRegistros — Vista personal de registros del usuario
 * 
 * FUNCIONALIDAD:
 * - Muestra registros del usuario actual filtrados por colaboradorId
 * - Permite editar descripción y proyecto asignado
 * - Campos sensibles (horas, precios, fecha, total) son read-only
 * - Modal de edición con validación y feedback visual
 * - Animaciones glass-panel aesthetic con Framer Motion
 * 
 * PATRONES:
 * - Custom Hook (useEditRegistro para lógica de edición)
 * - Compound Components (Modal, Card)
 * - AnimatePresence para transiciones
 * - Memoization para performance
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cardVariants, cardTransition } from '../lib/animations.ts';
import {
  Calendar,
  Clock,
  DollarSign,
  Edit2,
  X,
  CheckCircle,
  AlertCircle,
  Lock,
  Package,
  User,
  Briefcase,
  Building2,
  Save,
  FileText,
  Car,
  MapPin,
  Gauge,
  Fuel,
  AlertTriangle,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { DatabaseState, RegistroItem, RegistroVehiculo } from '../types.ts';
import { authFetchJSON } from '../authFetch.ts';

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface MisRegistrosProps {
  data: DatabaseState;
  currentUser: { nombre: string; rol: string; usuario: string };
  onRefresh: () => Promise<void>;
}

interface EditFormData {
  descripcion: string;
  proyectoId: string;
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function formatGuaranies(value: number): string {
  return 'Gs. ' + Math.round(value).toLocaleString('es-PY');
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('es-AR', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
}

function formatTime(timeStr?: string): string {
  if (!timeStr) return '—';
  return timeStr;
}

function getConceptoBadge(concepto: string) {
  switch (concepto) {
    case 'MO':
      return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    case 'Insumo':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    case 'Otros':
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    default:
      return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  }
}

// ─── CUSTOM HOOK: useEditRegistro ──────────────────────────────────────────

interface UseEditRegistroReturn {
  isEditing: boolean;
  editingId: string | null;
  formData: EditFormData;
  isSubmitting: boolean;
  feedback: { type: 'success' | 'error'; message: string } | null;
  startEdit: (registro: RegistroItem) => void;
  cancelEdit: () => void;
  updateField: (field: keyof EditFormData, value: string) => void;
  submitEdit: () => Promise<void>;
}

function useEditRegistro(
  data: DatabaseState,
  onRefresh: () => Promise<void>
): UseEditRegistroReturn {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EditFormData>({
    descripcion: '',
    proyectoId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const startEdit = useCallback((registro: RegistroItem) => {
    setEditingId(registro.id);
    setFormData({
      descripcion: registro.descripcion,
      proyectoId: registro.proyectoId,
    });
    setIsEditing(true);
    setFeedback(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ descripcion: '', proyectoId: '' });
    setFeedback(null);
  }, []);

  const updateField = useCallback((field: keyof EditFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const submitEdit = useCallback(async () => {
    if (!editingId) return;

    // Validación
    if (!formData.descripcion.trim()) {
      setFeedback({ type: 'error', message: 'La descripción no puede estar vacía.' });
      return;
    }

    if (!formData.proyectoId) {
      setFeedback({ type: 'error', message: 'Debe seleccionar un proyecto.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      // Obtener el registro original para enviar datos completos
      const originalRegistro = data.registros.find(r => r.id === editingId);
      if (!originalRegistro) {
        throw new Error('Registro no encontrado');
      }

      // Enviar PATCH con solo los campos editables
      await authFetchJSON(`/api/registros/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: formData.descripcion.trim(),
          proyectoId: formData.proyectoId,
        }),
      });

      setFeedback({ type: 'success', message: '✓ Cambios guardados con éxito' });
      
      // Refrescar datos
      await onRefresh();
      
      // Cerrar modal después de 1.5 segundos
      setTimeout(() => {
        cancelEdit();
      }, 1500);

    } catch (error: any) {
      console.error('Error al actualizar registro:', error);
      setFeedback({ 
        type: 'error', 
        message: error.message || 'Error al guardar los cambios. Intentá nuevamente.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [editingId, formData, data.registros, onRefresh, cancelEdit]);

  return {
    isEditing,
    editingId,
    formData,
    isSubmitting,
    feedback,
    startEdit,
    cancelEdit,
    updateField,
    submitEdit,
  };
}

// ─── MODAL COMPONENT ────────────────────────────────────────────────────────

interface EditModalProps {
  isOpen: boolean;
  registro: RegistroItem | null;
  formData: EditFormData;
  isSubmitting: boolean;
  feedback: { type: 'success' | 'error'; message: string } | null;
  proyectos: DatabaseState['proyectos'];
  onClose: () => void;
  onUpdateField: (field: keyof EditFormData, value: string) => void;
  onSubmit: () => Promise<void>;
  showPrices: boolean;
}

function EditModal({
  isOpen,
  registro,
  formData,
  isSubmitting,
  feedback,
  proyectos,
  onClose,
  onUpdateField,
  onSubmit,
  showPrices,
}: EditModalProps) {
  if (!isOpen || !registro) return null;

  // Filtrar proyectos del mismo cliente (solo activos, más el seleccionado por coherencia histórica)
  const proyectosFiltrados = proyectos.filter(
    p => p.clienteId === registro.clienteId && (p.activo !== false || p.id === registro.proyectoId)
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div 
              className="glass-panel rounded-md p-6 max-w-2xl w-full pointer-events-auto border-2 border-white/10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-md bg-orange-500/20 border border-orange-500/30">
                    <Edit2 className="w-5 h-5 text-orange-300" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Editar Registro</h2>
                    <p className="text-xs text-slate-400 font-mono">ID: {registro.id}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Campos No Editables (Solo lectura con Lock) */}
              <div className="space-y-4 mb-6">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                      Campos Protegidos (No Editables)
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500 text-xs">Fecha:</span>
                      <p className="text-white font-mono">{formatDate(registro.fecha)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">Concepto:</span>
                      <p className="text-white font-semibold">{registro.concepto}</p>
                    </div>
                    {registro.concepto === 'MO' && (
                      <>
                        <div>
                          <span className="text-slate-500 text-xs">Horas Trabajadas:</span>
                          <p className="text-white font-mono">{registro.hsTotal?.toFixed(2) || '—'} hs</p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-xs">Horario:</span>
                          <p className="text-white font-mono">
                            {formatTime(registro.hsInicio)} - {formatTime(registro.hsFin)}
                          </p>
                        </div>
                      </>
                    )}
                    <div>
                      <span className="text-slate-500 text-xs">Cantidad:</span>
                      <p className="text-white font-mono">{registro.cantidad}</p>
                    </div>
                    {showPrices && (
                      <>
                        <div>
                          <span className="text-slate-500 text-xs">Precio Unitario:</span>
                          <p className="text-white font-mono">{formatGuaranies(registro.precioUnitario)}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 text-xs">Total:</span>
                          <p className="text-white font-bold text-lg">{formatGuaranies(registro.total)}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Campos Editables */}
              <div className="space-y-4 mb-6">
                {/* Descripción */}
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 block flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" />
                    Descripción
                  </label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => onUpdateField('descripcion', e.target.value)}
                    className="glass-input w-full rounded-xl px-4 py-3 text-sm min-h-[100px] resize-none"
                    placeholder="Descripción del trabajo realizado..."
                    disabled={isSubmitting}
                  />
                </div>

                {/* Proyecto */}
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 block flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5" />
                    Proyecto
                  </label>
                  <select
                    value={formData.proyectoId}
                    onChange={(e) => onUpdateField('proyectoId', e.target.value)}
                    className="glass-select w-full rounded-xl px-4 py-3 text-sm"
                    disabled={isSubmitting}
                  >
                    <option value="">— Seleccionar Proyecto —</option>
                    {proyectosFiltrados.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.estado})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1 ml-1">
                    Solo proyectos de {registro.clienteNombre}
                  </p>
                </div>
              </div>

              {/* Feedback */}
              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-3 rounded-xl flex items-center gap-2 mb-4 ${
                      feedback.type === 'success'
                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {feedback.type === 'success' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="text-sm font-medium">{feedback.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
                >
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Save className="w-4 h-4" />
                      </motion.div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Guardar Cambios
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-6 py-3 text-slate-400 hover:text-white hover:bg-white/10 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── REGISTRO CARD ──────────────────────────────────────────────────────────

interface RegistroCardProps {
  registro: RegistroItem;
  onEdit: (registro: RegistroItem) => void;
  showPrices: boolean;
}

const RegistroCard = React.memo<RegistroCardProps>(({ registro, onEdit, showPrices }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="glass-panel rounded-xl p-5 hover:border-orange-500/30 transition-all group"
    >
      {/* Header: Concepto Badge + Edit Button */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wide ${getConceptoBadge(registro.concepto)}`}>
            {registro.concepto === 'MO' ? (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Mano de Obra
              </span>
            ) : registro.concepto === 'Insumo' ? (
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                Insumo
              </span>
            ) : (
              <span>Otros</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onEdit(registro)}
          className="p-2 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 transition-all opacity-0 group-hover:opacity-100"
          title="Editar registro"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {/* Descripción */}
        <div>
          <p className="text-white font-medium text-sm leading-relaxed">
            {registro.descripcion}
          </p>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(registro.fecha)}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <Building2 className="w-3.5 h-3.5" />
            <span className="truncate">{registro.clienteNombre}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 col-span-2">
            <Briefcase className="w-3.5 h-3.5" />
            <span className="truncate">{registro.proyectoNombre}</span>
          </div>

          {registro.concepto === 'MO' && (
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{registro.hsTotal?.toFixed(2) || '—'} horas</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-slate-400">
            <Package className="w-3.5 h-3.5" />
            <span>Cantidad: {registro.cantidad}</span>
          </div>
        </div>

        {/* Total */}
        {showPrices && (
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">Total</span>
          <span className="text-white font-bold text-lg font-mono">
            {formatGuaranies(registro.total)}
          </span>
        </div>
        )}
      </div>
    </motion.div>
  );
});

RegistroCard.displayName = 'RegistroCard';

// ─── REGISTRO VEHICULO CARD ─────────────────────────────────────────────────

interface RegistroVehiculoCardProps {
  registro: RegistroVehiculo;
  showPrices: boolean;
}

const RegistroVehiculoCard = React.memo<RegistroVehiculoCardProps>(({ registro, showPrices }) => {
  const esParticular = registro.clienteNombre === 'Viaje Particular';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`glass-panel rounded-xl p-5 transition-all group ${
        registro.alertaDiscrepancia ? 'border-2 border-amber-500/30 bg-amber-500/5' : 'hover:border-orange-500/30'
      }`}
    >
      {/* Header: Concepto Badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wide ${
            esParticular 
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
          }`}>
            <span className="flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5" />
              Vehículo {esParticular && '(Particular)'}
            </span>
          </div>
          
          {registro.alertaDiscrepancia && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded-lg">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] font-bold text-amber-300">Alerta</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {/* Descripción */}
        <div>
          <p className="text-white font-medium text-sm leading-relaxed">
            {registro.descripcion}
          </p>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(registro.fecha)}</span>
          </div>

          {!esParticular && (
            <>
              <div className="flex items-center gap-2 text-slate-400">
                <Building2 className="w-3.5 h-3.5" />
                <span className="truncate">{registro.clienteNombre}</span>
              </div>

              <div className="flex items-center gap-2 text-slate-400 col-span-2">
                <Briefcase className="w-3.5 h-3.5" />
                <span className="truncate">{registro.proyectoNombre}</span>
              </div>
            </>
          )}

          <div className="flex items-center gap-2 text-slate-400">
            <Gauge className="w-3.5 h-3.5" />
            <span>{registro.distanciaOdometro} km</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{registro.duracionMinutos} min</span>
          </div>

          {registro.combustibleLitros && (
            <div className="flex items-center gap-2 text-slate-400">
              <Fuel className="w-3.5 h-3.5" />
              <span>{registro.combustibleLitros} litros</span>
            </div>
          )}

          {registro.consumoPorKm && (
            <div className="flex items-center gap-2 text-slate-400">
              <Gauge className="w-3.5 h-3.5" />
              <span>{registro.consumoPorKm.toFixed(2)} L/km</span>
            </div>
          )}
        </div>

        {registro.alertaDiscrepancia && (
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-[10px] text-amber-300">
              <strong>Discrepancia detectada:</strong> {registro.discrepancia?.toFixed(1)}% diferencia entre GPS y odómetro
            </p>
          </div>
        )}

        {/* Total */}
        {showPrices && (
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">Combustible</span>
          <span className="text-white font-bold text-lg font-mono">
            {formatGuaranies(registro.total)}
          </span>
        </div>
        )}
      </div>
    </motion.div>
  );
});

RegistroVehiculoCard.displayName = 'RegistroVehiculoCard';

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function MisRegistros({ data, currentUser, onRefresh }: MisRegistrosProps) {
  // Estado local para registros del servidor
  const [registros, setRegistros] = useState<RegistroItem[]>([]);
  const [registrosVehiculo, setRegistrosVehiculo] = useState<RegistroVehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── FILTERS ───
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');
  const [filterConcepto, setFilterConcepto] = useState('');
  const [filterCliente, setFilterCliente] = useState('');
  const [filterProyecto, setFilterProyecto] = useState('');

  // ─── PAGINATION ───
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const {
    isEditing,
    editingId,
    formData,
    isSubmitting,
    feedback,
    startEdit,
    cancelEdit,
    updateField,
    submitEdit,
  } = useEditRegistro(data, onRefresh);

  // Fetch registros del servidor
  useEffect(() => {
    const fetchRegistros = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch both regular and vehicle registros in parallel
        const [registrosResponse, vehiculoResponse] = await Promise.all([
          authFetchJSON<{ success: boolean; data: RegistroItem[] }>('/api/registros/mis-registros'),
          authFetchJSON<{ success: boolean; data: RegistroVehiculo[] }>('/api/vehiculo/mis-registros')
        ]);

        if (registrosResponse.success && registrosResponse.data) {
          setRegistros(registrosResponse.data);
        } else {
          setRegistros([]);
        }

        if (vehiculoResponse.success && vehiculoResponse.data) {
          setRegistrosVehiculo(vehiculoResponse.data);
        } else {
          setRegistrosVehiculo([]);
        }
      } catch (err: any) {
        console.error('Error fetching registros:', err);
        setError(err.message || 'Error al cargar los registros');
        setRegistros([]);
        setRegistrosVehiculo([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRegistros();
  }, []);

  // Re-fetch cuando se refresque desde el padre
  useEffect(() => {
    const refetchRegistros = async () => {
      try {
        const [registrosResponse, vehiculoResponse] = await Promise.all([
          authFetchJSON<{ success: boolean; data: RegistroItem[] }>('/api/registros/mis-registros'),
          authFetchJSON<{ success: boolean; data: RegistroVehiculo[] }>('/api/vehiculo/mis-registros')
        ]);

        if (registrosResponse.success && registrosResponse.data) {
          setRegistros(registrosResponse.data);
        }

        if (vehiculoResponse.success && vehiculoResponse.data) {
          setRegistrosVehiculo(vehiculoResponse.data);
        }
      } catch (err) {
        console.error('Error refetching registros:', err);
      }
    };

    // Solo re-fetch si no estamos en el mount inicial
    if (!loading) {
      refetchRegistros();
    }
  }, [data.registros, data.registrosVehiculo]); // Watch both

  // Buscar el colaborador SOLO para mostrar la tarifa en el badge (no bloquea el render).
  // El servidor ya filtra los registros por el colaboradorId del JWT, así que la
  // identidad del usuario viene de `currentUser` (nombre / rol) y este lookup es opcional.
  const currentUserColaborador = useMemo(() => {
    return data.colaboradores.find(
      col => {
        if (!col?.nombre || !currentUser?.nombre) return false;
        const colName = col.nombre.toLowerCase();
        const userName = currentUser.nombre.toLowerCase();
        return colName.includes(userName) || userName.includes(colName);
      }
    );
  }, [data.colaboradores, currentUser.nombre]);

  // Usar los registros del servidor (ya filtrados)
  const misRegistros = registros;
  const misRegistrosVehiculo = registrosVehiculo;

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterFechaDesde, filterFechaHasta, filterConcepto, filterCliente, filterProyecto, itemsPerPage]);

  // ─── FILTERED + GROUPED DATA ──────────────────────────────────────────────
  const registrosPorFecha = useMemo(() => {
    let filteredRegular = misRegistros;
    let filteredVehiculo = misRegistrosVehiculo;

    // Filtro por concepto
    if (filterConcepto === 'Vehículo') {
      filteredRegular = [];
    } else if (filterConcepto) {
      filteredRegular = filteredRegular.filter(r => r.concepto === filterConcepto);
      filteredVehiculo = [];
    }

    // Filtro por cliente
    if (filterCliente) {
      filteredRegular = filteredRegular.filter(r => r.clienteId === filterCliente);
      filteredVehiculo = filteredVehiculo.filter(r => r.clienteId === filterCliente);
    }
    // Filtro por proyecto
    if (filterProyecto) {
      filteredRegular = filteredRegular.filter(r => r.proyectoId === filterProyecto);
      filteredVehiculo = filteredVehiculo.filter(r => r.proyectoId === filterProyecto);
    }
    // Filtro por rango de fechas
    if (filterFechaDesde) {
      filteredRegular = filteredRegular.filter(r => r.fecha >= filterFechaDesde);
      filteredVehiculo = filteredVehiculo.filter(r => r.fecha >= filterFechaDesde);
    }
    if (filterFechaHasta) {
      filteredRegular = filteredRegular.filter(r => r.fecha <= filterFechaHasta);
      filteredVehiculo = filteredVehiculo.filter(r => r.fecha <= filterFechaHasta);
    }

    // Agrupar por fecha
    const grupos = new Map<string, { regular: RegistroItem[]; vehiculo: RegistroVehiculo[] }>();
    filteredRegular.forEach(registro => {
      const fecha = registro.fecha;
      if (!grupos.has(fecha)) grupos.set(fecha, { regular: [], vehiculo: [] });
      grupos.get(fecha)!.regular.push(registro);
    });
    filteredVehiculo.forEach(registro => {
      const fecha = registro.fecha;
      if (!grupos.has(fecha)) grupos.set(fecha, { regular: [], vehiculo: [] });
      grupos.get(fecha)!.vehiculo.push(registro);
    });

    return Array.from(grupos.entries())
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  }, [misRegistros, misRegistrosVehiculo, filterFechaDesde, filterFechaHasta, filterConcepto, filterCliente, filterProyecto]);

  // ─── PAGINATED DATA ───────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(registrosPorFecha.length / itemsPerPage));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const registrosPaginated = useMemo(() => {
    const start = (currentPageSafe - 1) * itemsPerPage;
    return registrosPorFecha.slice(start, start + itemsPerPage);
  }, [registrosPorFecha, currentPageSafe, itemsPerPage]);

  const clearFilters = useCallback(() => {
    setFilterFechaDesde('');
    setFilterFechaHasta('');
    setFilterConcepto('');
    setFilterCliente('');
    setFilterProyecto('');
  }, []);

  // Total acumulado (incluye vehículos)
  const totalAcumulado = useMemo(() => {
    const totalRegular = misRegistros.reduce((acc, r) => acc + r.total, 0);
    const totalVehiculo = misRegistrosVehiculo.reduce((acc, r) => acc + r.total, 0);
    return totalRegular + totalVehiculo;
  }, [misRegistros, misRegistrosVehiculo]);

  // Registro siendo editado
  const editingRegistro = useMemo(() => {
    return misRegistros.find(r => r.id === editingId) || null;
  }, [misRegistros, editingId]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Mis Registros
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Cargando registros...
            </p>
          </div>
        </div>
        <div className="glass-panel rounded-md p-12 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 mx-auto mb-4"
          >
            <Clock className="w-12 h-12 text-orange-400" />
          </motion.div>
          <p className="text-slate-400 text-sm">Cargando tus registros...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Mis Registros
            </h1>
          </div>
        </div>
        <div className="glass-panel rounded-md p-8 text-center">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Error al cargar registros</h2>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-md transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Mis Registros
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Visualizá y editá tus registros de mano de obra
          </p>
        </div>

        {/* Stats Badge */}
        <div className="glass-panel rounded-xl px-6 py-3 flex items-center gap-4">
          <div className="text-center">
            <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Total Registros</p>
            <p className="text-2xl font-bold text-white">{misRegistros.length + misRegistrosVehiculo.length}</p>
          </div>
          {currentUser?.rol !== 'Operario' && (
            <>
              <div className="w-px h-12 bg-white/10" />
              <div className="text-center">
                <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Total Acumulado</p>
                <p className="text-xl font-bold text-emerald-400 font-mono">{formatGuaranies(totalAcumulado)}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* User Info Badge */}
      <div className="glass-panel rounded-xl p-4 flex items-center gap-3 border-2 border-orange-500/20">
        <div className="p-3 rounded-xl bg-orange-500/20 border border-orange-500/30">
          <User className="w-5 h-5 text-orange-300" />
        </div>
        <div>
          <p className="text-white font-semibold">{currentUser.nombre}</p>
          <p className="text-xs text-slate-400">
            {currentUser.rol}
            {currentUser?.rol !== 'Operario' && currentUserColaborador?.tarifaSugerida != null && (
              <> • Tarifa: {formatGuaranies(currentUserColaborador.tarifaSugerida)}/min</>
            )}
          </p>
        </div>
      </div>

      {/* ─── FILTER BAR ─── */}
      <div className="glass-panel rounded-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-white flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-orange-400" /> Filtros
          </h3>
          <button
            onClick={clearFilters}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Limpiar filtros
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 block">Cliente</label>
            <select value={filterCliente} onChange={e => { setFilterCliente(e.target.value); setFilterProyecto(''); }} className="glass-select w-full rounded-md px-3 py-2 text-xs">
              <option value="">Todos los Clientes</option>
              {data.clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 block">Proyecto</label>
            <select value={filterProyecto} onChange={e => setFilterProyecto(e.target.value)} className="glass-select w-full rounded-md px-3 py-2 text-xs">
              <option value="">Todos los Proyectos</option>
              {data.proyectos.filter(p => !filterCliente || p.clienteId === filterCliente).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 block">Concepto</label>
            <select value={filterConcepto} onChange={e => setFilterConcepto(e.target.value)} className="glass-select w-full rounded-md px-3 py-2 text-xs">
              <option value="">Todos</option>
              <option value="MO">Mano de Obra</option>
              <option value="Insumo">Insumo</option>
              <option value="Vehículo">Vehículo</option>
              <option value="Otros">Otros</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 block">Desde</label>
              <input type="date" value={filterFechaDesde} onChange={e => setFilterFechaDesde(e.target.value)} className="glass-select w-full rounded-md px-3 py-2 text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 block">Hasta</label>
              <input type="date" value={filterFechaHasta} onChange={e => setFilterFechaHasta(e.target.value)} className="glass-select w-full rounded-md px-3 py-2 text-xs" />
            </div>
          </div>
        </div>
      </div>

      {/* Registros agrupados por fecha */}
      {registrosPorFecha.length === 0 ? (
        <div className="glass-panel rounded-md p-12 text-center">
          <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No tenés registros todavía</h2>
          <p className="text-slate-400 text-sm">
            Empezá a registrar tu trabajo desde la pestaña "Registro Operativo"
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {registrosPaginated.map(([fecha, registros]) => {
            const totalRegistros = registros.regular.length + registros.vehiculo.length;
            
            return (
              <div key={fecha}>
                {/* Fecha Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar className="w-4 h-4" />
                    <h2 className="font-semibold text-lg">{formatDate(fecha)}</h2>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
                  <span className="text-xs text-slate-500 font-mono">
                    {totalRegistros} registro{totalRegistros !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Registros Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <AnimatePresence>
                    {/* Regular registros */}
                    {registros.regular.map(registro => (
                      <RegistroCard
                        key={registro.id}
                        registro={registro}
                        onEdit={startEdit}
                        showPrices={currentUser?.rol !== 'Operario'}
                      />
                    ))}
                    
                    {/* Vehicle registros */}
                    {registros.vehiculo.map(registro => (
                      <RegistroVehiculoCard
                        key={registro.id}
                        registro={registro}
                        showPrices={currentUser?.rol !== 'Operario'}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
          {/* ─── PAGINATION ─── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">Items por página:</span>
              <select
                value={itemsPerPage}
                onChange={e => setItemsPerPage(Number(e.target.value))}
                className="glass-select rounded-lg px-3 py-1.5 text-xs"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-xs text-slate-500 font-mono ml-2">
                {registrosPorFecha.length} fechas
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPageSafe <= 1}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                    page === currentPageSafe
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPageSafe >= totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditModal
        isOpen={isEditing}
        registro={editingRegistro}
        formData={formData}
        isSubmitting={isSubmitting}
        feedback={feedback}
        proyectos={data.proyectos}
        onClose={cancelEdit}
        onUpdateField={updateField}
        onSubmit={submitEdit}
        showPrices={currentUser?.rol !== 'Operario'}
      />
    </div>
  );
}
