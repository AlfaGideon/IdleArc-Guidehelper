/**
 * Интерфейс планировщика: пошаговый гайд «как собрать персонажа».
 *
 * Шаг 1 — класс и цель
 * Шаг 2 — уровни: уровень персонажа (очки навыков) и Monster Level (предметы, камни, дроп)
 * Шаг 3 — куда вложить очки навыков (+All Class Skills и итоговые бонусы)
 * Шаг 4 — что надеть: скелет персонажа и что искать в каждом слоте
 * Шаг 5 — какие камни вставить
 * Шаг 6 — что делать дальше (чек-лист под уровень, ML и цель)
 *
 * Все подписи — «Русское (English)»: сначала понятное по-русски, в скобках игровое название.
 */
import { CLASSES, classById, classPointsForLevel, CLASS_SKILL_RULES } from '../data/classes.js';
import { GOALS } from '../data/builds.js';
import { STATS, STANCES, TALISMANS } from '../data/systems.js';
import { GEM_FAMILIES, GEM_RARITY, GEM_SECONDARY, RARITY, ITEM_TIERS, SLOT_EN } from '../data/items.js';
import { planBuild, planToText, encodePlan, decodePlan, nextPointLevel } from '../core/planner.js';
import { el, card, table, kpi, copyButton } from './dom.js';

const state = {
  classId: 'warrior',
  level: 30,          // уровень персонажа → классовые очки
  ml: 30,             // Monster Level → предметы, камни, дроп (независим от уровня персонажа)
  goal: 'progress',
  plusAll: 0,
  extraPoints: 0,
  manual: null,       // null = авто-распределение, объект = ручные правки
  mode: 'auto',       // 'auto' | 'manual'
  shareCode: '',
};

/* ------------------------------ Двуязычные подписи ------------------------------ */

/** «Русское (English)» одной строкой — для текстов, ячеек таблиц и подписей. */
const biText = (ru, en) => (ru && en && ru !== en ? `${ru} (${en})` : (ru || en || ''));

/** Узел «Русское (English)»: русское жирным, английское приглушённым. */
const bi = (ru, en) => el('span', {}, [
  el('b', { text: ru || en || '' }),
  en && ru && ru !== en ? el('span', { class: 'en', text: ` ${en}` }) : null,
]);

/** Русские подписи и английские имена эффектов навыков (для ситуативных статов). */
const EFFECT_LABELS = {
  cull: 'Порог добивания', ddTriple: 'Тройной урон', critDouble: 'Двойной крит',
  echoTrigger: 'Шанс Shadow Echo', echoDamage: 'Урон эха', echoTwice: 'Второе эхо',
  dhBonusDmg: 'Бонус доп. удара', extraStrike: 'Доп. удар после Double Hit',
  petDoubleStrike: 'Двойной удар пета', petDmg: 'Урон пета',
  petDmgFlat: 'Урон пета (плоско)', petMastery: 'Уровни Pet Mastery',
  maxHpPct: 'Макс. HP, %', defFlat: 'Защита (плоско)', flatToPet: 'Конверсия урона в пета',
  elemWeak: 'Усиление слабости стихий', petExp: 'Опыт пета',
  magicBlastChance: 'Шанс Magic Blast', magicBlastDmg: 'Урон Magic Blast',
  critExplode: 'Взрыв крита', instakillNonBoss: 'Свести к 1 HP', trap: 'Урон ловушки',
  vsHigh: 'По врагам >50% HP', vsLow: 'По врагам <50% HP', extraKill: 'Extra Kill',
  matDupe: 'Дубли материалов', luckyTier: 'Lucky Tier', ruby: 'Рубины', rune: 'Руны',
};
const EFFECT_EN = {
  cull: 'Culling threshold', ddTriple: 'Triple Damage chance', critDouble: 'Double Critical chance',
  echoTrigger: 'Shadow Echo chance', echoDamage: 'Echo Damage', echoTwice: 'Second Echo chance',
  dhBonusDmg: 'Bonus extra-hit damage', extraStrike: 'Extra strike after Double Hit',
  petDoubleStrike: 'Pet Double Strike chance', petDmg: 'Pet Damage',
  petDmgFlat: 'Flat Pet Damage', petMastery: 'Pet Mastery levels',
  maxHpPct: 'Max Health %', defFlat: 'Flat Defense', flatToPet: 'Attack → Pet conversion',
  elemWeak: 'Elemental weakness amp', petExp: 'Pet EXP gain',
  magicBlastChance: 'Magic Blast chance', magicBlastDmg: 'Magic Blast damage',
  critExplode: 'Critical Explosion', instakillNonBoss: 'Reduce to 1 HP', trap: 'Trap Damage',
  vsHigh: 'Damage vs >50% HP', vsLow: 'Damage vs <50% HP', extraKill: 'Extra Kill chance',
  matDupe: 'Material dupe chance', luckyTier: 'Lucky Tier', ruby: 'Rubies', rune: 'Runes',
};

/** Подпись стат-эффекта: из STATS берём официальные ru/name, для ситуативных — свой словарь. */
function effectLabel(key) {
  const st = STATS.find((x) => x.id === key);
  if (st) return biText(st.ru, st.name);
  return biText(EFFECT_LABELS[key] || key, EFFECT_EN[key] || '');
}

