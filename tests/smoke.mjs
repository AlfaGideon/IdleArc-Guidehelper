#!/usr/bin/env node
/**
 * Смоук-тест без зависимостей: прогоняет рендер всех вкладок через DOM-шим,
 * проверяет планировщик (5 классов × 5 целей × 5 уровней), правила распределения
 * очков, +All Class Skills, капы, валидацию ручного режима и план экипировки/гемов.
 *
 * Запуск: node tests/smoke.mjs
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => path.join(ROOT, 'src', p);

/* ---------- DOM-шим ---------- */
// Строгий DOM-шим: ведёт себя как браузер там, где это важно.
// appendChild(число/строка/undefined) в браузере бросает TypeError — шим делает так же,
// иначе ошибки вида «в таблицу попало число» проходят мимо тестов (и ломают весь интерфейс).
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const HTML_IDS = [...HTML.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);

class El {
  constructor(tag) {
    this.nodeType = 1; this.tagName = String(tag).toUpperCase(); this.children = []; this.attrs = {}; this.style = {};
    this._text = ''; this._html = ''; this.dataset = {}; this.parentNode = null; this._listeners = {};
    this.classList = { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, v) { if (v === undefined) this._s.has(c) ? this._s.delete(c) : this._s.add(c); else v ? this._s.add(c) : this._s.delete(c); },
      contains(c) { return this._s.has(c); } };
  }
  appendChild(c) {
    if (typeof c === 'string') throw new Error(`appendChild получил строку «${c}» — нужен текстовый узел`);
    if (!c || typeof c !== 'object') throw new Error(`appendChild получил ${JSON.stringify(c)} (${typeof c}) — в браузере это TypeError`);
    c.parentNode = this; this.children.push(c); return c;
  }
  prepend(c) { if (!c) throw new Error('prepend получил пустое значение'); c.parentNode = this; this.children.unshift(c); return c; }
  insertBefore(c) { return this.appendChild(c); }
  setAttribute(k, v) { if (v === undefined || v === null) throw new Error(`setAttribute(${k}, ${v})`); this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); }
  dispatch(type, ev = {}) { for (const fn of this._listeners[type] || []) fn({ target: this, ...ev }); }
  querySelectorAll(sel) {
    const out = [];
    const walk = (n) => {
      for (const c of n.children || []) {
        if (sel.startsWith('#')) { if (c.attrs.id === sel.slice(1)) out.push(c); }
        else if (sel === 'button[data-tab]') { if (c.tagName === 'BUTTON' && c.attrs['data-tab']) out.push(c); }
        else if (sel.startsWith('button')) { if (c.tagName === 'BUTTON') out.push(c); }
        else if (c.tagName === sel.toUpperCase()) out.push(c);
        walk(c);
      }
    };
    walk(this);
    return out;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  closest(sel) {
    let n = this;
    while (n) {
      if (sel === 'button' && n.tagName === 'BUTTON') return n;
      if (sel.startsWith('button[') && n.tagName === 'BUTTON' && n.attrs[sel.slice(7, -1)]) return n;
      n = n.parentNode;
    }
    return null;
  }
  set className(v) { this.classList._s = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get className() { return [...this.classList._s].join(' '); }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text; }
  set innerHTML(v) { this._html = String(v); this.children = []; }
  get innerHTML() { return this._html; }
}

/** Реестр элементов из index.html: getElementById возвращает null для неизвестных id, как браузер. */
const registry = new Map();
for (const id of HTML_IDS) registry.set(id, new El(id === 'view' ? 'main' : 'div'));
for (const name of ['planner', 'calc', 'codex', 'nuances', 'nuances']) {
  const b = new El('button'); b.setAttribute('data-tab', name); b.textContent = name;
  const tabsEl = registry.get('tabs');
  if (tabsEl && !tabsEl.querySelectorAll('button[data-tab]').some((x) => x.attrs['data-tab'] === name)) tabsEl.appendChild(b);
}

const docListeners = { capture: {}, bubble: {} };
const winListeners = {};
globalThis.document = {
  createElement: (t) => new El(t),
  createTextNode: (t) => ({ nodeType: 3, textContent: String(t), children: [] }),
  getElementById: (id) => registry.get(id) || null,
  visibilityState: 'visible',
  addEventListener(type, fn, capture = false) {
    const bag = capture ? docListeners.capture : docListeners.bubble;
    (bag[type] = bag[type] || []).push(fn);
  },
  removeEventListener(type, fn, capture = false) {
    const bag = capture ? docListeners.capture : docListeners.bubble;
    bag[type] = (bag[type] || []).filter((f) => f !== fn);
  },
};
/** Событие документа: сначала фаза перехвата, потом всплытие — как в браузере. */
globalThis.__fireDoc = (type, ev = {}) => {
  for (const fn of [...(docListeners.capture[type] || [])]) fn({ type, target: null, ...ev });
  for (const fn of [...(docListeners.bubble[type] || [])]) fn({ type, target: null, ...ev });
};
globalThis.window = {
  name: '',
  location: { hash: '' },
  addEventListener(type, fn) { (winListeners[type] = winListeners[type] || []).push(fn); },
  removeEventListener(type, fn) { winListeners[type] = (winListeners[type] || []).filter((f) => f !== fn); },
};
globalThis.__fireWin = (type, ev = {}) => { for (const fn of [...(winListeners[type] || [])]) fn({ type, ...ev }); };
globalThis.location = { hash: '' };
Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: async () => {} } }, configurable: true });
globalThis.prompt = () => null;
globalThis.fetch = globalThis.fetch || (async () => { throw new Error('offline'); });
globalThis.alert = () => {};
// localStorage-шим: проверяем, что планировщик действительно сохраняет состояние в браузере.
const lsData = new Map();
globalThis.localStorage = {
  getItem: (k) => (lsData.has(k) ? lsData.get(k) : null),
  setItem: (k, v) => { lsData.set(k, String(v)); },
  removeItem: (k) => { lsData.delete(k); },
};
const ssData = new Map();
globalThis.sessionStorage = {
  getItem: (k) => (ssData.has(k) ? ssData.get(k) : null),
  setItem: (k, v) => { ssData.set(k, String(v)); },
  removeItem: (k) => { ssData.delete(k); },
};
if (!globalThis.btoa) globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
if (!globalThis.atob) globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');

/* ---------- Загрузка модулей ---------- */
let failures = 0;
const pending = [];
const check = (name, fn) => {
  try {
    const out = fn();
    if (out && typeof out.then === 'function') {
      // асинхронная проверка: дожидаемся её перед итогом
      pending.push(out.then(() => console.log(`  ok  ${name}`), (e) => { failures++; console.error(` FAIL ${name}: ${e.message}`); }));
      return null;
    }
    console.log(`  ok  ${name}`);
  } catch (e) { failures++; console.error(` FAIL ${name}: ${e.message}`); }
  return null;
};

const views = {
  planner: await import(src('ui/planner.js')),
  passives: await import(src('ui/passives.js')),
  calc: await import(src('ui/calculators.js')),
  codex: await import(src('ui/codex.js')),
  nuances: await import(src('ui/nuances.js')),
};
const classes = await import(src('data/classes.js'));
const core = await import(src('core/planner.js'));
const calc = await import(src('core/calc.js'));
const items = await import(src('data/items.js'));
const forge = await import(src('data/forge.js'));
const recmod = await import(src('core/recommend.js'));
const biomes = await import(src('data/biomes.js'));
const art = await import(src('ui/itemArt.js'));
const store = await import(src('ui/store.js'));
const artUi = await import(src('ui/art.js'));

/* ---------- Рендер ---------- */
for (const [name, view] of Object.entries(views)) {
  check(`render: ${name}`, () => {
    const root = new El('main');
    view.render(root);
    if (!root.children.length) throw new Error('пустой рендер');
  });
}

/**
 * Собрать весь текст отрисованного дерева — как это сделал бы браузер (textContent).
 * Соседние узлы склеиваются БЕЗ разделителей: подписи вида «Русское (English)» часто
 * собираются из двух узлов, и именно так они выглядят на экране.
 */
function textOf(node, acc = []) {
  if (!node || typeof node !== 'object') return acc;
  if (node.nodeType === 3) { acc.push(String(node.textContent)); return acc; }
  if (node._text) acc.push(String(node._text));
  for (const c of node.children || []) textOf(c, acc);
  return acc.join('');
}

function findByClass(node, cls, acc = []) {
  for (const c of node.children || []) {
    if (c.nodeType === 1 && String(c.className || '').split(/\s+/).includes(cls)) acc.push(c);
    findByClass(c, cls, acc);
  }
  return acc;
}

/** Идентификаторы страниц планировщика (вместо одной длинной ленты). */
const PAGE_IDS = ['class', 'levels', 'skills', 'gear', 'forge', 'gems', 'next', 'build'];

/** Отрисовать указанные страницы и вернуть их текст: { id, root, text }. */
function renderPages(ids = PAGE_IDS) {
  const st = views.planner.plannerState;
  const saved = st.page;
  const out = [];
  for (const id of ids) {
    st.page = id;
    const root = new El('main');
    views.planner.render(root);
    out.push({ id, root, text: textOf(root) });
  }
  st.page = saved;
  return out;
}

const pagesText = (ids) => renderPages(ids).map((p) => p.text).join('');

/** Все узлы, подходящие под условие (обход дерева). */
function findAll(node, pred, acc = []) {
  if (pred(node)) acc.push(node);
  for (const c of node.children || []) if (c && c.nodeType === 1) findAll(c, pred, acc);
  return acc;
}

/** Первая кнопка с указанной подписью. */
const findButton = (node, label) => findAll(node, (n) => n.tagName === 'BUTTON' && String(n.textContent || '').trim() === label)[0] || null;

/** Сколько элементов в поддереве. */
function countNodes(node) {
  let c = 1;
  for (const ch of node.children || []) if (ch && ch.nodeType === 1) c += countNodes(ch);
  return c;
}

check('страницы: планировщик разбит на отдельные экраны, а не одну длинную ленту', () => {
  const st = views.planner.plannerState;
  st.page = 'class';
  const root = new El('main');
  views.planner.render(root);
  const navs = findByClass(root, 'pagenav');
  if (navs.length !== 1) throw new Error('нет навигации по страницам');
  const btns = (navs[0].children || []).filter((c) => c.tagName === 'BUTTON');
  if (btns.length !== 8) throw new Error('страниц в навигации: ' + btns.length);
  let text = textOf(root);
  if (!text.includes('Страница 1')) throw new Error('нет заголовка первой страницы');
  if (text.includes('План действий прямо сейчас')) throw new Error('на экране видно содержимое других страниц');
  if (findByClass(root, 'forgecard').length) throw new Error('карточки Кузницы не должны рисоваться на чужой странице');
  // клик по кнопке переключает страницу и запоминается
  const forgeBtn = btns.find((b) => b.attrs['data-page'] === 'forge');
  if (!forgeBtn) throw new Error('нет кнопки страницы «Кузница»');
  forgeBtn.dispatch('click');
  text = textOf(root);
  if (!text.includes('Кузница: прогресс по слотам')) throw new Error('страница Кузницы не открылась по клику');
  if (text.includes('Экран снаряжения')) throw new Error('на странице Кузницы видно чужое содержимое');
  if (st.page !== 'forge') throw new Error('страница не запомнена в состоянии');
  const saved = JSON.parse(globalThis.localStorage.getItem('iac:helper:state:v1')).state;
  if (saved.page !== 'forge') throw new Error('страница не сохраняется в браузере');
  // «назад/далее» листают по порядку
  const foot = findByClass(root, 'pagefoot')[0];
  const nextBtn = (foot.children || []).find((c) => c.tagName === 'BUTTON' && String(c.textContent).includes('→'));
  if (!nextBtn) throw new Error('нет кнопки «далее»');
  nextBtn.dispatch('click');
  if (st.page !== 'gems') throw new Error('кнопка «далее» не переключает страницу: ' + st.page);
  st.page = 'class';
});

check('гайд: интерфейс двуязычен (Русское (English)) и все страницы отвечают', () => {
  const text = pagesText();
  for (const needle of ['Гайд: как собрать персонажа', 'Уровень персонажа', 'Monster Level (ML)', 'План действий прямо сейчас']) {
    if (!text.includes(needle)) throw new Error(`нет строки «${needle}»`);
  }

  // двуязычные подписи: русское рядом с игровым английским
  const pairs = [
    ['Могучие удары', 'Mighty Strikes'],
    ['Основная рука', 'Main Hand'],
    ['Вторая рука', 'Off Hand'],
    ['Воинский меч', 'Broken Sword'],
    ['Гранат', 'Garnet'],
    ['Необычный', 'Uncommon'],
  ];
  for (const [ru, en] of pairs) {
    if (!text.includes(ru)) throw new Error(`нет русской подписи «${ru}»`);
    if (!text.includes(en)) throw new Error(`нет английской подписи «${en}»`);
    if (!text.includes(`${ru} (${en}`) && !text.includes(`${ru} (${en})`) && !new RegExp(`${ru}\\s*${en}`).test(text)) {
      throw new Error(`нет пары «${ru} (${en})»`);
    }
  }
});

