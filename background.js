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
