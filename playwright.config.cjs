const { defineConfig } = require('@playwright/test');
const { existsSync } = require('node:fs');
const executablePath = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
module.exports = defineConfig({
  testDir: './tests/browser',
  use: { headless: true, launchOptions: { executablePath, args: ['--no-sandbox'] } },
  webServer: { command: 'python3 -m http.server 8000 --bind 127.0.0.1', url: 'http://127.0.0.1:8000/tests/fixtures/comments.html', reuseExistingServer: false },
});
