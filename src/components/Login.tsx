/**
 * Login Screen Component - Sistema aFull
 * Glass & Glow Bento Aesthetic
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { HardHat, Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: { nombre: string; rol: string; usuario: string; colaboradorId?: string }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // SECURITY Phase 2 Fix #5: Include cookies
        body: JSON.stringify({
          usuario: usuario.trim().toLowerCase(),
          password
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // SECURITY Phase 2 Fix #5: Token is in httpOnly cookie, not returned in response
        const { user } = result.data;
        onLoginSuccess({
          nombre: user.nombre,
          rol: user.rol,
          usuario: user.usuario,
          colaboradorId: user.colaboradorId || undefined
        });
      } else {
        setError(result.error?.message || 'Usuario o contraseña incorrectos. Verificá los datos e intentá nuevamente.');
      }
    } catch (error) {
      setError('Error de conexión. Por favor, intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#090a0f] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Header Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 bg-orange-600 rounded-xl flex items-center justify-center shadow-md mb-3">
            <img src="/Logo-AFULL-_1_.svg" alt="aFull Logo" className="w-8 h-8 object-contain" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Sistema aFull
          </h1>
          <p className="text-[11px] text-slate-500 font-mono tracking-wider uppercase mt-0.5">
            Módulo de Automatización Operativa
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel rounded-xl p-6 border border-white/10 shadow-xl">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-white">Iniciar Sesión</h2>
            <p className="text-xs text-slate-400 mt-0.5">Ingresá tus credenciales para acceder al sistema.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Usuario Field */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider font-mono">
                Usuario
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="login-usuario"
                  type="text"
                  value={usuario}
                  onChange={e => setUsuario(e.target.value)}
                  placeholder="ej: admin, rodrigo, ricardo"
                  className="glass-input w-full rounded-lg pl-9 pr-4 py-2.5 text-sm font-sans placeholder:text-slate-600"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider font-mono">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="glass-input w-full rounded-lg pl-9 pr-10 py-2.5 text-sm font-sans"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/25 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-300">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              id="login-submit-btn"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium text-xs shadow-sm border border-orange-500/30 transition-colors cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Ingresar al Sistema</span>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-slate-700 mt-6 font-mono">
          Sistema aFull v2.0 · Gestión Operativa Automatizada
        </p>
      </motion.div>
    </div>
  );
}
