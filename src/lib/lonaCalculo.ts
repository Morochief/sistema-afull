/**
 * Motor de Cálculo para Lonas, Impresión y Desperdicio (Mermas)
 * Especializado para taller y operarios (ej. Eduardo Méndez).
 * Soporta entradas en centímetros (cm) y metros (m), cálculo exacto
 * de superficie neta, superficie bruta, merma y costos en Guaraníes (Gs.).
 */

export interface PiezaMedida {
  id: string;
  nombre: string;
  ancho: number; // en la unidad especificada (cm o m)
  alto: number;  // en la unidad especificada (cm o m)
  cantidad: number;
}

export interface MaterialBrutoMedida {
  ancho: number; // en la unidad especificada (cm o m)
  alto: number;  // en la unidad especificada (cm o m)
  cantidad: number;
}

export interface TarifasInsumo {
  nombreInsumo?: string;
  costoImpresionPorM2?: number;   // Costo Gs. por m² o metro lineal de impresión
  costoDesperdicioPorM2?: number; // Costo Gs. por m² o metro lineal de desperdicio
  unidadMedida?: string;
}

export interface PiezaCalculada {
  id: string;
  nombre: string;
  anchoM: number;
  altoM: number;
  cantidad: number;
  areaUnitM2: number;
  areaTotalM2: number;
}

export interface ResultadoCalculoLona {
  unidadEntrada: 'cm' | 'm';
  // Medidas de la lona / material bruto
  anchoLonaM: number;
  altoLonaM: number;
  cantidadLonas: number;
  areaTotalLonaM2: number;

  // Medidas del trabajo / piezas impresas
  piezas: PiezaCalculada[];
  areaTotalImpresaM2: number;

  // Merma / Desperdicio
  desperdicioM2: number;
  porcentajeDesperdicio: number;

  // Costos en Guaraníes (Gs.)
  costoImpresionGs: number;
  costoDesperdicioGs: number;
  costoTotalGs: number;

  // Resumen textual para auditoría y facturación
  resumenTexto: string;
}

/**
 * Sanitiza y convierte un número o string con coma/punto a número flotante seguro.
 */
export function parseNumeroSeguro(valor: string | number | undefined | null): number {
  if (valor === undefined || valor === null) return 0;
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;
  const limpio = String(valor).trim().replace(',', '.');
  const num = parseFloat(limpio);
  return isNaN(num) ? 0 : num;
}

/**
 * Convierte una medida a metros según la unidad de entrada ('cm' | 'm').
 */
export function aMetros(valor: number, unidad: 'cm' | 'm'): number {
  return unidad === 'cm' ? valor / 100 : valor;
}

/**
 * Realiza el cálculo completo de lona, trabajo impreso, desperdicio y costos en Guaraníes.
 */
export function calcularLonaYDesperdicio(params: {
  unidad: 'cm' | 'm';
  lona: MaterialBrutoMedida;
  piezas: PiezaMedida[];
  tarifas?: TarifasInsumo;
}): ResultadoCalculoLona {
  const { unidad, lona, piezas, tarifas } = params;

  // 1. Convertir lona a metros y calcular área bruta
  const anchoLonaM = aMetros(lona.ancho, unidad);
  const altoLonaM = aMetros(lona.alto, unidad);
  const cantLonas = Math.max(1, lona.cantidad || 1);
  const areaTotalLonaM2 = Number((anchoLonaM * altoLonaM * cantLonas).toFixed(4));

  // 2. Calcular cada pieza en metros y suma total neta
  const piezasCalculadas: PiezaCalculada[] = piezas.map((p, idx) => {
    const wM = aMetros(p.ancho, unidad);
    const hM = aMetros(p.alto, unidad);
    const qty = Math.max(1, p.cantidad || 1);
    const areaUnitM2 = Number((wM * hM).toFixed(4));
    const areaTotalM2 = Number((areaUnitM2 * qty).toFixed(4));
    return {
      id: p.id || String(idx + 1),
      nombre: p.nombre || `Producto ${idx + 1}`,
      anchoM: Number(wM.toFixed(3)),
      altoM: Number(hM.toFixed(3)),
      cantidad: qty,
      areaUnitM2,
      areaTotalM2,
    };
  });

  const areaTotalImpresaM2 = Number(
    piezasCalculadas.reduce((acc, p) => acc + p.areaTotalM2, 0).toFixed(4)
  );

  // 3. Desperdicio / Merma: Total de la lona menos lo que se imprimió
  const desperdicioM2 = Number(Math.max(0, areaTotalLonaM2 - areaTotalImpresaM2).toFixed(4));
  const porcentajeDesperdicio = areaTotalLonaM2 > 0
    ? Number(((desperdicioM2 / areaTotalLonaM2) * 100).toFixed(2))
    : 0;

  // 4. Costos en Guaraníes
  const costoImpRate = tarifas?.costoImpresionPorM2 || 0;
  const costoDespRate = tarifas?.costoDesperdicioPorM2 || 0;

  let costoImpresionGs = Math.round(areaTotalImpresaM2 * costoImpRate);
  let costoDesperdicioGs = Math.round(desperdicioM2 * costoDespRate);

  // Si no hay tarifa de desperdicio explícita pero sí de lona/impresión general,
  // el costo se evalúa sobre la lona completa si solo se pasó una tarifa única
  if (costoImpRate > 0 && costoDespRate === 0 && desperdicioM2 > 0) {
    costoImpresionGs = Math.round(areaTotalImpresaM2 * costoImpRate);
    costoDesperdicioGs = 0;
  }

  const costoTotalGs = costoImpresionGs + costoDesperdicioGs;

  // 5. Generación de resumen técnico
  const materialNombre = tarifas?.nombreInsumo || 'Lona';
  const detallePiezas = piezasCalculadas
    .map(p => `${(p.anchoM * (unidad === 'cm' ? 100 : 1)).toFixed(0)}x${(p.altoM * (unidad === 'cm' ? 100 : 1)).toFixed(0)}${unidad}${p.cantidad > 1 ? ` (x${p.cantidad})` : ''} = ${p.areaTotalM2.toFixed(3)}m²`)
    .join(', ');

  const medidasLonaStr = `${(anchoLonaM * (unidad === 'cm' ? 100 : 1)).toFixed(0)}x${(altoLonaM * (unidad === 'cm' ? 100 : 1)).toFixed(0)}${unidad}`;

  const resumenTexto = `${materialNombre} — Lona: ${medidasLonaStr} (${areaTotalLonaM2.toFixed(2)}m²) | Impreso: ${areaTotalImpresaM2.toFixed(2)}m² [${detallePiezas}] | Merma: ${desperdicioM2.toFixed(2)}m² (${porcentajeDesperdicio.toFixed(0)}%)${costoTotalGs > 0 ? ` | Costo: Gs. ${costoTotalGs.toLocaleString('es-PY')}` : ''}`;

  return {
    unidadEntrada: unidad,
    anchoLonaM: Number(anchoLonaM.toFixed(3)),
    altoLonaM: Number(altoLonaM.toFixed(3)),
    cantidadLonas: cantLonas,
    areaTotalLonaM2,
    piezas: piezasCalculadas,
    areaTotalImpresaM2,
    desperdicioM2,
    porcentajeDesperdicio,
    costoImpresionGs,
    costoDesperdicioGs,
    costoTotalGs,
    resumenTexto,
  };
}
