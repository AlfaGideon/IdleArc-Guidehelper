import { t as tr, bi } from '../i18n.js';
import { el, card, table, kpi } from './dom.js';
import { critModel, doubleHitModel, doubleDamageModel, drModel, retaliationModel, gemValue, masteryShards, petCompoundEffective, expectedHitModel, fmt } from '../core/calc.js';
import { classPointsForLevel, CLASS_SKILL_RULES } from '../data/classes.js';
import { GEM_RARITY, GEM_FAMILIES, GEM_DROP_TABLE } from '../data/items.js';

const num = (v, d = 0) => (v == null || Number.isNaN(v) ? d : Number(v));
const pct = (v, digits = 1) => `${Number(v).toFixed(digits)}%`;

function field(label, value, onChange, opts = {}) {
  return el('div', {}, [
    el('label', { text: label }),
    el('input', { type: 'number', value: String(value), min: '0', step: opts.step || '1', oninput: (e) => onChange(num(e.target.value)) }),
  ]);
}

export function render(root) {
  root.innerHTML = '';
  root.appendChild(damageCard());
  root.appendChild(defenseCard());
  root.appendChild(gemCard());
  root.appendChild(masteryCard());
  root.appendChild(petCard());
}

/* 1. Модель удара */
const dmgState = { ad: 0, crit: 150, critDmg: 100, dh: 100, dd: 60, boss: 40, isBoss: true, enemyHp: 100, echo: 0, echoDmg: 40 };
function damageCard() {
  const box = el('div');
  const inputs = el('div', { class: 'controls' }, [
    field(tr('Attack Damage % (Fierce и т.п.)', 'Attack Damage % (Fierce, etc.)'), dmgState.ad, (v) => { dmgState.ad = v; redraw(); }),
    field('Crit Chance %', dmgState.crit, (v) => { dmgState.crit = v; redraw(); }),
    field('Crit Damage %', dmgState.critDmg, (v) => { dmgState.critDmg = v; redraw(); }),
    field('Double Hit %', dmgState.dh, (v) => { dmgState.dh = v; redraw(); }),
    field('Double Damage %', dmgState.dd, (v) => { dmgState.dd = v; redraw(); }),
    field('Boss Damage %', dmgState.boss, (v) => { dmgState.boss = v; redraw(); }),
    field('Shadow Echo % (Rogue)', dmgState.echo, (v) => { dmgState.echo = v; redraw(); }),
    field(tr('Эхо: урон %', 'Echo damage %'), dmgState.echoDmg, (v) => { dmgState.echoDmg = v; redraw(); }),
  ]);
  function redraw() {
    const crit = critModel(dmgState.crit, dmgState.critDmg);
    const dh = doubleHitModel(dmgState.dh);
    const dd = doubleDamageModel(dmgState.dd);
    const model = expectedHitModel({
      adPct: dmgState.ad, critChance: dmgState.crit, critDamage: dmgState.critDmg,
      dh: dmgState.dh, dd: dmgState.dd, bossDamage: dmgState.boss, isBoss: dmgState.isBoss,
      echoTrigger: dmgState.echo, echoDamage: dmgState.echoDmg, enemyHpPct: dmgState.enemyHp,
    });
    box.innerHTML = '';
    box.appendChild(el('div', { class: 'grid cols-2' }, [
      card(tr('Криты и мультиудары', 'Critical hits and extra hits'), [
        table([tr('Параметр', 'Parameter'), tr('Значение', 'Value'), tr('Комментарий', 'Notes')], [
          [tr('Крит-шанс эффективный', 'Effective Crit Chance'), pct(crit.effectiveChance), crit.overflow > 0 ? tr(`излишек ${pct(crit.overflow)} → Crit Damage`, `${pct(crit.overflow)} overflow converts to Crit Damage`) : tr('ниже 100% — часть ударов обычные', 'Below 100%, some hits are normal hits')],
          [tr('Crit Damage эффективный', 'Effective Crit Damage'), pct(crit.effectiveCritDamage), tr(`множитель крита ×${crit.critMult.toFixed(2)}`, `Critical hit multiplier ×${crit.critMult.toFixed(2)}`)],
          ['Double Hit', `${dh.guaranteed} + ${pct(dh.chance)}`, tr(`ожидаемо ударов: ${dh.expectedHits.toFixed(2)}`, `Expected hits: ${dh.expectedHits.toFixed(2)}`)],
          ['Double Damage', tr(`×${(dd.minMult).toFixed(2)} + ${pct(dd.chanceForNext)} на след.`, `×${(dd.minMult).toFixed(2)} + ${pct(dd.chanceForNext)} chance of the next multiplier`), tr(`ожидаемый множитель ×${dd.expectedMult.toFixed(2)}`, `Expected multiplier ×${dd.expectedMult.toFixed(2)}`)],
          [tr('Shadow Echo (если Rogue)', 'Shadow Echo (Rogue)'), pct(dmgState.echo), tr(`повтор на ${pct(dmgState.echoDmg)} урона`, `Repeats the hit at ${pct(dmgState.echoDmg)} damage`)],
        ]),
      ]),
      card(tr('Ожидаемый множитель удара', 'Expected hit multiplier'), [
        kpi([
          { label: tr('AD-множитель', 'Attack Damage multiplier'), value: `×${model.adMult.toFixed(2)}` },
          { label: tr('Крит (сред.)', 'Critical hits (average)'), value: `×${model.crit.expected.toFixed(2)}` },
          { label: tr('Доп. удары (сред.)', 'Extra hits (average)'), value: `×${model.hits.expectedHits.toFixed(2)}` },
          { label: tr('Double Damage (сред.)', 'Double Damage (average)'), value: `×${model.dd.expectedMult.toFixed(2)}` },
          { label: tr('Босс', 'Boss'), value: `×${model.bossMult.toFixed(2)}` },
          { label: tr('Эхо', 'Echo'), value: `×${model.echo.toFixed(2)}` },
          { label: tr('ИТОГО', 'TOTAL'), value: `×${fmt(model.total, 2)}` },
        ]),
        el('p', { class: 'muted', text: tr('Оценка при допущении, что слои перемножаются (как описано в игре для Fierce → криты → доп. удары). Порядок слоёв официально не раскрыт, поэтому цифра — ориентир для сравнения вариантов, а не точный DPS.', 'This estimate multiplies damage layers in the sequence described for Fierce, critical hits and extra hits. The game does not publish the full damage formula. Use the result to compare builds.') }),
      ]),
    ]));
  }
  redraw();
  return card(tr('Калькулятор урона', 'Damage calculator'), [inputs, box]);
}

