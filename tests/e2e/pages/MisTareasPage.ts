import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class MisTareasPage extends BasePage {
  readonly filtroFechaSelect: Locator;
  readonly filtroEstadoSelect: Locator;
  readonly modalNotas: Locator;
  readonly notasTextarea: Locator;
  readonly guardarNotasBtn: Locator;

  constructor(page: Page) {
    super(page);
    this.filtroFechaSelect = page.locator('select').first();
    this.filtroEstadoSelect = page.locator('select').nth(1);
    this.modalNotas = page.locator('div[class*="bg-[#111318]"]');
    this.notasTextarea = page.locator('textarea');
    this.guardarNotasBtn = page.locator('button:has-text("Guardar Notas y Foto"), button:has-text("Guardar")');
  }

  async cambiarEstadoTarea(descripcionSubstring: string, nuevoEstado: 'EnProgreso' | 'Completada' | 'Omitida') {
    const card = this.page.locator(`div:has-text("${descripcionSubstring}")`).last();
    await expect(card).toBeVisible({ timeout: 5000 });
    const select = card.locator('select');
    await select.selectOption(nuevoEstado);
    await this.expectToast();
  }

  async agregarNotaAFoto(descripcionSubstring: string, notas: string) {
    const card = this.page.locator(`div:has-text("${descripcionSubstring}")`).last();
    await expect(card).toBeVisible({ timeout: 5000 });
    const btn = card.locator('button[title*="foto"], button:has-text("Notas")');
    await btn.click();
    await expect(this.modalNotas).toBeVisible({ timeout: 5000 });
    await this.notasTextarea.fill(notas);
    await this.guardarNotasBtn.click();
    await this.expectToast();
  }
}
