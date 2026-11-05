import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const script = fs.readFileSync(new URL('../android/app/src/main/assets/game-probe.js', import.meta.url), 'utf8');
const sent = [];
let onClick;
class Element {
  constructor(label = 'Инвентарь') { this.label = label; this.tagName = 'BUTTON'; this.textContent = label; }
  closest(selector) { return selector.startsWith('form') ? null : this; }
  matches() { return false; }
  getAttribute(name) { return name === 'aria-label' ? this.label : null; }
}
class XHR {
  constructor() { this.status = 202; }
  addEventListener(type, fn) { if (type === 'loadend') this.complete = fn; }
  open() {}
}
class WS {
  constructor(url) { this.url = url; }
  addEventListener(type, fn) { if (type === 'message') this.message = fn; }
  send() {}
}
const sandbox = {
  location: { href: 'https://idlearc.com/game', pathname: '/game', origin: 'https://idlearc.com' },
  document: {
    addEventListener(type, fn) { if (type === 'click') onClick = fn; },
    querySelectorAll() { return []; },
  },
  Element, URL, XMLHttpRequest: XHR, WebSocket: WS,
  fetch: async () => ({ status: 204 }),
  IdleArcTelemetry: { postMessage(message) { sent.push(JSON.parse(message)); } },
};
sandbox.window = sandbox;
vm.runInNewContext(script, sandbox);
onClick({ isTrusted: true, target: new Element() });
assert.deepEqual(JSON.parse(JSON.stringify(sent[0])), { t: 'click', tag: 'BUTTON', label: 'Инвентарь', id: 1 });
await sandbox.fetch('/api/player/123?token=TOPSECRET');
assert.equal(sent[1].t, 'fetch');
assert.equal(sent[1].u, 'https://idlearc.com/api/player/123');
assert.equal(sent[1].s, 204);
assert.equal(sent[1].a, 1, 'request is time-correlated with preceding click');
const xhr = new XHR(); xhr.open('POST', '/api/shop?secret=TOPSECRET'); xhr.complete();
assert.equal(sent[2].t, 'xhr');
assert.equal(sent[2].m, 'POST');
const socket = new WS('wss://idlearc.com/socket?secret=TOPSECRET');
socket.send('VERY_PRIVATE_MESSAGE'); socket.message({ data: 'PRIVATE_REPLY' });
assert.equal(sent[3].t, 'ws-tx');
assert.equal(sent[4].t, 'ws-rx');
assert.equal(JSON.stringify(sent).includes('TOPSECRET'), false);
assert.equal(JSON.stringify(sent).includes('VERY_PRIVATE_MESSAGE'), false);
assert.equal(JSON.stringify(sent).includes('PRIVATE_REPLY'), false);
sandbox.location.pathname = '/login';
onClick({ isTrusted: true, target: new Element('Войти') });
await sandbox.fetch('/api/login?token=TOPSECRET');
assert.equal(sent.length, 5, 'auth page is excluded');
console.log('Game probe click/fetch/XHR/WebSocket metadata and auth masking OK');
