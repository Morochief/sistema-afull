import React, { useState, useEffect } from 'react';
import { Camera, FileText, Package, X, CheckCircle2, AlertCircle, Upload, User } from 'lucide-react';
import { authFetchJSON } from '../authFetch.ts';
import { useNotif } from '../context/NotifContext.tsx';

interface PedidoActivo {
  id: string;
  descripcion: string;
  local: string;
  marca?: string | null;
  estado: string;
  proyecto?: string | null;
  fotoRemisionUrl?: string | null;
  fotoEntregaUrl?: string | null;
  clienteId: string;
  clienteNombre: string;
}

interface SubirFotoEntregaModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  pedidoPreseleccionadoId?: string;
}

export default function SubirFotoEntregaModal({
  onClose,
  onSuccess,
  pedidoPreseleccionadoId,
}: SubirFotoEntregaModalProps) {
  const { showToast } = useNotif();
  const [pedidos, setPedidos] = useState<PedidoActivo[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);

  const [pedidoId, setPedidoId] = useState(pedidoPreseleccionadoId || '');
  const [tipo, setTipo] = useState<'remision' | 'entrega'>('remision');
  const [receptorNombre, setReceptorNombre] = useState('');
  const [fotoBase64, setFotoBase64] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPedidos() {
      try {
        const res = await authFetchJSON<{ success: boolean; data: PedidoActivo[] }>('/api/operario/pedidos-activos');
        if (res.success && res.data) {
          setPedidos(res.data);
          if (!pedidoId && res.data.length > 0) {
            setPedidoId(res.data[0].id);
          }
        }
      } catch (err: any) {
        setError('Error al cargar pedidos activos: ' + (err.message || ''));
      } finally {
        setLoadingPedidos(false);
      }
    }
    loadPedidos();
  }, []);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setFotoBase64(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          setFotoBase64(base64);
        }
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pedidoId) {
      setError('Seleccioná un pedido o proyecto');
      return;
    }
    if (!fotoBase64) {
      setError('Tomá o seleccioná una foto de evidencia');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await authFetchJSON<{ success: boolean; message?: string }>('/api/operario/entregas/foto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedidoId,
          tipo,
          fotoBase64,
          receptorNombre: receptorNombre.trim() || undefined,
          fechaEntrega: new Date().toISOString(),
        }),
      });

      if (res.success) {
        showToast(
          `✓ Foto de ${tipo === 'remision' ? 'remisión' : 'entrega'} subida con éxito`,
          'success'
        );
        if (onSuccess) onSuccess();
        onClose();
      } else {
        throw new Error('Error al guardar foto de entrega');
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar la foto de entrega');
    } finally {
      setSaving(false);
    }
  };

  const pedidoSeleccionado = pedidos.find(p => p.id === pedidoId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-lg rounded-xl border border-white/10 bg-[#111318] p-5 sm:p-6 shadow-2xl space-y-5 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Subir Remisión o Entrega</h2>
              <p className="text-xs text-slate-400">Evidencia fotográfica para el cliente y control de despacho</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Selector de Pedido / Proyecto */}
          <div>
            <label className="mb-1 block text-xs font-mono uppercase tracking-wider text-slate-400">
              Pedido / Proyecto del Cliente *
            </label>
            {loadingPedidos ? (
              <div className="rounded-lg border border-white/10 bg-[#090a0f] p-2.5 text-xs text-slate-400">
                Cargando pedidos activos...
              </div>
            ) : (
              <select
                value={pedidoId}
                onChange={(e) => setPedidoId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#090a0f] px-3 py-2 text-xs text-white outline-none focus:border-orange-500 transition cursor-pointer"
              >
                {pedidos.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#111318] text-white">
                    [{p.clienteNombre}] {p.local} — {p.descripcion.substring(0, 45)}
                  </option>
                ))}
              </select>
            )}

            {pedidoSeleccionado && (
              <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] font-mono text-slate-400">
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">
                  Local: <strong className="text-slate-200">{pedidoSeleccionado.local}</strong>
                </span>
                {pedidoSeleccionado.fotoRemisionUrl && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    ✓ Remisión ya cargada
                  </span>
                )}
                {pedidoSeleccionado.fotoEntregaUrl && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    ✓ Entrega ya cargada
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 2. Selector de Tipo: Remisión vs Entrega */}
          <div>
            <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-slate-400">
              Tipo de Documentación *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipo('remision')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                  tipo === 'remision'
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-sm'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Remisión Firmada</span>
              </button>

              <button
                type="button"
                onClick={() => setTipo('entrega')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                  tipo === 'entrega'
                    ? 'bg-orange-500/15 border-orange-500/50 text-orange-300 shadow-sm'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Foto de Entrega</span>
              </button>
            </div>
          </div>

          {/* 3. Nombre del receptor */}
          <div>
            <label className="mb-1 block text-xs font-mono uppercase tracking-wider text-slate-400">
              Nombre de la persona que recibió (opcional)
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={receptorNombre}
                onChange={(e) => setReceptorNombre(e.target.value)}
                placeholder="ej: Lic. Carlos Gómez (Encargado de Local)"
                className="w-full rounded-lg border border-white/10 bg-[#090a0f] pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-orange-500 transition"
              />
            </div>
          </div>

          {/* 4. Captura fotográfica */}
          <div>
            <label className="mb-1 block text-xs font-mono uppercase tracking-wider text-slate-400">
              {tipo === 'remision' ? 'Foto de la Remisión con Sello *' : 'Foto de la Entrega / Cartel Instalado *'}
            </label>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCapture}
                className="w-full text-xs text-slate-400 file:mr-2.5 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-500/20 file:text-orange-300 hover:file:bg-orange-500/30 cursor-pointer"
              />

              {fotoBase64 ? (
                <div className="relative rounded-lg overflow-hidden border border-white/15 max-h-52 bg-black/60 flex items-center justify-center">
                  <img src={fotoBase64} alt="Previsualización" className="max-h-52 object-contain" />
                  <button
                    type="button"
                    onClick={() => setFotoBase64('')}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full text-white hover:bg-black/90 transition"
                    title="Quitar foto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
                  <Upload className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-400 font-medium">Hacé clic arriba para abrir la cámara o galería</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Las fotos se optimizan y comprimen automáticamente.</p>
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !pedidoId || !fotoBase64}
              className="flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 text-xs font-semibold text-white shadow-sm transition cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Subiendo...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar Evidencia</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
