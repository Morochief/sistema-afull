import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class OrdenesTrabajoPage extends BasePage {
  readonly searchInput: Locator;
  readonly filtroEstadoSelect: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.locator('input[placeholder*="Buscar"], input[type="text"]').first();
    this.filtroEstadoSelect = page.locator('select').first();
  }

  async filtrarOT(estado: string) {
    await this.filtroEstadoSelect.selectOption(estado);
    await this.page.waitForTimeout(300);
  }
}
