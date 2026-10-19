(() => {
  "use strict";
  const SZ = globalThis.SelectiveZoom ||= {};
  const excluded = "script,style,noscript,template,input,textarea,select,option,button,iframe,object,embed,[contenteditable]:not([contenteditable=false]),[role=textbox],[data-selective-zoom]";
  SZ.isTextElement = (element) => element instanceof Element &&
    !["HTML", "BODY"].includes(element.tagName) && !element.closest(excluded) &&
    element.getRootNode() === document && !!element.textContent.trim() &&
    !element.querySelector("input,textarea,select,button,[contenteditable]:not([contenteditable=false]),[role=textbox]");

  SZ.textTarget = (element, x, y) => {
    if (!(element instanceof Element) || element.closest(excluded) || element.getRootNode() !== document) return null;
    // Event targets can be wrappers even when a nested text span is under the
    // pointer (for example with pointer-events:none or display:contents).
    if (Number.isFinite(x) && Number.isFinite(y)) {
      const caret = document.caretPositionFromPoint?.(x, y);
      const node = caret?.offsetNode || document.caretRangeFromPoint?.(x, y)?.startContainer;
      if (node?.nodeType === Node.TEXT_NODE && element.contains(node) && SZ.isTextElement(node.parentElement)) return node.parentElement;
    }
    return SZ.isTextElement(element) ? element : null;
  };

  SZ.Selection = class {
    constructor({ onSelect, onCancel }) {
      this.onSelect = onSelect;
      this.onCancel = onCancel;
      this.move = (event) => this.highlight(SZ.textTarget(event.target, event.clientX, event.clientY));
      this.suppress = (event) => {
        if (event.button !== 0) return;
        if (event.composedPath().some((node) => node instanceof Element && node.hasAttribute("data-selective-zoom"))) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      };
      this.click = (event) => {
        const target = SZ.textTarget(event.target, event.clientX, event.clientY);
        this.suppress(event);
        if (!target) return;
        this.stop();
        this.onSelect(target);
      };
      this.reposition = () => this.highlight(this.target);
      this.key = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopImmediatePropagation();
          this.stop();
          this.onCancel();
          return;
        }
        const source = event.composedPath()[0];
        if (source instanceof Element && source.closest("button,input,select,textarea")) return;
        if (["ArrowDown", "ArrowUp"].includes(event.key)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          const elements = [], seen = new Set();
          let node;
          while ((node = walker.nextNode()) && elements.length < 500) {
            const element = node.parentElement;
            if (node.textContent.trim() && SZ.isTextElement(element) && !seen.has(element) && element.getClientRects().length) {
              elements.push(element); seen.add(element);
            }
          }
          if (!elements.length) return;
          const index = elements.indexOf(this.target);
          const next = index < 0 ? (event.key === "ArrowDown" ? 0 : elements.length - 1) :
            (index + (event.key === "ArrowDown" ? 1 : -1) + elements.length) % elements.length;
          elements[next].scrollIntoView({ block: "nearest" });
          this.highlight(elements[next]);
        } else if (event.key === "Enter" && SZ.isTextElement(this.target)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          const target = this.target;
          this.stop();
          this.onSelect(target);
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
      window.addEventListener("scroll", this.reposition, true);
      window.addEventListener("resize", this.reposition);
    }
    highlight(element) {
      this.target = SZ.isTextElement(element) ? element : null;
      this.box.style.display = "none";
      if (!SZ.isTextElement(element)) return;
      let rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        const range = document.createRange();
        range.selectNodeContents(element);
        rect = range.getBoundingClientRect();
      }
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
      window.removeEventListener("scroll", this.reposition, true);
      window.removeEventListener("resize", this.reposition);
      this.target = null;
    }
  };
})();