check('персонаж и Monster Level независимы', () => {
  const base = core.planBuild({ classId: 'warrior', level: 60, goal: 'progress', ml: 10 });
  const highMl = core.planBuild({ classId: 'warrior', level: 60, goal: 'progress', ml: 200 });
  const highChar = core.planBuild({ classId: 'warrior', level: 120, goal: 'progress', ml: 10 });

  // ML меняет предметы/камни/сокеты, но не очки навыков
  if (base.points.available !== highMl.points.available) throw new Error('ML не должен влиять на классовые очки');
  if (highMl.itemTier.tier <= base.itemTier.tier) throw new Error('с ростом ML тир предметов должен расти');
  if (highMl.sockets.count <= base.sockets.count) throw new Error('с ростом ML должно быть больше сокетов');
  if (base.gemRarity.id === highMl.gemRarity.id) throw new Error('с ростом ML должна меняться доступная редкость гемов');
  if (JSON.stringify(base.allocations) !== JSON.stringify(highMl.allocations)) throw new Error('ML не должен менять распределение очков');
  if (base.gear.slots.find((s) => s.slot === 'torch').primary) throw new Error('Torch не должен появляться раньше ML 50');
  if (!highMl.gear.slots.find((s) => s.slot === 'torch').primary) throw new Error('после ML 50 Torch должен быть в слоте');

  // Уровень персонажа меняет очки, но не предметы
  if (highChar.points.available <= base.points.available) throw new Error('уровень персонажа должен давать больше очков');
  if (highChar.itemTier.tier !== base.itemTier.tier) throw new Error('уровень персонажа не должен менять тир предметов');
  if (highChar.sockets.count !== base.sockets.count) throw new Error('уровень персонажа не должен менять сокеты');
  if (highChar.gear.slots.find((s) => s.slot === 'mainhand').primary.name !== base.gear.slots.find((s) => s.slot === 'mainhand').primary.name) {
    throw new Error('уровень персонажа не должен менять доступное оружие');
  }
  if (core.nextPointLevel(30) !== 31 || core.nextPointLevel(31) !== 34) throw new Error('nextPointLevel считает неверно');
});

check('двуручное оружие и Torch появляются по ML, а не по уровню персонажа', () => {
  const low = core.planBuild({ classId: 'warrior', level: 900, goal: 'boss', ml: 10 });
  const enough = core.planBuild({ classId: 'warrior', level: 1, goal: 'boss', ml: 60 });
  if (low.gear.slots.find((s) => s.slot === 'mainhand').primary.hand === '2H') throw new Error('двуручка не должна предлагаться до ML 25');
  if (enough.gear.slots.find((s) => s.slot === 'mainhand').primary.hand !== '2H') throw new Error('на ML 60 босс-билд должен советовать двуручку');
});

check('каждая страница на своём месте: навыки, снаряжение, Кузница, камни, чек-лист', () => {
  const pages = renderPages();
  const by = Object.fromEntries(pages.map((p) => [p.id, p.text]));
  const need = (id, needle) => { if (!by[id].includes(needle)) throw new Error(`на странице «${id}» нет «${needle}»`); };
  need('skills', 'Классовые навыки — распределение');
  need('skills', 'Почему очки распределены именно так');
  need('skills', '+All Class Skills');
  need('skills', 'Итоговые бонусы от навыков');
  need('gear', 'Экран снаряжения');
  need('gear', 'Что надеть: рекомендация системы по каждому слоту');
  need('gear', 'Картинки предметов');
  need('gear', 'Имплисит');
  need('forge', 'Кузница: прогресс по слотам');
  need('forge', 'Что качать первым');
  need('forge', 'Слоты: тир, «+N» и цена следующего шага');
  need('forge', 'Кузница поднимает слот выше тира предмета');
  need('forge', 'Сколько стоит прокачать тир целиком');
  need('gems', 'Гемы: какой камень куда ставить');
  need('gems', 'Когда менять основной камень');
  need('gems', 'Другие камни сюда');
  need('gems', 'Вторичные статы камней');
  need('next', 'План действий прямо сейчас');
  need('build', 'Обмен сборкой');
  need('build', 'Сохранение: данные не теряются при перезагрузке');
  // Кузница не должна дублироваться на странице снаряжения
  if (by.gear.includes('Кузница: прогресс по слотам')) throw new Error('Кузница снова показана в двух местах');
  // слоты экипировки перечислены на странице снаряжения
  for (const slot of ['Факел', 'Шлем', 'Амулет', 'Оружие', 'Нагрудник', 'Кольцо 1', 'Кольцо 2', 'Пояс', 'Перчатки', 'Обувь', 'Талисман 1', 'Талисман 2']) {
    if (!by.gear.includes(slot)) throw new Error(`в блоке снаряжения нет слота «${slot}»`);
  }
});

check('планировщик: рендерится для всех 5 классов × 5 целей × 3 уровней (все страницы)', () => {
  const st = views.planner.plannerState;
  const problems = [];
  for (const cls of classes.CLASSES) {
    for (const goal of ['progress', 'farm', 'boss', 'pets', 'retaliation']) {
      for (const lvl of [1, 45, 200]) {
        try {
          st.classId = cls.id; st.goal = goal; st.level = lvl; st.ml = lvl; st.plusAll = 3; st.manual = null; st.mode = 'auto';
          const pages = renderPages();
          const by = Object.fromEntries(pages.map((p) => [p.id, p.text]));
          if (!by.gear.includes('Экран снаряжения')) problems.push(`${cls.id}/${goal}/${lvl}: нет экрана снаряжения`);
          if (!by.forge.includes('Кузница: прогресс по слотам')) problems.push(`${cls.id}/${goal}/${lvl}: нет страницы Кузницы`);
          if (!by.gems.includes('система советует')) problems.push(`${cls.id}/${goal}/${lvl}: нет рекомендации камня`);
          if (!by.skills.includes('Классовые навыки')) problems.push(`${cls.id}/${goal}/${lvl}: нет распределения навыков`);
        } catch (e) {
          problems.push(`${cls.id}/${goal}/${lvl}: ${e.message}`);
        }
      }
    }
  }
  st.classId = 'warrior'; st.goal = 'progress'; st.level = 30; st.ml = 30; st.plusAll = 0; st.manual = null; st.mode = 'auto'; st.page = 'class';
  if (problems.length) throw new Error(problems.slice(0, 3).join(' | '));
});



// Реальная точка входа: рендерит в #view из index.html. Клики по вкладкам идут через делегирование на #tabs.
try {
  const mod = await import(src('app.js') + '?smoke=2');
  if (!mod) throw new Error('app.js не загрузился');
  const view = registry.get('view');
  if (!view.children.length) throw new Error('#view пуст — планировщик не отрисовался при старте');
  if (!registry.get('meta-build').textContent) throw new Error('метка сборки не проставлена');
  for (const btn of registry.get('tabs').querySelectorAll('button[data-tab]')) {
    view.children = [];
    registry.get('tabs').dispatch('click', { target: btn });
    if (!view.children.length) throw new Error(`вкладка ${btn.attrs['data-tab']} не отрендерилась`);
  }
  console.log('  ok  app.js: старт + переключение всех вкладок');
} catch (e) {
  failures++;
  console.error(` FAIL app.js: ${e.message}`);
}

/* ---------- Планировщик ---------- */
check('планировщик: 5 классов × 5 целей × 5 уровней, очки сходятся', () => {
  for (const g of ['progress', 'farm', 'boss', 'pets', 'retaliation']) {
    for (const cls of classes.CLASSES) {
      for (const lvl of [1, 10, 30, 60, 100]) {
        const plan = core.planBuild({ classId: cls.id, level: lvl, goal: g, plusAll: 2 });
        if (plan.points.spent + plan.points.left !== plan.points.available) throw new Error(`очки не сходятся: ${cls.id}/${g}/${lvl}`);
        if (plan.points.spent > plan.points.available) throw new Error(`вложено больше доступного: ${cls.id}/${g}/${lvl}`);
        if (!core.planToText(plan).includes('IdleArc')) throw new Error('экспорт текста сломан');
      }
    }
  }
});

check('распределение использует все три ветки (при достаточном числе очков)', () => {
  const problems = [];
  for (const g of ['progress', 'farm', 'boss', 'pets', 'retaliation']) {
    for (const cls of classes.CLASSES) {
      for (const lvl of [7, 15, 30, 60, 100]) {
        const plan = core.planBuild({ classId: cls.id, level: lvl, goal: g });
        const used = Object.values(plan.branches).filter((b) => b.spent > 0).length;
        if (used < Math.min(3, cls.branches.length)) problems.push(`${cls.id}/${g}/${lvl}: ${used} ветки`);
      }
    }
  }
  if (problems.length) throw new Error('ветки не задействованы: ' + problems.slice(0, 4).join('; '));
});

check('цель меняет распределение (а не одну и ту же ветку)', () => {
  const diffs = [];
  for (const cls of classes.CLASSES) {
    const progress = core.planBuild({ classId: cls.id, level: 60, goal: 'progress' });
    const farm = core.planBuild({ classId: cls.id, level: 60, goal: 'farm' });
    const same = JSON.stringify(progress.allocations) === JSON.stringify(farm.allocations);
    if (same) diffs.push(cls.id);
  }
  if (diffs.length) throw new Error('цель не влияет на распределение у: ' + diffs.join(', '));
});

check('+All Class Skills поднимает ранги, но не пробивает капы', () => {
  const plan = core.planBuild({ classId: 'warrior', level: 60, goal: 'boss', plusAll: 5 });
  if (plan.bonuses.plusAll !== undefined && plan.bonuses.plusAll !== 5) throw new Error('plusAll не сохранён');
  if (plan.gained.length === 0) throw new Error('+All не дал ни одного прироста');
  for (const s of plan.skillList) {
    for (const k of s.capped) {
      const cap = s.cap[k];
      if (s.effect[k] > cap + 1e-9) throw new Error(`кап пробит: ${s.name}/${k}`);
    }
    if (s.effRank !== s.points + 5) throw new Error(`неверный эффективный ранг ${s.name}`);
  }
  const baseAd = plan.bonusesWithoutPlus.ad || 0;
  if (!(plan.bonuses.ad >= baseAd)) throw new Error('+All не должен уменьшать бонусы');
});

check('+All не открывает Tier 2/3 (гейты по вложенным очкам)', () => {
  const plan = core.planBuild({ classId: 'warrior', level: 30, goal: 'progress', plusAll: 15, manual: { w_culling: 1 } });
  if (plan.branches.Might.tier2) throw new Error('Tier 2 открылся не по очкам');
  if (plan.branches.Might.needTier2 !== 4) throw new Error('неверный счётчик до Tier 2');
});

check('ручное распределение валидируется: максимум, тиры, требования', () => {
  const bad = core.planBuild({
    classId: 'rogue', level: 30, goal: 'boss', plusAll: 0,
    manual: { r_coup: 5, r_cascade: 4, r_sharpened: 99 },
  });
  const reasons = bad.validation.problems.map((p) => p.reason).join(' | ');
  if (!/Больше максимума/.test(reasons)) throw new Error('не поймано превышение максимума навыка');
  if (!/Нужно 5 очков|Требуется навык/.test(reasons)) throw new Error('не пойманы требования тиров/зависимостей');
});

check('план экипировки: 10 слотов с семейством, аффиксами, Drop Bonus и гемом', () => {
  for (const [cls, goal] of [['archer', 'pets'], ['warrior', 'progress'], ['mage', 'boss'], ['rogue', 'farm'], ['druid', 'pets']]) {
    const plan = core.planBuild({ classId: cls, level: 200, goal });
    if (plan.gear.slots.length !== 10) throw new Error(`${cls}: слотов ${plan.gear.slots.length}`);
    for (const s of plan.gear.slots) {
      if (s.slot !== 'offhand' && !s.primary) throw new Error(`${cls}: слот ${s.slot} без семейства`);
      if (!s.gem || !s.gem.family) throw new Error(`${cls}: слот ${s.slot} без гема`);
      if (!s.gem.baseValue && s.gem.region !== 'weapon') throw new Error(`${cls}: слот ${s.slot} без описания гема`);
    }
  }
});

