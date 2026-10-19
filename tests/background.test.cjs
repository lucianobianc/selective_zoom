const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const crypto = require('node:crypto').webcrypto;
function background() {
  const data = {}, listeners = [];
  const browser = {
    browserAction: { onClicked: { addListener() {} } },
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
