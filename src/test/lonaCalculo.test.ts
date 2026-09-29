import { describe, it, expect } from 'vitest';
import { calcularLonaYDesperdicio, parseNumeroSeguro, aMetros } from '../lib/lonaCalculo.ts';

describe('Motor de Cálculo de Lonas y Desperdicio', () => {
  it('convierte correctamente centímetros a metros', () => {
    expect(aMetros(108, 'cm')).toBe(1.08);
    expect(aMetros(169, 'cm')).toBe(1.69);
    expect(aMetros(55, 'cm')).toBe(0.55);
    expect(aMetros(165, 'cm')).toBe(1.65);
    expect(aMetros(2.2, 'm')).toBe(2.2);
  });

  it('sanitiza números con coma decimal o espacios', () => {
    expect(parseNumeroSeguro('108,5')).toBe(108.5);
    expect(parseNumeroSeguro(' 169 ')).toBe(169);
    expect(parseNumeroSeguro('')).toBe(0);
    expect(parseNumeroSeguro(null)).toBe(0);
  });

  it('calcula el caso exacto de Eduardo Méndez (Lona 108x169 cm, Trabajo 55x165 cm)', () => {
    const res = calcularLonaYDesperdicio({
      unidad: 'cm',
      lona: { ancho: 108, alto: 169, cantidad: 1 },
      piezas: [
        { id: '1', nombre: 'Trabajo Cartel', ancho: 55, alto: 165, cantidad: 1 }
      ],
      tarifas: {
        nombreInsumo: 'Lona x m (impresión) Serimax',
        costoImpresionPorM2: 63000,
        costoDesperdicioPorM2: 15500,
      }
    });

    // 108cm = 1.08m, 169cm = 1.69m -> Area Lona = 1.8252 m²
    expect(res.areaTotalLonaM2).toBeCloseTo(1.8252, 4);

    // 55cm = 0.55m, 165cm = 1.65m -> Area Impresa = 0.9075 m²
    expect(res.areaTotalImpresaM2).toBeCloseTo(0.9075, 4);

    // Desperdicio = 1.8252 - 0.9075 = 0.9177 m²
    expect(res.desperdicioM2).toBeCloseTo(0.9177, 4);

    // Porcentaje Desperdicio: (0.9177 / 1.8252) * 100 = 50.28%
    expect(res.porcentajeDesperdicio).toBeCloseTo(50.28, 1);

    // Costo Impresión: 0.9075 * 63000 = 57172.5 -> 57173 Gs.
    expect(res.costoImpresionGs).toBe(57173);

    // Costo Desperdicio: 0.9177 * 15500 = 14224.35 -> 14224 Gs.
    expect(res.costoDesperdicioGs).toBe(14224);

    // Costo Total: 57173 + 14224 = 71397 Gs.
    expect(res.costoTotalGs).toBe(71397);

    // Resumen incluye los detalles necesarios
    expect(res.resumenTexto).toContain('Lona: 108x169cm');
    expect(res.resumenTexto).toContain('50%');
    expect(res.resumenTexto).toContain('71.397');
  });

  it('soporta múltiples piezas / trabajos sobre la misma lona', () => {
    const res = calcularLonaYDesperdicio({
      unidad: 'cm',
      lona: { ancho: 200, alto: 300, cantidad: 1 }, // 2m x 3m = 6m²
      piezas: [
        { id: '1', nombre: 'Banner 1', ancho: 100, alto: 100, cantidad: 2 }, // 2 x 1m² = 2m²
        { id: '2', nombre: 'Banner 2', ancho: 100, alto: 200, cantidad: 1 }, // 1 x 2m² = 2m²
      ],
      tarifas: {
        costoImpresionPorM2: 85000,
        costoDesperdicioPorM2: 38000,
      }
    });

    expect(res.areaTotalLonaM2).toBe(6);
    expect(res.areaTotalImpresaM2).toBe(4);
    expect(res.desperdicioM2).toBe(2);
    expect(res.porcentajeDesperdicio).toBeCloseTo(33.33, 1);
    expect(res.costoImpresionGs).toBe(4 * 85000); // 340.000 Gs.
    expect(res.costoDesperdicioGs).toBe(2 * 38000); // 76.000 Gs.
    expect(res.costoTotalGs).toBe(416000);
  });
});