check('гемы соответствуют слоту (Lapis/Beast Crown у пет-билда и т.д.)', () => {
  const pets = core.planBuild({ classId: 'archer', level: 200, goal: 'pets' });
  const main = pets.gear.slots.find((s) => s.slot === 'mainhand');
  if (main.gem.family.id !== 'jade') throw new Error('пет-билд: оружие должно советовать Jade');
  const head = pets.gear.slots.find((s) => s.slot === 'head');
  if (head.primary.id !== 'beast_crown') throw new Error('пет-билд: шлем должен советовать Beast Crown');

  const boss = core.planBuild({ classId: 'warrior', level: 200, goal: 'boss' });
  const weapon = boss.gear.slots.find((s) => s.slot === 'mainhand');
  if (weapon.gem.family.id !== 'garnet') throw new Error('AD-билд: оружие должно советовать Garnet');
  const hands = boss.gear.slots.find((s) => s.slot === 'hands');
  if (hands.primary.id !== 'slayer_gauntlets') throw new Error('босс-билд: перчатки должны советовать Slayer Gauntlets');
});

check('каталог предметов: 40 семейств, у каждого 6 значений имплисита и аффиксы', () => {
  if (items.GEAR_FAMILIES.length !== 40) throw new Error(`семейств ${items.GEAR_FAMILIES.length}, ожидалось 40`);
  for (const f of items.GEAR_FAMILIES) {
    if (f.implicitTiers.length !== 6) throw new Error(`${f.id}: ${f.implicitTiers.length} значений имплисита`);
    if (f.tierNames.length < 1) throw new Error(`${f.id}: нет имён тиров`);
    if (!(f.prefixes || []).length || !(f.suffixes || []).length) throw new Error(`${f.id}: нет аффиксов`);
    if (!items.SLOT_ORDER.includes(f.slot)) throw new Error(`${f.id}: неизвестный слот ${f.slot}`);
  }
  const perSlot = items.SLOT_ORDER.map((s) => items.familiesForSlot(s).length);
  if (perSlot.some((n) => n === 0)) throw new Error('есть пустые слоты: ' + items.SLOT_ORDER.filter((s, i) => perSlot[i] === 0).join(', '));
});

/**
 * Эталон ветки/тира/макс. ранга: 90 классовых навыков (5 классов × 3 ветки × 6 навыков).
 * Сверено 2026-10-04 с официальным сайтом (idlearc.com/classes — тиры, ранги, правила открытия),
 * патч-нотами 1.3.1 (Season 2: Counterstrike вместо Victory Rush, Defense у Iron Constitution /
 * Battle Recovery / Crushing Blows, ослабление крит-навыков Rogue) и данными текущего билда
 * (IdleArc Companion, skill_tree_data.json — сборка 2026-09-29), включая Druid.
 * Если игра изменит тиры или максимальные ранги — падает этот тест, а не пользователь.
 */
const SKILL_GROUND_TRUTH = {
  warrior: [
    ['Culling Strike', 'Might', 1, 5], ['Iron Constitution', 'Might', 1, 10],
    ['Battle Recovery', 'Might', 2, 5], ['Bloodthirst', 'Might', 2, 5],
    ['Executioner', 'Might', 3, 5], ['Counterstrike', 'Might', 3, 5],
    ['Mighty Strikes', 'Strength', 1, 10], ['Battle Focus', 'Strength', 1, 5],
    ['Crushing Blows', 'Strength', 2, 5], ["Titan's Grip", 'Strength', 2, 5],
    ['Overwhelm', 'Strength', 3, 5], ['Titanic Blow', 'Strength', 3, 5],
    ['Berserk', 'Finesse', 1, 10], ['Spoils of War', 'Finesse', 1, 5],
    ['Keen Edge', 'Finesse', 2, 5], ['Deflection', 'Finesse', 2, 5],
    ['Lethal Blow', 'Finesse', 3, 5], ['Relentless Assault', 'Finesse', 3, 5],
  ],
  archer: [
    ['Archery', 'Marksmanship', 1, 10], ['Steady Aim', 'Marksmanship', 1, 10],
    ['Precision', 'Marksmanship', 2, 5], ['Double Nock', 'Marksmanship', 2, 5],
    ['Headshot', 'Marksmanship', 3, 5], ['Perfect Shot', 'Marksmanship', 3, 5],
    ['Spike Trap', 'Hunting', 1, 10], ['Barbed Arrows', 'Hunting', 1, 5],
    ['Venomous Trap', 'Hunting', 2, 5], ['Trap Mastery', 'Hunting', 2, 5],
    ["Hunter's Mark", 'Hunting', 3, 5], ["Hunter's Instinct", 'Hunting', 3, 5],
    ['Beast Bond', 'Beastmaster', 1, 5], ['Egg Hunter', 'Beastmaster', 1, 5],
    ['Pack Leader', 'Beastmaster', 2, 5], ['Foraging Companion', 'Beastmaster', 2, 5],
    ['Strong Pet Bound', 'Beastmaster', 3, 5], ['Alpha Strike', 'Beastmaster', 3, 5],
  ],
  mage: [
    ['Magic Blast', 'Arcane', 1, 10], ['Arcane Siphon', 'Arcane', 1, 5],
    ['Arcane Surge', 'Arcane', 2, 5], ['Unstable Energy', 'Arcane', 2, 5],
    ['Spell Mastery', 'Arcane', 3, 5], ['Arcane Cascade', 'Arcane', 3, 5],
    ['Fire Infusion', 'Destruction', 1, 10], ['Combustion', 'Destruction', 1, 5],
    ['Burning Soul', 'Destruction', 2, 5], ['Melting Point', 'Destruction', 2, 5],
    ['Inferno', 'Destruction', 3, 5], ['Pyroclasm', 'Destruction', 3, 5],
    ['Wild Magic', 'Chaos', 1, 10], ["Fortune's Favor", 'Chaos', 1, 5],
    ['Chaos Bolt', 'Chaos', 2, 5], ['Soul Harvest', 'Chaos', 2, 5],
    ['Reality Warp', 'Chaos', 3, 5], ['Chaos Incarnate', 'Chaos', 3, 5],
  ],
  rogue: [
    ['Precision Strikes', 'Assassin', 1, 5], ['Sharpened Blades', 'Assassin', 1, 5],
    ['First Strike', 'Assassin', 2, 5], ['Contract Killer', 'Assassin', 2, 5],
    ['Deadly Ambush', 'Assassin', 3, 5], ['Coup de Grâce', 'Assassin', 3, 10],
    ['Swift Blades', 'Shadow-walker', 1, 5], ['Umbral Blades', 'Shadow-walker', 1, 5],
    ['Shadow Echo', 'Shadow-walker', 2, 5], ['Phantom Strike', 'Shadow-walker', 2, 5],
    ['Echo Mastery', 'Shadow-walker', 3, 10], ['Umbral Cascade', 'Shadow-walker', 3, 10],
    ['Scavenger', 'Thief', 1, 5], ['Pickpocket', 'Thief', 1, 5],
    ['Lucky Hands', 'Thief', 2, 5], ['Treasure Hunter', 'Thief', 2, 5],
    ['Black Market', 'Thief', 3, 5], ['Master Thief', 'Thief', 3, 5],
  ],
  druid: [
    ['Gnaw', 'Lodge', 1, 10], ['Thick Pelt', 'Lodge', 1, 5],
    ['Dam Builder', 'Lodge', 2, 5], ['Timberfall', 'Lodge', 2, 5],
    ['Tail Slap', 'Lodge', 3, 5], ['Lodgekeeper', 'Lodge', 3, 5],
    ['Digger', 'Tunnels', 1, 10], ['Keen Snout', 'Tunnels', 1, 5],
    ['Hoard', 'Tunnels', 2, 5], ['Earthbind', 'Tunnels', 2, 5],
    ['Undermine', 'Tunnels', 3, 5], ['Deep Roots', 'Tunnels', 3, 5],
    ['Kinship', 'Symbiosis', 1, 10], ['Shared Instinct', 'Symbiosis', 1, 5],
    ['Feral Bond', 'Symbiosis', 2, 5], ['Twin Heart', 'Symbiosis', 2, 5],
    ['Wild Attunement', 'Symbiosis', 3, 5], ['One Soul', 'Symbiosis', 3, 5],
  ],
};

check('навыки: ветка, тир и макс. ранг каждого из 90 навыков совпадают с игрой', () => {
  if (classes.CLASSES.length !== 5) throw new Error(`классов ${classes.CLASSES.length}`);
  for (const cls of classes.CLASSES) {
    const truth = SKILL_GROUND_TRUTH[cls.id];
    if (!truth) throw new Error(`${cls.id}: нет эталонной таблицы`);
    if (cls.skills.length !== truth.length) throw new Error(`${cls.id}: навыков ${cls.skills.length}, в эталоне ${truth.length}`);
    for (const [name, branch, tier, max] of truth) {
      const s = cls.skills.find((x) => x.name === name);
      if (!s) throw new Error(`${cls.id}: нет навыка «${name}»`);
      if (s.branch !== branch) throw new Error(`${cls.id}/${name}: ветка ${s.branch}, ожидалась ${branch}`);
      if (s.tier !== tier) throw new Error(`${cls.id}/${name}: тир ${s.tier}, ожидался ${tier}`);
      if (s.max !== max) throw new Error(`${cls.id}/${name}: макс. ранг ${s.max}, ожидался ${max}`);
      if (!Number.isInteger(s.max) || s.max % 5 !== 0) throw new Error(`${cls.id}/${name}: нестандартный макс. ранг ${s.max}`);
    }
    // в каждой ветке ровно по 6 навыков: 2 на тир, и по 2 навыка на каждый тир
    for (const b of cls.branches) {
      const inBranch = cls.skills.filter((s) => s.branch === b);
      if (inBranch.length !== 6) throw new Error(`${cls.id}/${b}: навыков ${inBranch.length}, ожидалось 6`);
      for (const t of [1, 2, 3]) {
        const inTier = inBranch.filter((s) => s.tier === t);
        if (inTier.length !== 2) throw new Error(`${cls.id}/${b}/Tier ${t}: навыков ${inTier.length}, ожидалось 2`);
      }
    }
  }
});