/* 2. Защита и возмездие */
const defState = { dr: 92, defense: 5000, reflect: 30, strength: 300, blocked: false };
function defenseCard() {
  const box = el('div');
  const inputs = el('div', { class: 'controls' }, [
    field('Damage Reduction %', defState.dr, (v) => { defState.dr = v; redraw(); }),
    field('Defense', defState.defense, (v) => { defState.defense = v; redraw(); }),
    field('Reflecting % (Drop Bonus)', defState.reflect, (v) => { defState.reflect = v; redraw(); }),
    field('Strength', defState.strength, (v) => { defState.strength = v; redraw(); }),
    el('div', {}, [el('label', { text: tr('Блокированный удар?', 'Was the hit blocked?') }), el('select', { onchange: (e) => { defState.blocked = e.target.value === 'yes'; redraw(); } }, [
      el('option', { value: 'no', selected: !defState.blocked ? 'selected' : null }, [tr('Нет', 'No')]),
      el('option', { value: 'yes', selected: defState.blocked ? 'selected' : null }, [tr('Да (+50% к возмездию)', 'Yes (+50% Retaliation)')]),
    ])]),
  ]);
  function redraw() {
    const dr = drModel(defState.dr);
    const ret = retaliationModel(defState.defense, defState.reflect, { blocked: defState.blocked, strength: defState.strength });
    box.innerHTML = '';
    box.appendChild(el('div', { class: 'grid cols-2' }, [
      card('Damage Reduction', [
        kpi([
          { label: tr('Входящий DR', 'Raw DR'), value: pct(dr.raw, 1) },
          { label: tr('Эффективный DR', 'Effective DR'), value: pct(dr.effective, 2) },
          { label: tr('Проходит урона', 'Damage taken'), value: pct(dr.taken * 100, 2) },
          { label: tr('«Съедено» капом', 'DR lost to the cap'), value: pct(dr.extraWasted, 2) },
        ]),
        el('p', { class: 'muted', text: tr('Софт-кап 95%: выше него DR работает на 10% эффективности. Хард-кап 99%, минимум 1% удара проходит всегда.', 'Above the 95% soft cap, additional DR works at 10% effectiveness. The hard cap is 99%. At least 1% of each hit gets through.') }),
      ]),
      card(tr('Возмездие (Retaliation)', 'Retaliation'), [
        kpi([
          { label: tr('Retaliation за атаку', 'Retaliation per attack'), value: fmt(ret.perAttack, 0) },
          { label: tr('С учётом блока', 'With block applied'), value: fmt(ret.hit, 0) },
        ]),
        el('p', { class: 'muted', text: tr('Формула игры: Retaliation = Reflecting% × Defense (+0.5 за пункт Strength). Срабатывает на каждую атаку монстра, даже если он промахнулся.', 'Retaliation equals Reflecting % × Defense, with 0.5 Defense per point of Strength. It triggers on every monster attack, even a miss.') }),
      ]),
    ]));
  }
  redraw();
  return card(tr('Калькулятор защиты и Retaliation', 'Defense and Retaliation calculator'), [inputs, box]);
}

