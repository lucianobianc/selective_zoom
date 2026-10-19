/* global browser */
"use strict";
async function openPanel(tab, message) {
  if (!tab?.id) return;
  try {
    await browser.tabs.sendMessage(tab.id, message, { frameId: 0 });
    await browser.browserAction.setTitle({ tabId: tab.id, title: "Selective Zoom — selecionar texto" });
  } catch {
    await browser.browserAction.setTitle({
      tabId: tab.id,
      title: "Selective Zoom indisponível nesta página. Abra um site HTTP(S) e recarregue após instalar."
    });
  }
}
browser.browserAction.onClicked.addListener((tab) => openPanel(tab, { type: "selective-zoom:toggle" }));

const contextMenuId = "selective-zoom-adjust-text";
browser.menus.removeAll().then(() => browser.menus.create({
  id: contextMenuId,
  title: "Selective Zoom — ajustar texto",
  contexts: ["page", "selection", "link"],
  documentUrlPatterns: ["http://*/*", "https://*/*"]
})).catch((error) => console.error("Não foi possível registrar o menu do Selective Zoom:", error));
browser.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== contextMenuId) return;
  return openPanel(tab, {
    type: "selective-zoom:context",
    // Subframe targets belong to another document, outside the MVP.
    targetElementId: info.frameId === 0 ? info.targetElementId : undefined
  });
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
