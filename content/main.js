/* global browser */
(() => {
  "use strict";
  const SZ = globalThis.SelectiveZoom;
  let indicator;
  const close = () => { selection.stop(); indicator?.remove(); indicator = null; };
  const selection = new SZ.Selection({
    onSelect(element) {
      indicator.textContent = `Selecionado: ${element.textContent.trim().slice(0, 80)} — clique na extensão para sair`;
    },
    onCancel: close
  });
  browser.runtime.onMessage.addListener((message) => {
    if (message.type !== "selective-zoom:toggle") return;
    if (indicator) return close();
    indicator = document.createElement("div");
    indicator.setAttribute("data-selective-zoom", "status");
    indicator.setAttribute("role", "status");
    indicator.textContent = "Selective Zoom — selecione um texto; Escape cancela";
    indicator.style.cssText = "position:fixed;right:16px;top:16px;z-index:2147483647;background:#172554;color:white;padding:12px;border-radius:8px;font:14px sans-serif";
    document.documentElement.append(indicator);
    selection.start();
  });
})();