/* 3. Гем */
const gemState = { family: 'garnet', slot: 'weapon', base: 0.5, rarity: 'brilliant', quality: 90, socket: 8 };
function gemCard() {
  const box = el('div');
  const inputs = el('div', { class: 'controls' }, [
    el('div', {}, [el('label', { text: tr('Семья гема', 'Gem family') }), el('select', { onchange: (e) => { gemState.family = e.target.value; redraw(); } },
      GEM_FAMILIES.map((f) => el('option', { value: f.id, selected: f.id === gemState.family ? 'selected' : null }, [bi(f.ru, f.name)])))]),
    el('div', {}, [el('label', { text: tr('Слот', 'Slot') }), el('select', { onchange: (e) => { gemState.slot = e.target.value; redraw(); } },
      [['weapon', tr('Оружие', 'Weapon')], ['torch', 'Torch'], ['armor', tr('Броня', 'Armor')], ['jewelry', tr('Украшения', 'Jewelry')]].map(([v, t]) => el('option', { value: v, selected: v === gemState.slot ? 'selected' : null }, [t])))]),
    el('div', {}, [el('label', { text: tr('База (Rough, quality 100, socket 0)', 'Base value (Rough, quality 100, socket level 0)') }), el('input', { type: 'number', step: '0.05', value: String(gemState.base), oninput: (e) => { gemState.base = num(e.target.value); redraw(); } })]),
    el('div', {}, [el('label', { text: tr('Редкость', 'Rarity') }), el('select', { onchange: (e) => { gemState.rarity = e.target.value; redraw(); } },
      GEM_RARITY.map((r) => el('option', { value: r.id, selected: r.id === gemState.rarity ? 'selected' : null }, [`${r.name} ×${r.mult}`])))]),
    field(tr('Качество (1–100)', 'Quality (1–100)'), gemState.quality, (v) => { gemState.quality = Math.max(1, Math.min(100, v)); redraw(); }),
    field(tr('Уровень сокета', 'Socket level'), gemState.socket, (v) => { gemState.socket = v; redraw(); }),
  ]);
  function redraw() {
    const r = GEM_RARITY.find((x) => x.id === gemState.rarity);
    const value = gemValue(gemState.base, r.mult, gemState.quality, gemState.socket);
    box.innerHTML = '';
    box.appendChild(el('div', { class: 'grid cols-2' }, [
      card(tr('Результат', 'Result'), [
        kpi([
          { label: tr('Значение эффекта', 'Effect value'), value: value.toFixed(2) },
          { label: tr('Множитель сокета', 'Socket multiplier'), value: `×${(1 + 0.04 * gemState.socket).toFixed(2)}` },
          { label: tr('Множитель редкости', 'Rarity multiplier'), value: `×${r.mult}` },
        ]),
        el('p', { class: 'muted', text: tr('Формула игры: base × rarity × (quality / 100) × (1 + 0.04 × socket level).', 'Formula: base × rarity × (quality / 100) × (1 + 0.04 × socket level).') }),
      ]),
      card(tr('Справка', 'Reference'), [
        table([tr('Редкость', 'Rarity'), tr('Множ.', 'Multiplier'), tr('Вторичек', 'Secondary stats'), tr('Кап сокета', 'Socket cap')], GEM_RARITY.map((g) => [g.name, `×${g.mult}`, String(g.secondary), g.socketCap == null ? tr('нет', 'None') : String(g.socketCap)])),
        el('p', { class: 'muted', text: tr('Дроп гемов и открытие сокетов:', 'Gem drops and socket unlocks') }),
        table(['ML', 'Rough', 'Cut', 'Polished', 'Brilliant'], GEM_DROP_TABLE.map((t) => [t.ml, `${t.rough}%`, `${t.cut}%`, `${t.polished}%`, `${t.brilliant}%`])),
      ]),
    ]));
  }
  redraw();
  return card(tr('Калькулятор гема', 'Gem calculator'), [inputs, box]);
}

