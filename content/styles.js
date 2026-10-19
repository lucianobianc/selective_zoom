(() => {
  "use strict";
  const SZ = globalThis.SelectiveZoom ||= {};
  SZ.Styles = class {
    constructor() {
      this.preview = document.createElement("style");
      this.preview.setAttribute("data-selective-zoom", "preview-style");
      this.saved = document.createElement("style");
      this.saved.setAttribute("data-selective-zoom", "saved-style");
      document.documentElement.append(this.saved, this.preview);
    }
    showPreview(selector, size) {
      this.preview.textContent = SZ.validSize(size) ? `${selector} { font-size: ${size}px !important; outline: 2px solid #2563eb !important; outline-offset: 2px !important; }` : "";
    }
    apply(record) {
      this.saved.textContent = record?.origin === location.origin ? record.rules.filter(SZ.validRule).map((rule) => `${rule.selector} { font-size: ${rule.size}px !important; }`).join("\n") : "";
    }
    clearPreview() { this.preview.textContent = ""; }
  };
})();
