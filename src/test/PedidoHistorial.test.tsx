import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PedidoHistorial from '../portal/PedidoHistorial';

const pedidosBase = [
  {
    id: 'ped-1',
    local: 'Mariano Roque Alonso',
    descripcion: 'Cambio de micro playland',
    cantidad: 2,
    estado: 'Pendiente',
    prioridad: 'Media',
    fotoUrl: '/uploads/pedidos/ped-1/foto.jpg',
    fechaSolicitud: '2026-08-01T10:00:00Z',
  },
  {
    id: 'ped-2',
    local: 'Luque',
    descripcion: 'Cartel luminoso',
    cantidad: 1,
    estado: 'Entregado',
    prioridad: 'Alta',
    fotoUrl: null,
    fechaSolicitud: '2026-08-05T09:00:00Z',
  },
];

describe('PedidoHistorial', () => {
  it('muestra la miniatura de foto cuando el pedido tiene fotoUrl', () => {
    render(
      <PedidoHistorial
        pedidos={pedidosBase}
        pagina={1}
        totalPaginas={1}
        total={2}
        cargando={false}
        onCambioPagina={vi.fn()}
      />
    );

    const miniaturas = screen.getAllByRole('button', { name: /Ver foto/i });
    expect(miniaturas).toHaveLength(1);
    const img = screen.getByAltText('Foto del pedido Cambio de micro playland');
    expect(img).toHaveAttribute('src', '/uploads/pedidos/ped-1/foto.jpg');
  });

  it('muestra un guión cuando el pedido no tiene foto', () => {
    render(
      <PedidoHistorial
        pedidos={pedidosBase}
        pagina={1}
        totalPaginas={1}
        total={2}
        cargando={false}
        onCambioPagina={vi.fn()}
      />
    );

    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('abre la foto ampliada al hacer clic y la cierra con el botón ✕', async () => {
    const user = userEvent.setup();
    render(
      <PedidoHistorial
        pedidos={pedidosBase}
        pagina={1}
        totalPaginas={1}
        total={2}
        cargando={false}
        onCambioPagina={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /Ver foto/i }));

    // Modal ampliado
    const ampliada = screen.getByAltText('Foto del pedido');
    expect(ampliada).toHaveAttribute('src', '/uploads/pedidos/ped-1/foto.jpg');

    await user.click(screen.getByRole('button', { name: '✕' }));
    expect(screen.queryByAltText('Foto del pedido')).not.toBeInTheDocument();
  });
});