check('навыки: у всех есть значения за очко, текст с подстановками и нет выдуманных «оценок»', () => {
  for (const cls of classes.CLASSES) {
    for (const s of cls.skills) {
      if (s.estimated) throw new Error(`${cls.id}/${s.name}: помечен как «оценка», хотя данные есть в игре`);
      const keys = Object.keys(s.perPoint || {});
      if (!keys.length) throw new Error(`${cls.id}/${s.name}: пустой perPoint`);
      if (!s.ru || !/^[А-Яа-яЁё]/.test(s.ru)) throw new Error(`${cls.id}/${s.name}: нет русского названия`);
      const holes = [...String(s.text || '').matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      if (!holes.length) throw new Error(`${cls.id}/${s.name}: текст без подстановок`);
      for (const k of holes) if (!keys.includes(k)) throw new Error(`${cls.id}/${s.name}: подстановка {${k}} без значения в perPoint`);
      for (const k of keys) if (s.cap?.[k] != null && !(s.cap[k] > 0)) throw new Error(`${cls.id}/${s.name}: некорректный кап ${k}`);
    }
  }
});

check('таблица навыков в шаге 3 сгруппирована по тирам и показывает максимумы', () => {
  views.planner.plannerState.page = 'skills';
  const root = new El('main');
  views.planner.render(root);
  const text = textOf(root);
  for (const needle of ['Tier 1 · доступно сразу', 'открывается после 5 очков в этой же ветке', 'открывается после 10 очков в этой же ветке',
    'макс. ранг 10 очк.', 'макс. ранг 5 очк.', 'максимум в ветке', 'максимум в тире']) {
    if (!text.includes(needle)) throw new Error(`в таблице навыков нет «${needle}»`);
  }
  // названия навыков идут вместе со своими тирами
  for (const [ru, en, tier] of [['Добивающий удар', 'Culling Strike', 1], ['Палач', 'Executioner', 3], ['Титанический удар', 'Titanic Blow', 3]]) {
    const idx = text.indexOf(`${ru} (${en})`);
    if (idx === -1) throw new Error(`нет навыка «${ru} (${en})»`);
    const around = text.slice(Math.max(0, idx - 400), idx);
    if (!around.includes(`Tier ${tier}`)) throw new Error(`${ru} (${en}) не под заголовком Tier ${tier}`);
  }
});

check('таблица навыков: каждый навык стоит под своим тиром и со своим максимумом (все 5 классов)', () => {
  views.planner.plannerState.page = 'skills';
  const st = views.planner.plannerState;
  for (const cls of classes.CLASSES) {
    st.classId = cls.id; st.goal = 'progress'; st.level = 60; st.ml = 60; st.plusAll = 0; st.manual = null; st.mode = 'auto';
    const root = new El('main');
    views.planner.render(root);
    let total = 0;
    // Сканируем только карточки веток (div.branch): там таблица навыков с заголовками Tier 1/2/3.
    for (const box of root.querySelectorAll('div')) {
      if (!String(box.className).split(/\s+/).includes('branch')) continue;
      if (!textOf(box).includes('макс. ранг')) continue; // только таблица классовых навыков, не блоки экипировки
      let tier = 0;
      let seen = 0;
      for (const tr of box.querySelectorAll('tr')) {
        const txt = textOf(tr);
        const head = txt.match(/^Tier ([123])/);
        if (head) { tier = Number(head[1]); continue; }
        const own = txt.match(/^T([123])/);   // строка навыка начинается со своего бейджа T1/T2/T3
        if (!own || !txt.includes('макс. ранг')) continue;
        const rowTier = Number(own[1]);
        const skill = cls.skills.find((s) => s.tier === rowTier && txt.includes(`${s.ru || s.name} (${s.name})`));
        if (!skill) throw new Error(`${cls.id}: не удалось сопоставить строку «${txt.slice(0, 60)}…» навыку`);
        seen += 1;
        if (rowTier !== tier) throw new Error(`${cls.id}/${skill.name}: строка стоит под заголовком Tier ${tier}, а сам навык — Tier ${rowTier}`);
        if (!txt.includes(`макс. ранг ${skill.max} очк.`)) throw new Error(`${cls.id}/${skill.name}: в строке нет «макс. ранг ${skill.max} очк.»`);
      }
      if (seen !== 6) throw new Error(`${cls.id}: в ветке ${seen} строк навыков, ожидалось 6`);
      total += seen;
    }
    if (total !== 18) throw new Error(`${cls.id}: в таблице ${total} навыков, ожидалось 18`);
  }
  st.classId = 'warrior'; st.goal = 'progress'; st.level = 30; st.ml = 30; st.plusAll = 0; st.manual = null; st.mode = 'auto';
});

check('данные и интерфейс не ссылаются на «внешние источники» как на способ получить цифры', () => {
  const bad = ['внешними источниками', 'не подтверждён внешними', 'unverified'];
  const files = ['src/data/classes.js', 'src/data/builds.js', 'src/ui/planner.js', 'src/ui/codex.js', 'src/ui/nuances.js', 'src/core/planner.js'];
  for (const f of files) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const phrase of bad) if (text.includes(phrase)) throw new Error(`${f}: найдено «${phrase}»`);
  }
});

check('метка сборки и точка входа: index.html без query-строк и со страховкой от пустой страницы', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const systems = fs.readFileSync(path.join(ROOT, 'src/data/systems.js'), 'utf8');
  const build = systems.match(/build:\s*'([^']+)'/)?.[1];
  if (!build) throw new Error('DATA_META.build не найден');
  if (!html.includes('<meta name="build" content="' + build + '"')) throw new Error('meta build в index.html не совпадает с DATA_META.build');
  if (html.includes('?v=')) throw new Error('в index.html остались query-строки (?v=) — за прокси они ненадёжны');
  if (!/<script type="module"[^>]*src="src\/app\.js"/.test(html)) throw new Error('нет статического подключения src/app.js');
  if (!html.includes('id="boot-error"') || !html.includes('__boot')) throw new Error('нет страховочного блока на случай, если модули не загрузились');
  if (!html.includes('id="reload-btn"')) throw new Error('в index.html нет кнопки «Обновить»');

  // app.js не должен использовать top-level await и динамические import() с query — именно это ломало запуск
  const app = fs.readFileSync(path.join(ROOT, 'src/app.js'), 'utf8');
  if (/await\s+import\(/.test(app)) throw new Error('в app.js вернулся top-level await import()');
  if (/import\([^)]*\+/.test(app)) throw new Error('в app.js динамический import со склейкой строк');
  if (!/window\.__boot\) window\.__boot\.ready = true/.test(app)) throw new Error('app.js не сообщает страховке о готовности');

  // сервер обязан отдавать версионированные пути и подставлять сборку в HTML
  const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  if (!server.includes('stripVersion')) throw new Error('в server.js нет поддержки версионированных путей /v/<сборка>/');
  if (!server.includes('htmlWithVersionedEntry')) throw new Error('server.js не подставляет версию в index.html');
});

/* ---------- Код сборки ---------- */
check('код сборки кодируется и декодируется вместе с ручным распределением', () => {
  const plan = core.planBuild({ classId: 'rogue', level: 45, goal: 'farm', ml: 90 });
  const code = core.encodePlan(plan, 3);
  const back = core.decodePlan(code);
  if (back.classId !== 'rogue' || back.level !== 45 || back.ml !== 90 || back.goal !== 'farm' || back.plusAll !== 3) throw new Error('round-trip не совпал');

  // старые коды (v2 без ML) должны читаться: ML = уровень персонажа
  const legacy = Buffer.from(JSON.stringify({ v: 2, c: 'mage', l: 30, g: 'boss', p: 0, a: {} })).toString('base64').replace(/=+$/, '');
  const old = core.decodePlan(legacy);
  if (old.ml !== 30) throw new Error('старый код без ML не читается');
  if (JSON.stringify(back.allocations) !== JSON.stringify(plan.allocations)) throw new Error('распределение потерялось');
});

/* ---------- Формулы ---------- */
check('крит >100% конвертируется в Crit Damage 1:1', () => {
  const m = calc.critModel(150, 100);
  if (m.effectiveCritDamage !== 150 || m.effectiveChance !== 100) throw new Error('неверная конверсия');
});

check('Double Hit / Double Damage: «полные сотни»', () => {
  const dh = calc.doubleHitModel(250);
  if (dh.guaranteed !== 2 || Math.abs(dh.chance - 50) > 1e-9) throw new Error('DH модель');
  const dd = calc.doubleDamageModel(250);
  if (dd.guaranteedSteps !== 2 || Math.abs(dd.chanceForNext - 50) > 1e-9) throw new Error('DD модель');
});

check('Damage Reduction: софт-кап 95% → 10% эффективности', () => {
  const dr = calc.drModel(99);
  if (Math.abs(dr.effective - 95.4) > 1e-6) throw new Error(`eff=${dr.effective}`);
  if (calc.drModel(0).taken !== 1) throw new Error('без DR должен проходить весь урон');
  if (calc.drModel(100).taken < 0.01) throw new Error('минимум 1% удара должен проходить');
});

check('Retaliation = Reflecting% × Defense (+0.5/Strength)', () => {
  const r = calc.retaliationModel(1000, 20, { strength: 100 });
  if (Math.abs(r.perAttack - 210) > 1e-9) throw new Error(`perAttack=${r.perAttack}`);
  const blocked = calc.retaliationModel(1000, 20, { strength: 100, blocked: true });
  if (Math.abs(blocked.hit - 315) > 1e-9) throw new Error('блок должен давать +50%');
});

check('формула гема и компоунд петов', () => {
  const v = calc.gemValue(0.5, 4.0, 90, 8);
  if (Math.abs(v - 2.376) > 1e-9) throw new Error(`v=${v}`);
  if (calc.petCompoundEffective(30, 5, 'seasonal') !== 15) throw new Error('seasonal должен давать +10 к слабейшему');
  if (calc.petCompoundEffective(30, 5, 'permanent') !== 30) throw new Error('permanent +25');
  if (calc.masteryShards(10) !== 1650) throw new Error('стоимость Mastery');
});

/* ---------- Кузница, экран персонажа, картинки, сохранение ---------- */

/** Найти узлы по классу (querySelectorAll в шиме умеет только id/теги). */

check('Кузница: шаги, фрагменты и шансы совпадают с данными Item Codex', () => {
  const eq = (a, b, what) => { if (Math.abs(a - b) > 1e-9) throw new Error(`${what}: ${a} != ${b}`); };
  eq(forge.forgeStep(1, 0).gold, 290, 'T1 +1 золото');
  eq(forge.forgeStep(1, 3).gold, 560, 'T1 +4 золото');
  eq(forge.forgeCumulative(1, 4).gold, 1700, 'T1 всего золото');
  eq(forge.forgeCumulative(1, 4).fragments, 10, 'T1 всего фрагменты');
  eq(forge.forgeCumulative(2, 9).gold, 35100, 'T2 всего золото');
  eq(forge.forgeStep(3, 13).gold, 51100, 'T3 +14 золото');
  eq(forge.forgeCumulative(3, 14).gold, 428750, 'T3 всего золото');
  eq(forge.forgeCumulative(3, 14).fragments, 84, 'T3 всего фрагменты');
  eq(forge.forgeStep(4, 18).gold, 382000, 'T4 +19 золото');
  eq(forge.forgeCumulative(4, 19).gold, 4180000, 'T4 всего золото');
  eq(forge.forgeCumulative(4, 19).fragments, 190, 'T4 всего фрагменты');
  eq(forge.forgeCumulative(5, 24).gold, 31800000, 'T5 всего золото');
  eq(forge.forgeCumulative(5, 24).fragments, 456, 'T5 всего фрагменты');
  eq(forge.forgeCumulative(6, 30).gold, 287100000, 'T6 всего золото');
  eq(forge.forgeCumulative(6, 30).fragments, 1170, 'T6 всего фрагменты');
  eq(forge.forgeStep(6, 0).fragments, 3, 'T6 +1 фрагменты');
  eq(forge.forgeStep(3, 0).fail, 0.05, 'T3 +1 шанс провала');
  eq(forge.forgeStep(5, 19).fail, 0.415, 'T5 +20 шанс провала');
  eq(forge.forgeStep(6, 19).fail, 0.465, 'T6 +20 шанс провала');
  eq(forge.forgeStep(6, 29).fail, 0.85, 'T6 +30 кап провала');
  eq(forge.forgeStep(1, 0).fail, 0, 'T1 без провалов');
  if (forge.forgeTierInfo(4).affixSlots !== 3) throw new Error('аффикс-слоты T4');
});

check('Кузница: ранг слота 0…100 объединяет все тиры', () => {
  const eq = (a, b, what) => { if (a !== b) throw new Error(`${what}: ${a} != ${b}`); };
  eq(forge.forgeRank(1, 4).rank, 4, 'ранг T1 +4');
  eq(forge.forgeRank(2, 0).rank, 4, 'ранг T2 +0');
  eq(forge.forgeRank(4, 19).rank, 46, 'ранг T4 +19');
  eq(forge.forgeRank(5, 24).rank, 70, 'ранг T5 +24');
  eq(forge.forgeRank(6, 30).rank, 100, 'ранг T6 +30');
  const back = forge.rankToForge(46);
  if (back.tier !== 4 || back.level !== 19) throw new Error('rankToForge(46)');
  if (forge.FORGE_MAX_RANK !== 100) throw new Error('FORGE_MAX_RANK');
});

check('экран снаряжения: силуэт 3+3+3+4 ячейки, как в игровом окне', () => {
  if (items.GEAR_CELLS.length !== 13) throw new Error('ячеек ' + items.GEAR_CELLS.length);
  const rows = [1, 2, 3, 4].map((r) => items.GEAR_CELLS.filter((c) => c.row === r));
  const shape = rows.map((r) => r.length).join('+');
  if (shape !== '3+3+3+4') throw new Error('форма силуэта: ' + shape);
  // как на игровом экране: сверху факел, шлем и амулет; ниже оружие, нагрудник и вторая рука
  const top = rows[0].map((c) => c.id).join(',');
  if (top !== 'torch,head,amulet') throw new Error('верхний ряд: ' + top);
  const mid = rows[1].map((c) => c.id).join(',');
  if (mid !== 'mainhand,chest,hand2') throw new Error('второй ряд: ' + mid);
  const low = rows[2].map((c) => c.id).join(',');
  if (low !== 'ring1,belt,ring2') throw new Error('третий ряд: ' + low);
  const last = rows[3].map((c) => c.id).join(',');
  if (last !== 'talisman1,hands,feet,talisman2') throw new Error('нижний ряд: ' + last);
  for (const need of ['torch', 'amulet', 'hand2', 'mainhand', 'chest', 'ring1', 'ring2', 'belt', 'head', 'hands', 'feet', 'talisman1', 'talisman2']) {
    if (!items.GEAR_CELLS.some((c) => c.id === need)) throw new Error('нет ячейки ' + need);
  }
  // вторая рука зависит от класса: щит/книга/колчан, второе оружие у разбойника, двуручное у друида
  if (items.CLASS_GEAR_RULES.warrior.hand2 !== 'offhand') throw new Error('у воина вторая рука — оффхенд');
  if (items.CLASS_GEAR_RULES.rogue.hand2 !== 'weapon2') throw new Error('у разбойника второе оружие');
  if (items.CLASS_GEAR_RULES.druid.hand2 !== 'twohanded' || !items.CLASS_GEAR_RULES.druid.locked.hand2) throw new Error('у друида вторая рука занята двуручным');
  for (const k of ['offhand', 'weapon2', 'twohanded']) if (!items.HAND2_LABELS[k]) throw new Error('нет подписи ' + k);
  if (items.SLOT_GEM_COUNT.torch !== 4 || items.SLOT_GEM_COUNT.mainhand !== 3 || items.SLOT_GEM_COUNT.ring !== 1) throw new Error('камни по слотам');
});

