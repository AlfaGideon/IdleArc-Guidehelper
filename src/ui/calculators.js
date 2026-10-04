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
    field('Attack Damage % (Fierce и т.п.)', dmgState.ad, (v) => { dmgState.ad = v; redraw(); }),
    field('Crit Chance %', dmgState.crit, (v) => { dmgState.crit = v; redraw(); }),
    field('Crit Damage %', dmgState.critDmg, (v) => { dmgState.critDmg = v; redraw(); }),
    field('Double Hit %', dmgState.dh, (v) => { dmgState.dh = v; redraw(); }),
    field('Double Damage %', dmgState.dd, (v) => { dmgState.dd = v; redraw(); }),
    field('Boss Damage %', dmgState.boss, (v) => { dmgState.boss = v; redraw(); }),
    field('Shadow Echo % (Rogue)', dmgState.echo, (v) => { dmgState.echo = v; redraw(); }),
    field('Эхо: урон %', dmgState.echoDmg, (v) => { dmgState.echoDmg = v; redraw(); }),
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
      card('Криты и мультиудары', [
        table(['Параметр', 'Значение', 'Комментарий'], [
          ['Крит-шанс эффективный', pct(crit.effectiveChance), crit.overflow > 0 ? `излишек ${pct(crit.overflow)} → Crit Damage` : 'ниже 100% — часть ударов обычные'],
          ['Crit Damage эффективный', pct(crit.effectiveCritDamage), `множитель крита ×${crit.critMult.toFixed(2)}`],
          ['Double Hit', `${dh.guaranteed} + ${pct(dh.chance)}`, `ожидаемо ударов: ${dh.expectedHits.toFixed(2)}`],
          ['Double Damage', `×${(dd.minMult).toFixed(2)} + ${pct(dd.chanceForNext)} на след.`, `ожидаемый множитель ×${dd.expectedMult.toFixed(2)}`],
          ['Shadow Echo (если Rogue)', pct(dmgState.echo), `повтор на ${pct(dmgState.echoDmg)} урона`],
        ]),
      ]),
      card('Ожидаемый множитель удара', [
        kpi([
          { label: 'AD-множитель', value: `×${model.adMult.toFixed(2)}` },
          { label: 'Крит (сред.)', value: `×${model.crit.expected.toFixed(2)}` },
          { label: 'Доп. удары (сред.)', value: `×${model.hits.expectedHits.toFixed(2)}` },
          { label: 'Double Damage (сред.)', value: `×${model.dd.expectedMult.toFixed(2)}` },
          { label: 'Босс', value: `×${model.bossMult.toFixed(2)}` },
          { label: 'Эхо', value: `×${model.echo.toFixed(2)}` },
          { label: 'ИТОГО', value: `×${fmt(model.total, 2)}` },
        ]),
        el('p', { class: 'muted', text: 'Оценка при допущении, что слои перемножаются (как описано в игре для Fierce → криты → доп. удары). Порядок слоёв официально не раскрыт, поэтому цифра — ориентир для сравнения вариантов, а не точный DPS.' }),
      ]),
    ]));
  }
  redraw();
  return card('Калькулятор урона', [inputs, box]);
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
    el('div', {}, [el('label', { text: 'Блокированный удар?' }), el('select', { onchange: (e) => { defState.blocked = e.target.value === 'yes'; redraw(); } }, [
      el('option', { value: 'no', selected: !defState.blocked ? 'selected' : null }, ['Нет']),
      el('option', { value: 'yes', selected: defState.blocked ? 'selected' : null }, ['Да (+50% к возмездию)']),
    ])]),
  ]);
  function redraw() {
    const dr = drModel(defState.dr);
    const ret = retaliationModel(defState.defense, defState.reflect, { blocked: defState.blocked, strength: defState.strength });
    box.innerHTML = '';
    box.appendChild(el('div', { class: 'grid cols-2' }, [
      card('Damage Reduction', [
        kpi([
          { label: 'Входящий DR', value: pct(dr.raw, 1) },
          { label: 'Эффективный DR', value: pct(dr.effective, 2) },
          { label: 'Проходит урона', value: pct(dr.taken * 100, 2) },
          { label: '«Съедено» капом', value: pct(dr.extraWasted, 2) },
        ]),
        el('p', { class: 'muted', text: 'Софт-кап 95%: выше него DR работает на 10% эффективности. Хард-кап 99%, минимум 1% удара проходит всегда.' }),
      ]),
      card('Возмездие (Retaliation)', [
        kpi([
          { label: 'Retaliation за атаку', value: fmt(ret.perAttack, 0) },
          { label: 'С учётом блока', value: fmt(ret.hit, 0) },
        ]),
        el('p', { class: 'muted', text: 'Формула игры: Retaliation = Reflecting% × Defense (+0.5 за пункт Strength). Срабатывает на каждую атаку монстра, даже если он промахнулся.' }),
      ]),
    ]));
  }
  redraw();
  return card('Калькулятор защиты и Retaliation', [inputs, box]);
}

