import {useCallback, useEffect, useState} from 'react';
import {PortalData} from '../types.ts';
import PedidoForm from './PedidoForm.tsx';
import PedidoHistorial from './PedidoHistorial.tsx';

interface PortalAppState {
  loading: boolean;
  error: string | null;
  data: PortalData | null;
}

/**
 * Portal público de pedidos para clientes.
 * Se accede vía /portal/:token — el token se extrae de la URL.
 * No requiere login: la autenticación es el token del cliente.
 */
export default function PortalApp() {
  const [state, setState] = useState<PortalAppState>({loading: true, error: null, data: null});

  const token = window.location.pathname.split('/portal/')[1]?.replace(/\/+$/, '') || '';

  const loadData = useCallback(async () => {
    if (!token) {
      setState({loading: false, error: 'Link no válido', data: null});
      return;
    }
    try {
      const res = await fetch('/api/portal/' + encodeURIComponent(token));
      const json = await res.json();
      if (!res.ok || !json.success) {
        setState({loading: false, error: json?.error?.message || 'Link no válido o expirado', data: null});
        return;
      }
      setState({loading: false, error: null, data: json.data});
    } catch {
      setState({loading: false, error: 'Error de conexión. Intentá nuevamente.', data: null});
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePedidoCreado = useCallback(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-xl font-extrabold text-white shadow-lg shadow-blue-500/30">
            aF
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {state.data ? `Portal de Pedidos — ${state.data.cliente.nombre}` : 'Portal de Pedidos'}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Cargá tu pedido con Local, Descripción y Cantidad. aFull se encarga del resto.
          </p>
        </header>

        {state.loading && (
          <div className="glass-panel rounded-2xl p-10 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <p className="text-slate-400">Cargando portal...</p>
          </div>
        )}

        {!state.loading && state.error && (
          <div className="glass-panel rounded-2xl border border-red-500/30 p-8 text-center">
            <div className="mb-3 text-4xl">🔗</div>
            <h2 className="mb-2 text-lg font-semibold text-red-300">Link no válido</h2>
            <p className="text-slate-400">{state.error}</p>
            <p className="mt-4 text-xs text-slate-500">
              Si creés que es un error, contactá al equipo de aFull para recibir un link válido.
            </p>
          </div>
        )}

        {!state.loading && !state.error && state.data && (
          <>
            <PedidoForm token={token} locales={state.data.locales} onPedidoCreado={handlePedidoCreado} />
            <PedidoHistorial pedidos={state.data.pedidos} />
          </>
        )}

        <footer className="mt-12 text-center text-xs text-slate-600">
          Sistema aFull · Gestión Operativa
        </footer>
      </div>
    </div>
  );
}
