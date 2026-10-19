(() => {
  "use strict";
  const SZ = globalThis.SelectiveZoom ||= {};
  const excluded = "script,style,noscript,template,input,textarea,select,option,button,iframe,object,embed,[contenteditable]:not([contenteditable=false]),[role=textbox],[data-selective-zoom]";
  SZ.isTextElement = (element) => element instanceof Element &&
    !["HTML", "BODY"].includes(element.tagName) && !element.closest(excluded) &&
    element.getRootNode() === document && !!element.textContent.trim();

  SZ.Selection = class {
    constructor({ onSelect, onCancel }) {
      this.onSelect = onSelect;
      this.onCancel = onCancel;
      this.move = (event) => this.highlight(event.target);
      this.suppress = (event) => {
        if (event.composedPath().some((node) => node instanceof Element && node.hasAttribute("data-selective-zoom"))) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      };
      this.click = (event) => {
        this.suppress(event);
        if (!SZ.isTextElement(event.target)) return;
        const target = event.target;
        this.stop();
        this.onSelect(target);
      };
      this.key = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopImmediatePropagation();
          this.stop();
          this.onCancel();
        }
      };
    }
    start() {
      if (this.active) return;
      this.active = true;
      this.host = document.createElement("div");
      this.host.setAttribute("data-selective-zoom", "highlight");
      this.host.style.cssText = "all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483646!important";
      const shadow = this.host.attachShadow({ mode: "open" });
      this.box = document.createElement("div");
      this.box.style.cssText = "display:none;position:fixed;outline:3px solid #2563eb;background:rgb(37 99 235 / 12%);pointer-events:none";
      shadow.append(this.box);
      document.documentElement.append(this.host);
      window.addEventListener("pointermove", this.move, true);
      window.addEventListener("pointerdown", this.suppress, true);
      window.addEventListener("pointerup", this.suppress, true);
      window.addEventListener("click", this.click, true);
      window.addEventListener("keydown", this.key, true);
    }
    highlight(element) {
      this.box.style.display = "none";
      if (!SZ.isTextElement(element)) return;
      const rect = element.getBoundingClientRect();
      Object.assign(this.box.style, { display: "block", left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    }
    stop() {
      this.active = false;
      this.host?.remove();
      window.removeEventListener("pointermove", this.move, true);
      window.removeEventListener("pointerdown", this.suppress, true);
      window.removeEventListener("pointerup", this.suppress, true);
      window.removeEventListener("click", this.click, true);
      window.removeEventListener("keydown", this.key, true);
    }
  };
})();
