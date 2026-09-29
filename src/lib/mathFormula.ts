/**
 * Safe Mathematical Formula Evaluator for Sistema aFull
 * 
 * Evaluates basic arithmetic expressions without using eval() or new Function().
 * Supports: +, -, *, x, X, /, ^, parentheses (), and both '.' and ',' as decimal separators.
 * Ideal for calculating square meters, dimensions, or compound quantities.
 * Example: "(2.5 * 0.8 * 2) + (1.2 * 0.5)" -> 4.6
 */

export interface FormulaResult {
  success: boolean;
  value?: number;
  formatted?: string;
  error?: string;
}

type TokenType = 'NUMBER' | 'OP' | 'LPAREN' | 'RPAREN';

interface Token {
  type: TokenType;
  value: string | number;
}

function tokenize(input: string): Token[] {
  // Pre-process:
  // 1. Replace 'x' or 'X' with '*'
  let str = input.replace(/[xX]/g, '*');
  
  // 2. Replace comma between digits with dot: e.g. 2,5 -> 2.5
  str = str.replace(/(\d+),(\d+)/g, '$1.$2');

  const tokens: Token[] = [];
  let i = 0;

  while (i < str.length) {
    const char = str[i];

    // Ignore whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Numbers (integers or decimals)
    if (/\d/.test(char) || (char === '.' && i + 1 < str.length && /\d/.test(str[i + 1]))) {
      let numStr = '';
      let hasDot = false;
      while (i < str.length && (/\d/.test(str[i]) || (str[i] === '.' && !hasDot))) {
        if (str[i] === '.') hasDot = true;
        numStr += str[i];
        i++;
      }
      const val = parseFloat(numStr);
      if (isNaN(val)) {
        throw new Error(`Número inválido: ${numStr}`);
      }
      tokens.push({ type: 'NUMBER', value: val });
      continue;
    }

    // Parentheses
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }

    // Operators
    if (['+', '-', '*', '/', '^'].includes(char)) {
      // Check for unary minus / plus
      const prev = tokens[tokens.length - 1];
      const isUnary = !prev || prev.type === 'OP' || prev.type === 'LPAREN';
      
      if (isUnary) {
        if (char === '-') {
          // Represent unary minus as 0 - ...
          tokens.push({ type: 'NUMBER', value: 0 });
          tokens.push({ type: 'OP', value: '-' });
          i++;
          continue;
        } else if (char === '+') {
          // Unary plus can just be skipped
          i++;
          continue;
        } else {
          throw new Error(`Operador inesperado '${char}' al inicio o después de operador`);
        }
      }

      tokens.push({ type: 'OP', value: char });
      i++;
      continue;
    }

    throw new Error(`Carácter no permitido: '${char}'`);
  }

  return tokens;
}

const PRECEDENCE: Record<string, number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
  '^': 3,
};

const RIGHT_ASSOCIATIVE: Record<string, boolean> = {
  '^': true,
};

function applyOp(op: string, b: number, a: number): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': {
      if (b === 0) throw new Error('División por cero');
      return a / b;
    }
    case '^': return Math.pow(a, b);
    default: throw new Error(`Operador desconocido: ${op}`);
  }
}

/**
 * Shunting-Yard parser + RPN evaluator
 */
export function evaluateFormula(expr: string): FormulaResult {
  if (!expr || typeof expr !== 'string' || !expr.trim()) {
    return { success: false, error: 'Expresión vacía' };
  }

  try {
    const tokens = tokenize(expr);
    if (tokens.length === 0) {
      return { success: false, error: 'Expresión vacía' };
    }

    const values: number[] = [];
    const ops: string[] = [];

    const processOp = () => {
      if (ops.length === 0) throw new Error('Expresión mal formada');
      const op = ops.pop()!;
      if (values.length < 2) throw new Error('Faltan operandos para ' + op);
      const b = values.pop()!;
      const a = values.pop()!;
      const res = applyOp(op, b, a);
      if (!isFinite(res)) throw new Error('Resultado numérico infinito o no definido');
      values.push(res);
    };

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === 'NUMBER') {
        values.push(token.value as number);
      } else if (token.type === 'LPAREN') {
        ops.push('(');
      } else if (token.type === 'RPAREN') {
        while (ops.length > 0 && ops[ops.length - 1] !== '(') {
          processOp();
        }
        if (ops.length === 0 || ops[ops.length - 1] !== '(') {
          throw new Error('Paréntesis desbalanceados');
        }
        ops.pop(); // Remove '('
      } else if (token.type === 'OP') {
        const currOp = token.value as string;
        const currPrec = PRECEDENCE[currOp] || 0;
        const isRightAssoc = Boolean(RIGHT_ASSOCIATIVE[currOp]);

        while (
          ops.length > 0 &&
          ops[ops.length - 1] !== '(' &&
          (isRightAssoc
            ? currPrec < (PRECEDENCE[ops[ops.length - 1]] || 0)
            : currPrec <= (PRECEDENCE[ops[ops.length - 1]] || 0))
        ) {
          processOp();
        }
        ops.push(currOp);
      }
    }

    while (ops.length > 0) {
      if (ops[ops.length - 1] === '(' || ops[ops.length - 1] === ')') {
        throw new Error('Paréntesis desbalanceados');
      }
      processOp();
    }

    if (values.length !== 1) {
      throw new Error('Expresión incompleta');
    }

    const result = values[0];
    // Round to max 4 decimal digits to avoid IEEE 754 precision artifacts (e.g. 0.30000000000000004)
    const rounded = Math.round(result * 10000) / 10000;

    return {
      success: true,
      value: rounded,
      formatted: rounded.toLocaleString('es-PY', { maximumFractionDigits: 4 }),
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error en la fórmula',
    };
  }
}
