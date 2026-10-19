const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../content/selectors.js');
require('../shared/storage.js');
const { RuleStore } = globalThis.SelectiveZoom;
function memory() {
  const data = {};
  return { data, get: async (key) => ({ [key]: structuredClone(data[key]) }), set: async (value) => Object.assign(data, structuredClone(value)) };
}
test('save, load, update and delete rules without crossing origins', async () => {
  const store = new RuleStore(memory());
  const a = 'https://example.test', b = 'http://example.test';
  assert.deepEqual((await store.load(a)).rules, []);
  let saved = await store.save(a, 'p.comment-text', 24);
  const id = saved.rules[0].id;
  assert.equal(saved.version, 1);
  assert.equal(saved.origin, a);
  assert.deepEqual((await store.load(b)).rules, []);
  saved = await store.save(a, 'p.comment-text', 30);
  assert.equal(saved.rules.length, 1);
  assert.equal(saved.rules[0].id, id);
  assert.equal(saved.rules[0].size, 30);
  await store.save(a, 'p.caption', 18);
  saved = await store.remove(a, id);
  assert.deepEqual(saved.rules.map((r) => r.selector), ['p.caption']);
});
test('reject invalid rules/origins and preserve incompatible storage', async () => {
  const area = memory(), store = new RuleStore(area);
  for (const origin of ['null', 'file:///tmp/test', 'https://example.test/path']) await assert.rejects(() => store.load(origin));
  for (const size of [0, 129, 12.5, '20']) await assert.rejects(() => store.save('https://example.test', 'p.body', size));
  await assert.rejects(() => store.save('https://example.test', 'p.body {color:red}', 20));
  const key = store.key('https://example.test');
  area.data[key] = { version: 2, origin: 'https://example.test', rules: [] };
  await assert.rejects(() => store.save('https://example.test', 'p.body', 20), /versão incompatível/);
  assert.equal(area.data[key].version, 2);
});
test('storage write errors are surfaced', async () => {
  const store = new RuleStore({ get: async () => ({}), set: async () => { throw new Error('quota'); } });
  await assert.rejects(() => store.save('https://example.test', 'p.body', 20), /quota/);
});
