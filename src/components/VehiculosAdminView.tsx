/**
 * Vista de Administración de Registros de Vehículo
 * Muestra todos los viajes con km, combustible, fotos y alertas
 * CRUD: Editar y Eliminar registros (Admin only)
 * Toggle: Listado (CRUD) vs Dashboard (Análisis)
 * Enterprise Design: Paleta Black & Orange (#090a0f, #111318, #ea580c), rounded-md
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Car,
  MapPin,
  Gauge,
  Fuel,
  Camera,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Filter,
  Eye,
  Edit2,
  Trash2,
  X,
  Save,
  BarChart3,
  List
} from 'lucide-react';
import { DatabaseState, RegistroVehiculo } from '../types';
import { authFetchJSON } from '../authFetch';
import VehiculosAnalysis from './vehiculos/VehiculosAnalysis';
import { useSortAndPaginate } from '../lib/tableUtils';
import Pagination from './Pagination';

interface Props {
  data: DatabaseState;
  onRefresh: () => Promise<void>;
  initialEditId?: string | null; // ID del registro a editar automáticamente
}

function formatGuaranies(value: number): string {
  return 'Gs. ' + Math.round(value).toLocaleString('es-PY');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

// ─── CUSTOM HOOK: useVehiculoCRUD ──────────────────────────────────────────

interface EditFormData {
  kmInicial: number;
  kmFinal: number;
  costoPorKm: number;
  total: number;
  descripcion: string;
  fecha: string;
  fotoOdometroInicio?: string; // base64 new photo or existing URL
  fotoOdometroFin?: string;
}

function useVehiculoCRUD(onRefresh: () => Promise<void>) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EditFormData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const startEdit = useCallback((registro: RegistroVehiculo) => {
    const distancia = registro.kmFinal - registro.kmInicial;
    const costoPorKm = distancia > 0 && registro.total > 0
      ? Math.round(registro.total / distancia)
      : 1400;
    setEditingId(registro.id);
    setFormData({
      kmInicial: registro.kmInicial,
      kmFinal: registro.kmFinal,
      costoPorKm,
      total: registro.total,
      descripcion: registro.descripcion,
      fecha: registro.fecha,
      fotoOdometroInicio: registro.fotoOdometroInicio,
      fotoOdometroFin: registro.fotoOdometroFin,
    });
    setFeedback(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setFormData(null);
    setFeedback(null);
  }, []);

  const updateField = useCallback((field: keyof EditFormData, value: any) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  }, []);

  const submitEdit = useCallback(async () => {
    if (!editingId || !formData) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const distancia = formData.kmFinal - formData.kmInicial;
      const total = distancia > 0 ? Math.round(distancia * formData.costoPorKm) : formData.total;

      await authFetchJSON(`/api/vehiculo/registro/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kmInicial: formData.kmInicial,
          kmFinal: formData.kmFinal,
          total,
          descripcion: formData.descripcion,
          fecha: formData.fecha,
          // Only send foto fields if they are new base64 data — skip existing URLs
          fotoOdometroInicio: formData.fotoOdometroInicio?.startsWith('data:') ? formData.fotoOdometroInicio : undefined,
          fotoOdometroFin: formData.fotoOdometroFin?.startsWith('data:') ? formData.fotoOdometroFin : undefined,
        })
      });

      // Close modal BEFORE refresh to avoid re-render issues
      setEditingId(null);
      setFormData(null);
      setFeedback(null);
      
      // Refresh data after closing
      await onRefresh();
    } catch (error: any) {
      console.error('Error updating registro:', error);
      setFeedback({ 
        type: 'error', 
        message: error.message || 'Error al actualizar el registro' 
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [editingId, formData, onRefresh]);

  const startDelete = useCallback((id: string) => {
    setDeletingId(id);
    setFeedback(null);
  }, []);

  const cancelDelete = useCallback(() => {
    setDeletingId(null);
    setFeedback(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingId) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await authFetchJSON(`/api/vehiculo/registro/${deletingId}`, {
        method: 'DELETE'
      });

      await onRefresh();
      setDeletingId(null);

    } catch (error: any) {
      console.error('Error deleting registro:', error);
      setFeedback({ 
        type: 'error', 
        message: error.message || 'Error al eliminar el registro' 
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [deletingId, onRefresh]);

  return {
    editingId,
    deletingId,
    formData,
    isSubmitting,
    feedback,
    startEdit,
    cancelEdit,
    updateField,
    submitEdit,
    startDelete,
    cancelDelete,
    confirmDelete
  };
}

const addCacheBuster = (() => {
  const version = Date.now();
  return (url: string | undefined): string => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${version}`;
  };
})();

export default function VehiculosAdminView({ data, onRefresh, initialEditId }: Props) {
  const [viewMode, setViewMode] = useState<'list' | 'dashboard'>('list');
  const [filtroAlerta, setFiltroAlerta] = useState<'todos' | 'alertas' | 'ok'>('todos');
  const [fotoModal, setFotoModal] = useState<{ url: string; tipo: string } | null>(null);

  const hasAutoOpenedRef = React.useRef(false);
  
  const {
    editingId,
    deletingId,
    formData,
    isSubmitting,
    feedback,
    startEdit,
    cancelEdit,
    updateField,
    submitEdit,
    startDelete,
    cancelDelete,
    confirmDelete
  } = useVehiculoCRUD(onRefresh);
  
  // Auto-abrir edición si se pasa initialEditId (solo una vez al montar)
  React.useEffect(() => {
    if (initialEditId && data.registrosVehiculo && !hasAutoOpenedRef.current) {
      const registro = data.registrosVehiculo.find(r => r.id === initialEditId);
      if (registro) {
        startEdit(registro);
        setViewMode('list');
        hasAutoOpenedRef.current = true;
      }
    }
  }, [initialEditId, data.registrosVehiculo, startEdit]);
  
  // Filter first, then sort+paginate via reusable hook
  const registrosFiltrados = React.useMemo(() => 
    (data.registrosVehiculo || []).filter(r => {
      if (filtroAlerta === 'alertas') return r.alertaDiscrepancia;
      if (filtroAlerta === 'ok') return !r.alertaDiscrepancia;
      return true;
    }), [data.registrosVehiculo, filtroAlerta]
  );

  type VehiculoSortField = 'fecha' | 'distanciaOdometro' | 'total';
  const table = useSortAndPaginate<RegistroVehiculo, VehiculoSortField>(registrosFiltrados, {
    defaultSortField: 'fecha',
    defaultSortOrder: 'desc',
    defaultItemsPerPage: 10,
    resetDeps: [filtroAlerta],
  });
  const registrosPaginated = table.paginatedData;

  const totalViajes = (data.registrosVehiculo || []).length;
  const totalAlertas = React.useMemo(() =>
    (data.registrosVehiculo || []).filter(r => r.alertaDiscrepancia).length,
    [data.registrosVehiculo]
  );

  return (
    <div className="space-y-4">
      {/* Header con estadísticas y toggle de vista */}
      <div className="bg-[#111318] border border-white/10 rounded-md p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Car className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Registro de Vehículos</h2>
              <p className="text-xs text-slate-400">Auditoría de viajes, discrepancias GPS, combustible y odómetro</p>
            </div>
          </div>

          {/* Toggle: Listado vs Dashboard */}
          <div className="flex items-center gap-1 bg-[#090a0f] p-1 rounded-md border border-white/10">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'list'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Listado</span>
            </button>
            <button
              onClick={() => setViewMode('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'dashboard'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Filtrar:</span>
          </span>
          <div className="flex gap-1.5">
            {(['todos', 'alertas', 'ok'] as const).map(filtro => (
              <button
                key={filtro}
                onClick={() => setFiltroAlerta(filtro)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                  filtroAlerta === filtro
                    ? 'bg-orange-600 text-white border-orange-500'
                    : 'bg-[#090a0f] text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                {filtro === 'todos' && `Todos (${totalViajes})`}
                {filtro === 'alertas' && `Con Alertas (${totalAlertas})`}
                {filtro === 'ok' && `Sin Alertas (${totalViajes - totalAlertas})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de viajes o Dashboard según el modo */}
      {viewMode === 'dashboard' ? (
        <VehiculosAnalysis data={data} />
      ) : (
        <div className="space-y-3">
          {registrosFiltrados.length === 0 ? (
            <div className="bg-[#111318] border border-white/10 rounded-md p-10 text-center">
              <Car className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No hay registros de viajes que coincidan con el filtro.</p>
            </div>
          ) : (
            registrosPaginated.map((registro) => (
              <ViajeCard
                key={registro.id}
                registro={registro}
                onVerFoto={(url, tipo) => setFotoModal({ url, tipo })}
                onEdit={startEdit}
                onDelete={startDelete}
              />
            ))
          )}
          {registrosFiltrados.length > 0 && (
            <div className="pt-2">
              <Pagination
                currentPage={table.currentPage}
                totalPages={table.totalPages}
                itemsPerPage={table.itemsPerPage}
                totalItems={registrosFiltrados.length}
                pageNumbers={table.pageNumbers}
                onPageChange={table.setCurrentPage}
                onItemsPerPageChange={table.setItemsPerPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Modal de foto */}
      {fotoModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setFotoModal(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="max-w-3xl w-full bg-[#111318] border border-white/10 rounded-md p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">
                Odómetro {fotoModal.tipo}
              </h3>
              <button 
                onClick={() => setFotoModal(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={addCacheBuster(fotoModal.url)}
              alt={`Odómetro ${fotoModal.tipo}`}
              className="w-full max-h-[70vh] object-contain rounded-md border border-white/10 bg-black"
            />
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {editingId && formData && (
        <EditModal
          registro={data.registrosVehiculo.find(r => r.id === editingId)!}
          formData={formData}
          isSubmitting={isSubmitting}
          feedback={feedback}
          onClose={cancelEdit}
          onUpdateField={updateField}
          onSubmit={submitEdit}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <DeleteConfirmModal
          registro={data.registrosVehiculo.find(r => r.id === deletingId)!}
          isSubmitting={isSubmitting}
          feedback={feedback}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

interface ViajeCardProps {
  registro: RegistroVehiculo;
  onVerFoto: (url: string, tipo: string) => void;
  onEdit: (registro: RegistroVehiculo) => void;
  onDelete: (id: string) => void;
}

// ─── EDIT MODAL ────────────────────────────────────────────────────────────

function compressImage(base64: string, maxWidth = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(base64); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

function ModalShell({ onClose, maxWidth = 'max-w-xl', borderColor = 'border-white/10', children }: {
  onClose: () => void; maxWidth?: string; borderColor?: string; children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50" onClick={onClose} />
      <motion.div key="modal" initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className={`bg-[#111318] rounded-md p-6 ${maxWidth} w-full pointer-events-auto border ${borderColor} shadow-2xl`}
          onClick={e => e.stopPropagation()}>
          {children}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

interface EditModalProps {
  registro: RegistroVehiculo;
  formData: EditFormData;
  isSubmitting: boolean;
  feedback: { type: 'success' | 'error'; message: string } | null;
  onClose: () => void;
  onUpdateField: (field: keyof EditFormData, value: any) => void;
  onSubmit: () => Promise<void>;
}

function EditModal({
  registro,
  formData,
  isSubmitting,
  feedback,
  onClose,
  onUpdateField,
  onSubmit
}: EditModalProps) {
  const dist = formData.kmFinal - formData.kmInicial;
  const totalPreview = dist > 0 ? Math.round(dist * formData.costoPorKm) : formData.total;
  const showPreview = dist > 0;
  return (
    <ModalShell onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <Edit2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Editar Registro de Vehículo</h2>
            <p className="text-[11px] text-slate-400 font-mono">{registro.proyectoNombre}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form */}
      <div className="space-y-3.5 text-xs">
        {/* Fecha */}
        <div>
          <label className="text-[11px] font-mono text-slate-400 mb-1 block">
            Fecha
          </label>
          <input
            type="date"
            value={formData.fecha}
            onChange={(e) => onUpdateField('fecha', e.target.value)}
            disabled={isSubmitting}
            className="w-full bg-[#090a0f] border border-white/10 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Kilometraje */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-mono text-slate-400 mb-1 block">
              Km Inicial
            </label>
            <input
              type="number"
              value={formData.kmInicial}
              onChange={(e) => onUpdateField('kmInicial', parseFloat(e.target.value))}
              disabled={isSubmitting}
              className="w-full bg-[#090a0f] border border-white/10 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-[11px] font-mono text-slate-400 mb-1 block">
              Km Final
            </label>
            <input
              type="number"
              value={formData.kmFinal}
              onChange={(e) => onUpdateField('kmFinal', parseFloat(e.target.value))}
              disabled={isSubmitting}
              className="w-full bg-[#090a0f] border border-white/10 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Costo por Km */}
        <div>
          <label className="text-[11px] font-mono text-slate-400 mb-1 block">
            Costo por Km (Gs.)
          </label>
          <input
            type="number"
            step="100"
            value={formData.costoPorKm}
            onChange={(e) => onUpdateField('costoPorKm', parseFloat(e.target.value) || 0)}
            disabled={isSubmitting}
            className="w-full bg-[#090a0f] border border-white/10 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
          />
          {showPreview && (
            <p className="text-[11px] text-emerald-400 mt-1">
              {dist.toFixed(1)} km × Gs. {formData.costoPorKm.toLocaleString()} ={' '}
              <strong>Gs. {totalPreview.toLocaleString()}</strong>
            </p>
          )}
        </div>

        {/* Descripción */}
        <div>
          <label className="text-[11px] font-mono text-slate-400 mb-1 block">
            Descripción del Viaje
          </label>
          <textarea
            value={formData.descripcion}
            onChange={(e) => onUpdateField('descripcion', e.target.value)}
            disabled={isSubmitting}
            className="w-full bg-[#090a0f] border border-white/10 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 min-h-[70px] resize-none"
            placeholder="Descripción del viaje o trabajo..."
          />
        </div>

        {/* Fotos del Odómetro */}
        <div className="grid grid-cols-2 gap-3">
          {(['fotoOdometroInicio', 'fotoOdometroFin'] as const).map((field) => {
            const label = field === 'fotoOdometroInicio' ? 'Foto Inicio' : 'Foto Fin';
            const current = formData[field];
            return (
              <div key={field}>
                <label className="text-[11px] font-mono text-slate-400 mb-1 block">
                  {label}
                </label>
                {current && (
                  <img
                    src={addCacheBuster(current)}
                    alt={label}
                    className="w-full h-20 object-cover rounded-md mb-1.5 border border-white/10"
                  />
                )}
                <label className="flex items-center justify-center gap-1.5 cursor-pointer px-2.5 py-1.5 bg-[#090a0f] hover:bg-white/5 border border-white/10 rounded-md text-[11px] text-slate-300 transition-colors">
                  <Camera className="w-3.5 h-3.5 text-orange-400" />
                  <span>Cambiar foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    disabled={isSubmitting}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        const raw = ev.target?.result as string;
                        const compressed = await compressImage(raw);
                        onUpdateField(field, compressed);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
            );
          })}
        </div>

        {/* Feedback */}
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-2.5 rounded-md flex items-center gap-2 text-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-slate-400 hover:text-white font-medium rounded-md transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onSubmit().catch(err => console.error('Submit error:', err));
            }}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-md transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Save className="w-3.5 h-3.5 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── DELETE CONFIRM MODAL ──────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  registro: RegistroVehiculo;
  isSubmitting: boolean;
  feedback: { type: 'success' | 'error'; message: string } | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function DeleteConfirmModal({
  registro,
  isSubmitting,
  feedback,
  onClose,
  onConfirm
}: DeleteConfirmModalProps) {
  return (
    <ModalShell onClose={onClose} maxWidth="max-w-md" borderColor="border-rose-500/30">
      <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-white/10">
        <div className="p-2 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Confirmar Eliminación</h2>
          <p className="text-[11px] text-slate-400">Esta acción no se puede deshacer</p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4 text-xs">
        <div className="p-2.5 bg-[#090a0f] rounded-md border border-white/5">
          <p className="text-[10px] text-slate-500 uppercase font-mono">Proyecto</p>
          <p className="text-white font-semibold">{registro.proyectoNombre}</p>
        </div>
        <div className="p-2.5 bg-[#090a0f] rounded-md border border-white/5">
          <p className="text-[10px] text-slate-500 uppercase font-mono">Distancia</p>
          <p className="text-white font-semibold">{registro.distanciaOdometro} km</p>
        </div>
        <div className="p-2.5 bg-[#090a0f] rounded-md border border-white/5">
          <p className="text-[10px] text-slate-500 uppercase font-mono">Fecha</p>
          <p className="text-white font-semibold">{formatDate(registro.fecha)}</p>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="p-2.5 rounded-md flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs mb-3">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-3.5 py-1.5 text-slate-400 hover:text-white font-medium rounded-md transition-colors text-xs"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-md transition-colors text-xs disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{isSubmitting ? 'Eliminando...' : 'Eliminar'}</span>
        </button>
      </div>
    </ModalShell>
  );
}

function UbicacionCard({ label, ubicacion, hora, color }: { label: string; ubicacion: any; hora?: string; color: 'orange' | 'emerald' }) {
  const colors = { 
    orange: 'bg-orange-500/5 border-orange-500/20 text-orange-400', 
    emerald: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
  };
  return (
    <div className={`p-3 ${colors[color]} rounded-md border`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <MapPin className="w-3.5 h-3.5" />
        <span className="text-[10px] font-bold uppercase font-mono">{label}</span>
      </div>
      {ubicacion?.lat != null ? (
        <>
          <p className="text-xs text-slate-300 font-mono">{ubicacion.lat.toFixed(6)}, {ubicacion.lng.toFixed(6)}</p>
          {ubicacion.nombre && <p className="text-[11px] text-slate-400 mt-0.5">{ubicacion.nombre}</p>}
        </>
      ) : <p className="text-[11px] text-slate-500 italic">Sin coordenadas GPS</p>}
      {hora && <p className="text-[10px] text-slate-500 font-mono mt-1">{hora}</p>}
    </div>
  );
}

function FotoButton({ src, label, km, onClick }: { src?: string; label: string; km: number | string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group relative aspect-video rounded-md overflow-hidden border border-white/10 hover:border-orange-500/50 transition cursor-pointer bg-black">
      <img src={addCacheBuster(src)} alt={`Odómetro ${label}`} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
        <Eye className="w-5 h-5 text-white" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
        <p className="text-[11px] text-white font-bold">{label}: {km} km</p>
      </div>
    </button>
  );
}

// ─── VIAJE CARD ─────────────────────────────────────────────────────────────

function ViajeCard({ registro, onVerFoto, onEdit, onDelete }: ViajeCardProps) {
  const [expandido, setExpandido] = useState(false);
  const esParticular = registro.clienteNombre === 'Viaje Particular';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-[#111318] rounded-md p-4 border transition-colors ${
        registro.alertaDiscrepancia
          ? 'border-amber-500/30 bg-amber-500/[0.02]'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
              esParticular 
                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                : 'bg-orange-500/10 border border-orange-500/20 text-orange-400'
            }`}>
              <Car className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-white truncate">
                {esParticular ? '🏠 Viaje Particular' : registro.proyectoNombre}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {!esParticular && `${registro.clienteNombre} • `}
                {formatDate(registro.fecha)}
              </p>
            </div>
            
            {/* Edit/Delete Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onEdit(registro)}
                className="p-1.5 rounded-md bg-white/5 hover:bg-orange-500/10 border border-white/10 hover:border-orange-500/30 text-slate-400 hover:text-orange-400 transition-colors"
                title="Editar registro"
                aria-label={`Editar viaje ${esParticular ? 'particular' : registro.proyectoNombre} del ${formatDate(registro.fecha)}`}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(registro.id)}
                className="p-1.5 rounded-md bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-colors"
                title="Eliminar registro"
                aria-label={`Eliminar viaje ${esParticular ? 'particular' : registro.proyectoNombre} del ${formatDate(registro.fecha)}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Alerta de discrepancia */}
          {registro.alertaDiscrepancia && (
            <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-md mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0 text-xs">
                <span className="font-bold text-amber-300">Discrepancia Detectada: </span>
                <span className="text-amber-400/90 font-mono text-[11px]">
                  {registro.discrepancia?.toFixed(1)}% diferencia entre GPS y odómetro
                </span>
              </div>
            </div>
          )}

          {/* Descripción */}
          {registro.descripcion && (
            <p className="text-xs text-slate-300 leading-relaxed mb-2">{registro.descripcion}</p>
          )}

          {/* Metrics summary bar */}
          <div className="flex items-center gap-2 text-xs flex-wrap font-mono">
            <span className="px-2 py-0.5 bg-[#090a0f] border border-white/10 rounded text-slate-400 text-[11px]">
              {formatDate(registro.fecha)}
            </span>
            <span className="px-2 py-0.5 bg-[#090a0f] border border-white/10 rounded text-slate-400 text-[11px]">
              {registro.duracionMinutos} min
            </span>
            <span className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded text-orange-300 font-bold text-[11px]">
              {registro.distanciaOdometro} km
            </span>
            <span className="px-2 py-0.5 bg-[#090a0f] border border-white/10 rounded text-emerald-400 font-bold text-[11px]">
              {formatGuaranies(registro.total)}
            </span>
          </div>
        </div>

        {/* Botón expandir */}
        <button
          onClick={() => setExpandido(!expandido)}
          className="px-3 py-1.5 bg-[#090a0f] hover:bg-orange-500/10 border border-white/10 hover:border-orange-500/30 rounded-md text-xs font-semibold text-slate-300 hover:text-orange-400 transition-colors shrink-0"
          aria-label={expandido ? 'Ocultar detalles del viaje' : 'Ver detalles del viaje'}
          aria-expanded={expandido}
        >
          {expandido ? 'Ocultar' : 'Detalles'}
        </button>
      </div>

      {/* Detalles expandidos */}
      <AnimatePresence>
        {expandido && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t border-white/10 space-y-3">
              {/* Ubicaciones GPS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <UbicacionCard label="Ubicación Inicio" ubicacion={registro.ubicacionInicio} hora={registro.horaInicio} color="orange" />
                <UbicacionCard label="Ubicación Fin" ubicacion={registro.ubicacionFin} hora={registro.horaFin} color="emerald" />
              </div>

              {/* Distancias y Combustible */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-[#090a0f] border border-white/5 rounded-md">
                  <div className="flex items-center gap-1 text-orange-400 mb-0.5 font-mono text-[10px] uppercase">
                    <MapPin className="w-3 h-3" />
                    <span>GPS</span>
                  </div>
                  <p className="text-sm font-bold text-white font-mono">{registro.distanciaGPS != null ? registro.distanciaGPS.toFixed(1) : '-'} km</p>
                </div>

                <div className="p-2.5 bg-[#090a0f] border border-white/5 rounded-md">
                  <div className="flex items-center gap-1 text-emerald-400 mb-0.5 font-mono text-[10px] uppercase">
                    <Gauge className="w-3 h-3" />
                    <span>Odómetro</span>
                  </div>
                  <p className="text-sm font-bold text-white font-mono">{registro.distanciaOdometro != null ? registro.distanciaOdometro.toFixed(1) : '-'} km</p>
                </div>

                <div className="p-2.5 bg-[#090a0f] border border-white/5 rounded-md">
                  <div className="flex items-center gap-1 text-amber-400 mb-0.5 font-mono text-[10px] uppercase">
                    <Fuel className="w-3 h-3" />
                    <span>Costo/km</span>
                  </div>
                  <p className="text-xs font-bold text-white font-mono">
                    {registro.total && registro.distanciaOdometro > 0
                      ? `${formatGuaranies(registro.total / registro.distanciaOdometro)}`
                      : formatGuaranies(registro.total)}
                  </p>
                </div>

                <div className="p-2.5 bg-[#090a0f] border border-white/5 rounded-md">
                  <div className="flex items-center gap-1 text-amber-400 mb-0.5 font-mono text-[10px] uppercase">
                    <DollarSign className="w-3 h-3" />
                    <span>Total</span>
                  </div>
                  <p className="text-xs font-bold text-white font-mono">{formatGuaranies(registro.total)}</p>
                </div>
              </div>

              {/* Fotos del Odómetro */}
              <div>
                <div className="flex items-center gap-1.5 text-slate-400 mb-2">
                  <Camera className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-bold text-white">Fotos del Odómetro</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FotoButton src={registro.fotoOdometroInicio} label="Inicio" km={registro.kmInicial} onClick={() => onVerFoto(registro.fotoOdometroInicio, 'Inicio')} />
                  <FotoButton src={registro.fotoOdometroFin} label="Fin" km={registro.kmFinal} onClick={() => onVerFoto(registro.fotoOdometroFin, 'Fin')} />
                </div>
              </div>

              {/* Kilometraje detallado */}
              <div className="p-3 bg-[#090a0f] rounded-md border border-white/5">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-mono mb-0.5">Km Inicial</p>
                    <p className="text-sm font-bold text-white font-mono">{registro.kmInicial}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-mono mb-0.5">Km Final</p>
                    <p className="text-sm font-bold text-white font-mono">{registro.kmFinal}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-mono mb-0.5">Recorrido</p>
                    <p className="text-sm font-bold text-emerald-400 font-mono">{registro.distanciaOdometro} km</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
