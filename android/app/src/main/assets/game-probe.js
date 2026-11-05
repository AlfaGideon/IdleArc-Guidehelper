// Runs only for idlearc.com and www.idlearc.com in an origin-restricted WebView.
// Reports user-initiated control clicks and request METADATA, never request/response bodies.
(() => {
  if (window.__idleArcProbeInstalled) return;
  Object.defineProperty(window, '__idleArcProbeInstalled', { value: true });
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
      const response = original.apply(this, arguments);
      // Preserve the fetch result, rejection, credentials and body untouched.
      if (!response || typeof response.then !== 'function') return response;
      return response.then(value => { record('fetch', m, url, value.status); return value; },
        error => { record('fetch', m, url, 0); throw error; });
    };
  }

  if (window.XMLHttpRequest && window.XMLHttpRequest.prototype) {
    const originalOpen = XMLHttpRequest.prototype.open;
    const state = new WeakMap();
    XMLHttpRequest.prototype.open = function(m, url) {
      if (!state.has(this)) this.addEventListener('loadend', () => {
        const request = state.get(this);
        if (request) record('xhr', request.m, request.url, this.status);
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
          this.addEventListener('message', () => record('ws-rx', 'OTHER', this.url, 0));
        }
        // Only the fact that a message was sent, never its contents.
        record('ws-tx', 'OTHER', this.url, 0);
      }
      return originalSend.apply(this, arguments);
    };
  }
})();
