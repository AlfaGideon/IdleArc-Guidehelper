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

globalThis.document = {
  createElement: (t) => new El(t),
  createTextNode: (t) => ({ nodeType: 3, textContent: String(t), children: [] }),
  getElementById: (id) => registry.get(id) || null,
};
globalThis.window = { addEventListener() {}, location: { hash: '' } };
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
if (!globalThis.btoa) globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
if (!globalThis.atob) globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');

/* ---------- Загрузка модулей ---------- */
let failures = 0;
const check = (name, fn) => {
  try { fn(); console.log(`  ok  ${name}`); }
  catch (e) { failures++; console.error(` FAIL ${name}: ${e.message}`); }
};

const views = {
  planner: await import(src('ui/planner.js')),
  calc: await import(src('ui/calculators.js')),
  codex: await import(src('ui/codex.js')),
  nuances: await import(src('ui/nuances.js')),
};
const classes = await import(src('data/classes.js'));
const core = await import(src('core/planner.js'));
const calc = await import(src('core/calc.js'));
const items = await import(src('data/items.js'));
const forge = await import(src('data/forge.js'));
const art = await import(src('ui/itemArt.js'));
const store = await import(src('ui/store.js'));

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

check('гайд: интерфейс собран в 6 шагов и двуязычен (Русское (English))', () => {
  const root = new El('main');
  views.planner.render(root);
  const text = textOf(root);
  for (let n = 1; n <= 6; n++) if (!text.includes(`Шаг ${n}`)) throw new Error(`нет «Шаг ${n}»`);
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

check('планировщик: на экране есть блоки распределения, +All, гемов и экипировки', () => {
  const root = new El('main');
  views.planner.render(root);
  const text = textOf(root);
  const must = [
    'Классовые навыки — распределение',
    'Почему очки распределены именно так',
    '+All Class Skills',
    'Гемы: какой камень куда ставить',
    'Лучшие камни под цель',
    'Когда менять основной камень',
    'Другие камни в этом слоте',
    'Экран персонажа',
    'Кузница поднимает слот выше тира предмета',
    'Что искать в каждом слоте',
    'Сохранение: данные не теряются при перезагрузке',
    'Обмен сборкой',
    'Вторичный стат',
    'Имплисит',
  ];
  for (const needle of must) if (!text.includes(needle)) throw new Error(`нет блока/строки: «${needle}»`);
  const slots = views.planner.plannerState ? null : null;
  // ячейки экрана персонажа должны быть перечислены как в игре
  for (const slot of ['Вторая рука', 'Факел', 'Нагрудник', 'Шлем', 'Перчатки', 'Обувь', 'Амулет', 'Кольцо', 'Пояс', 'Оружие 2']) {
    if (!text.includes(slot)) throw new Error(`в блоке экипировки нет слота «${slot}»`);
  }
});

check('планировщик: рендерится для всех 5 классов × 5 целей × 3 уровней', () => {
  const st = views.planner.plannerState;
  const problems = [];
  for (const cls of classes.CLASSES) {
    for (const goal of ['progress', 'farm', 'boss', 'pets', 'retaliation']) {
      for (const lvl of [1, 45, 200]) {
        try {
          st.classId = cls.id; st.goal = goal; st.level = lvl; st.ml = lvl; st.plusAll = 3; st.manual = null; st.mode = 'auto';
          const root = new El('main');
          views.planner.render(root);
          const text = textOf(root);
          if (!text.includes('Экран персонажа')) problems.push(`${cls.id}/${goal}/${lvl}: нет экрана экипировки`);
          if (!text.includes('лучшие выбор') && !text.includes('лучший выбор')) problems.push(`${cls.id}/${goal}/${lvl}: нет рекомендации камня`);
        } catch (e) {
          problems.push(`${cls.id}/${goal}/${lvl}: ${e.message}`);
        }
      }
    }
  }
  st.classId = 'warrior'; st.goal = 'progress'; st.level = 30; st.ml = 30; st.plusAll = 0; st.manual = null; st.mode = 'auto';
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
  if (!html.includes('<script type="module" src="src/app.js"></script>')) throw new Error('нет статического подключения src/app.js');
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
function findByClass(node, cls, acc = []) {
  for (const c of node.children || []) {
    if (c.nodeType === 1 && String(c.className || '').split(/\s+/).includes(cls)) acc.push(c);
    findByClass(c, cls, acc);
  }
  return acc;
}

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

check('экран персонажа: 12 ячеек как в игре и правила классов', () => {
  if (items.GEAR_CELLS.length !== 12) throw new Error('ячеек ' + items.GEAR_CELLS.length);
  for (const need of ['torch', 'amulet', 'offhand', 'mainhand', 'chest', 'weapon2', 'ring1', 'ring2', 'belt', 'head', 'hands', 'feet']) {
    if (!items.GEAR_CELLS.some((c) => c.id === need)) throw new Error('нет ячейки ' + need);
  }
  if (!items.CLASS_GEAR_RULES.druid.locked.offhand || !items.CLASS_GEAR_RULES.druid.locked.weapon2) throw new Error('у друида должны быть закрыты оффхенд и второе оружие');
  if (!items.CLASS_GEAR_RULES.rogue.locked.offhand) throw new Error('у разбойника закрыт щит');
  if (items.CLASS_GEAR_RULES.warrior.locked.weapon2 === undefined) throw new Error('у воина нет второго оружия');
  if (items.SLOT_GEM_COUNT.torch !== 4 || items.SLOT_GEM_COUNT.mainhand !== 3 || items.SLOT_GEM_COUNT.ring1 !== 1) throw new Error('камни по слотам');
  if (items.GEAR_CELLS[0].en !== 'Torch' || items.GEAR_CELLS[5].ru !== 'Оружие 2') throw new Error('подписи ячеек');
});

check('карточки предметов: картинка + переворот на статы', () => {
  const root = new El('main');
  views.planner.render(root);
  const cards = findByClass(root, 'flipcard');
  if (cards.length !== 12) throw new Error('карточек ' + cards.length);
  const faces = findByClass(root, 'face');
  if (faces.length !== 24) throw new Error('сторон карточек ' + faces.length);
  const arts = findByClass(root, 'art');
  if (arts.length !== 12) throw new Error('картинок ' + arts.length);
  for (const a of arts) if (!String(a.innerHTML).includes('<svg')) throw new Error('иконка без svg');
  cards[0].dispatch('click');
  if (!cards[0].classList.contains('flipped')) throw new Error('карточка не переворачивается по клику');
  cards[0].dispatch('click');
  if (cards[0].classList.contains('flipped')) throw new Error('карточка не возвращается обратно');
  const text = textOf(root);
  for (const needle of ['Кузница поднимает слот выше тира предмета', 'Следующий шаг Кузницы', 'аффикс-позиций', 'Awaken']) {
    if (!text.includes(needle)) throw new Error(`нет строки «${needle}»`);
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
  const root = new El('main');
  views.planner.render(root);
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
  const text = textOf(root);
  if (!text.includes('Сохранение: данные не теряются при перезагрузке')) throw new Error('нет блока сохранения');
  if (!text.includes('Набор 1') || !text.includes('Набор 2')) throw new Error('нет наборов');
  // вернуть стенд в исходное состояние и почистить хранилище
  st.classId = 'warrior'; st.level = 30; st.ml = 30; st.goal = 'progress'; st.plusAll = 0; st.extraPoints = 0; st.manual = null; st.mode = 'auto';
  store.clearState();
});

console.log(failures ? `\n${failures} проверок провалено` : '\nВсе проверки пройдены ✓');
process.exit(failures ? 1 : 0);
