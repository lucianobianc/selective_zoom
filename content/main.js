/* global browser */
(() => {
  "use strict";
  const SZ = globalThis.SelectiveZoom;
  const styles = new SZ.Styles();
  let panel, proposal, size, confirmed = false, busy = false, loadError, previousFocus;
  const request = async (type, fields = {}) => {
    const result = await browser.runtime.sendMessage({ type: `selective-zoom:${type}`, ...fields });
    if (!result?.ok) throw new Error(result?.error || 'Não foi possível acessar as regras locais.');
    loadError = null;
    styles.apply(result.record);
    return result.record;
  };
  const ready = request('load').catch((error) => { loadError = error.message; });
  const close = () => {
    selection.stop();
    styles.clearPreview();
    proposal = null;
    confirmed = false;
    panel?.remove();
    panel = null;
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  };
  const refreshSave = () => {
    if (panel) panel.get('save').disabled = busy || !proposal || !confirmed || !SZ.validSize(size) || !!loadError;
  };
  const selection = new SZ.Selection({
    onSelect(element) {
      proposal = SZ.Selectors.propose(element);
      confirmed = false;
      if (!proposal) return panel.unavailable();
      size = Math.min(128, Math.max(6, Math.round(parseFloat(getComputedStyle(element).fontSize))));
      panel.edit(size, proposal);
      if (loadError) panel.get("error").textContent = loadError;
      styles.showPreview(proposal.selector, size);
      refreshSave();
    },
    onCancel: close
  });
  window.addEventListener('keydown', (event) => {
    if (panel && event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    }
  }, true);
  browser.runtime.onMessage.addListener(async (message) => {
    if (message.type !== 'selective-zoom:toggle') return;
    await ready;
    if (panel) return close();
    previousFocus = document.activeElement;
    panel = new SZ.Panel({
      onCancel: close,
      onList: async () => {
        selection.stop();
        styles.clearPreview();
        proposal = null;
        const owner = panel;
        try { const record = await request('load'); if (panel === owner) panel.list(record); }
        catch (error) { if (panel === owner) panel.get('status').textContent = error.message; }
      },
      onRemove: async (id) => {
        const owner = panel;
        try {
          const record = await request('remove', { id });
          if (panel === owner) { panel.list(record); panel.get('reselect').focus(); }
        } catch (error) { if (panel === owner) panel.get('list-error').textContent = error.message; }
      },
      onSize: (value) => { size = value; if (proposal) styles.showPreview(proposal.selector, size); refreshSave(); },
      onConfirm: (value) => { confirmed = value; refreshSave(); },
      onSave: async () => {
        if (busy || !proposal || !confirmed || !SZ.validSize(size)) return;
        const editingPanel = panel;
        // Recheck a dynamic page before committing the reviewed set.
        const elements = SZ.Selectors.matches(proposal.selector);
        if (elements.length !== proposal.elements.length || elements.some((element, index) => element !== proposal.elements[index])) {
          confirmed = false;
          editingPanel.get('confirm').checked = false;
          proposal.elements = elements;
          editingPanel.get('status').textContent = `A página mudou: ${elements.length} elemento(s). Confira os destaques e confirme novamente.`;
          if (!elements.length) { proposal = null; styles.clearPreview(); }
          refreshSave();
          return;
        }
        busy = true;
        refreshSave();
        try {
          await request('save', { selector: proposal.selector, size });
          if (panel === editingPanel) close();
        } catch (error) {
          if (panel === editingPanel) panel.get('error').textContent = error.message;
        } finally { busy = false; refreshSave(); }
      },
      onReselect: () => { styles.clearPreview(); proposal = null; confirmed = false; panel.selecting(); selection.start(); }
    });
    panel.selecting();
    if (loadError) panel.get('status').textContent = loadError;
    selection.start();
  });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[`selective-zoom:v1:${location.origin}`]) {
      request('load').then((record) => { if (panel && !panel.get('list').hidden) panel.list(record); }).catch((error) => { loadError = error.message; if (panel) panel.get('error').textContent = loadError; });
    }
  });
})();
