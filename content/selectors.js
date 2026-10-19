(() => {
  "use strict";
  const SZ = globalThis.SelectiveZoom ||= {};
  const stableToken = (token) => /^[a-zA-Z][a-zA-Z_-]{1,63}$/.test(token) &&
    !/^(css-|jsx-|sc-|jss|_[a-f]|[a-f]{8,}$)/i.test(token);
  const safeClass = (token) => /^[a-zA-Z_][a-zA-Z0-9_-]{0,79}$/.test(token);
  const safeValue = (value) => typeof value === 'string' && /^[a-zA-Z0-9_:/.-]{1,100}$/.test(value);
  const genericClass = (token) => /^(style-scope|html-(?:div|span)|yt-core-attributed-string(?:--.*)?)$/.test(token);
  const tag = '[a-z][a-z0-9-]*';
  const token = '[a-zA-Z_][a-zA-Z0-9_-]{0,79}';
  const attributes = 'id|data-testid|data-test|role|dir|data-ad-rendering-role|data-ad-comet-preview';
  const qualifier = `(?:\\.${token}|\\[(?:${attributes})="[a-zA-Z0-9_:/.-]{1,100}"\\]|\\[(?:open|popover)\\])`;
  const segment = `${tag}(?:${qualifier}){0,12}`;
  const syntax = new RegExp(`^${segment}(?:(?: > | )${segment}){0,8}$`);
  const ownSelector = (element, attr) => {
    const value = element.getAttribute(attr);
    return safeValue(value) ? `${element.localName}[${attr}="${value}"]` : null;
  };
  const stableClasses = (element) => [...element.classList].filter((value) => stableToken(value) && !genericClass(value)).slice(0, 6);
  const strongScope = (element) => {
    for (const attr of ['data-ad-rendering-role', 'data-ad-comet-preview', 'data-testid', 'data-test']) {
      const selector = ownSelector(element, attr);
      if (selector) return selector;
    }
    if (['article', 'listitem'].includes(element.getAttribute('role'))) return ownSelector(element, 'role');
    if (/^[a-z][a-z0-9-]*-[a-z0-9-]+$/.test(element.localName) && /comment|post|message/.test(element.localName)) return element.localName;
    return null;
  };
  const leafSelectors = (element, generated = false, anchored = false) => {
    const options = [];
    for (const attr of ['data-ad-rendering-role', 'data-ad-comet-preview', 'data-testid', 'data-test', 'id']) {
      if (attr === 'id' && !stableToken(element.id)) continue;
      const selector = ownSelector(element, attr);
      if (selector) options.push(selector);
    }
    const classes = stableClasses(element);
    if (classes.length) options.push(element.localName + classes.map((value) => `.${value}`).join(''));
    if (generated) {
      const all = [...element.classList].filter(safeClass).slice(0, 10);
      // A combination can distinguish text in obfuscated DOMs; a lone hash
      // remains insufficient without a structural/semantic anchor.
      if (all.length > 1 || (anchored && all.length)) options.push(element.localName + all.map((value) => `.${value}`).join(''));
      if (['auto', 'ltr', 'rtl'].includes(element.getAttribute('dir'))) options.push(ownSelector(element, 'dir'));
    }
    return options;
  };
  SZ.Selectors = {
    stableToken,
    valid(selector) {
      if (typeof selector !== 'string' || selector.length > 512 || !syntax.test(selector)) return false;
      const first = selector.split(/ > | /)[0];
      // Never accept unanchored tag-only paths, selector lists or arbitrary CSS.
      return /[.\[]/.test(first) || (first.includes('-') && /[.\[]/.test(selector));
    },
    matches(selector, doc = document) {
      if (!this.valid(selector)) return [];
      try {
        const elements = [...doc.querySelectorAll(selector)];
        if (!elements.length || elements.length > 500 || elements.some((element) => !SZ.isTextElement(element))) return [];
        return elements;
      } catch { return []; }
    },
    propose(element) {
      if (!SZ.isTextElement(element) || !/^[a-z][a-z0-9-]*$/.test(element.localName)) return null;
      const modal = SZ.modalFor(element);
      const prefix = modal ? `${SZ.modalSelector(modal)} ` : '';
      const attempt = (selector, target = element) => {
        selector = prefix + selector;
        const elements = this.matches(selector);
        return elements.includes(target) ? { selector, elements } : null;
      };
      // Real reports show that YouTube typography classes are reused outside
      // comments. Target the body inside a comment, including nested spans.
      const comment = element.closest('ytd-comment-view-model,ytd-comment-renderer');
      const body = element.closest('[id="content-text"]');
      if (comment && body && comment.contains(body)) {
        const result = attempt(`${comment.localName} ${body.localName}[id="content-text"]`, body);
        if (result) return result;
      }
      // Facebook exposes these semantic markers in some DOM variants. Prefer
      // them to shared, generated presentation classes when they are present.
      const message = element.closest('[data-ad-rendering-role="comment_message"],[data-ad-rendering-role="story_message"],[data-ad-comet-preview="message"]');
      if (message && SZ.isTextElement(message)) {
        for (const attr of ['data-ad-rendering-role', 'data-ad-comet-preview']) {
          const selector = ownSelector(message, attr);
          if (selector) { const result = attempt(selector, message); if (result) return result; }
        }
      }
      const stable = leafSelectors(element);
      const scoped = leafSelectors(element, true);
      const contextual = leafSelectors(element, true, true);
      const directBlocks = element.getAttribute('dir') === 'auto' ? [
        ...contextual.filter((leaf) => !leaf.includes('[')).map((leaf) => `${leaf}[dir="auto"]`),
        ownSelector(element, 'dir')
      ] : [];
      let ancestor = element.parentElement;
      const path = [];
      const weakScopes = [];
      let textBlock;
      for (let depth = 0; ancestor && ancestor !== modal && depth < 24 && !['BODY', 'HTML'].includes(ancestor.tagName); depth++, ancestor = ancestor.parentElement) {
        if (!textBlock && ancestor.getAttribute('dir') === 'auto' && path.length < 5) {
          textBlock = `${ancestor.localName}[dir="auto"] > ${path.length ? path.join(' > ') + ' > ' : ''}`;
        }
        const anchor = strongScope(ancestor);
        if (anchor) {
          // Preserve the relative structure, not a global tag or utility class.
          for (const leaf of [...contextual, element.localName]) {
            const result = path.length < 7 ? attempt(`${anchor} > ${[...path, leaf].join(' > ')}`) : null;
            if (result) return result;
          }
          // Expanded replies may insert many layout wrappers. Keep the article
          // and text-block anchors without encoding all those transient layers.
          if (textBlock) for (const leaf of contextual) {
            const result = attempt(`${anchor} ${textBlock}${leaf}`);
            if (result) return result;
          }
          for (const leaf of directBlocks) {
            const result = attempt(`${anchor} ${leaf}`);
            if (result) return result;
          }
        }
        const classes = stableClasses(ancestor);
        if (classes.length && path.length < 7) weakScopes.push(`${ancestor.localName}${classes.map((value) => `.${value}`).join('')} > ${path.length ? path.join(' > ') + ' > ' : ''}`);
        path.unshift(ancestor.localName);
      }
      if (modal) {
        for (const leaf of directBlocks) {
          const result = attempt(leaf);
          if (result) return result;
        }
        for (const leaf of contextual) {
          const result = textBlock ? attempt(textBlock + leaf) : null;
          if (result) return result;
          if (ancestor === modal && path.length < 7) {
            const direct = attempt([...path, leaf].join(' > '));
            if (direct) return direct;
          }
        }
      }
      for (const selector of stable) {
        const global = attempt(selector);
        if (!global) continue;
        // A repeated styling class is not proof that texts share a purpose.
        for (const prefix of weakScopes) {
          const result = attempt(prefix + selector);
          if (result && result.elements.length < global.elements.length) return result;
        }
        return global;
      }
      for (const selector of scoped.filter((value) => value !== element.localName && !value.includes('[dir='))) {
        for (const prefix of weakScopes) {
          const result = attempt(prefix + selector);
          if (result) return result;
        }
        const result = attempt(selector);
        if (result) return result;
      }
      return null;
    }
  };
})();
