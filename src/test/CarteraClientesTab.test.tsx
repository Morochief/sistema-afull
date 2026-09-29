import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CarteraClientesTab from '../components/CarteraClientesTab';
import * as authFetch from '../authFetch';

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock del NotifContext
vi.mock('../context/NotifContext.tsx', () => ({
  useNotif: () => ({
    showToast: vi.fn(),
    requestConfirm: (_t: string, _m: string, _type: string, onConfirm: () => void) => onConfirm(),
  }),
}));

const mockClientes = [
  {
    id: 'carcli1',
    nombre: 'Gloria S.A.C.E.I.',
    ruc: '80002010-3',
    activo: true,
    fechaCreacion: '2026-08-01T00:00:00Z',
    _count: { contactos: 4, marcas: 7 },
  },
  {
    id: 'carcli2',
    nombre: 'UPISA',
    ruc: '80021003-4',
    activo: true,
    fechaCreacion: '2026-08-02T00:00:00Z',
    _count: { contactos: 1, marcas: 1 },
  },
];

const mockMarcas = [
  { id: 'carmar1', clienteId: 'carcli1', clienteNombre: 'Gloria S.A.C.E.I.', nombre: 'Milka', activo: true },
  { id: 'carmar2', clienteId: 'carcli1', clienteNombre: 'Gloria S.A.C.E.I.', nombre: 'Tang/Clight', activo: true },
];

const mockContactos = [
  { id: 'carcon1', clienteId: 'carcli1', clienteNombre: 'Gloria S.A.C.E.I.', nombre: 'Alejandra Almiron', cargo: 'Marketing', email: 'aalmiron@gloria.com.py', activo: true },
  { id: 'carcon2', clienteId: 'carcli1', clienteNombre: 'Gloria S.A.C.E.I.', nombre: 'Miguel Seux', cargo: null, email: 'mseux@gloria.com.py', activo: true },
];

describe('CarteraClientesTab', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Default: lista de clientes + hijos vacíos
    vi.spyOn(authFetch, 'authFetchJSON').mockImplementation(async (url: string) => {
      if (url.startsWith('/api/admin/cartera?')) {
        return { success: true, data: mockClientes };
      }
      if (url.includes('/marcas')) return { success: true, data: mockMarcas };
      if (url.includes('/contactos')) return { success: true, data: mockContactos };
      return { success: true, data: [] };
    });
  });

  it('renderiza la lista de clientes de cartera con RUC y conteos', async () => {
    render(<CarteraClientesTab />);

    expect(await screen.findByText('Gloria S.A.C.E.I.')).toBeInTheDocument();
    expect(await screen.findByText('UPISA')).toBeInTheDocument();
    expect(screen.getByText('RUC 80002010-3')).toBeInTheDocument();
    expect(screen.getByText(/4 contactos/)).toBeInTheDocument();
    expect(screen.getByText(/7 marcas/)).toBeInTheDocument();
  });

  it('crea un cliente de cartera nuevo', async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(authFetch, 'authFetchJSON');

    render(<CarteraClientesTab />);

    await user.type(screen.getByPlaceholderText('Razón Social (ej: Gloria S.A.C.E.I.)'), 'Nuevo Cliente SA');
    await user.type(screen.getByPlaceholderText('RUC (ej: 80002010-3)'), '80012345-1');
    await user.click(screen.getByRole('button', { name: /Agregar Cliente/i }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(
        '/api/admin/cartera',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ nombre: 'Nuevo Cliente SA', ruc: '80012345-1' }),
        })
      );
    });
  });

  it('expande un cliente y muestra sus marcas y contactos', async () => {
    const user = userEvent.setup();
    render(<CarteraClientesTab />);

    await screen.findByText('Gloria S.A.C.E.I.');
    await user.click(screen.getByText('Gloria S.A.C.E.I.'));

    // Marcas
    expect(await screen.findByText('Milka')).toBeInTheDocument();
    expect(screen.getByText('Tang/Clight')).toBeInTheDocument();
    // Contactos
    expect(await screen.findByText('Alejandra Almiron')).toBeInTheDocument();
    expect(screen.getByText(/aalmiron@gloria\.com\.py/)).toBeInTheDocument();
  });

  it('agrega una marca nueva a un cliente', async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(authFetch, 'authFetchJSON');

    render(<CarteraClientesTab />);

    await screen.findByText('Gloria S.A.C.E.I.');
    await user.click(screen.getByText('Gloria S.A.C.E.I.'));
    await screen.findByText('Milka');

    await user.type(screen.getByPlaceholderText('Nueva marca...'), 'Mimosa');
    await user.click(screen.getByRole('button', { name: /Agregar/ }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(
        '/api/admin/cartera/carcli1/marcas',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('agrega un contacto nuevo a un cliente', async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(authFetch, 'authFetchJSON');

    render(<CarteraClientesTab />);

    await screen.findByText('Gloria S.A.C.E.I.');
    await user.click(screen.getByText('Gloria S.A.C.E.I.'));
    await screen.findByText('Alejandra Almiron');

    await user.type(screen.getByPlaceholderText('Nombre del contacto'), 'Yeruti Acuña');
    await user.type(screen.getByPlaceholderText('Correo'), 'yerutia@gloria.com.py');
    await user.click(screen.getByRole('button', { name: /Agregar/ }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(
        '/api/admin/cartera/carcli1/contactos',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('muestra error cuando la carga falla', async () => {
    vi.spyOn(authFetch, 'authFetchJSON').mockRejectedValue(new Error('Error de conexión'));
    render(<CarteraClientesTab />);

    expect(await screen.findByText('Error de conexión')).toBeInTheDocument();
  });
});
