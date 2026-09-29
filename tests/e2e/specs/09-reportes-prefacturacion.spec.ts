import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { NavigationPage } from '../pages/NavigationPage';

test.describe('Reportería y Pre-Facturación', () => {
  test('Acceder a reportes, alternar filtros y vista de pre-factura', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);

    await loginPage.login('admin', 'admin123');
    await navPage.navigateTo('reportes');

    // Verificar filtros de reportería
    await expect(page.getByRole('button', { name: 'Exportar a Excel (.xlsx)' })).toBeVisible({ timeout: 8000 });
    
    // Alternar a Pre-factura
    const prefacturaTab = page.locator('button:has-text("Pre-Facturación"), button:has-text("Facturación")');
    if (await prefacturaTab.isVisible()) {
      await prefacturaTab.click();
      await page.waitForTimeout(300);
    }

    await expect(page.locator('body')).not.toContainText('ReferenceError');
    await expect(page.locator('body')).not.toContainText('TypeError');
  });
});
