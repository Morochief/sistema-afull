/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  CheckCircle2, 
  Sparkles, 
  Building2, 
  FolderGit2, 
  UserPlus, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { DatabaseState, Cliente, Proyecto, Colaborador, RegistroItem } from '../types.ts';
import { authFetch, authFetchJSON } from '../authFetch.ts'; // SECURITY Phase 2 Fix #5: No getSession
import { useNotif } from '../context/NotifContext.tsx';

interface ExcelImporterProps {
  currentDb: DatabaseState;
  onImportConfirmed: (updatedDb: DatabaseState) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export default function ExcelImporter({ currentDb, onImportConfirmed, onCancel, isSaving = false }: ExcelImporterProps) {
  const { showToast } = useNotif();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Results of Sheet Parser
  const [importResult, setImportResult] = useState<{
    summary: {
      totalRowsRead: number;
      itemsImported: number;
      tempClientesDetected: number;
      tempProyectosDetected: number;
      tempColaboradoresDetected: number;
    };
    parsedItems: any[];
    updatedDbState: {
      clientes: Cliente[];
      proyectos: Proyecto[];
      colaboradores: Colaborador[];
    };
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls') || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        setApiError(null);
      } else {
        setApiError('Por favor, selecciona un archivo válido de Excel (.xlsx, .xls) o CSV.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setApiError(null);
    }
  };

  // Upload and Parse
  const handleUploadAndParse = async () => {
    if (!file) return;

    setLoading(true);
    setApiError(null);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      // SECURITY Phase 2 Fix #5: Use cookie-based auth instead of Authorization header
      const response = await authFetch('/api/import-excel', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type - browser will set it with boundary for FormData
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error?.message || errJson.error || 'Error al procesar el archivo Excel');
      }

      const result = await response.json();
      setImportResult(result);
    } catch (err: any) {
      setApiError(err.message || 'Error de red durante la importación. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Run optional server-side intelligence with Gemini to extract finer detail from freeforms
  const handleGeminiEnrich = async () => {
    if (!importResult || importResult.parsedItems.length === 0) return;
    
    setIsAiLoading(true);
    try {
      const resData = await authFetchJSON('/api/gemini-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: importResult.parsedItems })
      });
      
      if (resData.success && resData.data?.enrichments) {
        // Apply enrichments back to parse preview
        const updatedItems = importResult.parsedItems.map((item, index) => {
          const matchingEnrich = resData.data.enrichments.find((e: any) => e.index === index);
          if (matchingEnrich) {
            return {
              ...item,
              concepto: matchingEnrich.categoriaSugerida || item.concepto,
              // If collaborator names could be inferred
              colaboradorNombre: matchingEnrich.colaboradorSugerido || item.colaboradorNombre,
              precioUnitario: matchingEnrich.precioSugerido || item.precioUnitario,
              total: item.cantidad && matchingEnrich.precioSugerido 
                ? item.cantidad * matchingEnrich.precioSugerido 
                : item.total
            };
          }
          return item;
        });

        // Also check if any new colaboradores must be added
        const tempWorkers = [...importResult.updatedDbState.colaboradores];
        resData.data.enrichments.forEach((e: any) => {
          if (e.colaboradorSugerido && !tempWorkers.some(tw => tw.nombre === e.colaboradorSugerido)) {
            tempWorkers.push({
              id: `col_${Math.random().toString(36).substring(2, 7)}`,
              nombre: e.colaboradorSugerido,
              tarifaSugerida: e.precioSugerido || 350,
              rol: 'Sugerido por IA'
            });
          }
        });

        setImportResult({
          ...importResult,
          parsedItems: updatedItems,
          updatedDbState: {
            ...importResult.updatedDbState,
            colaboradores: tempWorkers
          }
        });
      }
    } catch (err: any) {
      showToast('Enriquecimiento de IA falló: ' + err.message, 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Adjust specific parsed row fields in local UI state manually
  const updateParsedItemValue = (index: number, key: string, val: any) => {
    if (!importResult) return;
    
    const updated = [...importResult.parsedItems];
    const item = { ...updated[index], [key]: val };
    
    // Recompute total if quantity or price changed
    if (key === 'cantidad' || key === 'precioUnitario') {
      item.total = (parseFloat(item.cantidad) || 0) * (parseFloat(item.precioUnitario) || 0);
    }
    updated[index] = item;
    
    setImportResult({
      ...importResult,
      parsedItems: updated
    });
  };

  // Final Confirmation - merge parsed tables onto current permanent states
  const handleFinalProcessAndSave = () => {
    if (!importResult) return;

    // Create a deep copy of Database State to populate
    const finalDb: DatabaseState = {
      ...currentDb,
      clientes: [...importResult.updatedDbState.clientes],
      proyectos: [...importResult.updatedDbState.proyectos],
      colaboradores: [...importResult.updatedDbState.colaboradores],
      registros: [...currentDb.registros] // retain old history entries
    };

    // Ensure all Client-Project references are strictly synchronized
    const itemsToSave: RegistroItem[] = importResult.parsedItems.map((item, index) => {
      // Find true client ID mapped dynamically
      const mappedClientObj = finalDb.clientes.find(c => c.nombre.toLowerCase() === item.clienteNombre.toLowerCase());
      const mappedProjObj = finalDb.proyectos.find(p => p.nombre.toLowerCase() === item.proyectoNombre.toLowerCase());
      
      const clienteId = mappedClientObj ? mappedClientObj.id : `cli_new_${index}`;
      const proyectoId = mappedProjObj ? mappedProjObj.id : `pro_new_${index}`;
      
      return {
        id: `reg_${Math.random().toString(36).substring(2, 11)}`,
        clienteId,
        clienteNombre: item.clienteNombre,
        proyectoId,
        proyectoNombre: item.proyectoNombre,
        fecha: item.fecha,
        concepto: item.concepto,
        descripcion: item.descripcion,
        colaboradorId: item.colaboradorId || undefined,
        hsInicio: item.hsInicio,
        hsFin: item.hsFin,
        hsTotal: item.hsTotal,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        total: item.total,
        origen: 'Excel',
        fechaImportacion: new Date().toISOString().substring(0, 10)
      };
    });

    // Unshift pre-populated
    finalDb.registros = [...itemsToSave, ...finalDb.registros];

    // Call callback to persist state locally
    onImportConfirmed(finalDb);
  };

  return (
    <div id="importer_container" className="space-y-8 relative z-10">
      
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Importador de Excel</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Arrastra el archivo mensual de Mano de Obra para ejecutar el Mapeo Relacional Automatizado.
          </p>
        </div>
        <button 
          onClick={onCancel}
          className="text-sm text-slate-400 hover:text-slate-200 border border-white/10 hover:border-white/20 bg-white/5 py-2 px-4 rounded-md transition-all cursor-pointer"
        >
          Volver al Panel
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!importResult ? (
          
          /* VIEW A: Drag and Drop Upload file */
          <motion.div
            key="upload_module"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            className="space-y-6"
          >
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-md p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_40px_rgba(234,88,12,0.15)]' 
                  : 'border-white/10 bg-[#111318] hover:bg-[#16181f] hover:border-white/25'
              }`}
            >
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              
              <div className="p-4 bg-orange-500/10 text-orange-400 rounded-md mb-4 border border-orange-500/20">
                <Upload className="w-8 h-8" />
              </div>
              
              <h3 className="font-semibold text-lg text-white mb-2">
                {file ? file.name : "Subir planilla de Mano de Obra"}
              </h3>
              
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                {file 
                  ? `Tamaño: ${(file.size / 1024).toFixed(1)} KB. Haz clic para cambiar de archivo.`
                  : "Arrastra el archivo Excel aquí, o selecciona en tu buscador explorador de archivos (.xlsx, .xls o .csv)"
                }
              </p>
              
              <span className="text-[10px] uppercase tracking-wider font-mono bg-[#090a0f] text-orange-300 border border-orange-500/30 px-3 py-1.5 rounded-md">
                Soporta formato nativo Excel
              </span>
            </div>

            {/* Instruction Bento Guide */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel p-5 rounded-md space-y-2">
                <div className="text-orange-400 mb-2 font-mono text-xs">COLUMNAS DE ORIGEN</div>
                <p className="text-xs text-slate-300">
                  La planilla mapea automáticamente las columnas de <code className="text-orange-300 bg-white/5 px-1 rounded">Cliente</code>, <code className="text-orange-300 bg-white/5 px-1 rounded">Proyecto</code>, <code className="text-orange-300 bg-white/5 px-1 rounded">Descripción</code>, <code className="text-orange-300 bg-white/5 px-1 rounded">Precio Unitario</code>, y <code className="text-orange-300 bg-white/5 px-1 rounded">Cantidad</code>.
                </p>
              </div>
              <div className="glass-panel p-5 rounded-md space-y-2">
                <div className="text-amber-400 mb-2 font-mono text-xs">MAPPING CREACIONAL</div>
                <p className="text-xs text-slate-300">
                  Si un cliente o proyecto no figura en el listado histórico principal, el motor lo creará <strong className="text-white">"al vuelo"</strong> de manera relacional.
                </p>
              </div>
              <div className="glass-panel p-5 rounded-md space-y-2">
                <div className="text-orange-300 mb-2 font-mono text-xs">DURACIÓN Y CÁLCULOS</div>
                <p className="text-xs text-slate-300">
                  Mano de obra calcula los minutos a partir de fracciones de horas o cantidades brutas, multiplicándolo por la tarifa/minuto establecida.
                </p>
              </div>
            </div>

            {/* Trigger Button */}
            {file && (
              <div className="flex justify-center pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUploadAndParse}
                  disabled={loading}
                  className="flex items-center gap-3 px-8 py-4 rounded-md bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 font-semibold text-white shadow-xl shadow-orange-500/20 cursor-pointer"
                >
                  {loading && <RefreshCw className="w-5 h-5 animate-spin" />}
                  <span>{loading ? 'Analizando Planilla Operativa...' : 'Ejecutar Mapeo y Parseo'}</span>
                </motion.button>
              </div>
            )}

            {apiError && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-md flex items-center gap-3 text-sm"
              >
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{apiError}</span>
              </motion.div>
            )}

          </motion.div>
        ) : (
          
          /* VIEW B: Raw parse result, edit client map, AI suggestions, final approve */
          <motion.div
            key="results_module"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary Ribbon */}
            <div className="glass-panel p-6 rounded-md grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="space-y-1 border-r border-white/5 pr-4">
                <div className="text-slate-400 text-xs font-mono">FILAS TOTALES</div>
                <div className="text-2xl font-bold text-white">{importResult.summary.totalRowsRead}</div>
              </div>
              <div className="space-y-1 border-r border-white/5 pr-4">
                <div className="text-slate-400 text-xs font-mono">ITEMS IMPORTADOS</div>
                <div className="text-2xl font-bold text-white">{importResult.summary.itemsImported}</div>
              </div>
              <div className="space-y-1 border-r border-white/5 pr-4">
                <div className="text-emerald-400 text-xs font-mono">CLIENTES NUEVOS</div>
                <div className="text-2xl font-bold text-emerald-300 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span>+{importResult.summary.tempClientesDetected}</span>
                </div>
              </div>
              <div className="space-y-1 border-r border-white/5 pr-4">
                <div className="text-orange-400 text-xs font-mono">PROYECTOS NUEVOS</div>
                <div className="text-2xl font-bold text-orange-300 flex items-center gap-1.5">
                  <FolderGit2 className="w-4 h-4 shrink-0" />
                  <span>+{importResult.summary.tempProyectosDetected}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-amber-400 text-xs font-mono">AUX CONTRATISTAS</div>
                <div className="text-2xl font-bold text-amber-300 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span>+{importResult.summary.tempColaboradoresDetected}</span>
                </div>
              </div>
            </div>

            {/* AI Assistant Ribbon */}
            <div className="p-5 rounded-md bg-gradient-to-r from-orange-950/40 via-orange-900/10 to-transparent border border-orange-500/25 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <h4 className="font-sans font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-400" />
                  <span>Inteligencia Artificial Gemini AI</span>
                </h4>
                <p className="text-xs text-slate-300">
                  ¿Deseas clasificar u optimizar las descripciones abiertas usando IA? Esto detecta categorías de insumos y tarifas sugeridas por minuto de forma inteligente.
                </p>
              </div>
              <button
                onClick={handleGeminiEnrich}
                disabled={isAiLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-orange-600 hover:bg-orange-500 disabled:bg-orange-800 text-white font-medium text-xs shadow-lg shadow-orange-500/20 cursor-pointer"
              >
                {isAiLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{isAiLoading ? 'Pensando...' : 'Optimizar Tarifa con Gemini'}</span>
              </button>
            </div>

            {/* Main Interactive Spreadsheet Grid Table */}
            {/* Main Interactive Spreadsheet Grid Table */}
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111318]/80 backdrop-blur-sm shadow-xl p-4">
              <div className="mb-4">
                <h3 className="font-sans font-medium text-white mb-1">Previsualización del Mapeo Relacional</h3>
                <p className="text-xs text-slate-400">Edita los campos directamente si el mapeador automático malinterpretó alguna celda antes de confirmar.</p>
              </div>

              <div className="overflow-x-auto max-h-[480px]">
                <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase font-mono text-[11px] tracking-wider">
                      <th className="px-4 py-3.5 font-medium">Concepto</th>
                      <th className="px-4 py-3.5 font-medium">Cliente Extraído</th>
                      <th className="px-4 py-3.5 font-medium">Proyecto Extraído</th>
                      <th className="px-4 py-3.5 font-medium">Descripción Origen</th>
                      <th className="px-4 py-3.5 font-medium">Colaborador</th>
                      <th className="px-4 py-3.5 font-medium text-right">Fórmula Cant. (Min/metros)</th>
                      <th className="px-4 py-3.5 font-medium text-right">Tarifa Unit.</th>
                      <th className="px-4 py-3.5 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {importResult.parsedItems.map((item, idx) => {
                      // Check if Client is brand new or existing
                      const isNewClient = !currentDb.clientes.some(c => c.nombre.toLowerCase() === item.clienteNombre.toLowerCase());
                      const isNewProject = !currentDb.proyectos.some(p => p.nombre.toLowerCase() === item.proyectoNombre.toLowerCase());

                      return (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          {/* 1. Concept selector */}
                          <td className="px-4 py-3.5 align-middle">
                            <select
                              value={item.concepto}
                              onChange={(e) => updateParsedItemValue(idx, 'concepto', e.target.value)}
                              className="bg-[#090a0f] border border-white/10 rounded-md px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                            >
                              <option value="MO" className="bg-[#111318]">MO</option>
                              <option value="Insumo" className="bg-[#111318]">Insumo</option>
                              <option value="Otros" className="bg-[#111318]">Otros</option>
                            </select>
                          </td>

                          {/* 2. Client Input with New/Existing Indicator */}
                          <td className="px-4 py-3.5 align-middle min-w-[180px]">
                            <div className="flex flex-col gap-1.5">
                              <input
                                type="text"
                                value={item.clienteNombre}
                                onChange={(e) => updateParsedItemValue(idx, 'clienteNombre', e.target.value)}
                                className="bg-[#090a0f] text-white text-xs px-2.5 py-1.5 rounded-md border border-white/10 w-full focus:outline-none focus:border-orange-500"
                              />
                              <span className={`text-[10px] w-fit font-mono font-medium px-2 py-0.5 rounded-full ${
                                isNewClient 
                                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                  : 'bg-slate-500/15 text-slate-400 border border-white/5'
                              }`}>
                                {isNewClient ? 'Crear al Vuelo' : 'Verificado / BD'}
                              </span>
                            </div>
                          </td>

                          {/* 3. Project Input */}
                          <td className="px-4 py-3.5 align-middle min-w-[180px]">
                            <div className="flex flex-col gap-1.5">
                              <input
                                type="text"
                                value={item.proyectoNombre}
                                onChange={(e) => updateParsedItemValue(idx, 'proyectoNombre', e.target.value)}
                                className="bg-[#090a0f] text-white text-xs px-2.5 py-1.5 rounded-md border border-white/10 w-full focus:outline-none focus:border-orange-500"
                              />
                              <span className={`text-[10px] w-fit font-mono font-medium px-2 py-0.5 rounded-full ${
                                isNewProject 
                                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                                  : 'bg-slate-500/15 text-slate-400 border border-white/5'
                              }`}>
                                {isNewProject ? 'Nuevo Proyecto' : 'Asociado / BD'}
                              </span>
                            </div>
                          </td>

                          {/* 4. Description Detail */}
                          <td className="px-4 py-3.5 align-middle min-w-[200px]">
                            <input
                              type="text"
                              value={item.descripcion}
                              onChange={(e) => updateParsedItemValue(idx, 'descripcion', e.target.value)}
                              className="bg-[#090a0f] text-slate-200 text-xs px-2.5 py-1.5 rounded-md border border-white/10 w-full focus:outline-none focus:border-orange-500"
                            />
                          </td>

                          {/* 5. Colaborador name */}
                          <td className="px-4 py-3.5 align-middle min-w-[160px]">
                            <input
                              type="text"
                              value={item.colaboradorNombre || ''}
                              onChange={(e) => updateParsedItemValue(idx, 'colaboradorNombre', e.target.value)}
                              placeholder="No aplica Insumo"
                              className="bg-[#090a0f] disabled:opacity-40 text-slate-200 text-xs px-2.5 py-1.5 rounded-md border border-white/10 w-full focus:outline-none focus:border-orange-500"
                              disabled={item.concepto !== 'MO'}
                            />
                          </td>

                          {/* 6. Quantity */}
                          <td className="px-4 py-3.5 align-middle text-right whitespace-nowrap">
                            <input
                              type="number"
                              value={item.cantidad}
                              onChange={(e) => updateParsedItemValue(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                              className="bg-[#090a0f] text-right font-mono text-xs px-2.5 py-1.5 rounded-md border border-white/10 w-20 text-white focus:outline-none focus:border-orange-500"
                            />
                          </td>

                          {/* 7. Unit price */}
                          <td className="px-4 py-3.5 align-middle text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-slate-500 font-mono text-xs">Gs.</span>
                              <input
                                type="number"
                                value={item.precioUnitario}
                                onChange={(e) => updateParsedItemValue(idx, 'precioUnitario', parseFloat(e.target.value) || 0)}
                                className="bg-[#090a0f] text-right font-mono text-xs px-2.5 py-1.5 rounded-md border border-white/10 w-24 text-white focus:outline-none focus:border-orange-500"
                              />
                            </div>
                          </td>

                          {/* 8. Total price calculated */}
                          <td className="px-4 py-3.5 align-middle text-right font-bold font-mono text-emerald-400 whitespace-nowrap">
                            Gs. {Math.round(item.total).toLocaleString('es-PY')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-center bg-[#111318] p-6 rounded-md border border-white/10">
              <button
                onClick={() => setImportResult(null)}
                className="text-slate-400 hover:text-slate-200 text-sm py-2 px-5 rounded-md cursor-pointer transition hover:bg-white/5"
              >
                Cargar otro archivo
              </button>

              <div className="flex gap-4">
                <button
                  onClick={onCancel}
                  className="text-slate-400 hover:text-slate-200 text-sm py-2 px-5 rounded-md cursor-pointer transition hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleFinalProcessAndSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 rounded-md bg-gradient-to-br from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 font-semibold text-sm text-white shadow-lg shadow-orange-500/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{isSaving ? 'Guardando...' : 'Procesar e Insertar en Base de Datos'}</span>
                </button>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
