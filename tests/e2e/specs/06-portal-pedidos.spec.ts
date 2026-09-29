import { test, expect } from '@playwright/test';
import { PortalClientePage } from '../pages/PortalClientePage';

test.describe('Portal de Clientes - Autenticación por Token y Envío de Pedidos', () => {
  const token = '9d75cd0c-1d99-488d-ae41-acfb23b8124e';

  test('El cliente puede abrir su portal y enviar un pedido con descripción y cantidad', async ({ page }) => {
    const portalPage = new PortalClientePage(page);

    await portalPage.openPortal(token);
    const pedidoDesc = `Letrero Corp QA ${Date.now()}`;
    await portalPage.enviarPedido(pedidoDesc, 5);

    // Verificar que el nuevo pedido aparece en el historial del cliente
    await expect(page.locator(`text=${pedidoDesc}`)).toBeVisible({ timeout: 10000 });
  });
});
