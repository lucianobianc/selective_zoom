/* global browser */
(() => {
  "use strict";
  let indicator;
  browser.runtime.onMessage.addListener((message) => {
    if (message.type !== "selective-zoom:toggle") return;
    if (indicator) {
      indicator.remove();
      indicator = null;
      return;
    }
    indicator = document.createElement("div");
    indicator.textContent = "Selective Zoom ativo — clique no botão da extensão para sair";
    indicator.style.cssText = "position:fixed;right:16px;top:16px;z-index:2147483647;background:#172554;color:white;padding:12px;border-radius:8px;font:14px sans-serif";
    document.documentElement.append(indicator);
  });
})();
