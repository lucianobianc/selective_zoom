(() => {
  "use strict";
  const SZ = globalThis.SelectiveZoom ||= {};
  SZ.validSize = (size) => Number.isInteger(size) && size >= 6 && size <= 128;
  SZ.Styles = class {
    constructor() {
      this.preview = document.createElement("style");
      this.preview.setAttribute("data-selective-zoom", "preview-style");
      document.documentElement.append(this.preview);
    }
    showPreview(selector, size) {
      this.preview.textContent = SZ.validSize(size) ? `${selector} { font-size: ${size}px !important; outline: 2px solid #2563eb !important; outline-offset: 2px !important; }` : "";
    }
    clearPreview() { this.preview.textContent = ""; }
  };
})();
