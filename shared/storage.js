(() => {
  "use strict";
  const SZ = globalThis.SelectiveZoom ||= {};
  SZ.validSize = (size) => Number.isInteger(size) && size >= 6 && size <= 128;
  SZ.validOrigin = (origin) => {
    try { const url = new URL(origin); return ['http:', 'https:'].includes(url.protocol) && url.origin === origin; }
    catch { return false; }
  };
  SZ.validRule = (rule) => !!rule && typeof rule.id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(rule.id) && SZ.Selectors.valid(rule.selector) && SZ.validSize(rule.size);
  SZ.RuleStore = class {
    constructor(area) { this.area = area; }
    key(origin) {
      if (!SZ.validOrigin(origin)) throw new Error('Origem não suportada.');
      return `selective-zoom:v1:${origin}`;
    }
    async load(origin) {
      const key = this.key(origin);
      const value = (await this.area.get(key))[key];
      if (value === undefined) return { version: 1, origin, rules: [] };
      if (!value || value.version !== 1 || value.origin !== origin || !Array.isArray(value.rules) ||
        value.rules.length > 100 || !value.rules.every(SZ.validRule) ||
        new Set(value.rules.map((rule) => rule.id)).size !== value.rules.length ||
        new Set(value.rules.map((rule) => rule.selector)).size !== value.rules.length) {
        throw new Error('As regras salvas têm formato inválido ou versão incompatível. Os dados foram preservados.');
      }
      return value;
    }
    async save(origin, selector, size) {
      if (!SZ.Selectors.valid(selector) || !SZ.validSize(size)) throw new Error('Regra inválida. Use entre 6 e 128 px e um seletor seguro.');
      const record = await this.load(origin);
      const existing = record.rules.find((rule) => rule.selector === selector);
      const rule = { id: existing?.id || crypto.randomUUID(), selector, size };
      const rules = existing ? record.rules.map((item) => item.id === existing.id ? rule : item) : [...record.rules, rule];
      if (rules.length > 100) throw new Error('Limite de 100 regras por site atingido. Remova uma regra antes de salvar.');
      const updated = { version: 1, origin, rules };
      await this.area.set({ [this.key(origin)]: updated });
      return updated;
    }
    async remove(origin, id) {
      const record = await this.load(origin);
      const updated = { ...record, rules: record.rules.filter((rule) => rule.id !== id) };
      await this.area.set({ [this.key(origin)]: updated });
      return updated;
    }
  };
})();
