(() => {
  "use strict";
  const SZ = globalThis.SelectiveZoom ||= {};
  // Intentionally conservative: hashed/numeric classes are poor persistence keys.
  const stableToken = (token) => /^[a-zA-Z][a-zA-Z_-]{1,63}$/.test(token) &&
    !/^(css-|jsx-|sc-|jss|_[a-f]|[a-f]{8,}$)/i.test(token);
  const tag = '[a-z][a-z0-9-]*';
  const token = '[a-zA-Z][a-zA-Z_-]{1,63}';
  const qualifier = `(?:\\.${token}|\\[(?:id|data-testid|data-test)="${token}"\\])`;
  const segment = `${tag}(?:${qualifier}){1,3}`;
  const syntax = new RegExp(`^${segment}(?: > ${tag}(?:${qualifier}){0,3})?$`);
  SZ.Selectors = {
    stableToken,
    valid(selector) { return typeof selector === 'string' && selector.length <= 512 && syntax.test(selector); },
    matches(selector, doc = document) {
      if (!this.valid(selector)) return [];
      try {
        const elements = [...doc.querySelectorAll(selector)];
        if (!elements.length || elements.length > 500 || elements.some((element) => !SZ.isTextElement(element))) return [];
        return elements;
      } catch { return []; }
    },
    propose(element) {
      if (!SZ.isTextElement(element)) return null;
      const name = element.localName;
      if (!/^[a-z][a-z0-9-]*$/.test(name)) return null;
      const classes = [...element.classList].filter(stableToken).slice(0, 3);
      const candidates = [];
      if (classes.length > 1) candidates.push(name + classes.map((value) => `.${value}`).join(''));
      for (const value of classes) candidates.push(`${name}.${value}`);
      for (const attr of ['data-testid', 'data-test', 'id']) {
        const value = element.getAttribute(attr);
        if (stableToken(value || '')) candidates.push(`${name}[${attr}="${value}"]`);
      }
      const parent = element.parentElement;
      if (parent && /^[a-z][a-z0-9-]*$/.test(parent.localName)) {
        for (const value of [...parent.classList].filter(stableToken).slice(0, 3)) {
          candidates.push(`${parent.localName}.${value} > ${name}${classes[0] ? `.${classes[0]}` : ''}`);
        }
      }
      for (const selector of candidates) {
        const elements = this.matches(selector);
        if (elements.includes(element)) return { selector, elements };
      }
      return null;
    }
  };
})();
