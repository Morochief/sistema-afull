import {FormEvent, useRef, useState} from 'react';

interface PedidoFormProps {
  token: string;
  locales: {id: string; nombre: string}[];
  onPedidoCreado: () => void;
}

const ESTADOS_BADGE: Record<string, string> = {
  Pendiente: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'En Proceso': 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  Completado: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  Entregado: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

export function badgeEstado(estado: string): string {
  return ESTADOS_BADGE[estado] || 'bg-slate-500/15 text-slate-300 border-slate-500/30';
}

export default function PedidoForm({token, locales, onPedidoCreado}: PedidoFormProps) {
  // Auto-select cuando el cliente tiene un solo local
  const [proyectoId, setProyectoId] = useState<string>(locales.length === 1 ? locales[0].id : '');
  const [descripcion, setDescripcion] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [foto, setFoto] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFoto = (file: File | undefined) => {
    if (!file) {
      setFoto(null);
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('La foto debe pesar menos de 3MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setFoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    if (!proyectoId) {
      setError('Seleccioná un local');
      return;
    }
    if (!descripcion.trim()) {
      setError('Escribí una descripción del pedido');
      return;
    }
    const cant = Number(cantidad);
    if (isNaN(cant) || cant <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch('/api/portal/' + encodeURIComponent(token) + '/pedido', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({proyectoId, descripcion: descripcion.trim(), cantidad: cant, foto}),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.error?.message || 'No se pudo enviar el pedido');
        return;
      }
      // Reset form
      setProyectoId('');
      setDescripcion('');
      setCantidad('1');
      setFoto(null);
      if (fileRef.current) fileRef.current.value = '';
      setExito('¡Pedido enviado correctamente!');
      onPedidoCreado();
    } catch {
      setError('Error de conexión. Intentá nuevamente.');
    } finally {
      setEnviando(false);
    }
  };

  const inputCls = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500/60 focus:bg-white/10';
  const labelCls = 'mb-1.5 block text-sm font-medium text-slate-300';

  return (
    <section className="glass-panel rounded-2xl p-5 sm:p-7">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">+</span>
        Nuevo Pedido
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {locales.length === 0 ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            Todavía no hay locales cargados para este cliente. Contactá al equipo de aFull para habilitar tus locales.
          </div>
        ) : (
          <>
        <div>
          <label className={labelCls} htmlFor="local">Local *</label>
          {locales.length === 1 ? (
            <input
              id="local"
              type="text"
              className={`${inputCls} opacity-80`}
              value={locales[0].nombre}
              disabled
            />
          ) : (
          <select
            id="local"
            className={inputCls}
            value={proyectoId}
            onChange={(e) => setProyectoId(e.target.value)}
            disabled={locales.length === 0}
          >
            <option value="">Seleccioná un local...</option>
            {locales.map((l) => (
              <option key={l.id} value={l.id} className="bg-slate-900">{l.nombre}</option>
            ))}
          </select>
          )}
        </div>

        <div>
          <label className={labelCls} htmlFor="descripcion">Descripción *</label>
          <textarea
            id="descripcion"
            className={inputCls}
            rows={3}
            placeholder="Ej: Cambio de micro playland cajita feliz"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={1000}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="cantidad">Cantidad *</label>
          <input
            id="cantidad"
            type="number"
            min={1}
            step={1}
            className={inputCls}
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="foto">Foto (opcional)</label>
          <input
            id="foto"
            ref={fileRef}
            type="file"
            accept="image/*"
            className={inputCls}
            onChange={(e) => handleFoto(e.target.files?.[0])}
          />
          {foto && (
            <img
              src={foto}
              alt="Vista previa del pedido"
              className="mt-3 h-32 w-32 rounded-xl border border-white/10 object-cover"
            />
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        {exito && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {exito}
          </div>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-500 hover:to-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {enviando ? 'Enviando...' : 'Enviar Pedido'}
        </button>
        </>
        )}
      </form>
    </section>
  );
}
