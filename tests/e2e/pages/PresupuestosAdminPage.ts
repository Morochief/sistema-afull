import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class PresupuestosAdminPage extends BasePage {
  readonly nuevoPresupuestoBtn: Locator;
  readonly clienteSelect: Locator;
  readonly pedidoSelect: Locator;
  readonly proyectoSelect: Locator;
  readonly markupInput: Locator;
  readonly itemDescripcionInput: Locator;
  readonly itemCantidadInput: Locator;
  readonly itemPrecioInput: Locator;
  readonly guardarPresupuestoBtn: Locator;

  constructor(page: Page) {
    super(page);
    this.nuevoPresupuestoBtn = page.locator('button:has-text("+ Nuevo Presupuesto")');
    this.clienteSelect = page.locator('div:has-text("Cliente *") select, select').first();
    this.pedidoSelect = page.locator('div:has-text("Pedido *") select, select').nth(1);
    this.proyectoSelect = page.locator('div:has-text("Proyecto *") select, select').nth(2);
    this.markupInput = page.locator('input[placeholder="35"], input[type="number"]').first();
    this.itemDescripcionInput = page.locator('input[placeholder*="Vinilo"], input[placeholder*="Descripción"]').first();
    this.itemCantidadInput = page.locator('input[type="number"]').nth(1);
    this.itemPrecioInput = page.locator('input[type="number"]').nth(2);
    this.guardarPresupuestoBtn = page.locator('button:has-text("Crear Presupuesto"), button:has-text("Guardar Cambios")');
  }

  async crearPresupuestoDesdePedido(clienteIdx = 1) {
    await this.nuevoPresupuestoBtn.click();
    await this.page.waitForTimeout(300);
    const selects = this.page.locator('div.space-y-4 select');
    await selects.first().selectOption({ index: clienteIdx });
    await this.page.waitForTimeout(300);
    await selects.nth(1).selectOption({ index: 1 });
    await this.page.waitForTimeout(300);
    await selects.nth(2).selectOption({ index: 1 });

    const desc = this.page.locator('input[placeholder*="Descripción"], input[placeholder*="Vinilo"]').first();
    await desc.fill('Item Test QA Presupuesto');
    const cant = this.page.locator('input[type="number"]').nth(1);
    await cant.fill('2');
    const pu = this.page.locator('input[type="number"]').nth(2);
    await pu.fill('150000');

    await this.guardarPresupuestoBtn.click();
    await this.page.waitForTimeout(1000);
  }
}