/* 4. Mastery */
const mState = { from: 0, to: 10 };
function masteryCard() {
  const box = el('div');
  const inputs = el('div', { class: 'controls' }, [
    field(tr('Текущий уровень Mastery', 'Current Mastery level'), mState.from, (v) => { mState.from = Math.max(0, Math.min(10, v)); redraw(); }),
    field(tr('Желаемый уровень', 'Target level'), mState.to, (v) => { mState.to = Math.max(0, Math.min(10, v)); redraw(); }),
  ]);
  function redraw() {
    const need = Math.max(0, masteryShards(mState.to) - masteryShards(mState.from));
    box.innerHTML = '';
    box.appendChild(el('div', { class: 'grid cols-2' }, [
      card('Elemental Shards', [
        kpi([
          { label: tr('Нужно шардов', 'Shards needed'), value: String(need) },
          { label: tr('Дней Conflux (кап 100/день)', 'Conflux days (100 shards/day)'), value: String(Math.ceil(need / 100)) },
        ]),
        el('p', { class: 'muted', text: tr('Elemental Conflux: 60 минут в день, до 100 шардов в день, ×2 EXP; с ML 90 — ×3 к редким материалам.', 'Elemental Conflux lasts 60 minutes per day and grants up to 100 shards daily and ×2 EXP. At ML 90 it also grants ×3 rare materials.') }),
      ]),
      card(tr('Таблица Mastery', 'Mastery table'), [
        table([tr('Ур.', 'Level'), tr('Бонус', 'Bonus'), tr('Стоимость до след.', 'Cost to next level'), tr('Всего', 'Total')], [
          [0, '0%', 10, 0], [1, '7%', 35, 10], [2, '9%', 55, 45], [3, '11%', 80, 100], [4, '13%', 110, 180],
          [5, '15%', 150, 290], [6, '17%', 200, 440], [7, '19%', 260, 640], [8, '21%', 330, 900],
          [9, '23%', 420, 1230], [10, '25%', 'MAX', 1650],
        ]),
      ]),
    ]));
  }
  redraw();
  return card(tr('Калькулятор Mastery', 'Mastery calculator'), [inputs, box]);
}

