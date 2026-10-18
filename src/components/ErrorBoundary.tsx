/**
 * ErrorBoundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (process.env.NODE_ENV !== 'production') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    this.setState({
      error,
      errorInfo
    });
  }

  handleLogout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    window.location.href = '/';
  };

  handleClearCacheAndReload = async (): Promise<void> => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }
    } catch {}
    window.location.href = '/';
  };

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#090a0f] flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel rounded-md p-8 text-center border border-white/10">
            <div className="w-14 h-14 bg-rose-500/10 rounded-md border border-rose-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-rose-400" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">
              Algo salió mal
            </h1>
            
            <p className="text-slate-400 mb-6 text-sm">
              La aplicación encontró un error inesperado. Por favor, intenta recargar la página o limpiar la memoria local.
            </p>

            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <details className="text-left mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-md">
                <summary className="text-xs font-mono text-rose-300 cursor-pointer mb-2">
                  Detalles del error (dev only)
                </summary>
                <pre className="text-[10px] text-rose-200 overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo && (
                    <>
                      {'\n\n'}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}

            <div className="flex flex-col gap-3">
              <div className="flex gap-3 justify-center">
                <button
                  onClick={this.handleReset}
                  className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 rounded-md font-medium text-sm text-white transition-colors cursor-pointer"
                  aria-label="Reintentar"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reintentar
                </button>

                <button
                  onClick={() => window.location.reload()}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-md font-medium text-sm text-white transition-colors cursor-pointer"
                  aria-label="Recargar página"
                >
                  Recargar Página
                </button>
              </div>

              <button
                onClick={this.handleClearCacheAndReload}
                className="w-full py-2.5 px-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-md font-medium text-xs text-amber-300 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                aria-label="Limpiar datos locales y reiniciar"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpiar Datos Locales y Reiniciar (Android/Móvil)
              </button>

              <button
                onClick={this.handleLogout}
                className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-md font-medium text-xs text-rose-300 transition-colors cursor-pointer"
                aria-label="Cerrar sesión"
              >
                Cerrar Sesión (Limpiar Cookie)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
