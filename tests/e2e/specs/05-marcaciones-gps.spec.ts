import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { MarcacionesWidget } from '../pages/MarcacionesWidget';

test.describe('Control Horario y Geocerca - Marcaciones con GPS', () => {
  test('Debe registrar ENTRADA y SALIDA con geolocalización dentro de geocerca', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const marcaciones = new MarcacionesWidget(page);

    // Simular GPS en las coordenadas autorizadas del local
    await marcaciones.setMockGeolocation(-25.320588, -57.624181);

    // Login con usuario de pruebas
    await loginPage.login('qa_operador', 'QaTest123!');

    // Verificar botón en el header
    await expect(marcaciones.btnEntradaSalida).toBeVisible({ timeout: 6000 });

    const btnText = await marcaciones.btnEntradaSalida.textContent();
    if (btnText?.includes('ENTRADA')) {
      await marcaciones.marcarEntrada();
      await page.waitForTimeout(1000);
      await marcaciones.marcarSalida();
    } else {
      await marcaciones.marcarSalida();
      await page.waitForTimeout(1000);
      await marcaciones.marcarEntrada();
    }
  });
});