/* 5. Петы и очки */
const pState = { myLevel: 30, weakest: 5, realm: 'seasonal', charLevel: 30, extra: 0 };
function petCard() {
  const box = el('div');
  const inputs = el('div', { class: 'controls' }, [
    field(tr('Компоунд-уровень пета', 'Pet compound level'), pState.myLevel, (v) => { pState.myLevel = v; redraw(); }),
    field(tr('Уровень самого слабого надетого пета', 'Weakest equipped pet level'), pState.weakest, (v) => { pState.weakest = v; redraw(); }),
    el('div', {}, [el('label', { text: tr('Реалм', 'Realm') }), el('select', { onchange: (e) => { pState.realm = e.target.value; redraw(); } }, [
      el('option', { value: 'seasonal', selected: pState.realm === 'seasonal' ? 'selected' : null }, ['Seasonal (+10)']),
      el('option', { value: 'permanent', selected: pState.realm === 'permanent' ? 'selected' : null }, ['Permanent (+25)']),
    ])]),
    field(tr('Уровень персонажа', 'Character level'), pState.charLevel, (v) => { pState.charLevel = v; redraw(); }),
    field(tr('Доп. классовые очки', 'Extra class skill points'), pState.extra, (v) => { pState.extra = v; redraw(); }),
  ]);
  function redraw() {
    const eff = petCompoundEffective(pState.myLevel, pState.weakest, pState.realm);
    const lost = pState.myLevel - eff;
    box.innerHTML = '';
    box.appendChild(el('div', { class: 'grid cols-2' }, [
      card(tr('Компоунд пета', 'Pet compounding'), [
        kpi([
          { label: tr('Заявленный уровень', 'Pet level'), value: `+${pState.myLevel}` },
          { label: tr('Считается как', 'Effective level'), value: `+${eff}` },
          { label: tr('Потеряно', 'Levels lost'), value: lost > 0 ? `+${lost}` : '0' },
        ]),
        el('p', { class: 'muted', text: tr('Правило игры: пет считается не выше чем на 10 уровней (25 на Permanent) выше САМОГО СЛАБОГО надетого пета. Пустой слот = +0. Качайте команду ровно.', 'A pet can count as up to 10 levels above your weakest equipped pet (25 on Permanent). An empty slot counts as +0. Level your team evenly.') }),
        el('p', { class: 'muted', text: tr('Капы: Uncommon +10, Rare +20, Epic +30, Legendary — без капа.', 'Compound caps: Uncommon +10, Rare +20, Epic +30, Legendary uncapped.') }),
      ]),
      card(tr('Классовые очки', 'Class skill points'), [
        kpi([
          { label: tr('Очков на уровне', 'Points at this level'), value: String(classPointsForLevel(pState.charLevel) + pState.extra) },
          { label: tr('Всего уровней навыков', 'Levels per skill point'), value: tr(`${CLASS_SKILL_RULES.levelsPerPoint} ур. = 1 очко`, `${CLASS_SKILL_RULES.levelsPerPoint} levels = 1 point`) },
        ]),
        el('p', { class: 'muted', text: tr('Первый классовый скилл-поинт — на 1 уровне, далее по одному каждые 3 уровня персонажа. Tier 2 открывается после 5 очков в ветке, Tier 3 — после 10.', 'You gain your first class skill point at level 1 and another every 3 character levels. Tier 2 requires 5 points in the branch. Tier 3 requires 10.') }),
      ]),
    ]));
  }
  redraw();
  return card(tr('Петы и очки навыков', 'Pets and skill points'), [inputs, box]);
}

const calculatorStates = { damage: dmgState, defense: defState, gem: gemState, mastery: mState, pet: pState };

export const getViewState = () => Object.fromEntries(Object.entries(calculatorStates).map(([name, state]) => [name, { ...state }]));

export function restoreViewState(snapshot) {
  for (const [name, state] of Object.entries(calculatorStates)) {
    const saved = snapshot?.[name];
    if (!saved) continue;
    for (const key of Object.keys(state)) {
      if (typeof saved[key] === typeof state[key]) state[key] = saved[key];
    }
  }
}
