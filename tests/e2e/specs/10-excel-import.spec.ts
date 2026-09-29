import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { NavigationPage } from '../pages/NavigationPage';

test.describe('Importador de Planillas Excel', () => {
  test('Carga el módulo de importación y zona de carga de archivo drag-and-drop', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const navPage = new NavigationPage(page);

    await loginPage.login('admin', 'admin123');
    await navPage.navigateTo('import');

    // Verificar dropzone
    await expect(page.getByRole('heading', { name: 'Importador de Excel' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('heading', { name: 'Subir planilla de Mano de Obra' })).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Arrastra el archivo Excel aquí')).toBeVisible({ timeout: 8000 });
  });
});
