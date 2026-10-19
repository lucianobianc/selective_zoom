const { test, expect } = require('@playwright/test');
const path = require('node:path');
const manifest = require('../../manifest.json');
async function load(page, fixture = 'comments.html') {
  await page.goto(`http://127.0.0.1:8000/tests/fixtures/${fixture}`);
  await page.evaluate(() => {
    const key = `selective-zoom:v1:${location.origin}`;
    window.browser = {
      menus: { getTargetElement: () => window.menuTarget },
      storage: { onChanged: { addListener() {} } },
      runtime: {
        onMessage: { addListener(fn) { window.extensionMessage = fn; window.toggleExtension = () => fn({ type: 'selective-zoom:toggle' }); } },
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
  await expect(page.locator('[data-selective-zoom=panel] #save')).toBeEnabled();
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
test('saving directly survives reload and styles new matching content', async ({ page }) => {
  await load(page);
  await expect(page.locator('[data-selective-zoom=panel] input[type=checkbox]')).toHaveCount(0);
  await page.locator('.comment-text').first().click();
  await page.locator('[data-selective-zoom=panel] #size').fill('26');
  await expect(page.locator('[data-selective-zoom=panel] #save')).toBeEnabled();
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
  await page.locator('[data-selective-zoom=panel] #size').fill('129');
  await expect(page.locator('[data-selective-zoom=panel] #save')).toBeDisabled();
  await page.locator('[data-selective-zoom=panel] #size').fill('22');
  await page.evaluate(() => { window.storageError = true; });
  await page.locator('[data-selective-zoom=panel] #save').click();
  await expect(page.locator('[data-selective-zoom=panel] #error')).toContainText('Falha de armazenamento');
  await page.keyboard.press('Escape');
  await expect(page.locator('.comment-text').first()).toHaveCSS('font-size', '16px');
});
test('DOM changes between preview and save require another Save click', async ({ page }) => {
  await load(page);
  await page.locator('.comment-text').first().click();
  await page.evaluate(() => document.querySelector('#add-comment').click());
  await page.locator('[data-selective-zoom=panel] #save').click();
  await expect(page.locator('[data-selective-zoom=panel] #status')).toContainText('A página mudou: 4');
  await expect(page.locator('[data-selective-zoom=panel] #save')).toBeEnabled();
  await page.locator('[data-selective-zoom=panel] #save').click();
  await expect(page.locator('[data-selective-zoom=panel]')).toHaveCount(0);
});
test('two independent rules coexist and deleting one restores only its text', async ({ page }) => {
  await load(page);
  for (const [selector, size] of [['.comment-text', '25'], ['.caption', '20']]) {
    if (!(await page.locator('[data-selective-zoom=panel]').count())) await page.evaluate(() => window.toggleExtension());
    await page.locator(selector).first().click();
    await page.locator('[data-selective-zoom=panel] #size').fill(size);
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
test('keyboard can select text, edit and cancel without navigating', async ({ page }) => {
  await load(page);
  await page.keyboard.press('ArrowDown'); // Heading
  await page.keyboard.press('ArrowDown'); // First comment
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-selective-zoom=panel] #size')).toBeFocused();
  await page.locator('[data-selective-zoom=panel] #size').fill('28');
  await expect(page.locator('.comment-text').first()).toHaveCSS('font-size', '28px');
  await page.keyboard.press('Escape');
  await expect(page.locator('.comment-text').first()).toHaveCSS('font-size', '16px');
});
test('panel keeps readable colors and typography on dark pages', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await load(page);
  await page.addStyleTag({ content: `
    :root { color-scheme: dark; color: #e4e6eb; font: 24px Georgia, serif; }
    body { background: #242526; color: #e4e6eb; }
  ` });
  const panel = page.locator('[data-selective-zoom=panel]');
  await expect(panel.locator('section')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(panel.locator('h2')).toHaveCSS('color', 'rgb(23, 37, 84)');
  await expect(panel.locator('#status')).toHaveCSS('color', 'rgb(23, 37, 84)');
  await expect(panel.locator('#status')).toHaveCSS('font-size', '14px');
  await expect(panel.locator('#cancel')).toHaveCSS('font-family', 'system-ui, sans-serif');
  await page.locator('.comment-text').first().click();
  await expect(panel.locator('label[for=size]')).toHaveCSS('color', 'rgb(23, 37, 84)');
  await expect(panel.locator('#size')).toHaveCSS('color-scheme', 'light');
  await page.screenshot({ path: 'test-results/panel-dark-page.png' });
});
test('context action edits clicked text and replaces an existing panel', async ({ page }) => {
  await load(page);
  await page.evaluate(() => {
    window.menuTarget = document.querySelector('.comment-text');
    return window.extensionMessage({ type: 'selective-zoom:context', targetElementId: 42 });
  });
  const panel = page.locator('[data-selective-zoom=panel]');
  await expect(panel).toHaveCount(1);
  await expect(panel.locator('#status')).toContainText('3 elemento(s)');
  await panel.locator('#size').fill('30');
  await expect(page.locator('.comment-text').first()).toHaveCSS('font-size', '30px');
  await page.evaluate(() => {
    window.menuTarget = document.querySelector('.caption');
    return window.extensionMessage({ type: 'selective-zoom:context', targetElementId: 43 });
  });
  await expect(panel).toHaveCount(1);
  await expect(panel.locator('#selector')).toHaveText('p.caption');
  await expect(page.locator('.comment-text').first()).toHaveCSS('font-size', '16px');
});
test('context action on sensitive or missing targets starts safe selection', async ({ page }) => {
  await load(page);
  for (const selector of ['input', '.missing']) {
    await page.evaluate((selector) => {
      window.menuTarget = document.querySelector(selector);
      return window.extensionMessage({ type: 'selective-zoom:context', targetElementId: 42 });
    }, selector);
    await expect(page.locator('[data-selective-zoom=panel] #editor')).toBeHidden();
    await expect(page.locator('[data-selective-zoom=highlight]')).toHaveCount(1);
  }
});
test('YouTube-shaped comments do not share a rule with titles or authors', async ({ page }) => {
  await load(page, 'social-text.html');
  await page.locator('ytd-comment-view-model [id=content-text] span').first().click();
  const panel = page.locator('[data-selective-zoom=panel]');
  await expect(panel.locator('#selector')).toHaveText('ytd-comment-view-model yt-attributed-string[id="content-text"]');
  await expect(panel.locator('#status')).toContainText('2 elemento(s)');
  await panel.locator('#size').fill('29');
  for (const element of await page.locator('ytd-comment-view-model [id=content-text] span').all()) await expect(element).toHaveCSS('font-size', '29px');
  await expect(page.locator('#video-title')).toHaveCSS('font-size', '16px');
  await expect(page.locator('ytd-comment-view-model a')).toHaveCSS('font-size', '16px');
  await panel.locator('#save').click();
  await load(page, 'social-text.html');
  await page.keyboard.press('Escape');
  await expect(page.locator('ytd-comment-view-model [id=content-text] span').first()).toHaveCSS('font-size', '29px');
  await expect(page.locator('#video-title')).toHaveCSS('font-size', '16px');
});
test('Facebook-shaped markers separate comments from posts and style nested text', async ({ page }) => {
  await load(page, 'social-text.html');
  await page.locator('[data-ad-rendering-role=comment_message] span').first().click();
  const panel = page.locator('[data-selective-zoom=panel]');
  await expect(panel.locator('#selector')).toHaveText('div[data-ad-rendering-role="comment_message"]');
  await expect(panel.locator('#status')).toContainText('2 elemento(s)');
  await panel.locator('#size').fill('28');
  await expect(page.locator('[data-ad-rendering-role=comment_message] span').first()).toHaveCSS('font-size', '28px');
  await expect(page.locator('[data-ad-rendering-role=story_message] span')).toHaveCSS('font-size', '16px');
  await expect(page.locator('div[role=article] a')).toHaveCSS('font-size', '16px');
  await panel.locator('#cancel').click();
  await expect(page.locator('[data-ad-rendering-role=comment_message] span').first()).toHaveCSS('font-size', '16px');
});
test('article structure can scope generated classes when body markers are absent', async ({ page }) => {
  await load(page, 'social-text.html');
  await page.locator('.unmarked-comments div[dir=auto]').first().click();
  const panel = page.locator('[data-selective-zoom=panel]');
  await expect(panel.locator('#status')).toContainText('2 elemento(s)');
  await expect(panel.locator('#selector')).toContainText('div[role="article"] > div > div');
  await panel.locator('#size').fill('27');
  await expect(page.locator('.unmarked-comments div[dir=auto] span').first()).toHaveCSS('font-size', '27px');
  await expect(page.locator('.unmarked-comments header span').first()).toHaveCSS('font-size', '16px');
  await expect(page.locator('p.x193iq5w')).toHaveCSS('font-size', '16px');
});
test('a shared class is scoped to its local discussion structure', async ({ page }) => {
  await load(page, 'social-text.html');
  await page.locator('.discussion .shared-text').first().click();
  const panel = page.locator('[data-selective-zoom=panel]');
  await expect(panel.locator('#selector')).toHaveText('section.discussion > p.shared-text');
  await panel.locator('#size').fill('26');
  await expect(page.locator('.discussion .shared-text').nth(1)).toHaveCSS('font-size', '26px');
  await expect(page.locator('aside .shared-text')).toHaveCSS('font-size', '16px');
});
test('pointer coordinates find text inside a wrapper with controls', async ({ page }) => {
  await load(page, 'social-text.html');
  const point = await page.locator('.layered-text').first().evaluate((element) => {
    const range = document.createRange(); range.selectNodeContents(element);
    const rect = range.getBoundingClientRect();
    return { x: rect.left + 20, y: rect.top + rect.height / 2 };
  });
  await page.mouse.move(point.x, point.y);
  await expect(page.locator('[data-selective-zoom=highlight]').locator('div')).toHaveCSS('display', 'block');
  await page.mouse.click(point.x, point.y);
  const panel = page.locator('[data-selective-zoom=panel]');
  await expect(panel.locator('#status')).toContainText('2 elemento(s)');
  await panel.locator('#size').fill('30');
  await expect(page.locator('.layered-text').first()).toHaveCSS('font-size', '30px');
  await expect(page.locator('.layer-hit button').first()).toHaveCSS('font-size', '13.3333px');
});
