import { describe, it, expect } from 'vitest';
import {
  calcularCostoPorUnidad,
  calcularCostoPorMetro,
  calcularCostoPorDimension,
  calcularCostoPorPorcentaje,
  calcularDuracionHoras,
  validarProrrateoTotal,
  distribuirValor,
} from '../lib/insumosCosteo.ts';

describe('insumosCosteo — Cálculos de Taller y Prorrateo', () => {
  it('Modo 1 (Por unidad): calcula cantidad x precio unitario', () => {
    expect(calcularCostoPorUnidad(5, 12000)).toBe(60000);
    expect(calcularCostoPorUnidad(0, 50000)).toBe(0);
  });

  it('Modo 2 (Por metro): calcula metros lineales x precio', () => {
    expect(calcularCostoPorMetro(1.2, 50000)).toBe(60000);
    expect(calcularCostoPorMetro(3.5, 20000)).toBe(70000);
  });

  it('Modo 3 (Por dimensión): calcula área en m² sin desperdicio', () => {
    // 122cm x 252cm = 30744 cm² = 3.0744 m²
    const res = calcularCostoPorDimension({
      anchoCm: 122,
      altoCm: 252,
      precioPorM2: 50000,
      calcularDesperdicio: false,
    });

    expect(res.areaM2).toBeCloseTo(3.074, 2);
    expect(res.areaEfectivaM2).toBeCloseTo(3.074, 2);
    expect(res.mermaM2).toBe(0);
    expect(res.subtotalGs).toBe(Math.round(3.0744 * 50000));
  });

  it('Modo 3 (Por dimensión con bobina): calcula consumo sobre bobina de 127cm', () => {
    // Ancho impreso 122cm en bobina de 127cm: consume 127cm x 252cm = 3.2004 m²
    const res = calcularCostoPorDimension({
      anchoCm: 122,
      altoCm: 252,
      precioPorM2: 50000,
      calcularDesperdicio: true,
      anchoBobinaCm: 127,
    });

    expect(res.areaEfectivaM2).toBeCloseTo(3.2, 2);
    expect(res.mermaM2).toBeGreaterThan(0);
    expect(res.subtotalGs).toBe(Math.round(3.2004 * 50000));
  });

  it('Modo 4 (Por porcentaje): calcula fracción exacta de insumo', () => {
    // 20% de un bidón de pintura de Gs. 150.000 = Gs. 30.000
    expect(calcularCostoPorPorcentaje(20, 150000)).toBe(30000);
    expect(calcularCostoPorPorcentaje(50, 80000)).toBe(40000);
    expect(calcularCostoPorPorcentaje(0, 100000)).toBe(0);
  });

  it('Carga de Horas: calcula duración entre hora inicio y fin', () => {
    const res1 = calcularDuracionHoras('08:00', '12:30');
    expect(res1.valido).toBe(true);
    expect(res1.minutos).toBe(270);
    expect(res1.horasDecimal).toBe(4.5);
    expect(res1.duracionTexto).toBe('04:30');

    // Cruce de medianoche
    const res2 = calcularDuracionHoras('22:00', '02:30');
    expect(res2.valido).toBe(true);
    expect(res2.minutos).toBe(270);
    expect(res2.duracionTexto).toBe('04:30');
  });

  it('Prorrateo: valida que la suma de porcentajes sea exactamente 100%', () => {
    expect(validarProrrateoTotal([{ porcentaje: 60 }, { porcentaje: 40 }])).toBe(true);
    expect(validarProrrateoTotal([{ porcentaje: 33.33 }, { porcentaje: 33.33 }, { porcentaje: 33.34 }])).toBe(true);
    expect(validarProrrateoTotal([{ porcentaje: 50 }, { porcentaje: 40 }])).toBe(false);
  });

  it('Prorrateo: distribuye valores exactos sin pérdida por centavos', () => {
    const split = distribuirValor(100000, [60, 40]);
    expect(split).toEqual([60000, 40000]);

    const split3 = distribuirValor(100, [33.33, 33.33, 33.34]);
    const suma = split3.reduce((a, b) => a + b, 0);
    expect(suma).toBe(100);
  });
});
