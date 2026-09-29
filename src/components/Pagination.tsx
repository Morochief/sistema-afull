/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pagination - Controles de paginación reutilizables.
 * Sigue el mismo lenguaje visual que Dashboard (naranja/amber sobre glassmorphic).
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  pageNumbers: (number | string)[];
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (n: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  pageNumbers,
  onPageChange,
  onItemsPerPageChange,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="mt-6 space-y-4">
      {/* Indicador de registros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm font-mono text-slate-400">
          Mostrando{' '}
          <span className="text-white font-semibold">{start}</span>
          {' - '}
          <span className="text-white font-semibold">{end}</span>
          {' '}de{' '}
          <span className="text-white font-semibold">{totalItems}</span>
          {' '}registros
        </div>

        {/* Selector de registros por página */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Registros por página:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="px-3 py-1.5 glass-select rounded-md text-sm text-slate-200 focus:outline-none transition-colors cursor-pointer"
            aria-label="Registros por página"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Controles de paginación */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* Botón Anterior */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            currentPage === 1
              ? 'bg-white/5 text-slate-500 cursor-not-allowed'
              : 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white border border-white/10 cursor-pointer'
          }`}
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        {/* Números de página */}
        {pageNumbers.map((pageNum, index) => {
          if (pageNum === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-3 py-2 text-slate-500 text-sm font-mono"
              >
                ...
              </span>
            );
          }

          const isCurrentPage = pageNum === currentPage;
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum as number)}
              className={`min-w-[40px] px-3 py-2 rounded-md text-sm font-mono font-medium transition-all ${
                isCurrentPage
                  ? 'bg-orange-600 text-white border border-orange-500 shadow-sm'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10 cursor-pointer'
              }`}
              aria-label={`Página ${pageNum}`}
              aria-current={isCurrentPage ? 'page' : undefined}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Botón Siguiente */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            currentPage === totalPages
              ? 'bg-white/5 text-slate-500 cursor-not-allowed'
              : 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white border border-white/10 cursor-pointer'
          }`}
          aria-label="Página siguiente"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
