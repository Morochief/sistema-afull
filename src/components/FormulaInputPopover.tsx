import React, { useState, useEffect, useRef } from 'react';
import { Calculator, Check, X, AlertCircle } from 'lucide-react';
import { evaluateFormula, FormulaResult } from '../lib/mathFormula.ts';

interface FormulaInputPopoverProps {
  currentValue?: number;
  onApply: (val: number) => void;
  unidadMedida?: string;
}

export default function FormulaInputPopover({
  currentValue,
  onApply,
  unidadMedida,
}: FormulaInputPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formula, setFormula] = useState('');
  const [result, setResult] = useState<FormulaResult>({ success: false });
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto focus input when opened
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Recalculate on formula change
  useEffect(() => {
    if (!formula.trim()) {
      setResult({ success: false });
      return;
    }
    const evalRes = evaluateFormula(formula);
    setResult(evalRes);
  }, [formula]);

  const handleApply = () => {
    if (result.success && result.value !== undefined) {
      onApply(result.value);
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const insertToken = (token: string) => {
    setFormula((prev) => prev + token);
    inputRef.current?.focus();
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Botón activador 'fx' */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && !formula && currentValue) {
            setFormula(String(currentValue));
          }
        }}
        title="Calculadora de Fórmulas / Medidas (fx)"
        className={`h-7 px-2 flex items-center gap-1 rounded-md text-[11px] font-mono font-bold transition ${
          isOpen
            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
            : 'bg-white/5 text-orange-400 hover:bg-orange-500/20 border border-white/10 hover:border-orange-500/40'
        }`}
      >
        <span className="italic font-serif">fx</span>
      </button>

      {/* Popover desplegable */}
      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-72 z-50 rounded-xl border border-white/15 bg-[#111318]/95 backdrop-blur-xl p-3.5 shadow-2xl shadow-black/80 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <Calculator className="w-3.5 h-3.5 text-orange-400" />
              <span>Cálculo de Cantidad</span>
              {unidadMedida && (
                <span className="text-[10px] text-slate-400 font-normal">({unidadMedida})</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Campo de fórmula */}
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                Fórmula aritmética
              </label>
              <input
                ref={inputRef}
                type="text"
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ej: (2.5 * 0.8 * 2) + 1.2"
                className="w-full rounded-lg border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-orange-500 transition font-mono"
              />
            </div>

            {/* Fichas rápidas de ayuda */}
            <div className="flex flex-wrap gap-1">
              {['+', '-', '*', '/', '(', ')', 'x 2', '0.5'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => insertToken(chip === 'x 2' ? ' * 2' : chip)}
                  className="rounded px-1.5 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 text-slate-300 hover:bg-white/15 transition"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Resultado en vivo */}
            <div className="rounded-lg border border-white/10 bg-black/20 p-2 min-h-[36px] flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">Resultado:</span>
              {result.success && result.value !== undefined ? (
                <span className="text-sm font-bold text-emerald-400 font-mono flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {result.formatted}
                </span>
              ) : formula.trim() && result.error ? (
                <span className="text-[11px] text-red-400 truncate max-w-[170px] flex items-center gap-1" title={result.error}>
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {result.error}
                </span>
              ) : (
                <span className="text-xs text-slate-500 font-mono">—</span>
              )}
            </div>

            {/* Botón aplicar */}
            <button
              type="button"
              disabled={!result.success}
              onClick={handleApply}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                result.success
                  ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/25 cursor-pointer'
                  : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              Aplicar {result.success && result.formatted ? `(${result.formatted})` : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
