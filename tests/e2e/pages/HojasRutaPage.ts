import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class HojasRutaPage extends BasePage {
  readonly generarDesdeOTBtn: Locator;
  readonly otSelect: Locator;
  readonly confirmarGenerarBtn: Locator;

  constructor(page: Page) {
    super(page);
    this.generarDesdeOTBtn = page.locator('button:has-text("Generar desde OT")');
    this.otSelect = page.locator('select').last();
    this.confirmarGenerarBtn = page.locator('button:has-text("Generar Hoja de Ruta"), button:has-text("Crear")').last();
  }
}