const PERCENT_KEYS = new Set(['ad', 'crit', 'critDmg', 'dh', 'dd', 'boss', 'petDmg', 'petDmgFlat', 'gold', 'mat', 'itemDrop', 'eggDrop', 'exp', 'petExp', 'matDupe', 'luckyTier', 'ruby', 'rune', 'extraKill', 'cull', 'trap', 'vsHigh', 'vsLow', 'ddTriple', 'critDouble', 'echoTrigger', 'echoDamage', 'echoTwice', 'dhBonusDmg', 'extraStrike', 'petDoubleStrike', 'magicBlastChance', 'magicBlastDmg', 'critExplode', 'instakillNonBoss', 'block', 'dodge', 'dr', 'retal', 'defense', 'maxHpPct', 'flatToPet', 'elemWeak']);
const SITUATIONAL = new Set(['cull', 'trap', 'vsHigh', 'vsLow', 'instakillNonBoss', 'critExplode', 'echoTrigger', 'echoDamage', 'echoTwice', 'dhBonusDmg', 'extraStrike', 'petDoubleStrike', 'magicBlastChance', 'magicBlastDmg', 'ddTriple', 'critDouble', 'elemWeak']);
const fmtVal = (key, v) => `${Number(v.toFixed(1))}${PERCENT_KEYS.has(key) ? '%' : ''}`;

/* -------------------------------- Каркас шагов -------------------------------- */

const STEPS = [
  [1, 'Класс и цель', 'выберите класс и под какую задачу собираете персонажа'],
  [2, 'Уровни: персонаж и Monster Level', 'уровень персонажа даёт очки навыков, Monster Level — предметы и камни'],
  [3, 'Куда вложить очки навыков', 'распределение по ветвям, +All Class Skills, итоговые бонусы'],
  [4, 'Что надеть: слоты и предметы', 'скелет персонажа и что искать в каждом слоте'],
  [5, 'Какие камни вставить', 'камень на каждый слот, редкость по ML, вторичные статы'],
  [6, 'Что делать дальше', 'чек-лист под ваш уровень, ML и цель'],
];

function stepCard(n, title, children) {
  return el('section', { class: 'card step', id: `step-${n}` }, [
    el('h2', {}, [el('span', { class: 'step-num', text: `Шаг ${n}` }), el('span', { text: title })]),
    ...[].concat(children),
  ]);
}

