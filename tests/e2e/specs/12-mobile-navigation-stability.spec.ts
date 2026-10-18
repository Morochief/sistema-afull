import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { NavigationPage } from '../pages/NavigationPage';

test.describe('Navegación Móvil y Estabilidad de Módulos (Zero Crashes)', () => {
  test.use({
    viewport: { width: 390, height: 844 }, // Simulación pantalla smartphone (iPhone / Android)
    isMobile: true,
    hasTouch: true,
  });

  test('Debe alternar entre todos los módulos sin errores de DOM o ErrorBoundary', async ({ page }) => {
    test.setTimeout(60000);
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);

    await loginPage.goto('/');
    if (await navPage.logoutBtn.isVisible()) {
      await navPage.logout();
    }

    // 1. Iniciar sesión como Admin para tener visibilidad de todos los módulos
    await loginPage.login('admin', 'admin123');
    await expect(page.locator('header')).toBeVisible();

    // 2. Comprobar que NO aparezca la pantalla de "Algo salió mal"
    await expect(page.locator('text=Algo salió mal')).not.toBeVisible();

    // 3. Abrir menú hamburguesa móvil si está colapsado
    const menuBtn = page.locator('button[aria-label="Abrir menú"], button[title="Abrir menú de navegación"]');
    
    // Lista de módulos clave a recorrer
    const modulos = [
      'Registro Operativo',
      'Pedidos de Clientes',
      'Presupuestos',
      'Órdenes de Trabajo',
      'Hojas de Ruta',
      'Permisos RRHH',
      'Reportes y Costos',
      'Panel de Control',
    ];

    for (const modulo of modulos) {
      if (await menuBtn.isVisible()) {
        await menuBtn.click();
        await page.waitForTimeout(200);
      }

      const itemBtn = page.locator(`aside button:has-text("${modulo}")`).first();
      if (await itemBtn.isVisible()) {
        await itemBtn.click();
        await page.waitForTimeout(300);

        // Verificar que no crasheó el ErrorBoundary al montar el módulo
        await expect(page.locator('text=Algo salió mal')).not.toBeVisible();
        await expect(page.locator('header')).toBeVisible();
      }
    }
  });

  test('Debe cambiar de módulos como Operario sin crasheos en Mis Tareas o Mis Registros', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);

    await loginPage.goto('/');
    if (await navPage.logoutBtn.isVisible()) {
      await navPage.logout();
    }

    await loginPage.login('qa_operador', 'QaTest123!');
    await expect(page.locator('header')).toBeVisible();

    const menuBtn = page.locator('button[aria-label="Abrir menú"], button[title="Abrir menú de navegación"]');

    const modulosOperario = [
      'Registro Operativo',
      'Mis Tareas',
      'Mis Registros',
      'Permisos RRHH',
    ];

    for (const modulo of modulosOperario) {
      if (await menuBtn.isVisible()) {
        await menuBtn.click();
        await page.waitForTimeout(200);
      }

      const itemBtn = page.locator(`aside button:has-text("${modulo}")`).first();
      if (await itemBtn.isVisible()) {
        await itemBtn.click();
        await page.waitForTimeout(300);

        await expect(page.locator('text=Algo salió mal')).not.toBeVisible();
      }
    }
  });
});
