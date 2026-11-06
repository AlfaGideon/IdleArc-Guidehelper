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
  send() {}
  getResponseHeader() { return 'application/json'; }
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
  Element, URL, XMLHttpRequest: XHR, WebSocket: WS, TextDecoder, Uint8Array,
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
sandbox.location.pathname = '/game';
await sandbox.fetch('https://other.example/track?token=TOPSECRET');
assert.equal(sent.length, 5, 'external sites are not logged');
// A real readable game JSON response may expose safe, concrete item attributes.
const payload = { data: { items: [
  { name: 'Железный меч', rarity: 'rare', quantity: 2, level: 12, stats: { attack: 14 },
    token: 'TOPSECRET', ownerEmail: 'private@example.com' },
  { name: 'Щит', rarity: 'common', defense: 7 },
] } };
let responsePayload = payload;
sandbox.fetch = async () => ({ status: 200, headers: { get: () => 'application/json' },
  clone: () => ({ body: { getReader: () => {
    let done = false;
    return { async read() { if (done) return { done: true }; done = true;
      return { done: false, value: new TextEncoder().encode(JSON.stringify(responsePayload)) }; }, async cancel() {} };
  } } }) });
// The installed wrapper closes over the original fetch, so install a second sandbox for this test.
const itemSent = [];
const game = { ...sandbox, fetch: sandbox.fetch,
  IdleArcTelemetry: { postMessage(data) { itemSent.push(JSON.parse(data)); } } };
game.window = game;
delete game.__idleArcProbeInstalled;
vm.runInNewContext(script, game);
await game.fetch('/api/character/items?private=TOPSECRET');
await new Promise(resolve => setTimeout(resolve, 0));
const itemResult = itemSent.find(m => m.t === 'items');
assert.equal(itemResult.d, 'in');
assert.equal(itemResult.n, 2);
assert.equal(itemResult.list[0].name, 'Железный меч');
assert.equal(itemResult.list[0].attack, 14);
assert.equal(itemResult.list[0].qty, 2);
assert.equal(itemResult.list[1].defense, 7);
assert.equal(JSON.stringify(itemSent).includes('TOPSECRET'), false);
assert.equal(JSON.stringify(itemSent).includes('private@example.com'), false);
responsePayload = { payload: { character: { inventory: { items: Array.from({ length: 8 }, (_, i) => ({
  name: `Меч ${i + 1}`, rarity: 'rare', attributes: { strength: i + 1, dexterity: 2, critChance: 3.5 },
  accessToken: 'VERY_PRIVATE_MESSAGE', ownerEmail: 'private@example.com',
})) } } } };
await game.fetch('/api/character/items');
await new Promise(resolve => setTimeout(resolve, 0));
const nested = itemSent.filter(m => m.t === 'items').at(-1);
assert.equal(nested.n, 8);
assert.equal(nested.list.length, 6, 'journal bounds the number of item details per event');
assert.equal(nested.list[0].strength, 1);
assert.equal(nested.list[0].crit, 3.5);
assert.equal(JSON.stringify(itemSent).includes('VERY_PRIVATE_MESSAGE'), false);
responsePayload = { data: { event: { name: 'Pumpkin Event' },
  unlockedAchievement: { name: 'Goblin Hunter', eventName: 'Goblin Event', unlocked: true },
  token: 'TOPSECRET' } };
await game.fetch('/api/events/achievements');
await new Promise(resolve => setTimeout(resolve, 0));
const mismatch = itemSent.find(m => m.t === 'audit' && m.k === 'mismatch');
assert.equal(mismatch.sourceEvent, 'Pumpkin Event');
assert.equal(mismatch.event, 'Goblin Event');
assert.equal(itemSent.find(m => m.t === 'audit' && m.k === 'achievement').name, 'Goblin Hunter');
responsePayload = { data: { player: { wallet: { gold: 100, gems: 2,
  token: 'TOPSECRET', email: 'private@example.com' } } } };
await game.fetch('/api/player/balance');
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(itemSent.find(m => m.t === 'audit' && m.k === 'balance').v.gold, 100);
assert.equal(JSON.stringify(itemSent).includes('TOPSECRET'), false);
assert.equal(JSON.stringify(itemSent).includes('private@example.com'), false);
responsePayload = { data: { player: { wallet: { rubies: 100, token: 'TOPSECRET' } },
  autoInscription: { costRubies: 5, secret: 'TOPSECRET' } } };
await game.fetch('/api/player/inscription?token=TOPSECRET');
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(itemSent.some(m => m.t === 'audit' && m.k === 'balance' && m.v.rubies === 100), true);
assert.equal(itemSent.some(m => m.t === 'audit' && m.k === 'rubyPanel' && m.field === 'costRubies' && m.value === 5), true);
assert.equal(JSON.stringify(itemSent).includes('TOPSECRET'), false);
const wsItems = new WS('wss://idlearc.com/api/items');
wsItems.send(JSON.stringify({ item: { name: 'Меч', quantity: 3, secret: 'TOPSECRET' } }));
assert.equal(itemSent.filter(m => m.t === 'items').at(-1).d, 'out');
assert.equal(JSON.stringify(itemSent).includes('TOPSECRET'), false);
const before = itemSent.length;
const external = new WS('wss://other.example/api/items');
external.send(JSON.stringify(payload));
assert.equal(itemSent.length, before);
// A deliberately bounded UI runner clicks ordinary named game controls, not shops or forms.
let clicks = 0;
class BotControl extends Element {
  constructor(label, markup) { super(label); this.outerHTML = markup; this.disabled = false; }
  getClientRects() { return [1]; }
  click() { clicks++; }
}
const controls = [new BotControl('Buy', '<button>Buy</button>'),
  new BotControl('Fight', '<button>Fight</button>')];
const bot = { ...sandbox, document: { ...sandbox.document,
  querySelectorAll(selector) { return selector.includes('button') ? controls : []; } },
  IdleArcTelemetry: { postMessage() {} } };
bot.window = bot;
vm.runInNewContext(script, bot);
assert.equal(bot.__idleArcBotTick(), 'Fight');
assert.equal(clicks, 1);
assert.equal(bot.__idleArcBotTick(), null, 'rate-limit prevents rapid repeated actions');
bot.location = { href: 'https://idlearc.com/login', pathname: '/login' };
assert.equal(bot.__idleArcBotTick(), null, 'no automation on auth pages');
responsePayload = { action: 'attack', currency: 'gold', amount: 42, password: 'TOPSECRET' };
await game.fetch('/api/game/action');
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(itemSent.some(m => m.t === 'fields' && m.action === 'attack'), true,
  'unknown game route is recognized from actual allowlisted JSON fields');
await game.fetch('/api/character/reward');
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(itemSent.some(m => m.t === 'fields' && m.action === 'attack'), true);
assert.equal(itemSent.some(m => m.t === 'fields' && m.currency === 'gold' && m.amount === 42), true);
assert.equal(JSON.stringify(itemSent).includes('TOPSECRET'), false);
console.log('Game probe UI bot, bounded game fields, and auth masking OK');
