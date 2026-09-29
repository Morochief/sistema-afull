/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useCallback } from 'react';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type SortOrder = 'asc' | 'desc';

export interface SortState<TField extends string = string> {
  field: TField;
  order: SortOrder;
}

export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
}

// ─── Comparadores ────────────────────────────────────────────────────────────

function compareValues(aVal: any, bVal: any, order: SortOrder): number {
  // Números
  if (typeof aVal === 'number' && typeof bVal === 'number') {
    return order === 'asc' ? aVal - bVal : bVal - aVal;
  }
  // Strings
  if (typeof aVal === 'string' && typeof bVal === 'string') {
    return order === 'asc' ? aVal.localeCompare(bVal, 'es-PY') : bVal.localeCompare(aVal, 'es-PY');
  }
  // Fechas ISO (string con guion)
  if (typeof aVal === 'string' && typeof bVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(aVal) && /^\d{4}-\d{2}-\d{2}/.test(bVal)) {
    const aTime = new Date(aVal).getTime();
    const bTime = new Date(bVal).getTime();
    return order === 'asc' ? aTime - bTime : bTime - aTime;
  }
  // Nulls van al final
  if (aVal == null && bVal != null) return 1;
  if (aVal != null && bVal == null) return -1;
  if (aVal == null && bVal == null) return 0;
  // Fallback numérico
  const aNum = Number(aVal);
  const bNum = Number(bVal);
  if (!isNaN(aNum) && !isNaN(bNum)) {
    return order === 'asc' ? aNum - bNum : bNum - aNum;
  }
  return 0;
}

// ─── Hook: useSortAndPaginate ────────────────────────────────────────────────

export interface UseSortAndPaginateOptions<TField extends string> {
  defaultSortField?: TField;
  defaultSortOrder?: SortOrder;
  defaultItemsPerPage?: number;
  /** Reset a página 1 cuando cambia este valor (ej: filtro de búsqueda) */
  resetDeps?: any[];
}

export interface SortAndPaginateResult<T, TField extends string> {
  // Sort
  sortField: TField;
  sortOrder: SortOrder;
  handleSort: (field: TField) => void;
  sortedData: T[];
  // Pagination
  currentPage: number;
  itemsPerPage: number;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (n: number) => void;
  totalPages: number;
  paginatedData: T[];
  // Helpers UI
  pageNumbers: (number | string)[];
}

export function useSortAndPaginate<T extends Record<string, any>, TField extends string = string>(
  data: T[],
  options: UseSortAndPaginateOptions<TField> = {}
): SortAndPaginateResult<T, TField> {
  const {
    defaultSortField,
    defaultSortOrder = 'desc',
    defaultItemsPerPage = 25,
    resetDeps = [],
  } = options;

  const [sortField, setSortField] = useState<TField | undefined>(defaultSortField);
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPageState] = useState(defaultItemsPerPage);

  // Reset a página 1 cuando cambian las dependencias
  useEffect(() => {
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  const handleSort = useCallback((field: TField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortOrder('desc');
      return field;
    });
    setCurrentPage(1);
  }, []);

  const setItemsPerPage = useCallback((n: number) => {
    setItemsPerPageState(n);
    setCurrentPage(1);
  }, []);

  // Datos ordenados
  const sortedData = useMemo(() => {
    if (!sortField) return data;
    return [...data].sort((a, b) => compareValues(a[sortField], b[sortField], sortOrder));
  }, [data, sortField, sortOrder]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, safePage, itemsPerPage]);

  // Números de página (máximo 7 visibles con elipsis)
  const pageNumbers = useMemo((): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    if (safePage > 3) pages.push('...');
    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (safePage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  }, [totalPages, safePage]);

  return {
    sortField: sortField as TField,
    sortOrder,
    handleSort,
    sortedData,
    currentPage: safePage,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    totalPages,
    paginatedData,
    pageNumbers,
  };
}

// ─── Icono de sort reutilizable ─────────────────────────────────────────────

export function getSortIcon(field: string, sortField: string | undefined, sortOrder: SortOrder) {
  if (sortField !== field) return '↕';
  return sortOrder === 'asc' ? '↑' : '↓';
}

// ─── Clase CSS para header ordenable ────────────────────────────────────────

export function sortableHeaderClass(field: string, sortField: string | undefined) {
  const isActive = field === sortField;
  return `select-none cursor-pointer hover:text-white transition-colors ${
    isActive ? 'text-orange-400' : ''
  }`;
}
