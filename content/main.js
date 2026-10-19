/* global browser */
(() => {
  "use strict";
  const SZ = globalThis.SelectiveZoom;
  const styles = new SZ.Styles();
  let panel, target, attribute;
  const close = () => {
    selection.stop();
    styles.clearPreview();
    if (target && attribute) target.removeAttribute(attribute);
    target = attribute = null;
    panel?.remove();
    panel = null;
  };
  const selection = new SZ.Selection({
    onSelect(element) {
      target = element;
      attribute = `data-sz-${crypto.randomUUID()}`;
      target.setAttribute(attribute, "");
      const size = Math.min(128, Math.max(6, Math.round(parseFloat(getComputedStyle(element).fontSize))));
      panel.edit(size);
      styles.showPreview(`[${attribute}]`, size);
    },
    onCancel: close
  });
  window.addEventListener("keydown", (event) => {
    if (panel && event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    }
  }, true);
  browser.runtime.onMessage.addListener((message) => {
    if (message.type !== "selective-zoom:toggle") return;
    if (panel) return close();
    panel = new SZ.Panel({ onCancel: close, onSize: (size) => styles.showPreview(`[${attribute}]`, size) });
    panel.selecting();
    selection.start();
  });
})();
