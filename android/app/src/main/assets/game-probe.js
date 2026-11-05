// Runs only for idlearc.com and www.idlearc.com in an origin-restricted WebView.
// Reports safe request metadata and a bounded allowlist of item fields from game JSON. Never forwards raw bodies.
(() => {
  if (window.__idleArcProbeInstalled) return;
  Object.defineProperty(window, '__idleArcProbeInstalled', { value: true });
  const MAX_JSON = 65536; // Upper bound for JSON inspected locally; raw bodies never leave WebView.
  const MAX_ITEMS = 6;
  const bridge = window.IdleArcTelemetry;
  if (!bridge || typeof bridge.postMessage !== 'function') return;
  const send = value => { try { bridge.postMessage(JSON.stringify(value)); } catch (_) {} };
  let clickSequence = 0;
  let lastClickAt = 0;
  let lastClickId = 0;
  const hideAuth = () => /(?:login|sign-?in|account|oauth|auth|callback|password)/i.test(location.pathname)
    || Array.from(document.querySelectorAll('input[type="password"]')).some(el =>
      el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
  const safeUrl = input => {
    try {
      const u = new URL(input, location.href);
      if ((u.protocol !== 'https:' && u.protocol !== 'wss:') || !/(?:^|\.)idlearc\.com$/i.test(u.hostname)) return null;
      // Query strings, fragments, credentials, and request bodies never leave the page.
      if (u.username || u.password || /(?:auth|token|session|password|oauth|login|callback|credential)/i.test(u.pathname)) return null;
      return u.origin + u.pathname;
    } catch (_) { return null; }
  };
  const method = text => /^(GET|POST|PUT|PATCH|DELETE|HEAD)$/i.test(String(text || ''))
    ? String(text).toUpperCase() : 'OTHER';
  const record = (type, m, url, status) => {
    if (hideAuth()) return;
    const u = safeUrl(url);
    if (u) send({ t: type, m: method(m), u, s: Number.isInteger(status) && status >= 0 && status <= 599 ? status : 0,
      a: Date.now() - lastClickAt < 1500 && Date.now() >= lastClickAt ? lastClickId : 0 });
  };


  // Extract only specific, low-risk item attributes. No arbitrary JSON keys or raw bodies cross the bridge.
  const itemText = value => {
    if (typeof value !== 'string') return undefined;
    const text = value.trim();
    return text.length > 0 && text.length <= 48 && /^[\p{L}\p{N} .,_+%!?()/'-]+$/u.test(text)
      && !/@|[0-9]{6,}|[A-Za-z0-9_-]{20,}|token|password|secret|cookie|email|bearer|key/i.test(text)
      ? text : undefined;
  };
  const number = value => typeof value === 'number' && Number.isFinite(value) &&
    value >= 0 && value <= 1000000 ? value : undefined;
  const pick = (obj, keys, safe) => {
    for (const key of keys) {
      const value = safe(obj[key]);
      if (value !== undefined) return value;
    }
    return undefined;
  };
  const item = obj => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    const name = pick(obj, ['name', 'itemName', 'item_name', 'displayName', 'display_name', 'title'], itemText);
    if (!name) return null; // No guess from an opaque ID.
    const result = { name };
    const rarity = pick(obj, ['rarity', 'quality'], itemText);
    if (rarity) result.rarity = rarity;
    const qty = pick(obj, ['quantity', 'qty', 'count', 'stack'], number);
    if (qty !== undefined) result.qty = qty;
    const level = pick(obj, ['level', 'itemLevel', 'item_level'], number);
    if (level !== undefined) result.level = level;
    const stats = ['stats', 'attributes', 'bonuses'].map(key => obj[key]).filter(value =>
      value && typeof value === 'object' && !Array.isArray(value));
    for (const [out, keys] of Object.entries({ attack: ['attack', 'damage', 'attackDamage', 'attack_damage'],
      defense: ['defense', 'armor'], hp: ['hp', 'health', 'maxHp', 'max_hp'],
      strength: ['strength', 'str'], dexterity: ['dexterity', 'dex'],
      intelligence: ['intelligence', 'int'], crit: ['critChance', 'crit_chance'] })) {
      let val = pick(obj, keys, number);
      for (const block of stats) if (val === undefined) val = pick(block, keys, number);
      if (val !== undefined) result[out] = val;
    }
    return result;
  };
  const findItems = (obj, depth = 0) => {
    if (!obj || typeof obj !== 'object' || depth > 5) return null;
    if (Array.isArray(obj)) {
      // Ignore collections of unrelated user/profile records.
      const list = obj.slice(0, MAX_ITEMS).map(item).filter(Boolean);
      return list.length ? { list, total: Math.min(obj.length, 999) } : null;
    }
    for (const key of ['items', 'item', 'inventory', 'loot', 'equipment', 'rewards', 'data', 'result', 'payload', 'character', 'player']) {
      if (Object.hasOwn(obj, key)) {
        const found = findItems(obj[key], depth + 1);
        if (found) return found;
      }
    }
    const single = item(obj);
    return single ? { list: [single], total: 1 } : null;
  };
  const inspect = (body, url, direction) => {
    if (hideAuth()) return;
    const u = safeUrl(url);
    if (!u || !/(?:item|inventory|loot|equip|reward|drop)/i.test(new URL(u).pathname)) return;
    try {
      const parsed = typeof body === 'string' ? (body.length <= MAX_JSON ? JSON.parse(body) : null) : body;
      const result = findItems(parsed);
      if (result) {
        const report = { t: 'items', u, d: direction, n: result.total, list: result.list };
        // Long item names/stats must not exceed the native bridge bound.
        while (report.list.length > 1 && JSON.stringify(report).length > 2200) report.list.pop();
        if (JSON.stringify(report).length <= 2200) send(report);
      }
    } catch (_) { /* Unreadable or non-JSON game response: do not guess. */ }
  };
  const inspectFetchResponse = (response, url) => {
    try {
      if (!safeUrl(url) || hideAuth() || !/(?:item|inventory|loot|equip|reward|drop)/i.test(new URL(url, location.href).pathname)) return;
      if (!response || !response.clone || !response.headers ||
          !/json/i.test(response.headers.get('content-type') || '') ||
          Number(response.headers.get('content-length') || 0) > MAX_JSON) return;
      const copy = response.clone();
      if (!copy.body || !copy.body.getReader || typeof TextDecoder !== 'function') return;
      // Stream manually so an absent Content-Length cannot cause an unbounded read.
      (async () => {
        const reader = copy.body.getReader();
        let size = 0; const chunks = [];
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > MAX_JSON) { await reader.cancel(); return; }
            chunks.push(value);
          }
          const bytes = new Uint8Array(size); let offset = 0;
          for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
          inspect(new TextDecoder().decode(bytes), url, 'in');
        } catch (_) { try { await reader.cancel(); } catch (_) {} }
      })();
    } catch (_) {}
  };

  document.addEventListener('click', event => {
    if (!event.isTrusted || hideAuth()) return;
    const node = event.target instanceof Element
      ? event.target.closest('button,[role="button"],a,input[type="button"],input[type="submit"]') : null;
    if (!node || node.closest('form,[contenteditable]') || node.matches('input,textarea,select')) return;
    const label = (node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent || '')
      .replace(/\s+/g, ' ').trim();
    const safeLabel = label.length <= 60 && !/@|https?:\/\/|[0-9]{6,}|[A-Za-z0-9_-]{20,}|token|password|secret|cookie|email/i.test(label)
      ? label : '';
    lastClickId = ++clickSequence; lastClickAt = Date.now();
    send({ t: 'click', tag: node.tagName, label: safeLabel, id: lastClickId });
  }, true);

  if (typeof window.fetch === 'function') {
    const original = window.fetch;
    window.fetch = function(input, init) {
      const url = typeof input === 'string' || input instanceof URL ? String(input) : input && input.url;
      const m = init && init.method || input && input.method || 'GET';
      if (init && typeof init.body === 'string') inspect(init.body, url, 'out');
      const response = original.apply(this, arguments);
      // Preserve the fetch result, rejection, credentials and body untouched.
      if (!response || typeof response.then !== 'function') return response;
      return response.then(value => { record('fetch', m, url, value.status); inspectFetchResponse(value, url); return value; },
        error => { record('fetch', m, url, 0); throw error; });
    };
  }

  if (window.XMLHttpRequest && window.XMLHttpRequest.prototype) {
    const originalOpen = XMLHttpRequest.prototype.open;
    const state = new WeakMap();
    XMLHttpRequest.prototype.open = function(m, url) {
      if (!state.has(this)) this.addEventListener('loadend', () => {
        const request = state.get(this);
        if (request) {
          record('xhr', request.m, request.url, this.status);
          try {
            if (/json/i.test(this.getResponseHeader('Content-Type') || '') &&
                Number(this.getResponseHeader('Content-Length') || 0) <= MAX_JSON) {
              if (this.responseType === 'json') inspect(this.response, request.url, 'in');
              else if (!this.responseType || this.responseType === 'text') inspect(this.responseText, request.url, 'in');
            }
          } catch (_) {}
        }
      });
      state.set(this, { m, url });
      return originalOpen.apply(this, arguments);
    };
  }

  if (window.WebSocket && window.WebSocket.prototype) {
    const originalSend = WebSocket.prototype.send;
    const listening = new WeakSet();
    WebSocket.prototype.send = function(data) {
      if (!hideAuth()) {
        if (!listening.has(this)) {
          listening.add(this);
          this.addEventListener('message', event => { record('ws-rx', 'OTHER', this.url, 0); if (typeof event.data === 'string') inspect(event.data, this.url, 'in'); });
        }
        record('ws-tx', 'OTHER', this.url, 0);
        if (typeof data === 'string') inspect(data, this.url, 'out');
      }
      return originalSend.apply(this, arguments);
    };
  }
})();
