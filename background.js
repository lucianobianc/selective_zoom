/* global browser */
"use strict";
browser.browserAction.onClicked.addListener(async (tab) => {
  try {
    await browser.tabs.sendMessage(tab.id, { type: "selective-zoom:toggle" });
    await browser.browserAction.setTitle({ tabId: tab.id, title: "Selective Zoom — selecionar texto" });
  } catch {
    await browser.browserAction.setTitle({
      tabId: tab.id,
      title: "Selective Zoom indisponível nesta página. Abra um site HTTP(S) e recarregue após instalar."
    });
  }
});

// All mutations pass through the background queue, so tabs cannot overwrite
// each other's read/modify/write operations. Never trust an origin from a page.
const ruleStore = new globalThis.SelectiveZoom.RuleStore(browser.storage.local);
let storageQueue = Promise.resolve();
browser.runtime.onMessage.addListener((message, sender) => {
  if (!message || !['selective-zoom:load', 'selective-zoom:save', 'selective-zoom:remove'].includes(message.type)) return;
  if (!sender.tab || sender.frameId !== 0) return Promise.resolve({ ok: false, error: 'Contexto não suportado.' });
  const operation = storageQueue.then(async () => {
    const origin = new URL(sender.url).origin;
    let record;
    if (message.type === 'selective-zoom:save') record = await ruleStore.save(origin, message.selector, message.size);
    else if (message.type === 'selective-zoom:remove') record = await ruleStore.remove(origin, message.id);
    else record = await ruleStore.load(origin);
    return { ok: true, record };
  });
  storageQueue = operation.catch(() => {});
  return operation.catch((error) => ({ ok: false, error: error.message || 'Não foi possível acessar as regras locais.' }));
});
