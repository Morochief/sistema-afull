import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { NavigationPage } from '../pages/NavigationPage';
import { OrdenesTrabajoPage } from '../pages/OrdenesTrabajoPage';
import { HojasRutaPage } from '../pages/HojasRutaPage';

test.describe('Gestión de Producción - Órdenes de Trabajo y Hojas de Ruta', () => {
  test('Navegación e interactividad en Órdenes de Trabajo y Hojas de Ruta', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);
    const otPage = new OrdenesTrabajoPage(page);
    const hojasPage = new HojasRutaPage(page);

    await loginPage.login('admin', 'admin123');

    // 1. Órdenes de trabajo
    await navPage.navigateTo('ordenestrabajo');
    await expect(otPage.searchInput).toBeVisible({ timeout: 6000 });
    await otPage.filtrarOT('Generada');

    // 2. Hojas de ruta
    await navPage.navigateTo('hojasruta');
    await expect(hojasPage.generarDesdeOTBtn).toBeVisible({ timeout: 6000 });
  });
});
