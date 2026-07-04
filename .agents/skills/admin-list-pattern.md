# admin-list-pattern

Patrón estándar para listas del módulo Administración con filtros, paginación y ordenamiento.

## Estructura Base

```
┌──────────────────────────────────────────────┐
│  Header: Título + Total items + Stats        │
├──────────────────────────────────────────────┤
│  Filter Bar (opcional según el módulo)       │
│  ┌─────────┬──────────┬────────┬──────────┐  │
│  │ Cliente │ Proyecto │ Búsq.  │ F.Desde  │  │
│  │ (select)│ (select) │ (text) │ F.Hasta  │  │
│  └─────────┴──────────┴────────┴──────────┘  │
├──────────────────────────────────────────────┤
│  Items (cards o tabla)                       │
│  ┌──────────────────────────────────────────┐│
│  │ Item 1                   [Editar][Elim.] ││
│  │ Item 2                   [Editar][Elim.] ││
│  │ ...                                      ││
│  └──────────────────────────────────────────┘│
├──────────────────────────────────────────────┤
│  Paginación                                  │
│  ┌──────────────┬──────────────────────────┐ │
│  │ 10/25/50 pág │ ‹ 1 2 3 ... N ›         │ │
│  └──────────────┴──────────────────────────┘ │
└──────────────────────────────────────────────┘
```

## Estados Obligatorios

```typescript
// Filtros (opcional según el módulo)
const [searchText, setSearchText] = useState('');
const [filterField, setFilterField] = useState(''); // según el módulo

// Paginación (siempre)
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(10);

// Reset página al cambiar filtros
useEffect(() => { setCurrentPage(1); }, [searchText, filterField, itemsPerPage]);
```

## Cálculos

```typescript
const filteredItems = useMemo(() => {
  let items = [...dataSource];
  if (searchText) {
    const q = searchText.toLowerCase();
    items = items.filter(item =>
      item.nombre?.toLowerCase().includes(q) ||
      item.id?.toLowerCase().includes(q)
    );
  }
  // más filtros según el módulo...
  return items;
}, [dataSource, searchText, filterField]);

const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
const safePage = Math.min(currentPage, totalPages);
const paginatedItems = useMemo(() => {
  const start = (safePage - 1) * itemsPerPage;
  return filteredItems.slice(start, start + itemsPerPage);
}, [filteredItems, safePage, itemsPerPage]);
```

## Componentes UI Reutilizables

### Pagination
```tsx
<div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
  <div className="flex items-center gap-2">
    <span className="text-xs text-slate-400 font-mono">Items por página:</span>
    <select value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))}
      className="glass-select rounded-lg px-3 py-1.5 text-xs">
      <option value={10}>10</option>
      <option value={25}>25</option>
      <option value={50}>50</option>
    </select>
    <span className="text-xs text-slate-500 font-mono ml-2">{filteredItems.length} items</span>
  </div>
  <div className="flex items-center gap-1">
    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
      disabled={safePage <= 1}
      className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold disabled:opacity-30 disabled:cursor-not-allowed bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10">‹</button>
    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
      <button key={page} onClick={() => setCurrentPage(page)}
        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold ${page === safePage ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10'}`}>{page}</button>
    ))}
    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
      disabled={safePage >= totalPages}
      className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold disabled:opacity-30 disabled:cursor-not-allowed bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10">›</button>
  </div>
</div>
```

### Search Input
```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
  <input type="text" placeholder="Buscar..." value={searchText}
    onChange={e => setSearchText(e.target.value)}
    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50" />
</div>
```

## Módulos Pendientes de Implementar

| Módulo | Prioridad | Filtros necesarios | Items estimados |
|--------|-----------|-------------------|-----------------|
| Clientes | Alta | Búsqueda por nombre | ~50-200 |
| Proyectos | Alta | Búsqueda por nombre, filtro por estado | ~100-500 |
| Colaboradores | Media | Búsqueda por nombre | ~20-100 |
| AuditLog | Media | Búsqueda, rango fecha (ya existe filter text) | ~1000+ |
| Marcaciones | Media | Ya tiene filtro texto, falta paginación | ~1000+ |
| Vehículos | Baja | Ya tiene filtro alertas, falta paginación | ~100-500 |