function jump(n) {
  const target = document.getElementById(`step-${n}`);
  if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* --------------------------------- Шаг 0: гайд --------------------------------- */

function guideCard(plan, root) {
  return card('Гайд: как собрать персонажа в IdleArc', [
    el('ol', { class: 'guide' }, STEPS.map(([n, title, hint]) => el('li', {}, [
      el('button', { class: 'btn link', text: `${n}. ${title}`, onclick: () => jump(n) }),
      el('span', { class: 'muted', text: ` — ${hint}` }),
    ]))),
    el('div', { class: 'quick' }, [
      el('div', {}, [el('label', { text: 'Класс' }), el('b', { text: biText(plan.classRu, plan.className) })]),
      el('div', {}, [el('label', { text: 'Цель' }), el('b', { text: plan.goalDef.ru })]),
      el('div', {}, [el('label', { text: 'Уровень персонажа' }), el('b', { text: `${plan.level} · ${plan.points.available} очк.` })]),
      el('div', {}, [el('label', { text: 'Monster Level' }), el('b', { text: `${plan.ml} · ${plan.itemTier.tierLabel} ${plan.itemTier.ru}` })]),
      el('div', {}, [el('label', { text: '+All Class Skills' }), el('b', { text: `+${state.plusAll}` })]),
    ]),
    el('p', { class: 'muted', text: 'Идите по шагам сверху вниз: сначала класс и цель, потом уровни, затем очки навыков, предметы и камни. В конце — чек-лист, что делать в игре прямо сейчас. Все цифры пересчитываются мгновенно.' }),
    el('div', { class: 'actions' }, [el('button', { class: 'btn', text: 'Перейти к чек-листу →', onclick: () => jump(6) })]),
  ]);
}

/* -------------------------------- Шаг 1: класс -------------------------------- */

function classStep(root, plan) {
  const picker = el('div', { class: 'classes' }, CLASSES.map((c) => el('button', {
    class: `class-btn ${c.id === state.classId ? 'active' : ''}`,
    onclick: () => { state.classId = c.id; state.manual = null; state.mode = 'auto'; state.shareCode = ''; render(root); },
  }, [
    el('b', { text: biText(c.ru, c.name) }),
    el('span', { class: 'muted small', text: c.role }),
  ])));

  const goalSelect = el('div', {}, [
    el('label', { text: 'Цель билда' }),
    el('select', { onchange: (e) => { state.goal = e.target.value; state.manual = null; state.mode = 'auto'; render(root); } },
      GOALS.map((g) => el('option', { value: g.id, selected: g.id === state.goal ? 'selected' : null }, [`${g.ru} — ${g.desc}`]))),
  ]);

  const stance = STANCES.find((s) => s.id === plan.profile.stance) || STANCES[0];
  const cls = classById(state.classId);
  return [
    el('h3', { text: '1.1. Класс' }),
    picker,
    el('p', { class: 'muted', text: `${biText(cls.ru, cls.name)} · роль: ${cls.role}. Стойка под цель: ${biText(stance.ru, stance.name)} — ${stance.focus}` }),
    el('h3', { text: '1.2. Цель' }),
    goalSelect,
    el('p', { class: 'muted', text: 'От цели зависят: веса навыков, приоритет статов, набор Drop Bonus-ов, камни и гема вторичек.' }),
  ];
}

/* -------------------------------- Шаг 2: уровни -------------------------------- */

function levelsStep(root, plan) {
  const numberInput = (value, min, max, onchange) => el('input', {
    type: 'number', min: String(min), max: String(max), value: String(value),
    oninput: (e) => { const v = Math.max(min, Math.min(max, Number(e.target.value) || min)); onchange(v); },
  });

  const character = el('div', { class: 'level-box' }, [
    el('label', { text: 'Уровень персонажа' }),
    numberInput(state.level, 1, 999, (v) => { state.level = v; render(root); }),
    el('p', { class: 'muted small', text: 'Даёт классовые очки: 1 на 1-м уровне и +1 каждые 3 уровня. Больше ни на что в этом плане не влияет.' }),
    kpi([
      { label: 'Классовых очков', value: String(plan.points.available) },
      { label: 'Вложено', value: `${plan.points.spent}` },
      { label: 'Следующий очок', value: `ур. ${nextPointLevel(state.level)}` },
    ]),
  ]);

  const monster = el('div', { class: 'level-box' }, [
    el('label', { text: 'Monster Level (ML)' }),
    numberInput(state.ml, 1, 999, (v) => { state.ml = v; render(root); }),
    el('p', { class: 'muted small', text: 'Определяет, что падает и что вообще доступно: тир предметов, диапазон имплиситов, редкость гемов, открытие сокетов и слотов. Очки навыков от ML не зависят.' }),
    kpi([
      { label: 'Основной дроп', value: `${plan.itemTier.tierLabel} ${plan.itemTier.ru}` },
      { label: 'Шанс дропа', value: `${plan.itemTier.chance}%` },
      { label: 'Сокетов доступно', value: plan.sockets.next ? `${plan.sockets.count} (след. ML ${plan.sockets.next.ml})` : `${plan.sockets.count} (макс)` },
    ]),
  ]);

  const unlocks = [
    ['ML 20', 'гемы и первый сокет', 20],
    ['ML 25', 'двуручное оружие, когти Rogue, сайдгрейды брони', 25],
    ['ML 50', 'Torch в отдельном слоте (+All Class Skills)', 50],
    ['ML 65', 'второй сокет, гемы Polished', 65],
    ['ML 115', 'третий сокет, гемы Brilliant (2 вторички)', 115],
    ['ML 160', 'четвёртый сокет, гемы Flawless (3 вторички)', 160],
    ['ML 260', 'предметы T6 Infernal, Drop Bonus-ы T7–T9', 260],
    ['ML 350', 'The Convergence', 350],
  ];

  return [
    el('p', { text: 'Это два разных параметра: уровень персонажа и Monster Level не связаны между собой. Меняйте их отдельно — план пересчитается.' }),
    el('div', { class: 'grid cols-2' }, [character, monster]),
    el('h3', { text: 'Что открывается по Monster Level' }),
    table(['ML', 'Что открывается', 'Статус'], unlocks.map(([label, what, ml]) => [
      label, what, ml <= state.ml ? el('span', { class: 'chip good', text: 'уже открыто' }) : el('span', { class: 'chip warn', text: `осталось ${ml - state.ml} ML` }),
    ])),
    el('h3', { text: 'Что падает на вашем ML' }),
    el('div', { class: 'scroll' }, [table(['Тир', 'Редкость', 'Аффиксов', 'Шанс дропа'], plan.itemTier.probabilities.map((p) => {
      const meta = RARITY[p.tier - 1];
      return [`${meta.tier}`, biText(meta.ru, meta.name), String(meta.affixes), `${p.chance}%`];
    }))]),
  ];
}

/* ------------------------------- Шаг 3: навыки ------------------------------- */

function manualPoints(plan) {
  if (!state.manual) state.manual = { ...plan.allocations };
  return state.manual;
}

function bumpSkill(root, plan, skill, delta) {
  const alloc = manualPoints(plan);
  alloc[skill.id] = Math.max(0, Math.min(skill.max, (alloc[skill.id] || 0) + delta));
  state.mode = 'manual';
  render(root);
}

/** Одна строка таблицы навыков: тир, название, шаги очков, максимум и эффективный ранг. */
function skillRow(root, plan, s) {
  const pts = plan.allocations[s.id] || 0;
  const eff = pts + state.plusAll;
  const detail = plan.skillList.find((d) => d.id === s.id);
  const capNote = detail && detail.capped.length ? ` · кап: ${detail.capped.join(', ')}` : '';
  const req = s.requires ? plan.class.skills.find((x) => x.id === s.requires) : null;
  return el('tr', {}, [
    el('td', {}, [el('span', { class: `tag T${s.tier || 1}`, text: `T${s.tier || 1}` })]),
    el('td', {}, [el('div', {}, [
      el('b', { text: s.ru || s.name }),
      el('span', { class: 'en', text: ` (${s.name})` }),
      s.estimated ? el('span', { class: 'tag est', title: s.estimateNote || '', text: 'оценка' }) : null,
      el('div', { class: 'muted', text: s.text ? s.text.replace(/\{(\w+)\}/g, (_, k) => {
        const per = s.perPoint?.[k];
        if (per == null) return '?';
        const cap = s.cap?.[k];
        const v = cap != null ? Math.min(per * (eff || 1), cap) : per * (eff || 1);
        return Number(v.toFixed(2)).toString();
      }) : '' }),
      req ? el('div', { class: 'muted small', text: `Требует вложенного очка: ${req.ru || req.name} (${req.name})` }) : null,
      s.s2 ? el('div', { class: 'muted small', text: `Season 2: ${s.s2}` }) : null,
    ])]),
    el('td', {}, [el('div', { class: 'stepper' }, [
      el('button', { class: 'btn tiny', text: '−', disabled: pts <= 0 ? 'disabled' : null, onclick: () => bumpSkill(root, plan, s, -1) }),
      el('b', { class: 'pts', text: String(pts) }),
      el('button', { class: 'btn tiny', text: '+', disabled: pts >= s.max ? 'disabled' : null, onclick: () => bumpSkill(root, plan, s, 1) }),
    ])]),
    el('td', {}, [el('div', { class: 'muted' }, [
      el('div', { text: `макс. ранг ${s.max} очк. · вес цели ${plan.weights[s.id] || 0}` }),
      el('div', {
        class: state.plusAll > 0 ? 'plusline' : 'muted',
        text: `эффективный ранг ${eff}${state.plusAll > 0 ? ` (${pts} + ${state.plusAll})` : ''}${capNote}`,
      }),
    ])]),
  ]);
}

function skillsStep(root, plan) {
  const cls = plan.class;
  const blocks = cls.branches.map((branch) => {
    const skills = cls.skills.filter((s) => s.branch === branch || (s.branch == null && branch === cls.branches[0]));
    const b = plan.branches[branch];
    const branchMax = skills.reduce((a, s) => a + s.max, 0);
    const rows = [];
    for (const t of [1, 2, 3]) {
      const inTier = skills.filter((s) => (s.tier || 1) === t);
      if (!inTier.length) continue;
      const need = t === 1 ? 0 : CLASS_SKILL_RULES.tierUnlock[t];
      const opened = need === 0 || b.spent >= need;
      rows.push(el('tr', { class: `tierrow${opened ? '' : ' locked'}` }, [
        el('td', { colspan: '4' }, [
          el('b', { text: `Tier ${t}` }),
          el('span', { class: 'muted', text: need === 0
            ? ' · доступно сразу'
            : ` · открывается после ${need} очков в этой же ветке (сейчас ${b.spent})` }),
          el('span', { class: 'muted', text: ` · максимум в тире: ${inTier.reduce((a, s) => a + s.max, 0)} очк.` }),
        ]),
      ]));
      for (const s of inTier) rows.push(skillRow(root, plan, s));
    }
    return el('div', { class: 'branch' }, [
      el('header', {}, [
        el('strong', { text: `${cls.branchRu[branch] || branch} · ${branch}` }),
        el('div', { class: 'chips' }, [
          el('span', { class: 'chip', text: `${b.spent} очк. вложено` }),
          el('span', { class: 'chip', text: `максимум в ветке: ${branchMax}` }),
          el('span', { class: b.tier2 ? 'chip good' : 'chip warn', text: b.tier2 ? 'Tier 2 открыт' : `до Tier 2: ${b.needTier2}` }),
          el('span', { class: b.tier3 ? 'chip good' : 'chip warn', text: b.tier3 ? 'Tier 3 открыт' : `до Tier 3: ${b.needTier3}` }),
        ]),
      ]),
      el('table', {}, [
        el('thead', {}, [el('tr', {}, ['Тир', 'Навык', 'Очки', 'Ранг и доступность'].map((h) => el('th', { text: h })))]),
        el('tbody', {}, rows),
      ]),
    ]);
  });

  const bar = el('div', { class: 'bar' }, [el('div', { style: `width:${Math.min(100, (plan.points.spent / Math.max(1, plan.points.available)) * 100)}%` })]);

  const why = el('div', { class: 'infobox' }, [
    el('b', { text: 'Почему очки распределены именно так' }),
    el('ol', { class: 'tight' }, plan.explanation.map((e) => el('li', {}, [
      el('b', { text: `${e.ru} (${e.branch})` }),
      el('span', { text: ` — вес ${e.share}% от всех весов цели, вложено ${e.spent} очк.` }),
      el('div', { class: 'muted', text: `Ключевые навыки для этой цели: ${e.top.join(', ')}${e.target ? ` · цель авто-плана: ${e.target} очк.` : ''}` }),
    ]))),
    el('p', { class: 'muted', text: 'Правило: минимум 1 очко в каждую ветку, дальше — пропорционально весам цели, затем «доводка» сильных ветвей до Tier 2 (5 очков) и Tier 3 (10 очков) за счёт слабых. Ничего не свалено в одну ветку, но вес цели виден по цифрам.' }),
  ]);

  const plusAll = el('div', { class: 'panel' }, [
    el('h3', { text: '+All Class Skills (Torch, Sage Diadem, легендарные петы)' }),
    el('div', { class: 'controls' }, [
      el('div', { class: 'slider' }, [
        el('label', { text: `Бонус: +${state.plusAll}` }),
        el('input', {
          type: 'range', min: '0', max: '25', step: '1', value: String(state.plusAll),
          oninput: (e) => { state.plusAll = Number(e.target.value); render(root); },
        }),
      ]),
      el('div', {}, [el('label', { text: 'Ввести числом' }),
        el('input', { type: 'number', min: '0', max: '25', value: String(state.plusAll), oninput: (e) => { state.plusAll = Math.max(0, Math.min(25, Number(e.target.value) || 0)); render(root); } })]),
      el('div', {}, [el('label', { text: 'Свободных классовых очков' }),
        el('input', { type: 'number', min: '0', max: '200', value: String(state.extraPoints), oninput: (e) => { state.extraPoints = Math.max(0, Number(e.target.value) || 0); render(root); } })]),
    ]),
    el('p', { class: 'muted', text: 'Бонус повышает эффективный ранг каждого изученного навыка (см. колонку «эффективный ранг» ниже). Новые навыки он не учит, Tier 2/3 не открывает: гейты ветвей считаются по вложенным очкам.' }),
    (plan.gained || []).length
      ? el('div', { class: 'scroll' }, [table(['Показатель', 'Без +All', `С +${state.plusAll}`, 'Прирост'], plan.gained.map((g) => [
        effectLabel(g.key), fmtVal(g.key, g.from), fmtVal(g.key, g.to), `+${fmtVal(g.key, g.delta)}`,
      ]))])
      : el('p', { class: 'muted', text: 'Поставьте бонус выше нуля — здесь появится таблица прироста.' }),
    (plan.cappedByPlus || []).length
      ? el('div', { class: 'warnbox' }, [
        el('b', { text: 'Уже в капе — +All по этим навыкам не помогает' }),
        el('ul', { class: 'tight' }, plan.cappedByPlus.map((c) => el('li', { text: `${c.skill}: кап ${c.cap}` }))),
      ])
      : null,
  ]);

  const totalKeys = Object.keys(plan.bonuses).filter((k) => (plan.bonuses[k] || 0) > 0);
  const totals = el('div', {}, [
    el('h3', { text: 'Итоговые бонусы от навыков' }),
    el('div', { class: 'scroll' }, [table(['Показатель', 'Без +All', `+от +All (${state.plusAll})`, 'Итого', 'Тип'], totalKeys.map((k) => {
      const base = plan.bonusesWithoutPlus[k] || 0;
      const delta = plan.bonuses[k] - base;
      return [effectLabel(k), fmtVal(k, base), state.plusAll > 0 && delta > 1e-9 ? `+${fmtVal(k, delta)}` : '—', fmtVal(k, plan.bonuses[k]), SITUATIONAL.has(k) ? 'ситуативно' : 'постоянно'];
    }))]),
    kpi([
      { label: biText('Сила атаки', 'Attack Damage'), value: `+${(plan.bonuses.ad || 0).toFixed(0)}%` },
      { label: biText('Крит / крит-урон', 'Crit / Crit Damage'), value: `+${(plan.bonuses.crit || 0).toFixed(0)}% / +${(plan.bonuses.critDmg || 0).toFixed(0)}%` },
      { label: biText('Доп. удар / двойной урон', 'DH / DD'), value: `+${(plan.bonuses.dh || 0).toFixed(0)}% / +${(plan.bonuses.dd || 0).toFixed(0)}%` },
      { label: biText('Урон пета', 'Pet Damage'), value: `+${(plan.bonuses.petDmg || 0).toFixed(0)}%` },
      { label: biText('Урон по боссам', 'Boss Damage'), value: `+${(plan.bonuses.boss || 0).toFixed(0)}%` },
      { label: biText('Золото / материалы', 'Gold / Materials'), value: `+${(plan.bonuses.gold || 0).toFixed(0)}% / +${(plan.bonuses.mat || 0).toFixed(0)}%` },
    ]),
  ]);

  return [
    el('p', { text: 'Это ядро билда: очки навыков нельзя сбросить бесплатно, поэтому сначала посмотрите план, потом вкладывайте в игре.' }),
    el('div', { class: 'grid cols-3' }, [
      el('div', {}, [el('label', { text: 'Очков вложено' }), el('b', { text: `${plan.points.spent} / ${plan.points.available}` }), bar]),
      el('div', {}, [el('label', { text: 'Режим' }), el('b', { text: plan.usingManual ? 'Ручной' : 'Авто по цели' }),
        el('div', { class: 'actions' }, [
          el('button', { class: 'btn tiny', text: 'Авто', onclick: () => { state.mode = 'auto'; state.manual = null; render(root); } }),
          el('button', { class: 'btn tiny', text: 'Сбросить', onclick: () => { state.mode = 'manual'; state.manual = {}; render(root); } }),
        ])]),
      el('div', {}, [el('label', { text: 'Свободно очков' }), el('b', { class: plan.points.left < 0 ? 'neg' : '', text: String(plan.points.left) })]),
    ]),
    ...(plan.points.over ? [el('div', { class: 'warnbox', text: `Вложено больше доступного на ${plan.points.spent - plan.points.available} — уберите очки.` })] : []),
    ...plan.validation.problems.map((p) => el('div', { class: 'warnbox', text: `⚠ ${p.skill}: ${p.reason}` })),
    why,
    plusAll,
    el('h3', { text: 'Классовые навыки — распределение' }),
    el('p', { class: 'muted', text: `Правила: Tier 2 — после ${CLASS_SKILL_RULES.tierUnlock[2]} очков в этой же ветке, Tier 3 — после ${CLASS_SKILL_RULES.tierUnlock[3]}. Кнопки «+»/«−» включают ручной режим. В таблице навыки сгруппированы по своим тирам, у каждого указан настоящий максимальный ранг из игры; +All Class Skills поднимает эффективный ранг сверх него, но не пробивает капы.` }),
    ...blocks,
    totals,
  ];
}

/* ----------------------------- Шаг 4: экипировка ----------------------------- */

function gearStep(plan) {
  const skeleton = el('div', { class: 'skeleton' }, plan.gear.slots.map((s) => el('div', { class: 'slot-tile' + (s.primary ? '' : ' empty') }, [
    el('span', { class: 'slot-name', text: `${s.slotRu} (${SLOT_EN[s.slot] || s.slot})` }),
    el('b', { text: s.primary ? biText(s.primary.ru, s.primary.name) : (s.slot === 'offhand' ? '— (занято двуручным)' : '— пусто —') }),
    s.primary && s.tierNameNow ? el('span', { class: 'muted small', text: `${plan.itemTier.tierLabel} сейчас: ${s.tierNameNow}` }) : null,
    el('span', { class: 'muted small', text: s.implicitNow ? `Имплисит: ${s.implicitNow}` : (s.note || 'нет данных') }),
    el('span', { class: 'muted small', text: `Камень: ${s.gem.family.ru} (${s.gem.family.name}) · ${s.gem.rarityRu} (${s.gem.rarity})` }),
  ])));

  const rows = plan.gear.slots.map((s) => {
    const p = s.primary;
    const affixList = [...s.affixes.prefixes, ...s.affixes.suffixes].map((a) => el('span', { class: 'chip', text: biText(a.ru, a.name) }));
    const db = s.dropBonuses.length ? s.dropBonuses.map((d) => el('span', { class: 'chip gold', text: biText(d.ru, d.name) })) : [el('span', { class: 'muted', text: '—' })];
    return [
      el('div', {}, [
        el('b', { text: s.slotRu }),
        el('div', { class: 'muted small', text: SLOT_EN[s.slot] || s.slot }),
        s.note ? el('div', { class: 'muted small', text: s.note }) : null,
      ]),
      p ? el('div', {}, [
        el('b', { text: p.ru }), el('span', { class: 'en', text: ` (${p.name})` }),
        el('div', { class: 'muted small', text: `${p.hand === '2H' ? 'двуручное' : p.hand === '1H' ? 'одноручное' : 'оффхенд'} · открывается: ${p.unlock}` }),
      ]) : el('span', { class: 'muted', text: '—' }),
      p ? el('div', {}, [
        el('b', { text: s.tierNameNow }),
        el('div', { class: 'muted small', text: `имплисит ${plan.itemTier.tierLabel}: ${s.implicitNow}` }),
        el('div', { class: 'muted small', text: `${p.implicit}: ${p.implicitTiers.map((v, i) => `T${i + 1} ${v}`).join(' · ')}` }),
      ]) : el('span', { class: 'muted', text: '—' }),
      el('div', { class: 'chips' }, affixList.length ? affixList : '—'),
      el('div', { class: 'chips' }, db),
      el('div', {}, [
        el('b', { text: `${s.gem.family.ru} (${s.gem.family.name})` }),
        el('div', { class: 'muted small', text: `${s.gem.baseValue} · цель: ${s.gem.rarityRu} (${s.gem.rarity})` }),
      ]),
    ];
  });

  const lockedNotes = plan.gear.slots.filter((s) => s.locked && s.locked.length).map((s) =>
    el('li', { text: `${s.slotRu} (${SLOT_EN[s.slot]}): ${s.locked.map((f) => `${biText(f.ru, f.name)} — ${f.unlock}`).join(', ')}` }));

  return [
    el('h3', { text: `Скелет персонажа — ${biText(plan.classRu, plan.className)}, ML ${plan.ml}` }),
    skeleton,
    el('p', { class: 'muted', text: 'Это те же 10 слотов, что в окне персонажа: основная рука, вторая рука, факел, нагрудник, шлем, перчатки, обувь, амулет, кольцо, пояс. Названия предметов — из Item Codex: русская подпись + игровое английское имя.' }),
    el('h3', { text: 'Экипировка: что надевать в каждый слот' }),
    el('div', { class: 'scroll' }, [table(
      ['Слот', 'Семейство предметов', 'Имя и имплисит на вашем ML', 'Аффиксы (ищите эти)', 'Drop Bonus', 'Камень'],
      rows,
    )]),
    el('p', { class: 'muted', text: `Имплиситы показаны для тира, который чаще всего падает на ML ${plan.ml} (${plan.itemTier.tierLabel} ${plan.itemTier.ru} — ${plan.itemTier.chance}%). Полная лестница T1→T6 указана рядом, чтобы видеть, куда расти.` }),
    lockedNotes.length ? el('div', { class: 'infobox' }, [
      el('b', { text: 'Откроется на большем ML' }),
      el('ul', { class: 'tight' }, lockedNotes),
    ]) : null,
    ...plan.profile.notes.map((n) => el('div', { class: 'infobox', text: n })),
  ];
}

/* --------------------------------- Шаг 5: камни --------------------------------- */

function gemsStep(plan) {
  const regionRu = {
    weapon: 'Оружие — основная и вторая рука',
    torch: 'Факел — отдельный слот',
    armor: 'Броня — нагрудник, шлем, перчатки, обувь',
    jewelry: 'Украшения — амулет, кольцо, пояс',
  };
  const regionEn = { weapon: 'Weapon', torch: 'Torch', armor: 'Armor', jewelry: 'Jewelry' };
  const regions = ['weapon', 'torch', 'armor', 'jewelry'];

  const summary = regions.map((r) => {
    const fam = plan.gear.slots.find((s) => s.gem.region === r)?.gem.family;
    if (!fam) return null;
    return el('li', {}, [
      el('b', { text: `${regionRu[r]} (${regionEn[r]})` }),
      el('span', { text: ` → ${fam.ru} (${fam.name}) — ${fam.slots[r]}` }),
    ]);
  }).filter(Boolean);

  const blocks = regions.map((r) => {
    const slots = plan.gear.slots.filter((s) => s.gem.region === r);
    if (!slots.length) return null;
    const fam = slots[0].gem.family;
    const rows = slots.map((s) => {
      const alts = GEM_FAMILIES.filter((f) => f.id !== s.gem.family.id)
        .map((f) => `${f.ru} (${f.name}) — ${f.slots[r]}`)
        .join(' · ');
      return [
        el('div', {}, [el('b', { text: s.slotRu }), el('div', { class: 'muted small', text: SLOT_EN[s.slot] || s.slot })]),
        el('div', {}, [el('b', { class: 'want', text: `${s.gem.family.ru} (${s.gem.family.name})` }), el('div', { class: 'muted small', text: 'ставить сюда' })]),
        el('div', {}, [el('b', { text: s.gem.baseValue }), el('div', { class: 'muted small', text: 'Черновой (Rough), качество 100, сокет 0' })]),
        el('div', { class: 'muted small', text: `Другие камни в этом слоте: ${alts}` }),
      ];
    });
    return el('div', { class: 'branch' }, [
      el('header', {}, [
        el('strong', { text: `${regionRu[r]} (${regionEn[r]})` }),
        el('div', { class: 'chips' }, [
          el('span', { class: 'chip gold', text: `лучший выбор: ${fam.ru} (${fam.name})` }),
          el('span', { class: 'chip', text: fam.slots[r] }),
        ]),
      ]),
      el('div', { class: 'scroll' }, [table(['Слот', 'Камень', 'Что даёт в этом слоте', 'Альтернативы'], rows)]),
    ]);
  }).filter(Boolean);

  return [
    el('h3', { text: 'Гемы: какой камень куда ставить' }),
    el('div', { class: 'infobox' }, [
      el('b', { text: `Лучшие камни под цель «${plan.goalDef.ru}»` }),
      el('ul', { class: 'tight' }, summary),
      el('p', { class: 'muted', text: `Один и тот же камень даёт разный эффект в разных слотах: Garnet в оружии — урон, в броне — Defense, в украшениях — основной атрибут. На вашем ML ${plan.ml} падают гемы до ${plan.gemRarity.ru} (${plan.gemRarity.name}) — вторичных статов: ${plan.gemRarity.secondary}.` }),
    ]),
    ...blocks,
    el('h3', { text: 'Когда менять основной камень' }),
    el('ul', { class: 'tight' }, [
      el('li', { text: 'Мало выживаемости на высоком ML — поставьте Lapis (Лазурит) в броню: там он даёт опыт, но Garnet/Jade меняйте на него вместе с аффиксами Max Health и Defense.' }),
      el('li', { text: 'Фармите золото и материалы — Amber (Янтарь) во все слоты: он даёт фарм-статы в каждой группе.' }),
      el('li', { text: 'Пет-билд — Jade (Жад) в оружие и броню, Lapis в факел (уровень Pet Mastery).' }),
      el('li', { text: 'Retaliation — Garnet (Гранат) везде: Defense и Max Health напрямую усиливают урон возмездия.' }),
    ]),
    el('h3', { text: 'Вторичные статы камней' }),
    el('div', { class: 'scroll' }, [table(['Вторичный стат', 'Cut (Огранённый)', 'Polished (Полированный)', 'Brilliant (Блестящий)', 'Flawless (Безупречный)', 'Для этой цели'],
      GEM_SECONDARY.map((s) => {
        const wanted = plan.gear.profile.gems.secondary.includes(s.stat);
        return [biText(s.ru, s.stat), `+${s.cut}`, `+${s.polished}`, `+${s.brilliant}`, `+${s.flawless}`, wanted ? '★ приоритет' : '—'];
      }))]),
    el('h3', { text: 'Редкости камней' }),
    table(['Редкость', 'Множитель', 'Вторичек', 'Кап сокета'], GEM_RARITY.map((g) => [biText(g.ru, g.name), `×${g.mult}`, String(g.secondary), g.socketCap == null ? 'нет' : String(g.socketCap)])),
    el('h3', { text: 'Сокеты и порядок действий' }),
    el('ul', { class: 'tight' }, [
      el('li', { text: `Сокеты открываются покупкой за золото: 1-й — ML 20 (25K), 2-й — ML 65 (50M), 3-й — ML 115 (20B), 4-й — ML 160 (2T). На вашем ML доступно: ${plan.sockets.count}${plan.sockets.next ? `, следующий — на ML ${plan.sockets.next.ml} (${plan.sockets.next.gold})` : ' (максимум)'}.` }),
      el('li', { text: 'Заполните все открытые сокеты: пустой сокет хуже слабого камня.' }),
      el('li', { text: 'Фьюз: 3 камня одной редкости → 1 следующей. Flawless так не получить — только дроп с ML 160.' }),
      el('li', { text: 'Реролл вторичек — только на Brilliant и Flawless (там 2–3 вторички).' }),
      el('li', { text: 'Уровни сокета дают +0.04 к множителю каждый: выгоднее поднять несколько сокетов, чем один в потолок.' }),
    ]),
  ];
}

/* ------------------------------ Шаг 6: что дальше ------------------------------ */

function nextStep(plan) {
  const statRows = plan.statPriority.map((id, i) => {
    const s = STATS.find((x) => x.id === id);
    return [String(i + 1), biText(s ? s.ru : id, s ? s.name : id), s?.desc || '—'];
  });

  const tal = TALISMANS.types.filter((t) => plan.profile.talismans.some((x) => x.includes(t.name)));
  const talText = plan.profile.talismans.map((t) => {
    const found = TALISMANS.types.find((x) => t.includes(x.name));
    return found ? biText(found.ru, found.name) : t;
  }).join(' + ');

  return [
    el('h3', { text: 'План действий прямо сейчас' }),
    el('ol', { class: 'todo' }, plan.todo.map((t) => el('li', {}, [
      el('b', { text: t.title }), el('span', { text: ` — ${t.text}` }),
    ]))),
    el('h3', { text: 'Приоритет характеристик' }),
    el('div', { class: 'scroll' }, [table(['№', 'Характеристика', 'Что делает'], statRows)]),
    el('div', { class: 'grid cols-2' }, [
      el('div', { class: 'infobox' }, [
        el('b', { text: 'Талисманы (2 слота)' }),
        el('p', { text: talText || '—' }),
        tal.length ? el('ul', { class: 'tight' }, tal.map((t) => el('li', { text: `${biText(t.ru, t.name)}: ${t.stats}` }))) : null,
      ]),
      el('div', { class: 'infobox' }, [
        el('b', { text: 'Петы (4 слота)' }),
        el('p', { text: plan.profile.pets }),
      ]),
    ]),
    ...plan.tips.map((t) => el('div', { class: 'infobox', text: '💡 ' + t })),
  ];
}

/* ------------------------------- Обмен сборкой ------------------------------- */

function shareCard(root, plan) {
  return card('Обмен сборкой', [
    el('p', { class: 'muted', text: 'Текстовый план удобно кинуть в Discord, код — вставить другому игроку: класс, уровень персонажа, ML, цель, +All и распределение очков сохраняются.' }),
    el('div', { class: 'actions' }, [
      el('button', { class: 'btn primary', text: 'Создать код', onclick: () => { state.shareCode = encodePlan(plan, state.plusAll); render(root); } }),
      copyButton(planToText(plan), 'Скопировать текст плана'),
      el('button', {
        class: 'btn', text: 'Загрузить код',
        onclick: () => {
          const code = prompt('Вставьте код сборки:');
          const decoded = code ? decodePlan(code.trim()) : null;
          if (decoded) {
            state.classId = decoded.classId; state.level = decoded.level;
            state.ml = decoded.ml || decoded.level;
            state.goal = decoded.goal;
            state.plusAll = decoded.plusAll || 0;
            state.manual = Object.keys(decoded.allocations || {}).length ? decoded.allocations : null;
            state.mode = state.manual ? 'manual' : 'auto';
            render(root);
          } else if (code) alert('Не удалось прочитать код.');
        },
      }),
    ]),
    state.shareCode ? el('pre', { class: 'code', text: state.shareCode }) : null,
  ]);
}

/* ---------------------------------- Рендер ---------------------------------- */

export function render(root) {
  root.innerHTML = '';

  const plan = planBuild({
    classId: state.classId, level: state.level, ml: state.ml, goal: state.goal,
    plusAll: state.plusAll, extraPoints: state.extraPoints,
    manual: state.mode === 'manual' ? (state.manual || {}) : null,
  });
  if (state.mode === 'auto') state.manual = { ...plan.allocations };

  root.appendChild(guideCard(plan, root));
  root.appendChild(stepCard(1, 'Класс и цель', classStep(root, plan)));
  root.appendChild(stepCard(2, 'Уровни: персонаж и Monster Level', levelsStep(root, plan)));
  root.appendChild(stepCard(3, 'Куда вложить очки навыков', skillsStep(root, plan)));
  root.appendChild(stepCard(4, 'Что надеть: слоты и предметы', gearStep(plan)));
  root.appendChild(stepCard(5, 'Какие камни вставить', gemsStep(plan)));
  root.appendChild(stepCard(6, 'Что делать дальше', nextStep(plan)));
  root.appendChild(shareCard(root, plan));
}

export { state as plannerState };
