import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class MarcacionesWidget extends BasePage {
  readonly btnEntradaSalida: Locator;
  readonly btnModoRemoto: Locator;
  readonly btnHistorial: Locator;
  readonly panelHistorial: Locator;
  readonly motivoRemotoInput: Locator;

  constructor(page: Page) {
    super(page);
    this.btnEntradaSalida = page.locator('header button:has-text("ENTRADA"), header button:has-text("SALIDA")');
    this.btnModoRemoto = page.locator('header button[title*="remoto"]');
    this.btnHistorial = page.locator('header button:has(svg)').last();
    this.panelHistorial = page.locator('div:has-text("Historial de Marcaciones")');
    this.motivoRemotoInput = page.locator('input[placeholder*="motivo"], input[placeholder*="Motivo"]');
  }

  async setMockGeolocation(lat = -25.320588, lng = -57.624181) {
    await this.page.context().grantPermissions(['geolocation']);
    await this.page.context().setGeolocation({ latitude: lat, longitude: lng });
  }

  async marcarEntrada() {
    await expect(this.btnEntradaSalida).toContainText('ENTRADA');
    await this.btnEntradaSalida.click();
    await this.expectToast();
    await expect(this.btnEntradaSalida).toContainText('SALIDA', { timeout: 8000 });
  }

  async marcarSalida() {
    await expect(this.btnEntradaSalida).toContainText('SALIDA');
    await this.btnEntradaSalida.click();
    await this.expectToast();
    await expect(this.btnEntradaSalida).toContainText('ENTRADA', { timeout: 8000 });
  }

  async marcarRemoto(tipo: 'ENTRADA' | 'SALIDA', motivo: string) {
    await this.btnModoRemoto.click();
    if (await this.motivoRemotoInput.isVisible()) {
      await this.motivoRemotoInput.fill(motivo);
    }
    await this.btnEntradaSalida.click();
    await this.expectToast();
  }
}
