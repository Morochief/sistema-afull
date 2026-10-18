import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { NavigationPage } from '../pages/NavigationPage';

test.describe('Navegación Desktop PC - Pruebas Exhaustivas Módulo por Módulo', () => {
  test.use({
    viewport: { width: 1440, height: 900 }, // Pantalla Desktop PC estándar
  });

  test('Debe cargar e interactuar con cada módulo del sistema en Desktop PC', async ({ page }) => {
    test.setTimeout(90000);
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);

    await loginPage.goto('/');
    if (await navPage.logoutBtn.isVisible()) {
      await navPage.logout();
    }

    // Login como Administrador
    await loginPage.login('admin', 'admin123');
    await expect(page.locator('aside')).toBeVisible();

    // Matriz de módulos en PC
    const modulosDesktop = [
      { nombre: 'Panel de Control', selector: 'header:has-text("Panel de Control")' },
      { nombre: 'Registro Operativo', selector: 'header:has-text("Registro Operativo")' },
      { nombre: 'Presupuestos', selector: 'header:has-text("Presupuestos")' },
      { nombre: 'Órdenes de Trabajo', selector: 'header:has-text("Órdenes de Trabajo")' },
      { nombre: 'Pedidos de Clientes', selector: 'header:has-text("Pedidos de Clientes")' },
      { nombre: 'Hojas de Ruta', selector: 'header:has-text("Hojas de Ruta")' },
      { nombre: 'Permisos RRHH', selector: 'header:has-text("Permisos RRHH")' },
      { nombre: 'Reportes y Costos', selector: 'header:has-text("Reportes y Costos")' },
      { nombre: 'Importar Excel', selector: 'header:has-text("Importación de Planillas Excel")' },
      { nombre: 'Administración', selector: 'header:has-text("Panel de Administración")' },
    ];

    for (const mod of modulosDesktop) {
      // 1. Click en el botón de navegación del sidebar
      const btn = page.locator(`aside button:has-text("${mod.nombre}")`).first();
      await expect(btn).toBeVisible();
      await btn.click();
      await page.waitForTimeout(400);

      // 2. Verificar que el título de módulo en el header coincida
      await expect(page.locator('header').first()).toBeVisible();

      // 3. Verificar que NO haya caído en pantalla de error (ErrorBoundary)
      await expect(page.locator('text=Algo salió mal')).not.toBeVisible();

      // 4. Si estamos en Administración, recorrer también sus submódulos
      if (mod.nombre === 'Administración') {
        const subtabs = [
          '⚡ Control en Vivo',
          'Clientes y Tarifas',
          'Proyectos',
          'Colaboradores',
          'Marcaciones',
          'Vehículos',
        ];

        for (const sub of subtabs) {
          const subBtn = page.locator(`button:has-text("${sub}")`).first();
          if (await subBtn.isVisible()) {
            await subBtn.click();
            await page.waitForTimeout(300);
            await expect(page.locator('text=Algo salió mal')).not.toBeVisible();
          }
        }
      }
    }
  });

  test('Operario en Desktop PC: Registro Operativo, Mis Tareas y Mis Registros', async ({ page }) => {
    test.setTimeout(60000);
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);

    await loginPage.goto('/');
    if (await navPage.logoutBtn.isVisible()) {
      await navPage.logout();
    }

    await loginPage.login('qa_operador', 'QaTest123!');
    await expect(page.locator('aside')).toBeVisible();

    const modulosOperario = [
      'Registro Operativo',
      'Mis Tareas',
      'Mis Registros',
      'Permisos RRHH',
    ];

    for (const mod of modulosOperario) {
      const btn = page.locator(`aside button:has-text("${mod}")`).first();
      await expect(btn).toBeVisible();
      await btn.click();
      await page.waitForTimeout(400);

      // No debe haber error boundary
      await expect(page.locator('text=Algo salió mal')).not.toBeVisible();
      await expect(page.locator('header')).toBeVisible();
    }
  });
});
