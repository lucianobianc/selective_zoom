const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const crypto = require('node:crypto').webcrypto;
function background({ onMenuCreated = () => {}, onMenuListener = () => {}, onSendMessage = () => {} } = {}) {
  const data = {}, listeners = [];
  const browser = {
    browserAction: { onClicked: { addListener() {} }, async setTitle() {} },
    menus: { async removeAll() {}, create: onMenuCreated, onClicked: { addListener: onMenuListener } },
    tabs: { sendMessage: onSendMessage },
    runtime: { onMessage: { addListener(fn) { listeners.push(fn); } } },
    storage: { local: {
      async get(key) { await new Promise((resolve) => setTimeout(resolve, 1)); return { [key]: structuredClone(data[key]) }; },
      async set(value) { Object.assign(data, structuredClone(value)); }
    } }
  };
  const context = vm.createContext({ browser, URL, crypto });
  for (const path of ['content/selectors.js', 'shared/storage.js', 'background.js']) vm.runInContext(fs.readFileSync(path, 'utf8'), context);
  return (message, sender = { url: 'https://one.test/comments', tab: { id: 1 }, frameId: 0 }) => listeners[0](message, sender);
}
test('background serializes concurrent tab writes and derives origin from sender', async () => {
  const send = background();
  const responses = await Promise.all([
    send({ type: 'selective-zoom:save', selector: 'p.comment-text', size: 20, origin: 'https://spoof.test' }),
    send({ type: 'selective-zoom:save', selector: 'p.caption', size: 24 })
  ]);
  assert.ok(responses.every((r) => r.ok));
  const loaded = await send({ type: 'selective-zoom:load' });
  assert.equal(loaded.record.rules.length, 2);
  assert.equal(loaded.record.origin, 'https://one.test');
  const other = await send({ type: 'selective-zoom:load' }, { url: 'https://other.test/comments', tab: { id: 2 }, frameId: 0 });
  assert.equal(other.record.rules.length, 0);
});
test('invalid requests cannot poison the queue or access storage from a subframe', async () => {
  const send = background();
  assert.equal((await send({ type: 'selective-zoom:save', selector: '*', size: 20 })).ok, false);
  assert.equal((await send({ type: 'selective-zoom:load' })).ok, true);
  assert.equal((await send({ type: 'selective-zoom:load' }, { tab: { id: 1 }, url: 'https://one.test', frameId: 1 })).ok, false);
  assert.equal((await send({ type: 'selective-zoom:load' }, {})).ok, false);
});
test('context menu registers for websites and forwards the native target to the main frame', async () => {
  let item, click;
  const sent = [];
  background({ onMenuCreated: (menu) => { item = menu; }, onMenuListener: (listener) => { click = listener; }, onSendMessage: (...args) => sent.push(args) });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(item.title, 'Selective Zoom');
  assert.ok(item.contexts.includes('selection'));
  await click({ menuItemId: item.id, targetElementId: 42, frameId: 0 }, { id: 7 });
  assert.equal(sent[0][0], 7);
  assert.equal(sent[0][1].type, 'selective-zoom:context');
  assert.equal(sent[0][1].targetElementId, 42);
  assert.equal(sent[0][2].frameId, 0);
  await click({ menuItemId: 'unrelated' }, { id: 7 });
  assert.equal(sent.length, 1);
  await click({ menuItemId: item.id, targetElementId: 99, frameId: 1 }, { id: 7 });
  assert.equal(sent[1][1].targetElementId, undefined);
});
