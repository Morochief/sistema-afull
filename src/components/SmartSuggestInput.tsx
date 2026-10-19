import React, { useState, useRef, useEffect, useMemo } from 'react';

export interface SuggestionOption {
  value: string;
  label?: string;
  sublabel?: string;
  badge?: string;
  meta?: any; // e.g. precio unitario, categoria, etc.
}

interface SmartSuggestInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectOption?: (option: SuggestionOption) => void;
  options: (string | SuggestionOption)[];
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  maxSuggestions?: number;
}

export default function SmartSuggestInput({
  value,
  onChange,
  onSelectOption,
  options,
  placeholder = 'Escribí para buscar...',
  className = '',
  required = false,
  disabled = false,
  id,
  name,
  maxSuggestions = 8,
}: SmartSuggestInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalizar opciones a formato SuggestionOption
  const normalizedOptions: SuggestionOption[] = useMemo(() => {
    return options.map(opt => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return {
        ...opt,
        label: opt.label || opt.value,
      };
    });
  }, [options]);

  // Filtrar sugerencias según el texto ingresado
  const filteredSuggestions = useMemo(() => {
    if (!value || !value.trim()) return [];
    const query = value.toLowerCase().trim();
    return normalizedOptions
      .filter(opt => {
        const valMatch = opt.value.toLowerCase().includes(query);
        const labelMatch = opt.label?.toLowerCase().includes(query);
        const subMatch = opt.sublabel?.toLowerCase().includes(query);
        return valMatch || labelMatch || subMatch;
      })
      .slice(0, maxSuggestions);
  }, [normalizedOptions, value, maxSuggestions]);

  // Cerrar dropdown si se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: SuggestionOption) => {
    onChange(option.value);
    if (onSelectOption) {
      onSelectOption(option);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredSuggestions.length === 0) {
      if (e.key === 'ArrowDown' && filteredSuggestions.length > 0) {
        setIsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        e.preventDefault();
        handleSelect(filteredSuggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => {
          if (value && value.trim()) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        // DESACTIVAR COMPLETAMENTE EL HISTORIAL BASURA DEL NAVEGADOR
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-lpignore="true"
        className={className}
      />

      {/* Menú Flotante de Sugerencias Reales (Enterprise Glassmorphic) */}
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 overflow-hidden rounded-md border border-white/10 bg-[#111318]/95 backdrop-blur-md shadow-2xl">
          <div className="py-1 max-h-60 overflow-y-auto divide-y divide-white/5 font-sans">
            {filteredSuggestions.map((opt, index) => {
              const isHighlighted = index === highlightedIndex;
              return (
                <button
                  type="button"
                  key={`${opt.value}-${index}`}
                  onClick={() => handleSelect(opt)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    isHighlighted
                      ? 'bg-orange-500/15 text-orange-200'
                      : 'text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate flex items-center gap-1.5">
                      <span className={isHighlighted ? 'text-orange-300' : 'text-white'}>
                        {opt.label || opt.value}
                      </span>
                      {opt.badge && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-white/10 text-slate-300">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {opt.sublabel && (
                      <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                        {opt.sublabel}
                      </div>
                    )}
                  </div>

                  {opt.meta?.precio && (
                    <span className="font-mono text-[11px] text-orange-400 shrink-0 font-semibold">
                      Gs. {Number(opt.meta.precio).toLocaleString('es-PY')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="px-2.5 py-1 bg-[#090a0f] border-t border-white/5 text-[10px] font-mono text-slate-500 flex justify-between">
            <span>Usa ↑ ↓ y Enter para elegir</span>
            <span>{filteredSuggestions.length} sugerencias</span>
          </div>
        </div>
      )}
    </div>
  );
}
