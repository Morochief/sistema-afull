import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class PortalClientePage extends BasePage {
  readonly sucursalSelect: Locator;
  readonly descripcionInput: Locator;
  readonly cantidadInput: Locator;
  readonly submitPedidoBtn: Locator;
  readonly successBanner: Locator;

  constructor(page: Page) {
    super(page);
    this.sucursalSelect = page.locator('select').first();
    this.descripcionInput = page.locator('textarea');
    this.cantidadInput = page.locator('input[type="number"]').first();
    this.submitPedidoBtn = page.locator('button[type="submit"]:has-text("Enviar Pedido")');
    this.successBanner = page.locator('div:has-text("Pedido enviado")');
  }

  async openPortal(token: string) {
    await this.goto(`/portal/${token}`);
    await this.page.waitForSelector('h1:has-text("Portal de Pedidos")', { timeout: 10000 });
  }

  async enviarPedido(descripcion: string, cantidad = 2) {
    const nuevoLocalInput = this.page.locator('input[placeholder*="Mariano"], #nueva-sucursal');
    if (await nuevoLocalInput.isVisible()) {
      await nuevoLocalInput.fill('Casa Central QA');
      await this.page.locator('button:has-text("Agregar")').click();
      await this.page.waitForTimeout(500);
    }

    if (await this.sucursalSelect.isVisible()) {
      const optionsCount = await this.sucursalSelect.locator('option').count();
      if (optionsCount > 1) {
        await this.sucursalSelect.selectOption({ index: 1 });
      }
    }
    await this.descripcionInput.fill(descripcion);
    await this.cantidadInput.fill(cantidad.toString());
    await this.submitPedidoBtn.click();
    await expect(this.page.locator(`section:has-text("Mis Pedidos") p:has-text("${descripcion}"), section:has-text("Mis Pedidos") div:has-text("${descripcion}")`).last()).toBeVisible({ timeout: 10000 });
  }
}
