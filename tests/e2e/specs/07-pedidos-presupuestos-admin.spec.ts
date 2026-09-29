import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { NavigationPage } from '../pages/NavigationPage';
import { PresupuestosAdminPage } from '../pages/PresupuestosAdminPage';

test.describe('Gestión Comercial - Conversión y Creación de Presupuestos', () => {
  test('El administrador puede acceder al módulo de presupuestos y cargar filtros', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);
    const presupuestosPage = new PresupuestosAdminPage(page);

    await loginPage.login('admin', 'admin123');
    await navPage.navigateTo('presupuestos');

    await expect(presupuestosPage.nuevoPresupuestoBtn).toBeVisible({ timeout: 8000 });
    await expect(page.locator('body')).not.toContainText('ReferenceError');
    await expect(page.locator('body')).not.toContainText('TypeError');
  });
});
