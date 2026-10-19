/* global browser */
(() => {
  "use strict";
  const SZ = globalThis.SelectiveZoom;
  const styles = new SZ.Styles();
  let panel, proposal;
  const close = () => {
    selection.stop();
    styles.clearPreview();
    proposal = null;
    panel?.remove();
    panel = null;
  };
  const selection = new SZ.Selection({
    onSelect(element) {
      proposal = SZ.Selectors.propose(element);
      if (!proposal) return panel.unavailable();
      const size = Math.min(128, Math.max(6, Math.round(parseFloat(getComputedStyle(element).fontSize))));
      panel.edit(size, proposal);
      styles.showPreview(proposal.selector, size);
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
    panel = new SZ.Panel({
      onCancel: close,
      onSize: (size) => proposal && styles.showPreview(proposal.selector, size),
      onReselect: () => { styles.clearPreview(); proposal = null; panel.selecting(); selection.start(); }
    });
    panel.selecting();
    selection.start();
  });
})();
