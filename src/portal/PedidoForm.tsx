import {FormEvent, useRef, useState} from 'react';

interface PedidoFormProps {
  token: string;
  sucursales: {id: string; nombre: string}[];
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

export default function PedidoForm({token, sucursales, onPedidoCreado}: PedidoFormProps) {
  // Auto-select cuando el cliente tiene una sola sucursal
  const [sucursalId, setSucursalId] = useState<string>(sucursales.length === 1 ? sucursales[0].id : '');
  const [descripcion, setDescripcion] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [foto, setFoto] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Estado para crear una nueva sucursal
  const [mostrarNuevaSucursal, setMostrarNuevaSucursal] = useState(false);
  const [nuevaSucursal, setNuevaSucursal] = useState('');
  const [creandoSucursal, setCreandoSucursal] = useState(false);

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

  const crearSucursal = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const nombre = nuevaSucursal.trim();
    if (!nombre) {
      setError('Escribí el nombre del local');
      return;
    }
    setCreandoSucursal(true);
    try {
      const res = await fetch('/api/portal/' + encodeURIComponent(token) + '/sucursal', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({nombre}),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.error?.message || 'No se pudo crear el local');
        return;
      }
      setNuevaSucursal('');
      setMostrarNuevaSucursal(false);
      onPedidoCreado(); // recarga el portal para ver la nueva sucursal
    } catch {
      setError('Error de conexión. Intentá nuevamente.');
    } finally {
      setCreandoSucursal(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    if (!sucursalId) {
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
        body: JSON.stringify({sucursalId, descripcion: descripcion.trim(), cantidad: cant, foto}),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.error?.message || 'No se pudo enviar el pedido');
        return;
      }
      // Reset form
      setSucursalId(sucursales.length === 1 ? sucursales[0].id : '');
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
        {sucursales.length === 0 ? (
          <>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              Todavía no hay locales cargados. Agregá el primer local para poder enviar pedidos.
            </div>
            <div>
              <label className={labelCls} htmlFor="nueva-sucursal">Nombre del local</label>
              <div className="flex gap-2">
                <input
                  id="nueva-sucursal"
                  className={inputCls}
                  placeholder="Ej: Mariano Roque Alonso"
                  value={nuevaSucursal}
                  onChange={(e) => setNuevaSucursal(e.target.value)}
                />
                <button
                  type="button"
                  onClick={crearSucursal}
                  disabled={creandoSucursal}
                  className="shrink-0 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-cyan-400 disabled:opacity-60"
                >
                  {creandoSucursal ? '...' : 'Agregar'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="flex items-center justify-between">
                <label className={labelCls} htmlFor="local">Local *</label>
                {!mostrarNuevaSucursal && (
                  <button
                    type="button"
                    onClick={() => setMostrarNuevaSucursal(true)}
                    className="mb-1.5 text-xs font-medium text-cyan-300 hover:text-cyan-200"
                  >
                    + Agregar local
                  </button>
                )}
              </div>
              {sucursales.length === 1 && !mostrarNuevaSucursal ? (
                <input
                  id="local"
                  type="text"
                  className={`${inputCls} opacity-80`}
                  value={sucursales[0].nombre}
                  disabled
                />
              ) : (
                <select
                  id="local"
                  className={inputCls}
                  value={sucursalId}
                  onChange={(e) => setSucursalId(e.target.value)}
                >
                  <option value="">Seleccioná un local...</option>
                  {sucursales.map((l) => (
                    <option key={l.id} value={l.id} className="bg-slate-900">{l.nombre}</option>
                  ))}
                </select>
              )}

              {mostrarNuevaSucursal && (
                <div className="mt-2 flex gap-2">
                  <input
                    className={inputCls}
                    placeholder="Nombre del nuevo local"
                    value={nuevaSucursal}
                    onChange={(e) => setNuevaSucursal(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={crearSucursal}
                    disabled={creandoSucursal}
                    className="shrink-0 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-cyan-400 disabled:opacity-60"
                  >
                    {creandoSucursal ? '...' : 'Agregar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMostrarNuevaSucursal(false)}
                    className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-300 hover:bg-white/10"
                  >
                    Cancelar
                  </button>
                </div>
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
