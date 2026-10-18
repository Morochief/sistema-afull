import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Camera, X, Play, Route, CheckCircle } from 'lucide-react';
import { useNotif } from '../context/NotifContext';
import { authFetchJSON } from '../authFetch';

interface Props {
  onClose: () => void;
  onStart: (data: any) => Promise<void>;
  selectedClienteId: string;
  selectedProyectoId: string;
  currentUser?: { rol?: string; usuario?: string } | null;
}

interface TareaHoy {
  id: string;
  hojaRutaId: string;
  descripcion: string;
  categoria: string;
  cantidad: number | null;
  unidad: string | null;
  hojaRuta: {
    id: string;
    clienteNombre: string;
    proyecto: string;
    clienteId?: string;
  };
}

const VIAJE_SIN_PROYECTO = 'viaje_particular';

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

function useCameraCapture() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedKm, setExtractedKm] = useState<number | null>(null);
  
  const capturePhoto = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const raw = e.target?.result as string;
      const base64 = await compressImage(raw);
      setPhoto(base64);
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };
  
  const reset = () => {
    setPhoto(null);
    setExtractedKm(null);
    setIsProcessing(false);
  };
  
  return { photo, extractedKm, isProcessing, capturePhoto, reset };
}

export default function ModalIniciarViaje({ onClose, onStart, selectedClienteId, selectedProyectoId, currentUser }: Props) {
  const { showToast } = useNotif();
  const [descripcion, setDescripcion] = useState('');
  const [kmManual, setKmManual] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [esViajeParticular, setEsViajeParticular] = useState(!selectedProyectoId);
  const [tareasHoy, setTareasHoy] = useState<TareaHoy[]>([]);
  const [selectedTareaId, setSelectedTareaId] = useState('');
  const { photo, extractedKm, isProcessing, capturePhoto, reset } = useCameraCapture();
  const inputFileRef = useRef<HTMLInputElement>(null);

  // Cargar tareas asignadas al operario para hoy (Item 1: Iniciar tareas desde la ruta)
  useEffect(() => {
    authFetchJSON<{ success: boolean; data: TareaHoy[] }>('/api/operario/tareas/hoy')
      .then(res => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setTareasHoy(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectTarea = (tareaId: string) => {
    setSelectedTareaId(tareaId);
    if (!tareaId) return;
    const tarea = tareasHoy.find(t => t.id === tareaId);
    if (tarea) {
      setDescripcion(`[Ruta] ${tarea.hojaRuta.clienteNombre} - ${tarea.hojaRuta.proyecto}: ${tarea.descripcion}`);
      setEsViajeParticular(false);
    }
  };
  
  const handleSubmit = async () => {
    if (!photo) {
      showToast('Tomá una foto del odómetro para continuar', 'warning');
      return;
    }
    
    const kmFinal = kmManual ? parseFloat(kmManual) : extractedKm;
    if (!kmFinal) {
      showToast('Ingresá el kilometraje manualmente', 'warning');
      return;
    }
    
    if (!esViajeParticular && (!selectedClienteId || !selectedProyectoId) && !selectedTareaId) {
      showToast('Seleccioná un proyecto o tarea de ruta, o marcá viaje particular', 'warning');
      return;
    }
    
    try {
      setSubmitting(true);
      await onStart({
        clienteId: esViajeParticular ? VIAJE_SIN_PROYECTO : (selectedClienteId || VIAJE_SIN_PROYECTO),
        proyectoId: esViajeParticular ? VIAJE_SIN_PROYECTO : (selectedProyectoId || VIAJE_SIN_PROYECTO),
        descripcion: descripcion || (esViajeParticular ? 'Viaje particular/personal' : 'Viaje en vehículo'),
        fotoOdometroInicio: photo,
        kmInicial: kmFinal
      });

      // Si inició el viaje vinculado a una tarea de la ruta, actualizar su estado a EnProgreso
      if (selectedTareaId) {
        try {
          await authFetchJSON(`/api/operario/tareas/${selectedTareaId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 'EnProgreso' })
          });
        } catch {}
      }
      
      onClose();
    } catch (error) {
      showToast('Error al iniciar viaje', 'error');
      setSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090a0f]/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="glass-panel rounded-md p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl"
      >
        <h3 className="text-xl font-bold text-white mb-4">Iniciar Viaje</h3>

        {/* Item 1: Iniciar tareas desde la ruta (selector directo) */}
        {tareasHoy.length > 0 && (
          <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-md">
            <label className="text-xs font-mono uppercase tracking-wider text-orange-400 font-semibold mb-1.5 flex items-center gap-1.5 block">
              <Route className="w-3.5 h-3.5" />
              Vincular a Tarea / Hoja de Ruta de Hoy
            </label>
            <select
              value={selectedTareaId}
              onChange={(e) => handleSelectTarea(e.target.value)}
              className="glass-select w-full rounded-md px-3 py-2 text-xs"
            >
              <option value="">— Cargar manual el proyecto o viaje —</option>
              {tareasHoy.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.hojaRuta.clienteNombre} · {t.hojaRuta.proyecto}: {t.descripcion}
                </option>
              ))}
            </select>
            {selectedTareaId && (
              <p className="text-[11px] text-slate-300 mt-1.5 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                La tarea pasará automáticamente a estado "En Progreso".
              </p>
            )}
          </div>
        )}
        
        {/* Checkbox para viaje particular (si no hay proyecto o se desea viaje particular) */}
        {(!selectedClienteId || !selectedProyectoId) && !selectedTareaId && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={esViajeParticular}
                onChange={(e) => setEsViajeParticular(e.target.checked)}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-amber-300">
                Viaje particular / personal (sin proyecto asociado)
              </span>
            </label>
          </div>
        )}
        
        <input
          ref={inputFileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) capturePhoto(file);
          }}
        />
        
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-2">
            Foto del odómetro (inicio) *
          </label>
          
          {!photo ? (
            <button
              type="button"
              onClick={() => inputFileRef.current?.click()}
              className="w-full h-40 border-2 border-dashed border-white/10 rounded-md flex flex-col items-center justify-center gap-2 hover:border-orange-500 transition cursor-pointer"
            >
              <Camera className="w-8 h-8 text-slate-500" />
              <span className="text-sm text-slate-400">Tomar foto</span>
            </button>
          ) : (
            <div className="relative">
              <img src={photo} alt="Odómetro" className="w-full h-40 object-cover rounded-md" />
              <button
                type="button"
                onClick={() => { reset(); inputFileRef.current?.click(); }}
                aria-label="Cambiar foto"
                className="absolute top-2 right-2 bg-rose-500 text-white p-2 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-2">
            Kilometraje inicial *
          </label>
          <input
            type="number"
            step="0.1"
            value={kmManual || extractedKm || ''}
            onChange={(e) => setKmManual(e.target.value)}
            placeholder="Ej: 45623.5"
            className="glass-input w-full px-4 py-2.5 rounded-md text-sm"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-2">
            Descripción {selectedTareaId ? '(asociada a la tarea)' : '(opcional)'}
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Visita a cliente, traslado de insumos..."
            rows={2}
            className="glass-input w-full px-4 py-2.5 rounded-md text-sm resize-none"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 rounded-md text-sm font-semibold transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!photo || (!kmManual && !extractedKm) || submitting}
            className="flex-1 py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-md text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4" /> Iniciar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
