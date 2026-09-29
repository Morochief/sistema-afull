import { describe, it, expect } from 'vitest';
import { evaluateFormula } from '../lib/mathFormula.ts';

describe('evaluateFormula - Safe Mathematical Evaluator', () => {
  it('evaluates basic arithmetic operations correctly', () => {
    expect(evaluateFormula('2 + 3')).toEqual({ success: true, value: 5, formatted: '5' });
    expect(evaluateFormula('10 - 4')).toEqual({ success: true, value: 6, formatted: '6' });
    expect(evaluateFormula('6 * 7')).toEqual({ success: true, value: 42, formatted: '42' });
    expect(evaluateFormula('15 / 3')).toEqual({ success: true, value: 5, formatted: '5' });
  });

  it('respects operator precedence (* and / before + and -)', () => {
    expect(evaluateFormula('2 + 3 * 4')).toEqual({ success: true, value: 14, formatted: '14' });
    expect(evaluateFormula('(2 + 3) * 4')).toEqual({ success: true, value: 20, formatted: '20' });
    expect(evaluateFormula('20 - 4 / 2')).toEqual({ success: true, value: 18, formatted: '18' });
  });

  it('handles "x" and "X" as multiplication symbol', () => {
    expect(evaluateFormula('2.5 x 4')).toEqual({ success: true, value: 10, formatted: '10' });
    expect(evaluateFormula('3 X 3')).toEqual({ success: true, value: 9, formatted: '9' });
  });

  it('handles decimal comma separator', () => {
    expect(evaluateFormula('2,5 * 4')).toEqual({ success: true, value: 10, formatted: '10' });
    expect(evaluateFormula('1,25 + 0,75')).toEqual({ success: true, value: 2, formatted: '2' });
  });

  it('evaluates real-world compound dimension formula from technical meeting', () => {
    // Meeting example: (2.5 * 0.8 * 2) + (1.2 * 0.5)
    // 2.5 * 0.8 * 2 = 4
    // 1.2 * 0.5 = 0.6
    // Total = 4.6
    const res = evaluateFormula('(2.5 * 0.8 * 2) + (1.2 * 0.5)');
    expect(res.success).toBe(true);
    expect(res.value).toBe(4.6);
  });

  it('evaluates real-world formula with mixed x and commas', () => {
    const res = evaluateFormula('(2,5 x 0,8 x 2) + (1,2 x 0,5)');
    expect(res.success).toBe(true);
    expect(res.value).toBe(4.6);
  });

  it('supports exponentiation ^', () => {
    expect(evaluateFormula('2 ^ 3')).toEqual({ success: true, value: 8, formatted: '8' });
  });

  it('supports unary negative numbers', () => {
    expect(evaluateFormula('-5 + 10')).toEqual({ success: true, value: 5, formatted: '5' });
    expect(evaluateFormula('10 * (-2)')).toEqual({ success: true, value: -20, formatted: '-20' });
  });

  it('returns error on division by zero', () => {
    const res = evaluateFormula('10 / 0');
    expect(res.success).toBe(false);
    expect(res.error).toContain('División por cero');
  });

  it('returns error on unbalanced parentheses', () => {
    const res = evaluateFormula('(2 + 3 * 4');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Paréntesis');
  });

  it('returns error on empty or invalid input', () => {
    expect(evaluateFormula('').success).toBe(false);
    expect(evaluateFormula('   ').success).toBe(false);
    expect(evaluateFormula('hello').success).toBe(false);
  });
});