/* 3. Гем */
const gemState = { family: 'garnet', slot: 'weapon', base: 0.5, rarity: 'brilliant', quality: 90, socket: 8 };
function gemCard() {
  const box = el('div');
  const inputs = el('div', { class: 'controls' }, [
    el('div', {}, [el('label', { text: 'Семья гема' }), el('select', { onchange: (e) => { gemState.family = e.target.value; redraw(); } },
      GEM_FAMILIES.map((f) => el('option', { value: f.id, selected: f.id === gemState.family ? 'selected' : null }, [`${f.ru} (${f.name})`])))]),
    el('div', {}, [el('label', { text: 'Слот' }), el('select', { onchange: (e) => { gemState.slot = e.target.value; redraw(); } },
      [['weapon', 'Оружие'], ['torch', 'Torch'], ['armor', 'Броня'], ['jewelry', 'Украшения']].map(([v, t]) => el('option', { value: v, selected: v === gemState.slot ? 'selected' : null }, [t])))]),
    el('div', {}, [el('label', { text: 'База (Rough, quality 100, socket 0)' }), el('input', { type: 'number', step: '0.05', value: String(gemState.base), oninput: (e) => { gemState.base = num(e.target.value); redraw(); } })]),
    el('div', {}, [el('label', { text: 'Редкость' }), el('select', { onchange: (e) => { gemState.rarity = e.target.value; redraw(); } },
      GEM_RARITY.map((r) => el('option', { value: r.id, selected: r.id === gemState.rarity ? 'selected' : null }, [`${r.name} ×${r.mult}`])))]),
    field('Качество (1–100)', gemState.quality, (v) => { gemState.quality = Math.max(1, Math.min(100, v)); redraw(); }),
    field('Уровень сокета', gemState.socket, (v) => { gemState.socket = v; redraw(); }),
  ]);
  function redraw() {
    const r = GEM_RARITY.find((x) => x.id === gemState.rarity);
    const value = gemValue(gemState.base, r.mult, gemState.quality, gemState.socket);
    box.innerHTML = '';
    box.appendChild(el('div', { class: 'grid cols-2' }, [
      card('Результат', [
        kpi([
          { label: 'Значение эффекта', value: value.toFixed(2) },
          { label: 'Множитель сокета', value: `×${(1 + 0.04 * gemState.socket).toFixed(2)}` },
          { label: 'Множитель редкости', value: `×${r.mult}` },
        ]),
        el('p', { class: 'muted', text: 'Формула игры: base × rarity × (quality / 100) × (1 + 0.04 × socket level).' }),
      ]),
      card('Справка', [
        table(['Редкость', 'Множ.', 'Вторичек', 'Кап сокета'], GEM_RARITY.map((g) => [g.name, `×${g.mult}`, String(g.secondary), g.socketCap == null ? 'нет' : String(g.socketCap)])),
        el('p', { class: 'muted', text: 'Дроп гемов и открытие сокетов:' }),
        table(['ML', 'Rough', 'Cut', 'Polished', 'Brilliant'], GEM_DROP_TABLE.map((t) => [t.ml, `${t.rough}%`, `${t.cut}%`, `${t.polished}%`, `${t.brilliant}%`])),
      ]),
    ]));
  }
  redraw();
  return card('Калькулятор гема', [inputs, box]);
}

