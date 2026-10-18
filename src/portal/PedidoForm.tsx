import {FormEvent, useRef, useState} from 'react';

interface PedidoFormProps {
  token: string;
  sucursales: {id: string; nombre: string}[];
  onPedidoCreado: () => void;
}

const ESTADOS_BADGE: Record<string, string> = {
  Pendiente: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'En Proceso': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Completado: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  Entregado: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

export function badgeEstado(estado: string): string {
  return ESTADOS_BADGE[estado] || 'bg-slate-500/15 text-slate-300 border-slate-500/30';
}

export default function PedidoForm({token, sucursales, onPedidoCreado}: PedidoFormProps) {
  // Soporte para selección de múltiples locales
  const [sucursalIds, setSucursalIds] = useState<string[]>(sucursales.length === 1 ? [sucursales[0].id] : []);
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

  const toggleSucursal = (id: string) => {
    setSucursalIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleTodosLocales = () => {
    if (sucursalIds.length === sucursales.length) {
      setSucursalIds([]);
    } else {
      setSucursalIds(sucursales.map(s => s.id));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    if (sucursalIds.length === 0) {
      setError('Seleccioná al menos un local');
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
        body: JSON.stringify({
          sucursalIds,
          descripcion: descripcion.trim(),
          cantidad: cant,
          foto
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.error?.message || 'No se pudo enviar el pedido');
        return;
      }
      // Reset form
      setSucursalIds(sucursales.length === 1 ? [sucursales[0].id] : []);
      setDescripcion('');
      setCantidad('1');
      setFoto(null);
      if (fileRef.current) fileRef.current.value = '';
      setExito(`¡Pedido enviado correctamente para ${sucursalIds.length} local(es)!`);
      onPedidoCreado();
    } catch {
      setError('Error de conexión. Intentá nuevamente.');
    } finally {
      setEnviando(false);
    }
  };

  const inputCls = 'w-full rounded-md border border-white/10 bg-[#090a0f] px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-orange-500';
  const labelCls = 'mb-1.5 block text-sm font-medium text-slate-300';

  return (
    <section className="glass-panel rounded-md p-5 sm:p-7">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-600/20 text-orange-400">+</span>
        Nuevo Pedido
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {sucursales.length === 0 ? (
          <>
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
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
                  className="shrink-0 rounded-md bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-orange-500 hover:to-amber-400 disabled:opacity-60"
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
                    className="mb-1.5 text-xs font-medium text-amber-300 hover:text-amber-200"
                  >
                    + Agregar local
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {sucursalIds.length === 0
                      ? 'Ningún local seleccionado'
                      : `${sucursalIds.length} de ${sucursales.length} locales seleccionados`}
                  </span>
                  {sucursales.length > 1 && (
                    <button
                      type="button"
                      onClick={toggleTodosLocales}
                      className="text-orange-400 hover:text-orange-300 font-semibold cursor-pointer"
                    >
                      {sucursalIds.length === sucursales.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1 bg-[#090a0f] rounded-md border border-white/10">
                  {sucursales.map((l) => {
                    const seleccionado = sucursalIds.includes(l.id);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => toggleSucursal(l.id)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer border flex items-center gap-1.5 ${
                          seleccionado
                            ? 'bg-orange-600 border-orange-500 text-white shadow-sm'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[10px] ${
                          seleccionado ? 'border-white bg-white text-orange-600 font-bold' : 'border-white/30'
                        }`}>
                          {seleccionado ? '✓' : ''}
                        </span>
                        {l.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>

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
                    className="shrink-0 rounded-md bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-orange-500 hover:to-amber-400 disabled:opacity-60"
                  >
                    {creandoSucursal ? '...' : 'Agregar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMostrarNuevaSucursal(false)}
                    className="shrink-0 rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-300 hover:bg-white/10"
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
                  className="mt-3 h-32 w-32 rounded-md border border-white/10 object-cover"
                />
              )}
            </div>

            {error && (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
            {exito && (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                {exito}
              </div>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded-md bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:from-orange-500 hover:to-amber-400 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {enviando ? 'Enviando...' : 'Enviar Pedido'}
            </button>
          </>
        )}
      </form>
    </section>
  );
}
