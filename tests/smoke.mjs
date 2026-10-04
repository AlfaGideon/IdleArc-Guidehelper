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
    'Скелет персонажа',
    'Экипировка: что надевать в каждый слот',
    'Обмен сборкой',
    'Вторичный стат',
    'Имплисит',
  ];
  for (const needle of must) if (!text.includes(needle)) throw new Error(`нет блока/строки: «${needle}»`);
  const slots = views.planner.plannerState ? null : null;
  // 10 слотов экипировки должны быть перечислены в таблице
  for (const slot of ['Основная рука', 'Вторая рука', 'Факел', 'Нагрудник', 'Шлем', 'Перчатки', 'Обувь', 'Амулет', 'Кольцо', 'Пояс']) {
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
          if (!text.includes('Скелет персонажа')) problems.push(`${cls.id}/${goal}/${lvl}: нет скелета экипировки`);
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

check('все навыки с пометкой «оценка» объясняют, откуда взято значение', () => {
  const estimated = classes.CLASSES.flatMap((c) => c.skills.map((s) => ({ ...s, cls: c.id }))).filter((s) => s.estimated);
  if (estimated.length !== 19) throw new Error(`оценок ${estimated.length}, ожидалось 19 (18 Druid + Counterstrike)`);
  for (const s of estimated) {
    if (!s.estimateNote || s.estimateNote.length < 40) throw new Error(`${s.cls}/${s.name}: нет пояснения к оценке`);
    if (!Object.keys(s.perPoint || {}).length) throw new Error(`${s.cls}/${s.name}: оценка без значений (perPoint пуст)`);
    if (typeof s.text !== 'string' || !s.text.includes('{')) throw new Error(`${s.cls}/${s.name}: текст без подстановок`);
  }
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

console.log(failures ? `\n${failures} проверок провалено` : '\nВсе проверки пройдены ✓');
process.exit(failures ? 1 : 0);
