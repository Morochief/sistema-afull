import { Page, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path = '/') {
    await this.page.goto(path);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectToast(messageSubstring?: string) {
    // Look for toast message inside the toast stack
    const toast = this.page.locator('div.fixed.bottom-5.right-5 p, div.glass-panel p').first();
    await expect(toast).toBeVisible({ timeout: 6000 });
    if (messageSubstring) {
      await expect(toast).toContainText(messageSubstring);
    }
  }

  async confirmDialog(actionText = 'Eliminar') {
    const confirmBtn = this.page.locator(`button:has-text("${actionText}")`).last();
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();
  }

  async waitForLoaderDisappear() {
    const loader = this.page.locator('text=Sincronizando base de datos...');
    try {
      await loader.waitFor({ state: 'attached', timeout: 2000 });
      await loader.waitFor({ state: 'hidden', timeout: 15000 });
    } catch {
      // Loader did not appear or already finished
    }
  }
}