check('экран снаряжения: силуэт человека нарисован под ячейками и строки как в игре', () => {
  views.planner.plannerState.page = 'gear';
  const root = new El('main');
  views.planner.render(root);
  const dolls = findByClass(root, 'gear-doll');
  if (dolls.length !== 1) throw new Error('сеток снаряжения: ' + dolls.length);
  const figures = findByClass(root, 'doll-figure');
  if (figures.length !== 1) throw new Error('нет силуэта человека');
  if (!String(figures[0].innerHTML).includes('<svg')) throw new Error('силуэт без рисунка');
  const cards = findByClass(root, 'flipcard');
  const small = cards.filter((c) => String(c.className).includes('small'));
  if (cards.length !== 13) throw new Error('карточек ' + cards.length);
  if (small.length !== 4) throw new Error('в нижней строке должно быть 4 ячейки, а не ' + small.length);
  const text = textOf(root);
  for (const needle of ['Талисман 1 (Talisman 1)', 'Талисман 2 (Talisman 2)', 'Вторая рука (Off Hand)']) {
    if (!text.includes(needle)) throw new Error(`нет подписи «${needle}»`);
  }
});

check('карточки предметов: картинка + переворот на статы', () => {
  views.planner.plannerState.page = 'gear';
  const root = new El('main');
  views.planner.render(root);
  const cards = findByClass(root, 'flipcard');
  if (cards.length !== 13) throw new Error('карточек ' + cards.length);
  const faces = findByClass(root, 'face');
  if (faces.length !== 26) throw new Error('сторон карточек ' + faces.length);
  const arts = findByClass(root, 'art');
  if (arts.length !== 13) throw new Error('картинок ' + arts.length);
  // в ячейке либо нарисованная SVG-иконка, либо настоящая картинка <img>
  for (const a of arts) {
    const hasSvg = (a.children || []).some((c) => String(c.innerHTML || '').includes('<svg'));
    const hasImg = (a.children || []).some((c) => String(c.tagName) === 'IMG');
    if (!hasSvg && !hasImg) throw new Error('в ячейке нет ни картинки, ни рисунка');
  }
  cards[0].dispatch('click');
  if (!cards[0].classList.contains('flipped')) throw new Error('карточка не переворачивается по клику');
  cards[0].dispatch('click');
  if (cards[0].classList.contains('flipped')) throw new Error('карточка не возвращается обратно');
  const text = textOf(root);
  for (const needle of ['Шаг Кузницы:', 'камней:', 'Картинки предметов', 'Что надеть: рекомендация системы по каждому слоту']) {
    if (!text.includes(needle)) throw new Error(`нет строки «${needle}»`);
  }
  // выборы тира, «+N», Awaken и цены шагов живут на странице Кузницы
  const forgeText = renderPages(['forge'])[0].text;
  for (const needle of ['Awaken', 'Следующий шаг', 'Что качать первым', 'успех']) {
    if (!forgeText.includes(needle)) throw new Error(`нет строки «${needle}» на странице Кузницы`);
  }
});

check('картинки предметов: рисуются для всех 40 семейств и всех 6 тиров', () => {
  if (items.GEAR_FAMILIES.length !== 40) throw new Error('семейств ' + items.GEAR_FAMILIES.length);
  for (const f of items.GEAR_FAMILIES) {
    if (!art.knownShape(f.id)) throw new Error('нет фигуры для ' + f.id);
    for (let t = 1; t <= 6; t += 1) {
      const svg = art.itemArt(f, t);
      if (!svg.startsWith('<svg') || !svg.includes('</svg>')) throw new Error(`битая иконка ${f.id} T${t}`);
    }
  }
  const lock = art.lockArt(4);
  if (!lock.includes('<svg')) throw new Error('нет иконки закрытой ячейки');
});

check('сохранение в браузере: состояние пишется и восстанавливается', () => {
  const st = views.planner.plannerState;
  st.classId = 'rogue'; st.level = 77; st.ml = 123; st.goal = 'farm'; st.plusAll = 7; st.extraPoints = 3; st.manual = null; st.mode = 'auto';
  st.page = 'gear';
  const root = new El('main');
  views.planner.render(root);
  const pages = renderPages();
  const buildText = pages.find((p) => p.id === 'build').text;
  const raw = globalThis.localStorage.getItem('iac:helper:state:v1');
  if (!raw) throw new Error('состояние не сохранено в localStorage');
  const saved = JSON.parse(raw);
  if (saved.state.classId !== 'rogue' || saved.state.ml !== 123 || saved.state.level !== 77) throw new Error('в сохранении не те значения');
  if (!Array.isArray(Object.keys(saved.state.gear))) { /* gear должен быть объектом */ }
  if (typeof saved.state.gear !== 'object' || saved.state.gear === null) throw new Error('экипировка не попала в сохранение');
  if (!saved.state.gear.rogue || !saved.state.gear.rogue.mainhand) throw new Error('состояние слотов не сохраняется');
  const at = store.saveLoadout('Набор 1', saved.state);
  if (!at) throw new Error('набор не сохранился');
  const back = store.getLoadout('Набор 1');
  if (!back || back.classId !== 'rogue' || back.ml !== 123) throw new Error('набор не читается');
  const again = store.loadState();
  if (!again || again.ml !== 123 || again.classId !== 'rogue') throw new Error('loadState не вернул сохранённое');
  if (!buildText.includes('Сохранение: данные не теряются при перезагрузке')) throw new Error('нет блока сохранения');
  if (!buildText.includes('Набор 1') || !buildText.includes('Набор 2')) throw new Error('нет наборов');
  // страница тоже восстанавливается после перезагрузки
  const again2 = store.loadState();
  if (again2.page !== 'build') throw new Error('страница не восстанавливается: ' + again2.page);
  // вернуть стенд в исходное состояние и почистить хранилище
  st.classId = 'warrior'; st.level = 30; st.ml = 30; st.goal = 'progress'; st.plusAll = 0; st.extraPoints = 0; st.manual = null; st.mode = 'auto'; st.page = 'class';
  store.clearState();
});

