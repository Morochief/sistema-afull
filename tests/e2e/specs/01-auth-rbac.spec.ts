import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { NavigationPage } from '../pages/NavigationPage';

test.describe('Autenticación y Control de Accesos (RBAC)', () => {
  test('Debe autenticar exitosamente como Administrador', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);

    await loginPage.login('admin', 'admin123');
    await expect(navPage.sidebar).toBeVisible();
    await expect(page.locator('text=Panel de Control').first()).toBeVisible();
  });

  test('Debe rechazar credenciales incorrectas con alerta descriptiva', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto('/');

    // Asegurar estar deslogueado
    const navPage = new NavigationPage(page);
    if (await navPage.logoutBtn.isVisible()) {
      await navPage.logout();
    }

    await loginPage.submitLoginForm('admin', 'ClaveInvalida999!');
    await loginPage.expectError('incorrectos');
  });

  test('Debe permitir autenticación como Operador y restringir módulos administrativos', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);

    await loginPage.goto('/');
    if (await navPage.logoutBtn.isVisible()) {
      await navPage.logout();
    }

    await loginPage.login('qa_operador', 'QaTest123!');
    await expect(navPage.sidebar).toBeVisible();

    // Validar que NO ve el Panel de Administración
    await expect(page.locator('aside button:has-text("Configuración Admin")')).not.toBeVisible();
    await expect(page.locator('aside button:has-text("Reportes y Costos")')).not.toBeVisible();

    // Validar que SÍ ve Registro Operativo
    await expect(page.locator('aside button:has-text("Registro Operativo")')).toBeVisible();
  });

  test('Debe permitir autenticación como Visor con solo lectura', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);

    await loginPage.goto('/');
    if (await navPage.logoutBtn.isVisible()) {
      await navPage.logout();
    }

    await loginPage.login('qa_visor', 'QaTest123!');
    await expect(navPage.sidebar).toBeVisible();

    // No debe poder iniciar timers ni ver Admin
    await expect(page.locator('button:has-text("Iniciar Timer")')).not.toBeVisible();
    await expect(page.locator('aside button:has-text("Configuración Admin")')).not.toBeVisible();
  });
});
