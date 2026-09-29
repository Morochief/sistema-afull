import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class NavigationPage extends BasePage {
  readonly sidebar: Locator;
  readonly toggleSidebarBtn: Locator;
  readonly logoutBtn: Locator;
  readonly currentModuleTitle: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = page.locator('aside');
    this.toggleSidebarBtn = page.locator('aside button[title*="menú"]');
    this.logoutBtn = page.locator('aside button[title="Cerrar Sesión"]');
    this.currentModuleTitle = page.locator('header span.text-white.font-semibold');
  }

  async navigateTo(tabId: 'dashboard' | 'registro' | 'misregistros' | 'mistareas' | 'pedidos' | 'presupuestos' | 'ordenestrabajo' | 'hojasruta' | 'reportes' | 'import' | 'admin') {
    const tabMap: Record<string, string> = {
      dashboard: 'Panel de Control',
      registro: 'Registro Operativo',
      misregistros: 'Mis Registros',
      mistareas: 'Mis Tareas',
      pedidos: 'Pedidos de Clientes',
      presupuestos: 'Presupuestos',
      ordenestrabajo: 'Órdenes de Trabajo',
      hojasruta: 'Hojas de Ruta',
      reportes: 'Reportes y Costos',
      import: 'Importar Excel',
      admin: 'Configuración Admin',
    };

    const label = tabMap[tabId];
    const navBtn = this.page.locator(`aside button:has-text("${label}")`);
    await expect(navBtn).toBeVisible({ timeout: 5000 });
    await navBtn.click();
    await this.page.waitForTimeout(300);
  }

  async logout() {
    await this.logoutBtn.click();
    await this.page.waitForSelector('input[type="text"]', { timeout: 6000 });
  }

 async toggleSidebar() {
 await this.toggleSidebarBtn.click();
 }
}