/* 4. Mastery */
const mState = { from: 0, to: 10 };
function masteryCard() {
  const box = el('div');
  const inputs = el('div', { class: 'controls' }, [
    field('Текущий уровень Mastery', mState.from, (v) => { mState.from = Math.max(0, Math.min(10, v)); redraw(); }),
    field('Желаемый уровень', mState.to, (v) => { mState.to = Math.max(0, Math.min(10, v)); redraw(); }),
  ]);
  function redraw() {
    const need = Math.max(0, masteryShards(mState.to) - masteryShards(mState.from));
    box.innerHTML = '';
    box.appendChild(el('div', { class: 'grid cols-2' }, [
      card('Elemental Shards', [
        kpi([
          { label: 'Нужно шардов', value: String(need) },
          { label: 'Дней Conflux (кап 100/день)', value: String(Math.ceil(need / 100)) },
        ]),
        el('p', { class: 'muted', text: 'Elemental Conflux: 60 минут в день, до 100 шардов в день, ×2 EXP; с ML 90 — ×3 к редким материалам.' }),
      ]),
      card('Таблица Mastery', [
        table(['Ур.', 'Бонус', 'Стоимость до след.', 'Всего'], [
          [0, '0%', 10, 0], [1, '7%', 35, 10], [2, '9%', 55, 45], [3, '11%', 80, 100], [4, '13%', 110, 180],
          [5, '15%', 150, 290], [6, '17%', 200, 440], [7, '19%', 260, 640], [8, '21%', 330, 900],
          [9, '23%', 420, 1230], [10, '25%', 'MAX', 1650],
        ]),
      ]),
    ]));
  }
  redraw();
  return card('Калькулятор Mastery', [inputs, box]);
}

/* 5. Петы и очки */
const pState = { myLevel: 30, weakest: 5, realm: 'seasonal', charLevel: 30, extra: 0 };
function petCard() {
  const box = el('div');
  const inputs = el('div', { class: 'controls' }, [
    field('Компоунд-уровень пета', pState.myLevel, (v) => { pState.myLevel = v; redraw(); }),
    field('Уровень самого слабого надетого пета', pState.weakest, (v) => { pState.weakest = v; redraw(); }),
    el('div', {}, [el('label', { text: 'Реалм' }), el('select', { onchange: (e) => { pState.realm = e.target.value; redraw(); } }, [
      el('option', { value: 'seasonal', selected: pState.realm === 'seasonal' ? 'selected' : null }, ['Seasonal (+10)']),
      el('option', { value: 'permanent', selected: pState.realm === 'permanent' ? 'selected' : null }, ['Permanent (+25)']),
    ])]),
    field('Уровень персонажа', pState.charLevel, (v) => { pState.charLevel = v; redraw(); }),
    field('Доп. классовые очки', pState.extra, (v) => { pState.extra = v; redraw(); }),
  ]);
  function redraw() {
    const eff = petCompoundEffective(pState.myLevel, pState.weakest, pState.realm);
    const lost = pState.myLevel - eff;
    box.innerHTML = '';
    box.appendChild(el('div', { class: 'grid cols-2' }, [
      card('Компоунд пета', [
        kpi([
          { label: 'Заявленный уровень', value: `+${pState.myLevel}` },
          { label: 'Считается как', value: `+${eff}` },
          { label: 'Потеряно', value: lost > 0 ? `+${lost}` : '0' },
        ]),
        el('p', { class: 'muted', text: 'Правило игры: пет считается не выше чем на 10 уровней (25 на Permanent) выше САМОГО СЛАБОГО надетого пета. Пустой слот = +0. Качайте команду ровно.' }),
        el('p', { class: 'muted', text: 'Капы: Uncommon +10, Rare +20, Epic +30, Legendary — без капа.' }),
      ]),
      card('Классовые очки', [
        kpi([
          { label: 'Очков на уровне', value: String(classPointsForLevel(pState.charLevel) + pState.extra) },
          { label: 'Всего уровней навыков', value: `${CLASS_SKILL_RULES.levelsPerPoint} ур. = 1 очко` },
        ]),
        el('p', { class: 'muted', text: 'Первый классовый скилл-поинт — на 1 уровне, далее по одному каждые 3 уровня персонажа. Tier 2 открывается после 5 очков в ветке, Tier 3 — после 10.' }),
      ]),
    ]));
  }
  redraw();
  return card('Петы и очки навыков', [inputs, box]);
}
