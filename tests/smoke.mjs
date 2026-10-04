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
class El {
  constructor(tag) {
    this.tagName = tag; this.children = []; this.attrs = {}; this.style = {};
    this._text = ''; this._html = ''; this.dataset = {};
    this.classList = { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, v) { v ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } };
  }
  appendChild(c) { this.children.push(c); return c; }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener() {}
  set className(v) { this.classList._s = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get className() { return [...this.classList._s].join(' '); }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text; }
  set innerHTML(v) { this._html = v; this.children = []; }
  get innerHTML() { return this._html; }
  querySelectorAll() { return []; }
}
globalThis.document = {
  createElement: (t) => new El(t),
  createTextNode: (t) => ({ nodeType: 3, textContent: String(t) }),
  getElementById: () => new El('div'),
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

// Реальная точка входа: ловит ошибки импортов/роутинга, которые не видны при рендере вкладок по отдельности.
try {
  await import(src('app.js') + '?smoke=1');
  console.log('  ok  app.js: точка входа загружается и активирует вкладки');
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

check('метка сборки: DATA_META.build совпадает с ?v= в index.html', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const systems = fs.readFileSync(path.join(ROOT, 'src/data/systems.js'), 'utf8');
  const build = systems.match(/build:\s*'([^']+)'/)?.[1];
  if (!build) throw new Error('DATA_META.build не найден');
  if (!html.includes(`src/app.js?v=${build}`)) throw new Error(`index.html ссылается не на сборку ${build}`);
  if (!html.includes('id="reload-btn"')) throw new Error('в index.html нет кнопки «Обновить»');
});

/* ---------- Код сборки ---------- */
check('код сборки кодируется и декодируется вместе с ручным распределением', () => {
  const plan = core.planBuild({ classId: 'rogue', level: 45, goal: 'farm' });
  const code = core.encodePlan(plan, 3);
  const back = core.decodePlan(code);
  if (back.classId !== 'rogue' || back.level !== 45 || back.goal !== 'farm' || back.plusAll !== 3) throw new Error('round-trip не совпал');
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
