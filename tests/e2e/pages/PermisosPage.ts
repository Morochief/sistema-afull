import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class PermisosPage extends BasePage {
  readonly nuevaSolicitudBtn: Locator;
  readonly colaboradorSelect: Locator;
  readonly tipoPermisoSelect: Locator;
  readonly motivoInput: Locator;
  readonly enviarSolicitudBtn: Locator;
  readonly modalContainer: Locator;

  constructor(page: Page) {
    super(page);
    this.nuevaSolicitudBtn = page.locator('button:has-text(Nueva Solicitud)');
    this.colaboradorSelect = page.locator('select').first();
    this.tipoPermisoSelect = page.locator('select').nth(1);
    this.motivoInput = page.locator('textarea, input[placeholder*=motivo], input[placeholder*=Motivo]').first();
    this.enviarSolicitudBtn = page.locator('button:has-text(Registrar Solicitud), button:has-text(Enviar)').last();
    this.modalContainer = page.locator('div[class*=bg-[#111318]]');
  }

  async abrirNuevaSolicitud() {
    await this.nuevaSolicitudBtn.click();
    await expect(this.enviarSolicitudBtn).toBeVisible({ timeout: 5000 });
  }

  async aprobarComoJefe(solicitanteNombre: string) {
    const row = this.page.locator(`tr:has-text("${solicitanteNombre}")`).first();
    await expect(row).toBeVisible({ timeout: 5000 });
    const aprobarBtn = row.locator('button:has-text("Aprobar")');
    await expect(aprobarBtn).toBeVisible();
    await aprobarBtn.click();
    await this.expectToast();
  }

  async rechazarComoJefe(solicitanteNombre: string) {
    const row = this.page.locator(`tr:has-text("${solicitanteNombre}")`).first();
    await expect(row).toBeVisible({ timeout: 5000 });
    const rechazarBtn = row.locator('button:has-text("Rechazar")');
    await expect(rechazarBtn).toBeVisible();
    await rechazarBtn.click();
    await this.expectToast();
  }

  async validarComoRRHH(solicitanteNombre: string, decision: 'Aprobado' | 'Rechazado' = 'Aprobado') {
    const row = this.page.locator(`tr:has-text("${solicitanteNombre}")`).first();
    await expect(row).toBeVisible({ timeout: 5000 });
 const validarBtn = row.locator('button:has-text(Validar RR.HH.)');
 await expect(validarBtn).toBeVisible({ timeout: 5000 });
 await validarBtn.click();

 // Modal de RRHH
 const decisionSelect = this.page.locator('select:has-text(Aprobar), select:has-text(Rechazar)').or(this.page.locator('select').last());
 if (await decisionSelect.isVisible()) {
 await decisionSelect.selectOption(decision);
 }
 const confirmarBtn = this.page.locator('button:has-text(Confirmar Dictamen), button:has-text(Guardar Dictamen)');
 await confirmarBtn.click();
 await this.expectToast();
 }
}
