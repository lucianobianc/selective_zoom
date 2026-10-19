module.exports = {
  sourceDir: '.',
  artifactsDir: 'web-ext-artifacts',
  ignoreFiles: [
    'node_modules', 'node_modules/**', 'tests', 'tests/**',
    'test-results', 'test-results/**', 'playwright-report', 'playwright-report/**',
    'package*.json', 'playwright.config.cjs', 'web-ext.config.cjs', '*.md',
    '.github', '.github/**'
  ],
  build: { overwriteDest: true }
};
