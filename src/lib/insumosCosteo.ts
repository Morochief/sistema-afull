/**
 * Insumos Costeo & Prorrateo Utilities — Sistema aFull
 * 
 * Funciones puras para los 5 modos de costeo de insumos de taller,
 * cálculo de duración de jornadas manuales y distribución multi-cliente.
 */

export type ModoInsumo = 'UNIDAD' | 'METRO' | 'DIMENSION' | 'PORCENTAJE' | 'FACTURA';

export interface CalculoDimensionInput {
  anchoCm: number;
  altoCm: number;
  precioPorM2: number;
  calcularDesperdicio: boolean;
  anchoBobinaCm?: number; // e.g. 105, 122, 127, 152
}

export interface CalculoDimensionResult {
  areaM2: number;
  areaEfectivaM2: number;
  mermaM2: number;
  porcentajeDesperdicio: number;
  subtotalGs: number;
}

export interface CalculoDuracionResult {
  minutos: number;
  horasDecimal: number;
  duracionTexto: string; // "04:30"
  valido: boolean;
  error?: string;
}

export interface DistribucionCliente {
  clienteId: string;
  clienteNombre: string;
  proyectoId?: string;
  proyectoNombre?: string;
  porcentaje: number; // e.g. 60
}

/**
 * Modo 1: Por unidad (cantidad de piezas x precio unitario)
 */
export function calcularCostoPorUnidad(cantidad: number, precioUnitario: number): number {
  if (cantidad <= 0 || precioUnitario <= 0) return 0;
  return Math.round(cantidad * precioUnitario);
}

/**
 * Modo 2: Por metro lineal (metros x precio por metro)
 */
export function calcularCostoPorMetro(metros: number, precioPorMetro: number): number {
  if (metros <= 0 || precioPorMetro <= 0) return 0;
  return Math.round(metros * precioPorMetro);
}

/**
 * Modo 3: Por dimensión AxA en centímetros
 * Si calcularDesperdicio es true:
 * - Si se especifica bobina o rollo (ej. 127cm y el impreso mide 122cm x 252cm):
 *   El material consumido de la bobina es 127cm x 252cm.
 * - Si no se especifica bobina, se aplica un 15% estándar de merma de corte/taller.
 */
export function calcularCostoPorDimension(input: CalculoDimensionInput): CalculoDimensionResult {
  const { anchoCm, altoCm, precioPorM2, calcularDesperdicio, anchoBobinaCm } = input;
  
  if (anchoCm <= 0 || altoCm <= 0) {
    return {
      areaM2: 0,
      areaEfectivaM2: 0,
      mermaM2: 0,
      porcentajeDesperdicio: 0,
      subtotalGs: 0,
    };
  }

  const areaNetaM2 = (anchoCm * altoCm) / 10000;
  let areaConsumidaM2 = areaNetaM2;

  if (calcularDesperdicio) {
    if (anchoBobinaCm && anchoBobinaCm > anchoCm) {
      // Consume el ancho completo de la bobina
      areaConsumidaM2 = (anchoBobinaCm * altoCm) / 10000;
    } else {
      // Merma estándar de 15% de taller
      areaConsumidaM2 = areaNetaM2 * 1.15;
    }
  }

  const mermaM2 = Math.max(0, areaConsumidaM2 - areaNetaM2);
  const porcentajeDesperdicio = areaConsumidaM2 > 0 ? (mermaM2 / areaConsumidaM2) * 100 : 0;
  const subtotalGs = Math.round(areaConsumidaM2 * (precioPorM2 || 0));

  return {
    areaM2: Math.round(areaNetaM2 * 1000) / 1000,
    areaEfectivaM2: Math.round(areaConsumidaM2 * 1000) / 1000,
    mermaM2: Math.round(mermaM2 * 1000) / 1000,
    porcentajeDesperdicio: Math.round(porcentajeDesperdicio * 10) / 10,
    subtotalGs,
  };
}

/**
 * Modo 4: Por porcentaje (ej. 20% de un bidón de Gs. 150.000 = Gs. 30.000)
 */
export function calcularCostoPorPorcentaje(porcentaje: number, precioTotalInsumo: number): number {
  if (porcentaje <= 0 || precioTotalInsumo <= 0) return 0;
  return Math.round((porcentaje / 100) * precioTotalInsumo);
}

/**
 * Carga rápida de horario: Calcula minutos y formato HH:MM desde hora inicio y fin
 * Soporta "08:00" a "12:30" -> 270 minutos ("04:30")
 * Soporta cruce de medianoche: "22:00" a "02:00" -> 240 minutos ("04:00")
 */
export function calcularDuracionHoras(horaInicio: string, horaFin: string): CalculoDuracionResult {
  if (!horaInicio || !horaFin) {
    return { minutos: 0, horasDecimal: 0, duracionTexto: '00:00', valido: false };
  }

  const [hIniStr, mIniStr] = horaInicio.split(':');
  const [hFinStr, mFinStr] = horaFin.split(':');

  const hIni = parseInt(hIniStr, 10);
  const mIni = parseInt(mIniStr, 10);
  const hFin = parseInt(hFinStr, 10);
  const mFin = parseInt(mFinStr, 10);

  if (isNaN(hIni) || isNaN(mIni) || isNaN(hFin) || isNaN(mFin)) {
    return { minutos: 0, horasDecimal: 0, duracionTexto: '00:00', valido: false, error: 'Formato inválido' };
  }

  let inicioMin = hIni * 60 + mIni;
  let finMin = hFin * 60 + mFin;

  // Cruce de medianoche
  if (finMin < inicioMin) {
    finMin += 24 * 60;
  }

  const minutos = finMin - inicioMin;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  const horasDecimal = Math.round((minutos / 60) * 100) / 100;
  const duracionTexto = `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

  return {
    minutos,
    horasDecimal,
    duracionTexto,
    valido: true,
  };
}

/**
 * Valida que la suma de porcentajes en el prorrateo sea exactamente 100%
 */
export function validarProrrateoTotal(distribuciones: { porcentaje: number }[]): boolean {
  if (!distribuciones || distribuciones.length === 0) return false;
  const sum = distribuciones.reduce((acc, d) => acc + (Number(d.porcentaje) || 0), 0);
  return Math.abs(sum - 100) < 0.01;
}

/**
 * Distribuye un valor total numérico según porcentajes, cuadrando el último para evitar centavos perdidos
 */
export function distribuirValor(total: number, porcentajes: number[]): number[] {
  if (porcentajes.length === 0) return [];
  if (porcentajes.length === 1) return [total];

  let acumulado = 0;
  const resultado: number[] = [];

  for (let i = 0; i < porcentajes.length; i++) {
    if (i === porcentajes.length - 1) {
      // Último ítem absorbe la diferencia de redondeo
      resultado.push(Math.round((total - acumulado) * 100) / 100);
    } else {
      const parte = Math.round(((total * porcentajes[i]) / 100) * 100) / 100;
      acumulado += parte;
      resultado.push(parte);
    }
  }

  return resultado;
}
