import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { NavigationPage } from '../pages/NavigationPage';
import { RegistroOperativoPage } from '../pages/RegistroOperativoPage';

test.describe('Registro Operativo - Mano de Obra, Insumos y Control', () => {
  test('Debe registrar horas de mano de obra con cronómetro e insumos operativos', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);
    const regPage = new RegistroOperativoPage(page);

    // 1. Iniciar sesión como Admin
    await loginPage.login('admin', 'admin123');

    // 2. Navegar a Registro Operativo
    await navPage.navigateTo('registro');

    // 3. Seleccionar Cliente y Proyecto
    await regPage.seleccionarClienteYProyecto(1, 1);

    // 4. Registrar Mano de Obra con Timer (Play -> Pausa -> Reanudar -> Finalizar -> Guardar)
    await regPage.tabManoObra.click();
    await expect(regPage.iniciarTareaBtn).toBeVisible({ timeout: 5000 });
    await regPage.iniciarTareaBtn.click();
    
    // Probar Pausa corta
    await expect(regPage.pausaBtn).toBeVisible({ timeout: 5000 });
    await regPage.pausaBtn.click();
    await expect(regPage.reanudarBtn).toBeVisible({ timeout: 5000 });
    await regPage.reanudarBtn.click();

    // Finalizar y Guardar
    await page.waitForTimeout(1200);
    await regPage.finalizarBtn.click();
    const moDesc = `Instalación de Prueba QA ${Date.now()}`;
    await regPage.moDescripcionInput.fill(moDesc);
    await regPage.registrarMOBtn.click();
    await regPage.expectToast();

    // 5. Registrar Insumo Operativo en el mismo contexto
    const insumoDesc = `Cinta Doble Faz QA ${Date.now()}`;
    await regPage.registrarInsumoSimple(insumoDesc, 3, 25000);
  });
});
