import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { NavigationPage } from '../pages/NavigationPage';
import { PermisosTabSubPage } from '../pages/PermisosTabSubPage';

test.describe('Gestión Integral de Permisos y Licencias (RR.HH.)', () => {
  const motivoUnico = `QA Permiso Prueba ${Date.now()}`;

  test('Debe completar el ciclo de vida: Crear -> Aprobar Jefe -> Validar RR.HH.', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);
    const permisosPage = new PermisosTabSubPage(page);

    // 1. Iniciar sesión como Admin
    await loginPage.login('admin', 'admin123');

    // 2. Navegar a Configuración Admin y pestaña Permisos
    await navPage.navigateTo('admin');
    const tabPermisos = page.locator('button:has-text("Permisos (RR.HH.)")');
    await expect(tabPermisos).toBeVisible({ timeout: 5000 });
    await tabPermisos.click();

    // 3. Crear solicitud de permiso
    await permisosPage.crearSolicitudHoras(1, motivoUnico, '09:00', '13:00');
    await expect(page.locator(`tr:has-text("${motivoUnico}")`)).toBeVisible({ timeout: 5000 });

    // 4. Aprobar como Jefe (verifica el fix del payload que acabamos de resolver)
    await permisosPage.aprobarJefe(motivoUnico);
    const rowJefe = page.locator(`tr:has-text("${motivoUnico}")`);
    await expect(rowJefe.locator('button[title*="Validar Dictamen RR.HH."], button:has-text("Validar RR.HH.")')).toBeVisible({ timeout: 10000 });

    // 5. Dictamen final de RR.HH.
    await permisosPage.dictamenRRHH(motivoUnico, 'Aprobado', false);
    const rowRrhh = page.locator(`tr:has-text("${motivoUnico}")`);
    await expect(rowRrhh.locator('text=Aprobado').first()).toBeVisible({ timeout: 10000 });
  });

  test('Debe permitir rechazo directo por el Jefe inmediato', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);
    const permisosPage = new PermisosTabSubPage(page);
    const motivoRechazo = `QA Rechazo ${Date.now()}`;

    await loginPage.login('admin', 'admin123');
    await navPage.navigateTo('admin');
    await page.locator('button:has-text("Permisos (RR.HH.)")').click();

    // Crear solicitud y rechazar como jefe
    await permisosPage.crearSolicitudHoras(1, motivoRechazo, '14:00', '16:00');
    await permisosPage.rechazarJefe(motivoRechazo);

    const row = page.locator(`tr:has-text("${motivoRechazo}")`);
    await expect(row.locator('text=Rechazado').first()).toBeVisible({ timeout: 5000 });
  });
});
