import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PresupuestosAdmin from '../components/PresupuestosAdmin';
import { Cliente, Pedido, Proyecto } from '../types';

vi.mock('../authFetch.ts', () => ({
  authFetchJSON: vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/admin/presupuestos')) {
      return Promise.resolve({ success: true, data: [] });
    }
    return Promise.resolve({ success: true });
  }),
}));

vi.mock('../components/CalculadoraAdhesivoModal', () => ({
  default: () => <div data-testid="calculadora-modal">Calculadora</div>,
}));

describe('PresupuestosAdmin — Flujo de Proyecto (Existente vs Nuevo)', () => {
  const mockClientes: Cliente[] = [
    { id: 'cli_1', nombre: 'Puma Energy', codigo: 'PUM', fechaCreacion: '2026-01-01' },
    { id: 'cli_2', nombre: 'Burger King', codigo: 'BK', fechaCreacion: '2026-01-01' },
  ];

  const mockPedidos: Pedido[] = [
    {
      id: 'ped_1',
      clienteId: 'cli_1',
      sucursalId: 'suc_1',
      descripcion: 'Cambio de lona cartel principal y marquesina',
      cantidad: 1,
      estado: 'Pendiente',
      fechaSolicitud: '2026-09-20',
      clienteNombre: 'Puma Energy',
      local: 'Estación Km 5',
      proyecto: 'Cartelería Nueva Km 5',
    },
    {
      id: 'ped_2',
      clienteId: 'cli_2',
      sucursalId: 'suc_2',
      descripcion: 'Corpóreo luminoso led para fachada',
      cantidad: 1,
      estado: 'Pendiente',
      fechaSolicitud: '2026-09-21',
      clienteNombre: 'Burger King',
      local: 'Sucursal MRA',
    },
  ];

  const mockProyectos: Proyecto[] = [
    {
      id: 'pro_1',
      clienteId: 'cli_1',
      nombre: 'Mantenimiento General 2026',
      estado: 'En Proceso',
      activo: true,
      fechaInicio: '2026-01-01',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permite abrir el formulario de nuevo presupuesto y alternar entre proyecto existente y nuevo', async () => {
    const user = userEvent.setup();
    render(
      <PresupuestosAdmin
        clientes={mockClientes}
        pedidos={mockPedidos}
        proyectos={mockProyectos}
        onConvertido={vi.fn()}
      />
    );

    // Abrir formulario
    const btnNuevo = screen.getByRole('button', { name: /\+ Nuevo Presupuesto/i });
    await user.click(btnNuevo);

    expect(screen.getByText('Nuevo Presupuesto')).toBeInTheDocument();

    // Seleccionar cliente con proyectos existentes (Puma Energy)
    const selectCliente = screen.getByRole('combobox', { name: /Cliente \*/i });
    await user.selectOptions(selectCliente, 'cli_1');

    // Debe mostrar los botones de alternancia Existente y Nuevo
    const btnExistente = screen.getByRole('button', { name: /📁 Existente \(1\)/i });
    const btnNuevoModo = screen.getByRole('button', { name: /✨ Nuevo/i });
    expect(btnExistente).toBeInTheDocument();
    expect(btnNuevoModo).toBeInTheDocument();

    // Por defecto inicia en existente porque cli_1 tiene 1 proyecto
    expect(screen.getByRole('combobox', { name: /Proyecto \*/i })).toBeInTheDocument();

    // Cambiar a modo nuevo
    await user.click(btnNuevoModo);
    const inputProyecto = screen.getByPlaceholderText(/Ej: Renovación Cartelería Fachada 2026/i);
    expect(inputProyecto).toBeInTheDocument();

    // Escribir un nombre de proyecto nuevo
    await user.type(inputProyecto, 'Nuevo Totem 2026');
    expect(inputProyecto).toHaveValue('Nuevo Totem 2026');
  });

  it('activa automáticamente el modo nuevo y sugiere el nombre cuando el cliente no tiene proyectos previos', async () => {
    const user = userEvent.setup();
    render(
      <PresupuestosAdmin
        clientes={mockClientes}
        pedidos={mockPedidos}
        proyectos={mockProyectos}
        onConvertido={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /\+ Nuevo Presupuesto/i }));

    // Seleccionar cliente SIN proyectos existentes (Burger King - cli_2)
    const selectCliente = screen.getByRole('combobox', { name: /Cliente \*/i });
    await user.selectOptions(selectCliente, 'cli_2');

    // El botón de existente debe estar deshabilitado con (0)
    const btnExistente = screen.getByRole('button', { name: /📁 Existente \(0\)/i });
    expect(btnExistente).toBeDisabled();

    // Debe mostrar directamente el input de texto en modo Nuevo
    const inputProyecto = screen.getByPlaceholderText(/Ej: Renovación Cartelería Fachada 2026/i);
    expect(inputProyecto).toBeInTheDocument();

    // Seleccionar el pedido ped_2
    const selectPedido = screen.getByRole('combobox', { name: /Pedido \*/i });
    await user.selectOptions(selectPedido, 'ped_2');

    // Debe autocompletar el nombre del proyecto a partir de la descripción del pedido
    expect(inputProyecto).toHaveValue('Corpóreo luminoso led para fachada');
  });

  it('al seleccionar un pedido con proyecto definido lo pre-completa en modo nuevo si no existe en la base', async () => {
    const user = userEvent.setup();
    render(
      <PresupuestosAdmin
        clientes={mockClientes}
        pedidos={mockPedidos}
        proyectos={mockProyectos}
        onConvertido={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /\+ Nuevo Presupuesto/i }));

    // Seleccionar cliente Puma Energy
    const selectCliente = screen.getByRole('combobox', { name: /Cliente \*/i });
    await user.selectOptions(selectCliente, 'cli_1');

    // Seleccionar pedido ped_1 (tiene proyecto: 'Cartelería Nueva Km 5')
    const selectPedido = screen.getByRole('combobox', { name: /Pedido \*/i });
    await user.selectOptions(selectPedido, 'ped_1');

    // Como 'Cartelería Nueva Km 5' no estaba en mockProyectos, se activa modo nuevo y se pre-completa
    const inputProyecto = screen.getByPlaceholderText(/Ej: Renovación Cartelería Fachada 2026/i);
    expect(inputProyecto).toBeInTheDocument();
    expect(inputProyecto).toHaveValue('Cartelería Nueva Km 5');
  });
});
