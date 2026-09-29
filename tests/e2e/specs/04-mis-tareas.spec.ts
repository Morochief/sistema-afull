import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { NavigationPage } from '../pages/NavigationPage';
import { MisTareasPage } from '../pages/MisTareasPage';

test.describe('Mis Tareas - Vista del Operador', () => {
  test('El operador puede acceder a Mis Tareas y gestionar filtros', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);
    const tareasPage = new MisTareasPage(page);

    // 1. Iniciar sesión como Operador
    await loginPage.login('qa_operador', 'QaTest123!');

    // 2. Navegar a Mis Tareas
    await navPage.navigateTo('mistareas');

    // 3. Probar interactividad de filtros
    await expect(tareasPage.filtroFechaSelect).toBeVisible({ timeout: 5000 });
    await tareasPage.filtroFechaSelect.selectOption('todas');
    await page.waitForTimeout(300);
    await tareasPage.filtroFechaSelect.selectOption('hoy');
    await tareasPage.filtroEstadoSelect.selectOption('Pendiente');
    await page.waitForTimeout(300);
    await tareasPage.filtroEstadoSelect.selectOption('');

    // 4. Verificar que no haya errores no controlados
    await expect(page.locator('body')).not.toContainText('ReferenceError');
    await expect(page.locator('body')).not.toContainText('TypeError');
  });
});
