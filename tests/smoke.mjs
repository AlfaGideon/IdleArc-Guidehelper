#!/usr/bin/env node
/**
 * Смоук-тест без зависимостей: прогоняет рендер всех вкладок через DOM-шим
 * и проверяет формулы + планировщик по всем классам/целям/уровням.
 *
 * Запуск: node tests/smoke.mjs
 */
import path from 'node:path';
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
globalThis.alert = () => {};
if (!globalThis.btoa) globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
if (!globalThis.atob) globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');

/* ---------- Тесты ---------- */
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
for (const [name, view] of Object.entries(views)) {
  check(`render: ${name}`, () => {
    const root = new El('main');
    view.render(root);
    if (!root.children.length) throw new Error('пустой рендер');
  });
}

const classes = await import(src('data/classes.js'));
const core = await import(src('core/planner.js'));
const calc = await import(src('core/calc.js'));

check('планировщик: 5 классов × 5 целей × 5 уровней', () => {
  for (const g of ['progress', 'farm', 'boss', 'pets', 'retaliation']) {
    for (const cls of classes.CLASSES) {
      for (const lvl of [1, 10, 30, 60, 100]) {
        const plan = core.planBuild({ classId: cls.id, level: lvl, goal: g, plusAll: 2 });
        if (plan.points.spent + plan.points.leftover !== plan.points.total) throw new Error(`очки не сходятся: ${cls.id}/${g}/${lvl}`);
        if (!core.planToText(plan).includes('IdleArc')) throw new Error('экспорт текста сломан');
      }
    }
  }
});

check('код сборки кодируется и декодируется', () => {
  const plan = core.planBuild({ classId: 'rogue', level: 45, goal: 'farm' });
  const code = core.encodePlan(plan, 3);
  const back = core.decodePlan(code);
  if (back.classId !== 'rogue' || back.level !== 45 || back.goal !== 'farm' || back.plusAll !== 3) throw new Error('round-trip не совпал');
});

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
  if (calc.drModel(100).taken < 0.01) throw new Error('минимум 1% удара должен проходить даже при 100% DR');
});

check('Retaliation = Reflecting% × Defense (+0.5/Strength)', () => {
  const r = calc.retaliationModel(1000, 20, { strength: 100 });
  if (Math.abs(r.perAttack - 210) > 1e-9) throw new Error(`perAttack=${r.perAttack}`);
  const blocked = calc.retaliationModel(1000, 20, { strength: 100, blocked: true });
  if (Math.abs(blocked.hit - 315) > 1e-9) throw new Error('блок должен давать +50%');
});

check('формула гема', () => {
  const v = calc.gemValue(0.5, 4.0, 90, 8);
  if (Math.abs(v - 2.376) > 1e-9) throw new Error(`v=${v}`);
});

check('компоунд пета ограничен балансом команды', () => {
  if (calc.petCompoundEffective(30, 5, 'seasonal') !== 15) throw new Error('seasonal должен давать +10 к слабейшему');
  if (calc.petCompoundEffective(30, 5, 'permanent') !== 30) throw new Error('permanent +25');
});

check('Mastery: 1650 шардов до 10 уровня', () => {
  if (calc.masteryShards(10) !== 1650) throw new Error('стоимость Mastery');
});

console.log(failures ? `\n${failures} проверок провалено` : '\nВсе проверки пройдены ✓');
process.exit(failures ? 1 : 0);
