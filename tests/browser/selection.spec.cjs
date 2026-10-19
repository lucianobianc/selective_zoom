const { test, expect } = require('@playwright/test');
const path = require('node:path');
const manifest = require('../../manifest.json');
async function load(page) {
  await page.goto('http://127.0.0.1:8000/tests/fixtures/comments.html');
  await page.evaluate(() => {
    window.browser = { runtime: { onMessage: { addListener(fn) { window.toggleExtension = () => fn({ type: 'selective-zoom:toggle' }); } } } };
  });
  for (const script of manifest.content_scripts[0].js) await page.addScriptTag({ path: path.resolve(__dirname, '../..', script) });
  await page.evaluate(() => window.toggleExtension());
}
test('selection prevents navigation and Escape removes UI', async ({ page }) => {
  await load(page);
  await page.locator('.test-link').click();
  expect(new URL(page.url()).hash).toBe('');
  await expect(page.locator('[data-selective-zoom=panel] #status')).toContainText('Selecionado');
  await page.evaluate(() => window.toggleExtension());
  await expect(page.locator('[data-selective-zoom=panel], [data-selective-zoom=highlight]')).toHaveCount(0);
  await page.evaluate(() => window.toggleExtension());
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-selective-zoom=panel], [data-selective-zoom=highlight]')).toHaveCount(0);
});
test('sensitive controls cannot be selected', async ({ page }) => {
  await load(page);
  await page.getByRole('textbox', { name: 'Campo sensível' }).click();
  await expect(page.locator('[data-selective-zoom=panel] #status')).toContainText('Selecione');
  await expect(page.locator('[data-selective-zoom=highlight]')).toHaveCount(1);
});
test('preview changes only selected text and cancel restores original styles', async ({ page }) => {
  await load(page);
  await page.locator('.comment-text').first().click();
  await page.locator('[data-selective-zoom=panel] #size').fill('30');
  await expect(page.locator('.comment-text').first()).toHaveCSS('font-size', '30px');
  await expect(page.locator('.comment-text').nth(1)).toHaveCSS('font-size', '16px');
  await expect(page.locator('[data-selective-zoom=panel] #save')).toBeDisabled();
  await page.locator('[data-selective-zoom=panel] #cancel').click();
  await expect(page.locator('.comment-text').first()).toHaveCSS('font-size', '16px');
  expect(await page.locator('.comment-text').first().getAttribute('style')).toBeNull();
});
