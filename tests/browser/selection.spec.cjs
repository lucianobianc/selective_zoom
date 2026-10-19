const { test, expect } = require('@playwright/test');
const path = require('node:path');
const manifest = require('../../manifest.json');
async function load(page) {
  await page.goto('http://127.0.0.1:8000/tests/fixtures/comments.html');
  await page.evaluate(() => {
    const key = `selective-zoom:v1:${location.origin}`;
    window.browser = {
      storage: { onChanged: { addListener() {} } },
      runtime: {
        onMessage: { addListener(fn) { window.toggleExtension = () => fn({ type: 'selective-zoom:toggle' }); } },
        async sendMessage(message) {
          if (window.storageError) return { ok: false, error: 'Falha de armazenamento de teste' };
          let record = JSON.parse(localStorage.getItem(key) || 'null') || { version: 1, origin: location.origin, rules: [] };
          if (message.type.endsWith(':save')) {
            record = await new window.SelectiveZoom.RuleStore({
              get: async () => ({ [key]: record }),
              set: async (value) => { record = value[key]; localStorage.setItem(key, JSON.stringify(record)); }
            }).save(location.origin, message.selector, message.size);
          }
          if (message.type.endsWith(':remove')) {
            record.rules = record.rules.filter((rule) => rule.id !== message.id);
            localStorage.setItem(key, JSON.stringify(record));
          }
          return { ok: true, record };
        }
      }
    };
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
test('preview changes matching text only and cancel restores original styles', async ({ page }) => {
  await load(page);
  await page.locator('.comment-text').first().click();
  await page.locator('[data-selective-zoom=panel] #size').fill('30');
  await expect(page.locator('.comment-text').first()).toHaveCSS('font-size', '30px');
  await expect(page.locator('.comment-text').nth(1)).toHaveCSS('font-size', '30px');
  await expect(page.locator('h1')).toHaveCSS('font-size', '32px');
  await expect(page.locator('[data-selective-zoom=panel] #status')).toContainText('3 elemento(s)');
  await expect(page.locator('[data-selective-zoom=panel] #save')).toBeDisabled();
  await page.locator('[data-selective-zoom=panel] #cancel').click();
  await expect(page.locator('.comment-text').first()).toHaveCSS('font-size', '16px');
  expect(await page.locator('.comment-text').first().getAttribute('style')).toBeNull();
});
test('unstable classes have no unsafe tag-only fallback', async ({ page }) => {
  await load(page);
  await page.evaluate(() => {
    const p = document.createElement('p');
    p.className = 'css-a1b2c3';
    p.textContent = 'Texto sem seletor confiável';
    document.body.append(p);
  });
  await page.locator('.css-a1b2c3').click();
  await expect(page.locator('[data-selective-zoom=panel] #status')).toContainText('Não foi possível');
  await expect(page.locator('[data-selective-zoom=panel] #editor')).toBeHidden();
  await page.locator('[data-selective-zoom=panel] #reselect').click();
  await page.locator('.comment-text').first().click();
  await expect(page.locator('[data-selective-zoom=panel] #status')).toContainText('3 elemento(s)');
});
test('saving requires confirmation, survives reload and styles new matching content', async ({ page }) => {
  await load(page);
  await page.locator('.comment-text').first().click();
  await page.locator('[data-selective-zoom=panel] #size').fill('26');
  await expect(page.locator('[data-selective-zoom=panel] #save')).toBeDisabled();
  await page.locator('[data-selective-zoom=panel] #confirm').check();
  await page.locator('[data-selective-zoom=panel] #save').click();
  await expect(page.locator('[data-selective-zoom=panel]')).toHaveCount(0);
  await load(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('.comment-text').first()).toHaveCSS('font-size', '26px');
  await page.locator('#add-comment').click();
  await expect(page.locator('.comment-text').last()).toHaveCSS('font-size', '26px');
  await expect(page.locator('h1')).toHaveCSS('font-size', '32px');
});
test('save failure stays visible and invalid sizes cannot be saved', async ({ page }) => {
  await load(page);
  await page.locator('.comment-text').first().click();
  await page.locator('[data-selective-zoom=panel] #confirm').check();
  await page.locator('[data-selective-zoom=panel] #size').fill('129');
  await expect(page.locator('[data-selective-zoom=panel] #save')).toBeDisabled();
  await page.locator('[data-selective-zoom=panel] #size').fill('22');
  await page.evaluate(() => { window.storageError = true; });
  await page.locator('[data-selective-zoom=panel] #save').click();
  await expect(page.locator('[data-selective-zoom=panel] #error')).toContainText('Falha de armazenamento');
  await page.keyboard.press('Escape');
  await expect(page.locator('.comment-text').first()).toHaveCSS('font-size', '16px');
});
test('DOM changes between review and save require renewed confirmation', async ({ page }) => {
  await load(page);
  await page.locator('.comment-text').first().click();
  await page.locator('[data-selective-zoom=panel] #confirm').check();
  await page.evaluate(() => document.querySelector('#add-comment').click());
  await page.locator('[data-selective-zoom=panel] #save').click();
  await expect(page.locator('[data-selective-zoom=panel] #status')).toContainText('A página mudou: 4');
  await expect(page.locator('[data-selective-zoom=panel] #confirm')).not.toBeChecked();
  await expect(page.locator('[data-selective-zoom=panel] #save')).toBeDisabled();
});
test('two independent rules coexist and deleting one restores only its text', async ({ page }) => {
  await load(page);
  for (const [selector, size] of [['.comment-text', '25'], ['.caption', '20']]) {
    if (!(await page.locator('[data-selective-zoom=panel]').count())) await page.evaluate(() => window.toggleExtension());
    await page.locator(selector).first().click();
    await page.locator('[data-selective-zoom=panel] #size').fill(size);
    await page.locator('[data-selective-zoom=panel] #confirm').check();
    await page.locator('[data-selective-zoom=panel] #save').click();
  }
  await page.evaluate(() => window.toggleExtension());
  await page.locator('[data-selective-zoom=panel] #list-button').click();
  await expect(page.locator('[data-selective-zoom=panel] #rules li')).toHaveCount(2);
  await page.getByRole('button', { name: 'Remover regra p.comment-text', exact: true }).click();
  await expect(page.locator('.comment-text').first()).toHaveCSS('font-size', '16px');
  await expect(page.locator('.caption')).toHaveCSS('font-size', '20px');
  await expect(page.locator('[data-selective-zoom=panel] #rules li')).toHaveCount(1);
  await page.getByRole('button', { name: 'Remover regra p.caption', exact: true }).click();
  await expect(page.locator('.caption')).toHaveCSS('font-size', '12px');
  await expect(page.locator('[data-selective-zoom=panel] #status')).toContainText('Nenhuma regra');
});
