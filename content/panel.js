(() => {
  "use strict";
  const SZ = globalThis.SelectiveZoom ||= {};
  SZ.Panel = class {
    constructor({ onCancel, onSize, onSave, onConfirm, onReselect, onList, onRemove }) {
      this.onSize = onSize;
      this.onSave = onSave;
      this.onRemove = onRemove;
      this.host = document.createElement("div");
      this.host.setAttribute("data-selective-zoom", "panel");
      this.host.style.cssText = "all:initial!important;position:fixed!important;top:16px!important;right:16px!important;z-index:2147483647!important;color-scheme:light!important";
      this.root = this.host.attachShadow({ mode: "open" });
      this.root.innerHTML = `
        <style>
          * { box-sizing:border-box; }
          /* The host's important reset overrides :host typography. Establish
             the panel's inherited defaults inside the shadow tree instead. */
          section { all:initial; display:block; box-sizing:border-box; font:14px/1.5 system-ui,sans-serif; color:#172554; color-scheme:light; direction:ltr; text-align:left; width:min(340px,calc(100vw - 32px)); max-height:calc(100vh - 32px); overflow:auto; background:#fff; border:2px solid #1d4ed8; border-radius:12px; padding:16px; box-shadow:0 8px 32px #0004; }
          h2 { font-size:18px; margin:0 0 8px; }
          p { margin:8px 0; }
          button,input { font:inherit; color:inherit; }
          button { cursor:pointer; background:#eff6ff; color:#172554; border:1px solid #2563eb; border-radius:6px; padding:7px 10px; margin:4px 4px 0 0; }
          button:disabled { cursor:default; opacity:.55; }
          :focus-visible { outline:3px solid #ca8a04; outline-offset:2px; }
          input[type=number] { width:80px; padding:5px; }
          input[type=range] { width:100%; }
          [hidden] { display:none!important; }
          .error { color:#b91c1c; }
          li { margin:12px 0; overflow-wrap:anywhere; }
          #selector { overflow-wrap:anywhere; }
        </style>
        <section aria-label="Selective Zoom" role="dialog">
          <h2>Selective Zoom</h2>
          <p id="status" role="status" aria-live="polite"></p>
          <div id="editor" hidden>
            <p id="selector"></p><p id="samples"></p>
            <label><input id="confirm" type="checkbox"> Os elementos destacados são os que quero alterar</label><br>
            <label for="size">Tamanho da fonte (px)</label>
            <input id="size" type="number" min="6" max="128" step="1">
            <input id="range" aria-label="Ajustar tamanho da fonte" type="range" min="6" max="128" step="1">
            <p id="error" class="error" role="alert"></p>
            <button id="save" disabled>Salvar</button>
          </div>
          <div id="list" hidden><p id="origin"></p><ul id="rules"></ul><p id="list-error" class="error" role="alert"></p></div>
          <button id="list-button">Regras deste site</button>
          <button id="reselect" hidden>Selecionar outro texto</button>
          <button id="cancel">Cancelar</button>
        </section>`;
      this.get("list-button").addEventListener("click", () => onList?.());
      this.get("confirm").addEventListener("change", () => onConfirm?.(this.get("confirm").checked));
      this.get("reselect").addEventListener("click", () => onReselect?.());
      this.get("cancel").addEventListener("click", onCancel);
      for (const name of ["size", "range"]) this.get(name).addEventListener("input", () => {
        const size = Number(this.get(name).value);
        if (name === "range") this.get("size").value = size;
        else if (SZ.validSize(size)) this.get("range").value = size;
        this.get("error").textContent = SZ.validSize(size) ? "" : "Use um número inteiro entre 6 e 128 px.";
        this.onSize(size);
      });
      this.get("save").addEventListener("click", () => this.onSave?.());
      document.documentElement.append(this.host);
    }
    get(id) { return this.root.getElementById(id); }
    selecting() {
      this.get("status").textContent = "Selecione um texto com o mouse ou use ↑/↓ e Enter. Escape cancela.";
      this.get("editor").hidden = true;
      this.get("list").hidden = true;
      this.get("reselect").hidden = true;
      this.get("error").textContent = "";
      this.get("status").tabIndex = -1;
      this.get("status").focus();
    }
    edit(size, proposal) {
      this.get("list").hidden = true;
      this.get("error").textContent = "";
      this.get("editor").hidden = false;
      this.get("confirm").checked = false;
      this.get("reselect").hidden = false;
      this.get("status").textContent = `Selecionado: ${proposal.elements.length} elemento(s) destacado(s). Confira antes de confirmar.`;
      this.get("selector").textContent = proposal.selector;
      this.get("samples").textContent = proposal.elements.slice(0, 3).map((element) => element.textContent.trim().slice(0, 60)).join(" • ");
      this.get("size").value = size;
      this.get("range").value = size;
      this.get("size").focus();
    }
    unavailable() {
      this.get("status").textContent = "Não foi possível criar uma regra segura para esse texto. Nenhuma alteração foi salva.";
      this.get("editor").hidden = true;
      this.get("reselect").hidden = false;
      this.get("reselect").focus();
    }
    list(record) {
      this.get("editor").hidden = true;
      this.get("list").hidden = false;
      this.get("reselect").hidden = false;
      this.get("status").textContent = record.rules.length ? `${record.rules.length} regra(s) deste site.` : "Nenhuma regra salva neste site.";
      this.get("origin").textContent = record.origin;
      this.get("list-error").textContent = "";
      this.get("rules").replaceChildren();
      for (const rule of record.rules) {
        const row = document.createElement("li");
        const label = document.createElement("span");
        label.textContent = `${rule.selector} — ${rule.size} px `;
        const remove = document.createElement("button");
        remove.textContent = "Remover";
        remove.setAttribute("aria-label", `Remover regra ${rule.selector}`);
        remove.addEventListener("click", async () => {
          remove.disabled = true;
          try { await this.onRemove(rule.id); }
          finally { remove.disabled = false; }
        });
        row.append(label, remove);
        this.get("rules").append(row);
      }
    }
    remove() { this.host.remove(); }
  };
})();
