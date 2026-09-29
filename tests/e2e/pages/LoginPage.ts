import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly usuarioInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly togglePasswordBtn: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.usuarioInput = page.locator('input[type="text"]');
    this.passwordInput = page.locator('input[type="password"], input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.togglePasswordBtn = page.locator('button[title*="contraseña"], button:has(svg)');
    this.errorAlert = page.locator('div.bg-rose-500\\/10');
  }

  async submitLoginForm(usuario: string, pass: string) {
    await this.goto('/');
    await this.waitForLoaderDisappear();
    
    // Wait for either login form or main layout
    const loggedInOrForm = await Promise.race([
      this.page.waitForSelector('input[type="text"]', { timeout: 8000 }).then(() => 'form').catch(() => null),
      this.page.waitForSelector('aside, header', { timeout: 8000 }).then(() => 'logged').catch(() => null)
    ]);

    if (loggedInOrForm === 'logged') {
      return false;
    }

    if (await this.usuarioInput.isVisible()) {
      await this.usuarioInput.fill(usuario);
      await this.passwordInput.fill(pass);
      await this.submitButton.click();
      await this.waitForLoaderDisappear();
      return true;
    }
    return false;
  }

  async login(usuario: string, pass: string) {
    const submitted = await this.submitLoginForm(usuario, pass);
    if (submitted) {
      await this.page.waitForSelector('aside, header', { timeout: 15000 });
    }
  }

  async expectError(msgSubstring?: string) {
    await expect(this.errorAlert).toBeVisible({ timeout: 5000 });
    if (msgSubstring) {
      await expect(this.errorAlert).toContainText(msgSubstring);
    }
  }
}
