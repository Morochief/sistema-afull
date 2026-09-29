import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class RegistroOperativoPage extends BasePage {
  readonly clienteSelect: Locator;
  readonly proyectoSelect: Locator;
  readonly fechaInput: Locator;

  // Tabs
  readonly tabManoObra: Locator;
  readonly tabInsumos: Locator;
  readonly tabVehiculo: Locator;

  // Mano de Obra
  readonly iniciarTareaBtn: Locator;
  readonly pausaBtn: Locator;
  readonly descansoBtn: Locator;
  readonly reanudarBtn: Locator;
  readonly finalizarBtn: Locator;
  readonly resetTimerBtn: Locator;
  readonly moDescripcionInput: Locator;
  readonly moPrecioUnitarioInput: Locator;
  readonly registrarMOBtn: Locator;

  // Insumos
  readonly agregarInsumoBtn: Locator;
  readonly calculadoraAdhesivoBtn: Locator;
  readonly registrarInsumosBtn: Locator;

  // Vehículo
  readonly iniciarViajeBtn: Locator;
  readonly finalizarViajeBtn: Locator;

  constructor(page: Page) {
    super(page);
    this.clienteSelect = page.locator('select').first();
    this.proyectoSelect = page.locator('select').nth(1);
    this.fechaInput = page.locator('input[type="date"]').first();

    this.tabManoObra = page.getByRole('button', { name: 'Mano de Obra', exact: true });
    this.tabInsumos = page.getByRole('button', { name: 'Insumos', exact: true });
    this.tabVehiculo = page.getByRole('button', { name: 'Vehículo', exact: true });

    this.iniciarTareaBtn = page.locator('button:has-text("Iniciar Tarea")');
    this.pausaBtn = page.locator('button:has-text("Pausa")');
    this.descansoBtn = page.locator('button:has-text("Descanso")');
    this.reanudarBtn = page.locator('button:has-text("Reanudar")');
    this.finalizarBtn = page.locator('button:has-text("Finalizar")');
    this.resetTimerBtn = page.locator('button[title="Reiniciar timer"]');
    this.moDescripcionInput = page.locator('input[placeholder*="Instalación"], input[placeholder*="fachada"]');
    this.moPrecioUnitarioInput = page.locator('input[placeholder="350"]');
    this.registrarMOBtn = page.locator('button:has-text("Registrar Horas de Mano de Obra")');

    this.agregarInsumoBtn = page.locator('button:has-text("Agregar ítem de insumo")');
    this.calculadoraAdhesivoBtn = page.locator('button:has-text("Calcular Adhesivo")');
    this.registrarInsumosBtn = page.locator('button:has-text("Registrar"), button:has-text("Insumo")').last();

    this.iniciarViajeBtn = page.locator('button:has-text("Iniciar Viaje")');
    this.finalizarViajeBtn = page.locator('button:has-text("Finalizar Viaje")');
  }

  async seleccionarClienteYProyecto(clienteIdx = 1, proyectoIdx = 1, colaboradorIdx = 1) {
    await this.clienteSelect.selectOption({ index: clienteIdx });
    await this.page.waitForTimeout(300);
    await this.proyectoSelect.selectOption({ index: proyectoIdx });
    await this.page.waitForTimeout(300);

    // Select collaborator if dropdown is available for Admin
    const colSelect = this.page.locator('select:has-text("Eduardo Mendez"), select:has-text("Sin asignar"), select').nth(2);
    if (await colSelect.isVisible()) {
      await colSelect.selectOption({ index: colaboradorIdx });
    }
  }

  async registrarManoDeObra(descripcion: string, duracionMs = 1500) {
    await this.tabManoObra.click();
    await this.iniciarTareaBtn.click();
    await this.page.waitForTimeout(duracionMs);
    await this.finalizarBtn.click();
    await this.moDescripcionInput.fill(descripcion);
    await this.registrarMOBtn.click();
    await this.expectToast();
  }

  async registrarInsumoSimple(descripcion: string, cantidad: number, precio = 15000) {
    await this.tabInsumos.click();
    const descInput = this.page.locator('input[placeholder*="Insumo 1"]').first();
    await descInput.fill(descripcion);
    const cantInput = this.page.locator('input[type="number"]').first();
    await cantInput.fill(cantidad.toString());
    const precioInput = this.page.locator('input[type="number"]').nth(1);
    if (await precioInput.isVisible()) {
      await precioInput.fill(precio.toString());
    }
    await this.registrarInsumosBtn.click();
    await this.expectToast();
  }
}
