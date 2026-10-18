import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Camera, X, CheckCircle } from 'lucide-react';
import { useNotif } from '../context/NotifContext';

interface Props {
  onClose: () => void;
  onFinish: (data: any) => Promise<any>;
  kmInicio: number;
  duracionSegundos: number;
  currentUser?: { rol?: string } | null;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

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
  
  const capturePhoto = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const raw = e.target?.result as string;
      const base64 = await compressImage(raw);
      setPhoto(base64);
    };
    reader.readAsDataURL(file);
  };
  
  const reset = () => setPhoto(null);
  return { photo, capturePhoto, reset };
}

export default function ModalFinalizarViaje({ onClose, onFinish, kmInicio, duracionSegundos, currentUser }: Props) {
  const { showToast } = useNotif();
  const [kmFinal, setKmFinal] = useState('');
  const [costoPorKm, setCostoPorKm] = useState('1400');
  const [submitting, setSubmitting] = useState(false);
  const { photo, capturePhoto, reset } = useCameraCapture();
  const inputFileRef = useRef<HTMLInputElement>(null);
  
  const isAdmin = currentUser?.rol === 'Admin';
  const distanciaOdometro = kmFinal ? parseFloat(kmFinal) - kmInicio : 0;
  const costoTotal = distanciaOdometro > 0 && costoPorKm
    ? Math.round(distanciaOdometro * parseFloat(costoPorKm))
    : 0;

  const handleSubmit = async () => {
    if (!photo) {
      showToast('Tomá una foto del odómetro final', 'warning');
      return;
    }
    
    if (!kmFinal) {
      showToast('Completá el kilometraje final', 'warning');
      return;
    }
    
    try {
      setSubmitting(true);
      const result = await onFinish({
        fotoOdometroFin: photo,
        kmFinal: parseFloat(kmFinal),
        combustibleLitros: undefined,
        combustibleCosto: costoTotal,
      });
      
      if (result.alertas && result.alertas.length > 0) {
        showToast(result.alertas[0].mensaje, 'warning');
      }
      
      onClose();
    } catch (error: any) {
      showToast('Error al finalizar viaje: ' + (error.message || error), 'error');
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
        <h3 className="text-xl font-bold text-white mb-4">Finalizar Viaje</h3>
        
        <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-md text-sm">
          <div className="grid grid-cols-2 gap-2 text-slate-300">
            <div><span className="text-slate-400">Duración:</span> {formatDuration(duracionSegundos)}</div>
            <div><span className="text-slate-400">Km inicial:</span> {kmInicio.toLocaleString()}</div>
          </div>
        </div>
        
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
          <label className="block text-sm text-slate-400 mb-2">Foto del odómetro (final) *</label>
          
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
              <img src={photo} alt="Odómetro final" className="w-full h-40 object-cover rounded-md" />
              <button type="button" onClick={() => { reset(); inputFileRef.current?.click(); }} aria-label="Cambiar foto" className="absolute top-2 right-2 bg-rose-500 text-white p-2 rounded-full cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-2">Kilometraje final *</label>
          <input type="number" step="0.1" value={kmFinal} onChange={(e) => setKmFinal(e.target.value)} placeholder="Ej: 45668.7" className="glass-input w-full px-4 py-2.5 rounded-md text-sm" />
          {distanciaOdometro > 0 && (
            <p className="text-xs text-orange-400 mt-1 font-mono">Distancia: {distanciaOdometro.toFixed(1)} km</p>
          )}
        </div>
        
        {/* Costo de combustible (solo visible para administradores) */}
        {isAdmin && (
          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-2">Costo por Km (Gs) *</label>
            <input
              type="number"
              step="100"
              value={costoPorKm}
              onChange={(e) => setCostoPorKm(e.target.value)}
              placeholder="1400"
              className="glass-input w-full px-4 py-2.5 rounded-md text-sm"
            />
            {distanciaOdometro > 0 && (
              <div className="mt-2 p-3 bg-white/5 border border-white/10 rounded-md">
                <p className="text-sm text-slate-300">
                  <span className="text-slate-400">Distancia:</span> {distanciaOdometro.toFixed(1)} km ×{' '}
                  <span className="text-slate-400">Gs.</span> {parseFloat(costoPorKm || '0').toLocaleString()}
                </p>
                <p className="text-base font-bold text-orange-400 mt-1 font-mono">
                  Costo Total Estimado: Gs. {costoTotal.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
        
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 px-4 border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 rounded-md text-sm font-semibold transition-all cursor-pointer">Cancelar</button>
          <button type="button" onClick={handleSubmit} disabled={!photo || !kmFinal || submitting} className="flex-1 py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-md text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 transition-all cursor-pointer">
            <CheckCircle className="w-4 h-4" /> Guardar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