check('разворот карточки: стороны непрозрачные, отражённый текст не просвечивает', () => {
  const css = fs.readFileSync(path.join(ROOT, 'styles', 'app.css'), 'utf8');
  const face = css.slice(css.indexOf('.flipcard .face {'), css.indexOf('.flipcard .art {'));
  const bg = (face.match(/background:\s*([^;]+);/) || [])[1] || '';
  if (/rgba\(|transparent/.test(bg)) throw new Error('фон стороны карточки полупрозрачный: ' + bg);
  if (!/(#|var\(--bg)/.test(bg)) throw new Error('у стороны карточки нет непрозрачного фона: ' + bg);
  if (!/backface-visibility:\s*hidden/.test(face)) throw new Error('нет backface-visibility: hidden');
  if (!/\.flipcard\.flipped \.face\.front \{ visibility: hidden/.test(css)) throw new Error('лицевая сторона не скрывается при развороте');
  if (!/\.flipcard:not\(\.flipped\) \.face\.back \{ visibility: hidden/.test(css)) throw new Error('обратная сторона не скрывается до разворота');
  const flip = css.slice(css.indexOf('.flipcard .inner {')); 
  if (!/preserve-3d/.test(flip)) throw new Error('нет preserve-3d');
});

check('картинки предметов: игровые, если доступны, иначе нарисованные', () => {
  const st = artUi.artState;
  // без интернета карта иконок недоступна — рисуем сами
  if (st.index) throw new Error('в офлайне карта иконок не должна загрузиться');
  const src = artUi.artSrc('Broken Sword', 3, 0);
  if (src !== null) throw new Error('без карты иконок адрес картинки должен быть пустым');
  const fam = items.familyById('gnarled_stick');
  const node = artUi.artNode(fam, 5, 0);
  if (node.tagName !== 'SPAN' || !String(node.innerHTML).includes('<svg')) throw new Error('нет запасной нарисованной иконки');
  // а с картой — берём игровой файл
  st.mode = 'local'; st.index = { 'Gnarled Stick': { tiers: { 5: 'runed-stick.webp' }, awakens: { 1: 'ancient-grove-stick.webp' } } };
  const url = artUi.artSrc('Gnarled Stick', 5, 0);
  if (url !== 'assets/items/runed-stick.webp') throw new Error('адрес иконки: ' + url);
  const aw = artUi.artSrc('Gnarled Stick', 5, 1);
  if (aw !== 'assets/items/ancient-grove-stick.webp') throw new Error('Awaken-иконка: ' + aw);
  const img = artUi.artNode(fam, 5, 0);
  if (img.tagName !== 'IMG' || img.attrs.src !== 'assets/items/runed-stick.webp') throw new Error('картинка не подставилась');
  st.mode = 'cdn';
  if (artUi.artSrc('Gnarled Stick', 5, 0) !== 'https://idlearc-companion-web-production.up.railway.app/static/images/items/runed-stick.webp') throw new Error('адрес CDN');
  st.mode = 'none'; st.index = null;
});

check('сервер: маршруты статуса и загрузки игровых иконок объявлены', () => {
  const srv = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  for (const needle of ['/api/art/status', '/api/art/fetch', 'art-core.mjs']) {
    if (!srv.includes(needle)) throw new Error('нет ' + needle);
  }
  const core = fs.readFileSync(path.join(ROOT, 'scripts', 'art-core.mjs'), 'utf8');
  for (const needle of ['collectImages', 'downloadArt', 'buildIndex', 'artStatus']) {
    const ok = core.includes(`export function ${needle}`) || core.includes(`export async function ${needle}`);
    if (!ok) throw new Error('art-core: нет ' + needle);
  }
  const script = fs.readFileSync(path.join(ROOT, 'scripts', 'fetch-art.mjs'), 'utf8');
  if (!script.includes('downloadArt')) throw new Error('скрипт загрузки не использует art-core');
});

check('локальный запуск на ПК: start.bat (Windows) и scripts/serve.mjs', () => {
  const bat = fs.readFileSync(path.join(ROOT, 'start.bat'), 'utf8');
  // cmd.exe требует CRLF и не переваривает UTF-8 BOM в начале файла.
  if (bat.charCodeAt(0) === 0xfeff) throw new Error('start.bat начинается с BOM — cmd сломается');
  if (/\n/.test(bat.replace(/\r\n/g, ''))) throw new Error('в start.bat есть строки без CRLF');
  // Кириллица допустима только в тексте (echo/rem/title): в самих командах cmd её может исказить.
  const risky = bat.split('\r\n').find((line) => {
    const t = line.trim().toLowerCase();
    if (!t || t.startsWith('rem') || t.startsWith('echo') || t.startsWith('title')) return false;
    return /[^\x00-\x7F]/.test(line);
  });
  if (risky) throw new Error('кириллица в команде start.bat (cmd её не поймёт): ' + risky.trim());
  for (const needle of ['chcp 65001', 'serve.mjs', 'pause', 'nodejs.org', '%~1']) {
    if (!bat.includes(needle)) throw new Error('в start.bat нет ' + needle);
  }

  // Лаунчер: сам выбирает свободный порт, ждёт готовности и открывает браузер.
  // По умолчанию поднимает хаб «две стороны» (hub-server.js, 8080); --arc возвращает
  // классический запуск server.js (5173) — оба режима проверяются здесь.
  const serve = fs.readFileSync(path.join(ROOT, 'scripts', 'serve.mjs'), 'utf8');
  for (const needle of ['/api/build', '--no-open', '--lan', '--arc', 'MIN_NODE_MAJOR', 'isPortFree', 'openBrowser', 'server.js', 'hub-server.js', 'DEFAULT_HUB_PORT']) {
    if (!serve.includes(needle)) throw new Error('serve.mjs: нет ' + needle);
  }

  // Сервер хаба: отдаёт метку сборки с флагом hub (лаунчер отличает его от
  // одиночного server.js), проксирует /arc/* и /api/* на сторону A и умеет
  // пережить уже запущенный на 5173 старый сервер (переиспользование вместо копии).
  const hub = fs.readFileSync(path.join(ROOT, 'hub', 'hub-server.js'), 'utf8');
  for (const needle of ['/api/build', 'hub: true', 'ARC_PORT', '/arc/', '/api/', 'startArcChild', 'HOST']) {
    if (!hub.includes(needle)) throw new Error('hub-server.js: нет ' + needle);
  }
  // Иначе bat-файл после клонирования получит LF и перестанет запускаться на Windows.
  const attrs = fs.readFileSync(path.join(ROOT, '.gitattributes'), 'utf8');
  if (!/\*\.bat\s+text\s+eol=crlf/.test(attrs)) throw new Error('.gitattributes не закрепляет CRLF для *.bat');
});

check('загрузка иконок через браузер: скачивает codex, картинки и отправляет на сервер', async () => {
  const realFetch = globalThis.fetch;
  const calls = { uploads: [] };
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('item_codex_data.json')) {
      return { ok: true, json: async () => ({ item_variants: { 'Torch': { tiers: { 1: { image: 'static/images/items/torch.webp' }, 2: { image: 'static/images/items/torch-2.webp' } }, awakens: { 1: { image: 'static/images/items/torch-7.webp' } } } } }) };
    }
    if (u.includes('api/art/upload')) {
      const body = JSON.parse(opts.body);
      calls.uploads.push(Object.keys(body.files));
      return { ok: true, json: async () => ({ ok: true, saved: Object.keys(body.files) }) };
    }
    if (u.includes('/static/images/items/')) {
      const bytes = new Uint8Array(400).fill(9);
      return { ok: true, arrayBuffer: async () => bytes.buffer };
    }
    return { ok: false, status: 404, json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) };
  };
  try {
    const out = await artUi.downloadArtViaBrowser(() => {});
    if (!out.ok || out.saved !== 3) throw new Error(`скачано: ${JSON.stringify(out)}`);
    const flat = calls.uploads.flat().sort();
    if (flat.join(',') !== 'torch-2.webp,torch-7.webp,torch.webp') throw new Error('отправлены не те файлы: ' + flat);
    if (!artUi.artDownload.note.includes('3')) throw new Error('нет отчёта о прогрессе');
  } finally {
    globalThis.fetch = realFetch;
    artUi.artDownload.active = false; artUi.artDownload.note = '';
  }
});

check('Кузница: карточки слотов с полосами прогресса, шагами и ценами', () => {
  const st = views.planner.plannerState;
  st.classId = 'warrior'; st.page = 'forge'; st.gear = {};
  const root = new El('main');
  views.planner.render(root);
  const cards = findByClass(root, 'forgecard');
  if (cards.length !== 11) throw new Error('карточек Кузницы: ' + cards.length); // у воина 11 слотов (без второго оружия)
  const bars = findByClass(root, 'pbar');
  if (bars.length !== cards.length * 2) throw new Error('полос прогресса: ' + bars.length);
  for (const card of cards) {
    const selects = findAll(card, (n) => n.tagName === 'SELECT');
    if (selects.length !== 4) throw new Error('в карточке слота должно быть 4 выбора (предмет, тир, +N, Awaken), а не ' + selects.length);
    if (!findButton(card, '+1') || !findButton(card, 'макс')) throw new Error('нет кнопок шага');
  }
  const advice = findByClass(root, 'advice')[0];
  if (!advice || (advice.children || []).length < 3) throw new Error('советник «что качать первым» пуст');
});

check('Кузница: кнопки двигают шаги слота, «макс» открывает промоушен тира', () => {
  const st = views.planner.plannerState;
  st.classId = 'warrior'; st.page = 'forge'; st.gear = {};
  const root = new El('main');
  views.planner.render(root);
  const torch = st.gear.warrior.torch;
  // ручной выбор тира — как если бы игрок выставил слот сам (иначе система подставит рекомендацию)
  torch.manual = true; torch.tier = 2; torch.level = 0;
  views.planner.render(root);
  const card = findByClass(root, 'forgecard')[0];
  const plus = findButton(card, '+1');
  if (!plus) throw new Error('нет кнопки +1');
  plus.dispatch('click');
  if (torch.level !== 1) throw new Error('шаг +1 не применился: ' + torch.level);
  const card2 = findByClass(root, 'forgecard')[0];
  if (!textOf(card2).includes('+1')) throw new Error('карточка не показала новый шаг');
  const maxBtn = findButton(card2, 'макс');
  maxBtn.dispatch('click');
  if (torch.level !== 9) throw new Error('«макс» не выставил уровень тира: ' + torch.level);
  // на максимуме тира появляется промоушен и кнопка поднятия тира
  const card3 = findByClass(root, 'forgecard')[0];
  if (!textOf(card3).includes('Промоушен')) throw new Error('нет подсказки про промоушен');
  const promote = findButton(card3, 'Поднять тир → T3');
  if (!promote) throw new Error('нет кнопки поднятия тира');
  promote.dispatch('click');
  if (torch.tier !== 3) throw new Error('тир не поднялся: ' + torch.tier);
  st.page = 'class'; st.gear = {}; st.classId = 'warrior';
});

check('страницы: на экране одна страница, а не вся лента целиком (скорость)', () => {
  const st = views.planner.plannerState;
  st.classId = 'warrior'; st.manual = null; st.mode = 'auto'; st.gear = {};
  const counts = {};
  let total = 0;
  for (const id of PAGE_IDS) {
    st.page = id;
    const root = new El('main');
    views.planner.render(root);
    counts[id] = countNodes(root);
    total += counts[id];
  }
  const biggest = Math.max(...Object.values(counts));
  if (biggest > 1250) throw new Error('страница слишком тяжёлая: ' + biggest + ' узлов');
  if (total < biggest * 2.5) throw new Error('страницы не разделены: всего ' + total + ', максимум ' + biggest);
  // на каждой странице есть своя навигация и переходы
  st.page = 'gems';
  const root = new El('main');
  views.planner.render(root);
  if (findByClass(root, 'pagenav').length !== 1) throw new Error('нет навигации');
  if (findByClass(root, 'pagefoot').length !== 1) throw new Error('нет переходов назад/далее');
  st.page = 'class';
});

check('сохранение: плашка «сохранено» видна на каждой странице и показывает канал', () => {
  const st = views.planner.plannerState;
  for (const id of PAGE_IDS) {
    st.page = id;
    const root = new El('main');
    views.planner.render(root);
    const chip = findAll(root, (n) => n.attrs && n.attrs.id === 'save-chip')[0];
    if (!chip) throw new Error(`нет плашки сохранения на странице «${id}»`);
    const text = String(chip.textContent);
    if (!text.includes('сохранено') && !text.includes('ещё не сохранялось')) throw new Error('плашка без времени: ' + text);
    if (!text.includes('в браузере') && !text.includes('до перезагрузки')) throw new Error('плашка без канала: ' + text);
  }
  st.page = 'class';
});

check('запуск: приложение стартует, даже если доступ к хранилищу браузера запрещён', () => {
  // Реальная среда пользователя: обращение к window.localStorage бросает SecurityError
  // (приватный режим или страница внутри iframe без доступа к хранилищу). Приложение
  // обязано запуститься и продолжать сохранять состояние через резервный канал.
  const child = `
Object.defineProperty(globalThis, 'localStorage', { get() { throw new Error('SecurityError: storage disabled'); }, configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { get() { throw new Error('SecurityError: storage disabled'); }, configurable: true });
class El { constructor(t){this.nodeType=1;this.tagName=String(t).toUpperCase();this.children=[];this.attrs={};this.style={};this._text='';this._html='';this.classList={_s:new Set(),add(){},remove(){},toggle(){},contains(){return false}};}
  appendChild(c){c.parentNode=this;this.children.push(c);return c;} prepend(c){c.parentNode=this;this.children.unshift(c);return c;} insertBefore(c){return this.appendChild(c)}
  setAttribute(k,v){this.attrs[k]=String(v)} getAttribute(k){return this.attrs[k]??null}
  addEventListener(t,f){(this._listeners=this._listeners||{})[t]=(this._listeners[t]||[]).concat(f)} dispatch(t){for(const f of (this._listeners||{})[t]||[])f({target:this})}
  querySelectorAll(){return []} querySelector(){return null} closest(){return null}
  set className(v){this.classList._s=new Set(String(v).split(/\\s+/).filter(Boolean))} get className(){return [...this.classList._s].join(' ')}
  set textContent(v){this._text=String(v);this.children=[]} get textContent(){return this._text}
  set innerHTML(v){this._html=String(v);this.children=[]} get innerHTML(){return this._html} }
globalThis.document={createElement:(t)=>new El(t),createTextNode:(t)=>({nodeType:3,textContent:String(t)}),getElementById:()=>null,visibilityState:'visible',addEventListener(){},removeEventListener(){}};
globalThis.window={name:'',location:{hash:''},addEventListener(){},removeEventListener(){}};
const planner = await import(${JSON.stringify(src('ui/planner.js'))});
const store = await import(${JSON.stringify(src('ui/store.js'))});
planner.render(new El('main'));
store.markTouched();
store.saveState({ classId: 'rogue', ml: 5 }, { allowOverwrite: true });
const back = store.loadState();
if (!back || back.classId !== 'rogue') { console.log('НЕТ ВОССТАНОВЛЕНИЯ'); process.exit(2); }
console.log('OK ' + store.saveInfo.note);
process.exit(0);
`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iac-boot-'));
  const file = path.join(dir, 'boot.mjs');
  fs.writeFileSync(file, child, 'utf8');
  try {
    const out = execFileSync(process.execPath, [file], { encoding: 'utf8', timeout: 30000 });
    if (!out.includes('OK')) throw new Error('неожиданный вывод: ' + out.trim());
    if (!out.includes('резервный канал') && !out.includes('окне браузера')) throw new Error('сохранение ушло не в резервный канал: ' + out.trim());
  } catch (e) {
    throw new Error('приложение упало при запрете хранилища: ' + (e.stdout || e.message));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

check('рекомендация: система сама выбирает предмет в каждый слот (без ручного выбора)', () => {
  const st = views.planner.plannerState;
  st.classId = 'warrior'; st.goal = 'progress'; st.level = 60; st.ml = 120; st.gear = {}; st.page = 'gear';
  const root = new El('main');
  views.planner.render(root);
  const cls = st.gear.warrior;
  for (const cell of items.GEAR_CELLS) {
    const entry = cls[cell.id];
    if (!entry) throw new Error(`нет слота «${cell.id}»`);
    if (cell.slot === 'talisman') {
      if (!entry.talisman) throw new Error('талисман не выбран системой');
      continue;
    }
    if (!entry.family) throw new Error(`в слоту «${cell.id}» система не выбрала предмет`);
    if (entry.manual) throw new Error('слот помечен ручным, хотя система должна предложить свой вариант');
  }
  // на карточках есть пометка «рекомендовано» и таблица «что надеть» на 13 строк
  const text = textOf(root);
  if (!text.includes('Готовая сборка под цель')) throw new Error('нет сводки сборки');
  if (!text.includes('рекомендовано')) throw new Error('нет пометок «рекомендовано»');
  const tables = findByClass(root, 'scroll').map((t) => t.children[0]).filter((t) => t && t.tagName === 'TABLE');
  const bigTable = tables.find((t) => {
    const head = (t.children[0] || {}).children || [];
    const first = head[0] || {};
    return ((first.children || [])[0] || {}).textContent === 'Ячейка';
  });
  if (!bigTable) throw new Error('нет таблицы рекомендаций «Ячейка …»');
  const rows = (bigTable.children[1] || { children: [] }).children || [];
  if (rows.length !== 13) throw new Error('в таблице рекомендаций строк: ' + rows.length);
  // в каждой строке есть «Почему именно он» с объяснением
  for (const row of rows) {
    const cells = row.children || [];
    const why = cells[3] ? textOf(cells[3]) : '';
    if (why.trim().length < 20) throw new Error('нет объяснения в строке слота: ' + why);
  }
});

check('рекомендация: сборка честно отличается по цели (предметы и камни)', () => {
  const rec = recmod.recommendBuild;
  const pick = (goal) => {
    const r = rec('warrior', goal, { level: 60, ml: 120 });
    return {
      chest: r.cells.chest.family.name,
      head: r.cells.head.family.name,
      feet: r.cells.feet.family.name,
      gem: r.gemPlan.weapon.family.name,
      order: r.forgeOrder.map((x) => x.slotRu).join('>'),
    };
  };
  const p = pick('progress'); const f = pick('farm'); const b = pick('boss'); const pets = pick('pets');
  if (f.chest === p.chest && f.head === p.head) throw new Error('фарм-сборка не отличается от прогресса по броне');
  if (b.feet === p.feet) throw new Error('босс-сборка не отличается по обуви');
  if (f.gem === p.gem) throw new Error('фарм должен брать Amber, а прогресс — Garnet');
  if (pets.gem !== 'Jade') throw new Error('пет-билд должен брать Jade (урон пета), а не ' + pets.gem);
  if (p.order === f.order) throw new Error('порядок Кузницы должен отличаться по целям');

  // друид: посох с пет-уроном и отдельное объяснение
  const d = rec('druid', 'pets', { level: 60, ml: 120 });
  if (d.cells.mainhand.family.name !== 'Gnarled Stick') throw new Error('друиду нужен Gnarled Stick');
  if (!d.cells.mainhand.why.join(' ').includes('Pet Damage')) throw new Error('нет объяснения про пет-урон у посоха');
  // у разбоя во второй руке — второе оружие, у друида её нет
  const rogue = rec('rogue', 'progress', { level: 60, ml: 120 });
  if (!rogue.cells.hand2.family || rogue.cells.hand2.slot !== 'offhand') throw new Error('разбойнику нужна вторая рука с оружием');
  if (d.cells.hand2.family) throw new Error('у друида вторая рука должна быть пустой');
});

check('рекомендация: любую правку можно вернуть к варианту системы', () => {
  const st = views.planner.plannerState;
  st.classId = 'warrior'; st.goal = 'progress'; st.level = 60; st.ml = 120; st.gear = {}; st.page = 'forge';
  const root = new El('main');
  views.planner.render(root);
  const torch = st.gear.warrior.torch;
  const systemFamily = torch.family;
  if (!systemFamily) throw new Error('система не подставила факел');
  // выбираем другой предмет руками
  const card = findByClass(root, 'forgecard')[0];
  const select = findAll(card, (n) => n.tagName === 'SELECT')[0];
  select.value = 'sage_diadem';
  select.dispatch('change');
  if (!torch.manual) throw new Error('ручная правка не помечена');
  if (torch.family !== 'sage_diadem') throw new Error('правка не применилась');
  // меняем цель: ручной слот остаётся, остальные пересобираются системой
  st.goal = 'farm';
  views.planner.render(root);
  if (torch.family !== 'sage_diadem') throw new Error('ручной выбор потерялся при смене цели');
  // кнопка «↺ как рекомендовано» возвращает вариант системы
  const card2 = findByClass(root, 'forgecard')[0];
  const back = findButton(card2, '↺ как рекомендовано');
  if (!back) throw new Error('нет кнопки возврата к рекомендации');
  back.dispatch('click');
  if (torch.manual) throw new Error('кнопка не сняла ручной режим');
  if (torch.family === 'sage_diadem' && systemFamily === 'sage_diadem') throw new Error('нечего было возвращать');
  if (torch.family !== systemFamily) throw new Error('не вернулся системный предмет: ' + torch.family);
  st.goal = 'progress'; st.gear = {}; st.page = 'class';
});

check('готовая сборка: список из 13 строк и текст для копирования', () => {
  const st = views.planner.plannerState;
  st.classId = 'druid'; st.goal = 'pets'; st.level = 60; st.ml = 120; st.gear = {}; st.page = 'build';
  const root = new El('main');
  views.planner.render(root);
  const text = textOf(root);
  if (!text.includes('Готовая сборка: что надеть и какие камни')) throw new Error('нет блока готовой сборки');
  const list = findByClass(root, 'buylist')[0];
  if (!list) throw new Error('нет списка сборки');
  const rows = (list.children || []).filter((c) => c.tagName === 'DIV');
  if (rows.length !== 13) throw new Error('строк в готовой сборке: ' + rows.length);
  for (const cell of items.GEAR_CELLS) {
    if (!text.includes(`${cell.ru} (${cell.en})`)) throw new Error(`в готовой сборке нет слота «${cell.ru}»`);
  }
  if (!text.includes('Gnarled Stick')) throw new Error('в сборке друида нет посоха');
  if (!text.includes('Ярость') && !text.includes('Дух')) throw new Error('в сборке нет талисманов');
  if (!findButton(root, 'Скопировать сборку целиком')) throw new Error('нет кнопки копирования сборки');
  st.classId = 'warrior'; st.goal = 'progress'; st.level = 30; st.ml = 30; st.gear = {}; st.page = 'class';
});

check('сохранение: мгновенная запись, восстановление, резервные каналы и копия', async () => {
  const st = views.planner.plannerState;
  const pause = (ms) => new Promise((r) => globalThis.setTimeout(r, ms));
  const reset = () => { lsData.clear(); ssData.clear(); globalThis.window.name = ''; };
  const stored = () => {
    const raw = globalThis.localStorage.getItem('iac:helper:state:v1');
    return raw ? JSON.parse(raw) : null;
  };

  // 1. Клик по классу сохраняется сразу, без захода на страницу «Сборка».
  reset();
  store.markTouched();
  st.page = 'class'; st.classId = 'warrior'; st.ml = 30; st.level = 30;
  const root = new El('main');
  views.planner.render(root);
  const classButtons = findAll(root, (n) => n.tagName === 'BUTTON' && textOf(n).includes('Разбойник'));
  if (!classButtons.length) throw new Error('на странице класса нет кнопки разбойника');
  classButtons[0].dispatch('click');
  const afterClick = stored();
  if (!afterClick || afterClick.state.classId !== 'rogue') throw new Error('клик по классу не сохранился сразу');

  // 2. Любое событие документа (клик мышью, ввод) — тоже сохранение.
  const savedMatches = (field, hint) => {
    const at = stored();
    if (!at || at.state[field] !== st[field]) throw new Error(`${hint}: в сохранении ${at && at.state[field]}, в состоянии ${st[field]}`);
  };
  st.ml = 456;
  globalThis.__fireDoc('click');
  await pause(5);
  savedMatches('ml', 'действие документа не сохранилось');
  st.level = 111;
  globalThis.__fireDoc('input');
  await pause(5);
  savedMatches('level', 'ввод не сохранился');

  // 3. Уход со страницы и скрытие вкладки — синхронное сохранение.
  st.plusAll = 4;
  globalThis.__fireWin('pagehide');
  savedMatches('plusAll', 'pagehide не сохранил состояние');
  st.goal = 'boss';
  globalThis.document.visibilityState = 'hidden';
  globalThis.__fireDoc('visibilitychange');
  globalThis.document.visibilityState = 'visible';
  savedMatches('goal', 'скрытие вкладки не сохранило состояние');
  if (!store.saveInfo.durable) throw new Error('данные должны считаться надёжно сохранёнными: ' + store.saveInfo.note);

  // 4. Снимок пишется в начале отрисовки: сбой рендера данные не теряет.
  st.ml = 777;
  let crashed = false;
  try { views.planner.render(null); } catch { crashed = true; }
  if (!crashed) throw new Error('тест ожидал падение отрисовки');
  if (stored().state.ml !== 777) throw new Error('снимок не записан до отрисовки');

  // 5. localStorage почистили — данные поднимаются из резервных каналов.
  reset();
  store.saveState({
    classId: 'druid', level: 88, ml: 99, goal: 'farm', plusAll: 2, extraPoints: 0,
    mode: 'auto', manual: null, gear: {}, page: 'forge', shareCode: '',
  }, { allowOverwrite: true });
  if (!ssData.has('iac:helper:state:v1')) throw new Error('sessionStorage не заполняется');
  if (!String(globalThis.window.name).startsWith('iac-helper:')) throw new Error('резервный канал окна не заполняется');
  lsData.clear();
  const restored = store.loadState();
  if (!restored || restored.classId !== 'druid' || restored.ml !== 99) throw new Error('данные потерялись после очистки localStorage');
  // самый свежий снимок побеждает: старый в localStorage не должен перебивать новый
  lsData.set('iac:helper:state:v1', JSON.stringify({ v: 1, savedAt: '2001-01-01T00:00:00.000Z', state: { classId: 'warrior', level: 1, ml: 1 } }));
  if (store.loadState().classId !== 'druid') throw new Error('выбран не самый свежий снимок');

  // 6. Хранилище запрещено полностью (приватный режим, iframe) — работает резерв окна.
  const blocked = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
    removeItem: () => { throw new Error('blocked'); },
  };
  const realLs = globalThis.localStorage; const realSs = globalThis.sessionStorage;
  globalThis.localStorage = blocked; globalThis.sessionStorage = blocked;
  try {
    store.saveState({
      classId: 'mage', level: 5, ml: 7, goal: 'progress', plusAll: 1, extraPoints: 0,
      mode: 'auto', manual: null, gear: {}, page: 'class', shareCode: '',
    }, { allowOverwrite: true });
    const back = store.loadState();
    if (!back || back.classId !== 'mage') throw new Error('при запрете хранилища данные не восстановились');
    if (store.saveInfo.durable !== true) throw new Error('резервный канал окна должен считаться надёжным');
  } finally {
    globalThis.localStorage = realLs; globalThis.sessionStorage = realSs;
  }

  // 7. Перед перезаписью остаётся предыдущая версия (кнопка «вернуть»).
  reset();
  store.saveState({
    classId: 'warrior', level: 10, ml: 10, goal: 'progress', plusAll: 0, extraPoints: 0,
    mode: 'auto', manual: null, gear: {}, page: 'class', shareCode: '',
  }, { allowOverwrite: true });
  store.saveState({
    classId: 'rogue', level: 60, ml: 70, goal: 'boss', plusAll: 3, extraPoints: 1,
    mode: 'manual', manual: { x: 1 }, gear: {}, page: 'skills', shareCode: '',
  }, { allowOverwrite: true });
  const backup = store.loadBackupRecord();
  if (!backup || backup.state.classId !== 'warrior') throw new Error('предыдущая версия не сохранена');
  if (store.loadState().classId !== 'rogue') throw new Error('текущий снимок испорчен');

  // 8. Если снимок есть, но прочитать его нельзя — он не перезаписывается молча.
  reset();
  lsData.set('iac:helper:state:v1', '{это не json');
  if (!store.hasStoredState()) throw new Error('битый снимок должен считаться имеющимся');

  // стенд возвращаем в исходное состояние
  reset();
  store.clearState();
  st.classId = 'warrior'; st.level = 30; st.ml = 30; st.goal = 'progress'; st.plusAll = 0; st.extraPoints = 0;
  st.manual = null; st.mode = 'auto'; st.page = 'class'; st.gear = {};
  views.planner.render(new El('main'));
});

check('украшения: система не навязывает «воинскую» линию — считает по атрибутам под цель', () => {
  const rec = recmod.recommendBuild;
  // друид в пет-билде: воинские украшения не подходят — Ловкость даёт урон пета
  const d = rec('druid', 'pets', { level: 80, ml: 200 });
  const belt = d.cells.belt.family.id;
  const ring = d.cells.ring1.family.id;
  const amulet = d.cells.amulet.family.id;
  if (belt === 'warriors_belt') throw new Error('друиду не нужен Пояс воина: там нет урона пета');
  if (!['scholars_belt'].includes(belt)) throw new Error('для пет-билда ожидается Пояс учёного (все атрибуты), а не ' + belt);
  if (ring === 'warriors_ring' || amulet === 'warriors_amulet') throw new Error('кольцо/амулет воина не подходят пет-билду');
  if (!ring.startsWith('adventurers') && !ring.startsWith('rangers')) throw new Error('ожидается линия авантюриста или охотника, а не ' + ring);
  // объяснение ссылается на официальные значения за пункт
  const why = d.cells.ring1.why.join(' ');
  if (!why.includes('за пункт')) throw new Error('нет объяснения про эффект за пункт атрибута');
  if (!why.includes('Ловкость') && !why.includes('Dexterity')) throw new Error('нет упоминания Ловкости/урона пета');
  // у мага своя линия — учёного (интеллект)
  const m = rec('mage', 'farm', { level: 80, ml: 200 });
  if (!m.cells.ring1.family.id.startsWith('scholars') && !m.cells.ring1.family.id.startsWith('adventurers')) throw new Error('магу ожидается линия учёного/авантюриста, а не ' + m.cells.ring1.family.id);
  // игрок может зафиксировать линию вручную
  const forced = rec('druid', 'pets', { level: 80, ml: 200, jewelryLine: 'warriors' });
  if (forced.cells.ring1.family.id !== 'warriors_ring') throw new Error('ручной выбор линии не применён: ' + forced.cells.ring1.family.id);
  if (!forced.cells.ring1.why.join(' ').includes('вручную')) throw new Error('нет пометки, что линия выбрана вручную');
});

check('украшения: на странице снаряжения есть выбор линии и таблица атрибутов', () => {
  const st = views.planner.plannerState;
  st.classId = 'druid'; st.goal = 'pets'; st.level = 80; st.ml = 200; st.gear = {}; st.page = 'gear'; st.jewelryLine = 'auto';
  const root = new El('main');
  views.planner.render(root);
  const text = textOf(root);
  for (const needle of ['Линия украшений: амулет, кольца, пояс', 'Что даёт каждый атрибут за пункт', 'Ловкость (Dexterity)', 'Интеллект (Intelligence)', 'Пояс учёного']) {
    if (!text.includes(needle)) throw new Error(`нет строки «${needle}»`);
  }
  const select = findAll(root, (n) => n.tagName === 'SELECT' && (n.children || []).some((o) => o.attrs && o.attrs.value === 'rangers'));
  if (!select.length) throw new Error('нет выбора линии украшений');
  const option = (select[0].children || []).find((o) => o.attrs.value === 'rangers');
  option.selected = true; select[0].value = 'rangers';
  select[0].dispatch('change');
  if (st.jewelryLine !== 'rangers') throw new Error('выбор линии не сохранился: ' + st.jewelryLine);
  if (!textOf(root).includes('Охотника')) throw new Error('после смены линии страница не пересобралась');
  const cls = st.gear.druid;
  if (!cls.amulet.family.startsWith('rangers')) throw new Error('амулет не сменился на линию охотника: ' + cls.amulet.family);
  st.jewelryLine = 'auto'; st.classId = 'warrior'; st.goal = 'progress'; st.level = 30; st.ml = 30; st.gear = {}; st.page = 'class';
});

check('биомы: тир слота качается по биомам, а не по выпавшему предмету', () => {
  const gate = biomes.forgeGateAtMl;
  // Официальные правила: T5 доступно с ML 65 (Shadow Realm), T6 — с ML 90 (Infernal Pits)
  if (gate(1).tier !== 1) throw new Error('на старте должен быть доступен только T1, а не T' + gate(1).tier);
  if (gate(30).tier !== 3) throw new Error('на ML 30 ожидается T3, а не T' + gate(30).tier);
  if (gate(45).tier !== 4) throw new Error('на ML 45 ожидается T4 (Frozen Peaks), а не T' + gate(45).tier);
  if (gate(65).tier !== 5) throw new Error('на ML 65 ожидается T5 (Shadow Realm), а не T' + gate(65).tier);
  if (gate(90).tier !== 6) throw new Error('на ML 90 ожидается T6 (Infernal Pits), а не T' + gate(90).tier);
  if (gate(65).biome.name !== 'Shadow Realm') throw new Error('биом T5 должен быть Shadow Realm: ' + gate(65).biome.name);
  if (gate(65).next.tier !== 6 || gate(65).next.ml !== 90) throw new Error('следующий тир на ML 65 — T6 с ML 90');
  // материалы берутся с монстров биома
  const mats = gate(65).materials.map((m) => m.material);
  if (!mats.includes('Void Core') || !mats.includes('Wisp Fragment')) throw new Error('материалы Shadow Realm не подхвачены: ' + mats.join(', '));
  // промоушен тира — официальная цена
  const promo = biomes.promotionFromTier(4);
  if (!promo || promo.gold !== 1125000 || promo.essence !== 'Legendary Essence') throw new Error('промоушен T4→T5 неверный');
  if (!promo.materials.some((m) => m[0] === 'Dragon Frost' && m[1] === 18)) throw new Error('материалы промоушена T4→T5 неверные');
});

check('рекомендация: предмет и слот Кузницы считаются раздельно (как в Season 2)', () => {
  const rec = recmod.recommendBuild;
  const r = rec('druid', 'pets', { level: 65, ml: 65 });
  // предмет — то, что падает на ML: T3 Rare; слот — по биомам: T5
  if (r.tierInfo.tier !== 3) throw new Error('на ML 65 основной дроп — T3, а не T' + r.tierInfo.tier);
  if (r.forgeGate.tier !== 5) throw new Error('слот на ML 65 качается до T5, а не до T' + r.forgeGate.tier);
  const e = r.cells.mainhand;
  if (e.forge.tier !== 5) throw new Error('рекомендация слота оружия не учла гейт биома: T' + e.forge.tier);
  if (e.itemTierInfo.tier !== 3) throw new Error('тир предмета в рекомендации неверный: T' + e.itemTierInfo.tier);
  const why = e.why.join(' ');
  if (!why.includes('от предмета не зависит')) throw new Error('нет объяснения, что слот не зависит от предмета');
  if (!why.includes('Shadow Realm')) throw new Error('нет упоминания биома-гейта (Shadow Realm)');
  if (!why.includes('Промоушен')) throw new Error('нет промоушена слота с ценой');
  // порядок Кузницы тоже про слот, а не про предмет
  if (!r.forgeOrder[0].reasons.join(' ').includes('не зависит от того, какой предмет')) throw new Error('порядок Кузницы не объясняет гейт биома');
  // на разных ML потолок слота растёт независимо от дропа
  const low = rec('druid', 'pets', { level: 30, ml: 30 });
  if (low.forgeGate.tier !== 3) throw new Error('на ML 30 слот должен качаться до T3');
  if (low.tierInfo.tier === low.forgeGate.tier) throw new Error('тир предмета и тир слота совпали — проверка потеряла смысл');
});

check('интерфейс: на снаряжении и в Кузнице видно правило «слот по биомам, предмет по дропу»', () => {
  const st = views.planner.plannerState;
  st.classId = 'druid'; st.goal = 'pets'; st.level = 65; st.ml = 65; st.gear = {}; st.jewelryLine = 'auto';
  st.page = 'gear';
  const root = new El('main');
  views.planner.render(root);
  const gearText = textOf(root);
  for (const needle of ['Кузница и биомы: до какого тира можно качать слот', 'Shadow Realm', 'слот можно качать', 'предмет падает T3', 'слот качается до T5']) {
    if (!gearText.includes(needle)) throw new Error(`на странице снаряжения нет «${needle}»`);
  }
  // на карточке видно и тир слота, и тир предмета
  const cards = findByClass(root, 'flipcard');
  if (!cards.length) throw new Error('нет карточек предметов');
  const back = cards[0].children[0].children[1];
  const backText = textOf(back);
  if (!backText.includes('Кузница качает СЛОТ')) throw new Error('на обороте нет пояснения про слот');
  if (!backText.includes('открывается биомами')) throw new Error('на обороте нет гейта биомов');

  st.page = 'forge';
  const forgeRoot = new El('main');
  views.planner.render(forgeRoot);
  const forgeText = textOf(forgeRoot);
  for (const needle of ['Кузница качает слот, и её потолок задают биомы', 'Void Core', 'материалы с ML 90', 'промоушен → T6']) {
    if (!forgeText.includes(needle)) throw new Error(`на странице Кузницы нет «${needle}»`);
  }
  // тир выше гейта помечен как заблокированный по ML
  const selects = findAll(forgeRoot, (n) => n.tagName === 'SELECT');
  const tierOptions = (selects[1] || { children: [] }).children || [];
  const t6 = tierOptions.find((o) => o.attrs && o.attrs.value === '6');
  if (!t6 || !textOf(t6).includes('ML 90')) throw new Error('вариант T6 не помечен гейтом ML 90');

  st.classId = 'warrior'; st.goal = 'progress'; st.level = 30; st.ml = 30; st.gear = {}; st.page = 'class';
});

/* ---------- Пассивное дерево ---------- */
const passivesData = await import(src('data/passives.js'));
const passivesCore = await import(src('core/passiveTree.js'));

check('пассивка: данные дерева корректны (200 рядов, 20 тиров, майлстоун каждый 10-й)', () => {
  const rows = passivesData.PASSIVE_ROWS;
  if (rows.length !== 200) throw new Error(`рядов ${rows.length}, ожидалось 200`);
  rows.forEach((row, i) => {
    if (!Array.isArray(row) || row.length < 2 || row.length > 3) throw new Error(`ряд ${i}: ${row.length} узлов`);
    for (const node of row) {
      const [code, per, max] = node;
      if (!passivesData.PASSIVE_STATS[code]) throw new Error(`ряд ${i}: неизвестный стат ${code}`);
      if (!(per > 0) || !(max >= 1 && max <= 10)) throw new Error(`ряд ${i}: битые значения ${per}/${max}`);
      if (passivesData.isMilestoneRow(i) && max !== 1) throw new Error(`майлстоун ${i}: max ${max} ≠ 1`);
    }
  });
  // сверка с независимым Skill Calculator сообщества (тир 17)
  const t17 = rows.slice(160, 163);
  const expect = JSON.stringify([[['str', 5, 4], ['dex', 5, 4], ['int', 5, 4]], [['adf', 507, 5], ['pdf', 355, 4]], [['cc', 1, 2], ['dg', 0.6, 2]]]);
  if (JSON.stringify(t17) !== expect) throw new Error('значения тира 17 не совпадают с референсом');
});

check('пассивка: план идёт вглубь (20 очков на тир) и зависит от цели', () => {
  const boss = passivesCore.planPassives('mage', 'boss', 300);
  const farm = passivesCore.planPassives('mage', 'farm', 300);
  if (boss.spent !== 300 || farm.spent !== 300) throw new Error('не все очки распределены');
  if (boss.deepestTier < 14) throw new Error(`boss: глубина ${boss.deepestTier} < 14`);
  for (let t = 0; t < boss.deepestTier - 1; t += 1) {
    if (boss.tiers[t].spent < 20) throw new Error(`boss: в тире ${t + 1} только ${boss.tiers[t].spent} очков, а тир ${t + 2} уже открыт`);
  }
  const sumFor = (plan, codes) => plan.tiers.flatMap((t) => t.rows).flatMap((r) => r.nodes)
    .filter((n) => codes.includes(n.code)).reduce((s, n) => s + n.points, 0);
  if (!(sumFor(farm, ['gg', 'xg', 'id', 'md']) > sumFor(boss, ['gg', 'xg', 'id', 'md']))) throw new Error('фарм-план не фармовее босс-плана');
  if (!(sumFor(boss, ['cc', 'cd', 'dd', 'dh']) > sumFor(farm, ['cc', 'cd', 'dd', 'dh']))) throw new Error('босс-план не злее фарм-плана');
  // пет-класс вкладывается в урон пета не меньше, чем в урон атаки; не-пет класс на боссах пет-узлы не берёт
  const pets = passivesCore.planPassives('druid', 'pets', 120);
  const wboss = passivesCore.planPassives('warrior', 'boss', 120);
  if (!(sumFor(pets, ['pdf', 'pdp']) >= sumFor(pets, ['adf', 'adp']))) throw new Error('пет-план не выбирает Pet Damage');
  if (!(sumFor(pets, ['pdf', 'pdp']) > sumFor(wboss, ['pdf', 'pdp']))) throw new Error('пет-узлы не зависят от класса/цели');
  // майлстоун — не больше 1 очка на ряд
  for (const plan of [boss, farm, pets]) {
    for (const tier of plan.tiers) {
      const m = tier.rows[9];
      const spent = m.nodes.reduce((s, n) => s + n.points, 0);
      if (spent > 1) throw new Error(`в майлстоуне тира ${tier.tier} вложено ${spent} очков`);
    }
  }
  // главный атрибут: маг берёт интеллект, а не силу
  if (!(sumFor(boss, ['int']) >= sumFor(boss, ['str']))) throw new Error('маг качает не свой атрибут');
});

check('интерфейс: вкладка пассивки показывает план, стратегию и итоги', () => {
  const st = views.passives.passivesState;
  st.classId = 'warrior'; st.goal = 'retaliation'; st.level = 200; st.restored = true;
  const root = new El('main');
  views.passives.render(root);
  const text = textOf(root);
  for (const needle of ['Пассивное дерево (Passive Skill Tree)', '1 очко за каждый уровень', 'Стратегия под вашу цель',
    'Что даст дерево суммарно', 'Куда класть очки: тир за тиром', 'Тир 1', 'тир 2 открыт (20/20)', 'Защита (Defense)']) {
    if (!text.includes(needle)) throw new Error(`нет «${needle}»`);
  }
  if (!text.includes('пассивных очков: 200')) throw new Error('не посчитаны очки за уровень');
});

await Promise.all(pending);

console.log(failures ? `\n${failures} проверок провалено` : '\nВсе проверки пройдены ✓');
process.exit(failures ? 1 : 0);
