import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class PermisosTabSubPage extends BasePage {
  readonly nuevaSolicitudBtn: Locator;
  readonly modalContainer: Locator;
  readonly colaboradorSelect: Locator;
  readonly tipoPermisoSelect: Locator;
  readonly motivoInput: Locator;
  readonly modoHorasRadio: Locator;
  readonly modoDiasRadio: Locator;
  readonly horaInicioInput: Locator;
  readonly horaFinInput: Locator;
  readonly fechaHoraInput: Locator;
  readonly submitSolicitudBtn: Locator;

  // Filtros
  readonly filtroTodos: Locator;
  readonly filtroPendiente: Locator;
  readonly filtroAprobadoJefe: Locator;
  readonly filtroAprobado: Locator;
  readonly filtroRechazado: Locator;

  // Modal RRHH
  readonly rrhhModal: Locator;
  readonly rrhhDecisionSelect: Locator;
  readonly rrhhComentarioInput: Locator;
  readonly rrhhDescontarCheckbox: Locator;
  readonly rrhhConfirmarBtn: Locator;

  constructor(page: Page) {
    super(page);
    this.nuevaSolicitudBtn = page.locator('button:has-text("Nueva Solicitud")');
    this.modalContainer = page.locator('div.fixed.inset-0').last();
    this.colaboradorSelect = this.modalContainer.locator('select').first();
    this.tipoPermisoSelect = this.modalContainer.locator('select').nth(1);
    this.motivoInput = this.modalContainer.locator('textarea');
    this.modoHorasRadio = this.modalContainer.locator('input[type="radio"]').first();
    this.modoDiasRadio = this.modalContainer.locator('input[type="radio"]').nth(1);
    this.horaInicioInput = this.modalContainer.locator('input[type="time"]').first();
    this.horaFinInput = this.modalContainer.locator('input[type="time"]').nth(1);
    this.fechaHoraInput = this.modalContainer.locator('input[type="date"]').first();
    this.submitSolicitudBtn = this.modalContainer.locator('button:has-text("Crear Solicitud"), button:has-text("Registrar Solicitud")');

    this.filtroTodos = page.locator('button:has-text("Todos")');
    this.filtroPendiente = page.locator('button:has-text("Pendiente")');
    this.filtroAprobadoJefe = page.locator('button:has-text("Aprobado Jefe")');
    this.filtroAprobado = page.locator('button:has-text("Aprobado (")');
    this.filtroRechazado = page.locator('button:has-text("Rechazado")');

    this.rrhhModal = page.locator('div:has-text("Dictamen Final de RR.HH.")').last();
    this.rrhhDecisionSelect = this.rrhhModal.locator('select');
    this.rrhhComentarioInput = this.rrhhModal.locator('textarea');
    this.rrhhDescontarCheckbox = this.rrhhModal.locator('input[type="checkbox"]');
    this.rrhhConfirmarBtn = this.rrhhModal.locator('button:has-text("Guardar Dictamen"), button:has-text("Confirmar")');
  }

  async abrirFormulario() {
    await this.nuevaSolicitudBtn.click();
    await expect(this.modalContainer).toBeVisible({ timeout: 5000 });
  }

  async crearSolicitudHoras(colaboradorIndex: number, motivo: string, horaIni = '08:00', horaFin = '12:00') {
    await this.abrirFormulario();
    await this.colaboradorSelect.selectOption({ index: colaboradorIndex });
    await this.motivoInput.fill(motivo);
    if (await this.horaInicioInput.isVisible()) {
      await this.horaInicioInput.fill(horaIni);
      await this.horaFinInput.fill(horaFin);
      const hoy = new Date().toISOString().substring(0, 10);
      await this.fechaHoraInput.fill(hoy);
    }
    await this.submitSolicitudBtn.click();
    await this.expectToast();
  }

  async aprobarJefe(motivoSubstring: string) {
    const row = this.page.locator(`tr:has-text("${motivoSubstring}")`).first();
    await expect(row).toBeVisible({ timeout: 5000 });
    const btn = row.locator('button:has-text("Aprobar")');
    await expect(btn).toBeVisible();
    await btn.click();
    await this.expectToast();
  }

  async rechazarJefe(motivoSubstring: string) {
    const row = this.page.locator(`tr:has-text("${motivoSubstring}")`).first();
    await expect(row).toBeVisible({ timeout: 5000 });
    const btn = row.locator('button:has-text("Rechazar")');
    await expect(btn).toBeVisible();
    await btn.click();
    await this.expectToast();
  }

  async dictamenRRHH(motivoSubstring: string, decision: 'Aprobado' | 'Rechazado' = 'Aprobado', descontar = false) {
    const row = this.page.locator(`tr:has-text("${motivoSubstring}")`).first();
    await expect(row).toBeVisible({ timeout: 5000 });
    const btn = row.locator('button:has-text("Validar RR.HH.")');
    await expect(btn).toBeVisible({ timeout: 5000 });
    await btn.click();

    // Modal de RRHH
    const modal = this.page.locator('div.fixed.inset-0:has-text("Validación Final RR.HH.")').last();
    await expect(modal).toBeVisible({ timeout: 5000 });

    if (decision === 'Aprobado') {
      await modal.locator('text=Aprobar Permiso').click();
    } else {
      await modal.locator('text=Rechazar Permiso').click();
    }

    if (descontar && decision === 'Aprobado') {
      await modal.locator('input[type="checkbox"]').check();
    }

    await modal.locator('button:has-text("Confirmar Dictamen")').click();
    await this.expectToast();
  }

  async eliminarSolicitud(motivoSubstring: string) {
    const row = this.page.locator(`tr:has-text("${motivoSubstring}")`).first();
    await expect(row).toBeVisible({ timeout: 5000 });
    const deleteBtn = row.locator('button[title*="Eliminar"]').last();
    await deleteBtn.click();
    await this.confirmDialog('Eliminar');
    await this.expectToast();
  }
}
