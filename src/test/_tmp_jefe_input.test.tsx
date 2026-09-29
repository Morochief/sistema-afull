import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColaboradoresTab from '../components/ColaboradoresTab';
import { DatabaseState } from '../types';

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../context/NotifContext.tsx', () => ({
  useNotif: () => ({
    showToast: vi.fn(),
    requestConfirm: (_title: string, _msg: string, _variant: string, onConfirm: () => void) => onConfirm(),
  }),
}));

const colaborador = {
  id: 'col1',
  nombre: 'Juan Pérez',
  rol: 'Montador',
  tarifaSugerida: 400,
  ci: '1234567',
  cargo: 'Operario',
  departamento: 'Producción',
  jefeInmediato: 'Eduardo',
};

const data = {
  colaboradores: [colaborador],
  clientes: [],
  proyectos: [],
  registros: [],
  registrosVehiculo: [],
  timersActivos: [],
  viajesActivos: [],
  usuariosSinColaborador: [],
} as unknown as DatabaseState;

const props = {
  data,
  onAddColaborador: vi.fn().mockResolvedValue(undefined),
  onEditColaborador: vi.fn().mockResolvedValue(undefined),
  onDeleteColaborador: vi.fn().mockResolvedValue(undefined),
};

describe('ColaboradoresTab Jefe Inmediato edit input', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permite escribir en el input Jefe Inmediato en modo edición', async () => {
    render(<ColaboradoresTab {...props} />);
    // Click en "Editar"
    const editBtn = screen.getByText('Editar');
    fireEvent.click(editBtn);

    // Buscar el input por su placeholder "Jefe"
    const jefeInput = screen.getByPlaceholderText('Jefe') as HTMLInputElement;
    expect(jefeInput).toBeTruthy();
    // Debe precargarse con el valor existente
    expect(jefeInput.value).toBe('Eduardo');

    // Simular escribir caracter por caracter (no pegar)
    const user = userEvent.setup();
    await user.clear(jefeInput);
    await user.type(jefeInput, 'Carlos Ruiz');
    await waitFor(() => {
      expect(jefeInput.value).toBe('Carlos Ruiz');
    });
  });
});
