import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { NavigationPage } from '../pages/NavigationPage';

test.describe('Administración - Entidades y Submódulos', () => {
  test('Navega por todos los submódulos de configuración admin sin errores', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);

    await loginPage.login('admin', 'admin123');
    await navPage.navigateTo('admin');

    const subtabs = [
      'Clientes',
      'Sucursales / Locales',
      'Proyectos',
      'Colaboradores',
      'Permisos (RR.HH.)',
      'Control de Vehículos',
      'Timeline Marcaciones',
      'Carga Manual Directa',
      'Auditoría de Accesos'
    ];

    for (const sub of subtabs) {
      const btn = page.locator(`main button:has-text("${sub}")`);
      await expect(btn).toBeVisible({ timeout: 5000 });
      await btn.click();
      await page.waitForTimeout(200);
      await expect(page.locator('body')).not.toContainText('ReferenceError');
      await expect(page.locator('body')).not.toContainText('TypeError');
    }
  });
});
