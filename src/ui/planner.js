import { CLASSES, classById, classPointsForLevel, CLASS_SKILL_RULES } from '../data/classes.js';
import { GOALS } from '../data/builds.js';
import { STATS, STANCES } from '../data/systems.js';
import { GEM_FAMILIES, GEM_RARITY, GEM_SECONDARY, RARITY } from '../data/items.js';
import { planBuild, planToText, encodePlan, decodePlan, effectAtRank } from '../core/planner.js';
import { el, card, table, chips, kpi, copyButton } from './dom.js';

const state = {
  classId: 'warrior',
  level: 30,
  goal: 'progress',
  plusAll: 0,
  extraPoints: 0,
  manual: null,        // null = авто-распределение, объект = ручные правки
  mode: 'auto',        // 'auto' | 'manual'
  shareCode: '',
  gearDetail: null,    // какой слот раскрыт в каталоге
};

const EFFECT_LABELS = {
  ad: 'Атака', crit: 'Крит-шанс', critDmg: 'Крит-урон', dh: 'Double Hit', dd: 'Double Damage',
  boss: 'Урон по боссам', petDmg: 'Урон пета', petMastery: 'Pet Mastery', maxHp: 'Макс. HP',
  loh: 'HP за удар', lok: 'HP за убийство', block: 'Block', dodge: 'Уклонение', dr: 'Снижение урона',
  gold: 'Золото', mat: 'Материалы', itemDrop: 'Дроп предметов', eggDrop: 'Дроп яиц', exp: 'Опыт',
  matDupe: 'Дубли материалов', luckyTier: 'Lucky Tier', ruby: 'Рубины', rune: 'Руны',
  extraKill: 'Extra Kill', cull: 'Добивание', trap: 'Урон ловушки', vsHigh: 'По врагам >50% HP',
  vsLow: 'По врагам <50% HP', ddTriple: 'Тройной урон', critDouble: 'Двойной крит',
  echoTrigger: 'Шанс Shadow Echo', echoDamage: 'Урон эха', echoTwice: 'Второе эхо',
  dhBonusDmg: 'Бонус доп. удара', petDoubleStrike: 'Двойной удар пета',
  magicBlastChance: 'Шанс Magic Blast', magicBlastDmg: 'Урон Magic Blast',
  critExplode: 'Взрыв крита', instakillNonBoss: 'Свести к 1 HP',
};
const SITUATIONAL = new Set(['cull', 'trap', 'vsHigh', 'vsLow', 'instakillNonBoss', 'critExplode', 'echoTrigger', 'echoDamage', 'echoTwice', 'dhBonusDmg', 'petDoubleStrike', 'magicBlastChance', 'magicBlastDmg', 'ddTriple', 'critDouble']);
const PERCENT_KEYS = new Set(['ad', 'crit', 'critDmg', 'dh', 'dd', 'boss', 'petDmg', 'gold', 'mat', 'itemDrop', 'eggDrop', 'exp', 'matDupe', 'luckyTier', 'ruby', 'rune', 'extraKill', 'cull', 'trap', 'vsHigh', 'vsLow', 'ddTriple', 'critDouble', 'echoTrigger', 'echoDamage', 'echoTwice', 'dhBonusDmg', 'petDoubleStrike', 'magicBlastChance', 'magicBlastDmg', 'critExplode', 'instakillNonBoss', 'block', 'dodge', 'dr']);

const statLabel = (id) => {
  const s = STATS.find((x) => x.id === id);
  return s ? `${s.ru}` : id;
};
const fmtVal = (key, v) => `${Number(v.toFixed(1))}${PERCENT_KEYS.has(key) ? '%' : ''}`;

/* ------------------------------- Панель навыков ------------------------------- */

function manualPoints(plan) {
  if (!state.manual) state.manual = { ...plan.allocations };
  return state.manual;
}

function bumpSkill(root, plan, skill, delta) {
  const alloc = manualPoints(plan);
  const next = Math.max(0, Math.min(skill.max, (alloc[skill.id] || 0) + delta));
  alloc[skill.id] = next;
  state.mode = 'manual';
  render(root);
}

function skillsSection(root, plan) {
  const cls = plan.class;
  const blocks = cls.branches.map((branch) => {
    const skills = cls.skills.filter((s) => s.branch === branch || (s.branch == null && branch === cls.branches[0]));
    const b = plan.branches[branch];
    const rows = skills.map((s) => {
      const pts = plan.allocations[s.id] || 0;
      const eff = pts + state.plusAll;
      const detail = plan.skillList.find((d) => d.id === s.id);
      const capNote = detail && detail.capped.length ? ` · достигнут кап (${detail.capped.join(', ')})` : '';
      return [
        el('span', { class: `tag T${s.tier || 1}`, text: s.tier ? `T${s.tier}` : 'T?' }),
        el('div', {}, [
          el('b', { text: s.name }),
          s.estimated ? el('span', { class: 'tag est', title: s.estimateNote || '', text: 'оценка' }) : null,
          el('div', { class: 'muted', text: s.text ? s.text.replace(/\{(\w+)\}/g, (_, k) => {
            const per = s.perPoint?.[k];
            if (per == null) return '?';
            const cap = s.cap?.[k];
            const v = cap != null ? Math.min(per * (eff || 1), cap) : per * (eff || 1);
            return Number(v.toFixed(2)).toString();
          }) : '' }),
          s.estimated && s.estimateNote ? el('div', { class: 'muted small', text: 'Как считали: ' + s.estimateNote }) : null,
        ]),
        // интерактивное распределение
        el('div', { class: 'stepper' }, [
          el('button', { class: 'btn tiny', text: '−', disabled: pts <= 0 ? 'disabled' : null, onclick: () => bumpSkill(root, plan, s, -1) }),
          el('b', { class: 'pts', text: String(pts) }),
          el('button', { class: 'btn tiny', text: '+', disabled: pts >= s.max ? 'disabled' : null, onclick: () => bumpSkill(root, plan, s, 1) }),
        ]),
        el('div', { class: 'muted' }, [
          el('div', { text: `макс ${s.max} · вес цели ${plan.weights[s.id] || 0}` }),
          el('div', {
            class: state.plusAll > 0 ? 'plusline' : 'muted',
            text: `эффективный ранг ${eff}${state.plusAll > 0 ? ` (${pts} + ${state.plusAll})` : ''}${capNote}`,
          }),
        ]),
      ];
    });
    return el('div', { class: 'branch' }, [
      el('header', {}, [
        el('strong', { text: `${cls.branchRu[branch] || branch} · ${branch}` }),
        el('div', { class: 'chips' }, [
          el('span', { class: 'chip', text: `${b.spent} очк.` }),
          el('span', { class: b.tier2 ? 'chip good' : 'chip warn', text: b.tier2 ? 'Tier 2 открыт' : `до Tier 2: ${b.needTier2}` }),
          el('span', { class: b.tier3 ? 'chip good' : 'chip warn', text: b.tier3 ? 'Tier 3 открыт' : `до Tier 3: ${b.needTier3}` }),
        ]),
      ]),
      table(['Тир', 'Навык', 'Очки', 'Ранг и доступность'], rows),
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

  return card('Классовые навыки — распределение', [
    el('div', { class: 'grid cols-3' }, [
      el('div', {}, [el('label', { text: 'Очков вложено' }), el('b', { text: `${plan.points.spent} / ${plan.points.available}` }), bar]),
      el('div', {}, [el('label', { text: 'Режим' }), el('b', { text: plan.usingManual ? 'Ручной' : 'Авто по цели' }),
        el('div', { class: 'actions' }, [
          el('button', { class: 'btn tiny', text: 'Авто', onclick: () => { state.mode = 'auto'; state.manual = null; render(root); } }),
          el('button', { class: 'btn tiny', text: 'Сбросить', onclick: () => { state.mode = 'manual'; state.manual = {}; render(root); } }),
        ])]),
      el('div', {}, [el('label', { text: 'Свободно очков' }), el('b', { class: plan.points.left < 0 ? 'neg' : '', text: String(plan.points.left) })]),
    ]),
    ...(plan.auto.leftover > 0 && !plan.usingManual
      ? [el('div', { class: 'warnbox', text: `Авто-распределение вложило ${plan.auto.spent} из ${plan.auto.total} очков: дальше веса цели не позволяют расти (навыки упёрлись в максимум или в капы). Добавьте очки вручную кнопками «+».` })]
      : []),
    ...(plan.points.over ? [el('div', { class: 'warnbox', text: `Вложено больше доступного на ${plan.points.spent - plan.points.available} — уберите очки.` })] : []),
    ...validationBoxes(plan),
    why,
    el('p', { class: 'muted', text: 'Значок «оценка» = точной формулы в игре не опубликовано, поэтому процент посчитан по механике (аналог известного навыка или Drop Bonus-а) — наведите мышь на значок, чтобы увидеть, по какому именно аналогу.' }),
    el('p', { class: 'muted', text: 'Правила игры: очки — 1 на 1 уровне и +1 каждые 3 уровня; Tier 2 открывается после 5 очков в этой ветке, Tier 3 — после 10; некоторые навыки требуют другой навык. «Эффективный ранг» = вложенные очки + бонус +All Class Skills — именно он считается в игре; гейты ветвей при этом считаются только по вложенным очкам. Кнопки «+»/«−» переключают план в ручной режим, в игре ничего не меняется.' }),
    ...blocks,
  ]);
}

function validationBoxes(plan) {
  return plan.validation.problems.map((p) => el('div', { class: 'warnbox', text: `⚠ ${p.skill}: ${p.reason}` }));
}

/* --------------------------- Панель +All Class Skills --------------------------- */

function plusAllSection(plan) {
  const gained = plan.gained || [];
  const capped = plan.cappedByPlus || [];
  return card('+All Class Skills (Torch, Sage Diadem, легендарные петы)', [
    el('div', { class: 'controls' }, [
      el('div', { class: 'slider' }, [
        el('label', { text: `Бонус: +${state.plusAll}` }),
        el('input', {
          type: 'range', min: '0', max: '25', step: '1', value: String(state.plusAll),
          oninput: (e) => { state.plusAll = Number(e.target.value); render(root); },
        }),
      ]),
      el('div', {}, [el('label', { text: 'Проще ввести числом' }),
        el('input', { type: 'number', min: '0', max: '25', value: String(state.plusAll), oninput: (e) => { state.plusAll = Math.max(0, Math.min(25, Number(e.target.value) || 0)); render(root); } })]),
      el('div', {}, [el('label', { text: 'Свободных классовых очков' }),
        el('input', { type: 'number', min: '0', max: '200', value: String(state.extraPoints), oninput: (e) => { state.extraPoints = Math.max(0, Number(e.target.value) || 0); render(root); } })]),
    ]),
    el('div', { class: 'infobox' }, [
      el('b', { text: 'Как это работает в игре' }),
      el('ul', { class: 'tight' }, [
        el('li', { text: '+All Class Skills повышает эффективный ранг КАЖДОГО изученного навыка, даже выше его максимума — но не учит новые навыки.' }),
        el('li', { text: 'Эффекты со своим капом останавливаются на капе: лишний бонус по этому стату просто не даёт прироста.' }),
        el('li', { text: 'Tier-гейты считаются по вложенным очкам, поэтому +All не «открывает» Tier 2/3.' }),
      ]),
    ]),
    gained.length
      ? table(['Стат', 'Без +All', `С +${state.plusAll}`, 'Прирост'], gained.map((g) => [
        EFFECT_LABELS[g.key] || g.key, fmtVal(g.key, g.from), fmtVal(g.key, g.to), `+${fmtVal(g.key, g.delta)}`,
      ]))
      : el('p', { class: 'muted', text: 'Поставьте бонус выше нуля — здесь появится таблица: какой прирост даёт +All и где уже сработал кап.' }),
    capped.length
      ? el('div', { class: 'warnbox' }, [
        el('b', { text: 'Уже в капе — +All по этим навыкам не помогает' }),
        el('ul', { class: 'tight' }, capped.map((c) => el('li', { text: `${c.skill}: кап ${c.cap}` }))),
      ])
      : null,
  ]);
}

/* ------------------------------- Итоговые бонусы ------------------------------- */

function totalsSection(plan) {
  const t = plan.bonuses;
  const keys = Object.keys(EFFECT_LABELS).filter((k) => (t[k] || 0) > 0);
  const flat = keys.filter((k) => !PERCENT_KEYS.has(k));
  const pct = keys.filter((k) => PERCENT_KEYS.has(k));
  const rows = keys.map((k) => {
    const base = plan.bonusesWithoutPlus[k] || 0;
    const delta = t[k] - base;
    return [`${EFFECT_LABELS[k] || k}`, fmtVal(k, base), state.plusAll > 0 && delta > 1e-9 ? `+${fmtVal(k, delta)}` : '—', fmtVal(k, t[k]), SITUATIONAL.has(k) ? 'ситуативно' : ''];
  });
  return card('Итоговые бонусы от навыков', [
    el('p', { class: 'muted', text: `Столбец «Без +All» — только вложенные очки; «+от +All» — прибавка от бонуса ${state.plusAll}; «Итого» — эффективные значения, которые идут в игру.` }),
    el('div', { class: 'scroll' }, [table(['Показатель', 'Без +All', `+от +All (${state.plusAll})`, 'Итого', 'Тип'], rows)]),
    el('h3', { text: 'Сводка' }),
    kpi([
      { label: 'Атака', value: `+${(t.ad || 0).toFixed(0)}%` },
      { label: 'Крит / крит-урон', value: `+${(t.crit || 0).toFixed(0)}% / +${(t.critDmg || 0).toFixed(0)}%` },
      { label: 'Double Hit / Damage', value: `+${(t.dh || 0).toFixed(0)}% / +${(t.dd || 0).toFixed(0)}%` },
      { label: 'Пет', value: `+${(t.petDmg || 0).toFixed(0)}%` },
      { label: 'Босс', value: `+${(t.boss || 0).toFixed(0)}%` },
      { label: 'Фарм (голд/мат)', value: `+${(t.gold || 0).toFixed(0)}% / +${(t.mat || 0).toFixed(0)}%` },
    ]),
    pct.length || flat.length ? null : el('p', { class: 'muted', text: 'Пока не распределено ни одного очка.' }),
  ]);
}

/* ---------------------------------- Экипировка ---------------------------------- */

function gearSection(root, plan) {
  const rows = plan.gear.slots.map((slot) => {
    const p = slot.primary;
    const imp = p ? p.implicitTiers[Math.min(5, Math.max(0, tierIndex(state.level)))] : '—';
    const affixList = [...slot.affixes.prefixes, ...slot.affixes.suffixes]
      .map((a) => el('span', { class: 'chip', text: a.name }));
    const db = slot.dropBonuses.length ? slot.dropBonuses.map((d) => el('span', { class: 'chip gold', text: d.name })) : [el('span', { class: 'muted', text: '—' })];
    return {
      slot, row: [
        el('div', {}, [
          el('b', { text: slot.slotRu }),
          slot.note ? el('div', { class: 'muted', text: slot.note }) : null,
          slot.alternatives.length ? el('div', { class: 'muted', text: `альтернатива: ${slot.alternatives.map((a) => a.name).join(', ')}` }) : null,
          slot.locked && slot.locked.length ? el('div', { class: 'muted small', text: `откроется позже: ${slot.locked.map((a) => `${a.name} (${a.unlock})`).join(', ')}` }) : null,
        ]),
        p ? el('div', {}, [el('b', { text: p.name }), el('div', { class: 'muted', text: p.ru })]) : el('span', { class: 'muted', text: 'пусто (двуручное оружие)' }),
        el('div', {}, [el('div', { text: p ? `${p.implicit}` : '—' }), el('div', { class: 'muted', text: imp })]),
        el('div', { class: 'chips' }, affixList.length ? affixList : '—'),
        el('div', { class: 'chips' }, db),
        el('div', {}, [el('b', { text: slot.gem.family.ru }), el('div', { class: 'muted', text: slot.gem.baseValue || '—' })]),
      ],
    };
  });
  const skeleton = el('div', { class: 'skeleton' }, plan.gear.slots.map((s) => el('div', { class: 'slot-tile' + (s.primary ? '' : ' empty') }, [
    el('span', { class: 'slot-name', text: s.slotRu }),
    el('b', { text: s.primary ? s.primary.name : '— пусто —' }),
    el('span', { class: 'muted small', text: s.primary ? s.primary.implicit : (s.slot === 'offhand' ? 'двуручное оружие в основной руке' : 'нет данных') }),
    el('span', { class: 'muted small', text: `гем: ${s.gem.family.name} · ${s.gem.rarity}` }),
  ])));

  return card('Экипировка: что надевать в каждый слот', [
    el('h3', { text: `Скелет персонажа — ${plan.classRu} (${plan.className}), уровень ${state.level}` }),
    skeleton,
    el('p', { class: 'muted', text: 'Это те же 10 слотов, что в окне персонажа в игре: основная рука, вторая рука, факел, нагрудник, шлем, перчатки, обувь, амулет, кольцо, пояс. Ниже — подробно по каждому: семейство, имплисит, аффиксы и Drop Bonus.' }),
    el('div', { class: 'scroll' }, [table(
      ['Слот', 'Семейство', 'Имплисит', 'Аффиксы (ищите эти)', 'Drop Bonus', 'Гем'],
      rows.map((r) => r.row),
    )]),
    el('p', { class: 'muted', text: 'Правило: имя предмета меняется по тирам (T1 → T6, затем A1 после пробуждения). Например, меч воина: Broken Sword → Iron Sword → Steel Broadsword → Silver Saber → Runed Warblade → Frostfang Blade.' }),
    ...plan.profile.notes.map((n) => el('div', { class: 'infobox', text: n })),
  ]);
}

function tierIndex(level) {
  if (level >= 300) return 5;
  if (level >= 220) return 4;
  if (level >= 150) return 3;
  return 2;
}

/* ------------------------------------ Гемы ------------------------------------ */

function gemsSection(plan) {
  const regionRu = {
    weapon: 'Оружие — основная и вторая рука',
    torch: 'Факел (отдельный слот)',
    armor: 'Броня — нагрудник, шлем, перчатки, обувь',
    jewelry: 'Украшения — амулет, кольцо, пояс',
  };
  const regions = ['weapon', 'torch', 'armor', 'jewelry'];
  const goal = plan.goalDef.ru;

  const blocks = regions.map((r) => {
    const slots = plan.gear.slots.filter((s) => s.gem.region === r && s.gem.region);
    if (!slots.length) return null;
    const fam = slots[0].gem.family;
    const rows = slots.map((s) => {
      const alt = GEM_FAMILIES.filter((f) => f.id !== s.gem.family.id)
        .map((f) => `${f.name} — ${f.slots[r]}`)
        .join(' · ');
      return [
        el('b', { text: s.slotRu }),
        el('div', {}, [el('b', { class: 'want', text: `${s.gem.family.name} (${s.gem.family.ru})` }), el('div', { class: 'muted small', text: 'ставить сюда' })]),
        el('div', {}, [el('b', { text: s.gem.baseValue }), el('div', { class: 'muted small', text: `Rough, качество 100, сокет 0 — ${s.gem.rarity} даст больше` })]),
        el('div', { class: 'muted small', text: `Другие камни в этом слоте: ${alt}` }),
      ];
    });
    return el('div', { class: 'branch' }, [
      el('header', {}, [
        el('strong', { text: regionRu[r] }),
        el('div', { class: 'chips' }, [
          el('span', { class: 'chip gold', text: `лучший выбор: ${fam.name}` }),
          el('span', { class: 'chip', text: fam.slots[r] }),
        ]),
      ]),
      el('div', { class: 'scroll' }, [table(['Слот', 'Камень', 'Что даёт в этом слоте', 'Альтернативы'], rows)]),
    ]);
  }).filter(Boolean);

  // Короткая памятка «какой камень лучше» под цель — чтобы не читать таблицы целиком.
  const summary = regions.map((r) => {
    const fam = plan.gear.slots.find((s) => s.gem.region === r)?.gem.family;
    if (!fam) return null;
    const skill = plan.gear.profile.gems[r];
    return el('li', {}, [
      el('b', { text: `${regionRu[r]}: ${fam.name} (${fam.ru})` }),
      el('span', { text: ` — ${fam.slots[r]}` }),
    ]);
  }).filter(Boolean);

  return card('Гемы: какой камень куда ставить', [
    el('div', { class: 'infobox' }, [
      el('b', { text: `Лучшие камни под цель «${goal}»` }),
      el('ul', { class: 'tight' }, summary),
      el('p', { class: 'muted', text: 'Камень занимает слот и даёт эффект, зависящий от группы слотов: один и тот же Garnet в оружии — это урон, в броне — Defense, в украшениях — основной атрибут. Поэтому «лучший» камень определяется слотом и целью, а не редкостью.' }),
    ]),
    ...blocks,
    el('h3', { text: 'Когда менять основной камень' }),
    el('ul', { class: 'tight' }, [
      el('li', { text: 'Не хватает выживаемости на высоком ML — поставьте Lapis в броню (Max Health/Defense) вместо Garnet/Jade.' }),
      el('li', { text: 'Фармите золото/материалы — Amber во все слоты: он даёт фарм-статы в каждой группе.' }),
      el('li', { text: 'Пет-билд — Jade в оружие и броню (Pet Damage) и Lapis в факел (Pet Mastery).' }),
      el('li', { text: 'Retaliation — Garnet везде: Defense и Max Health напрямую усиливают урон Retaliation.' }),
    ]),
    el('h3', { text: `Вторичные статы для ${plan.classRu} · ${goal}` }),
    el('div', { class: 'scroll' }, [
      table(['Вторичный стат', 'Cut', 'Polished', 'Brilliant', 'Flawless', 'Для этой цели'],
        GEM_SECONDARY.map((s) => {
          const wanted = plan.gear.profile.gems.secondary.includes(s.stat);
          return [el('b', { text: s.ru, class: wanted ? 'want' : '' }), `+${s.cut}`, `+${s.polished}`, `+${s.brilliant}`, `+${s.flawless}`, wanted ? '★ приоритет' : '—'];
        })),
    ]),
    el('p', { class: 'muted', text: 'Вторички появляются с Cut-редкости: Cut — 1, Polished — 1, Brilliant — 2, Flawless — 3. Рероллить вторички можно только на Brilliant и Flawless.' }),
    el('h3', { text: 'Редкости гемов' }),
    table(['Редкость', 'Множитель', 'Вторичек', 'Кап сокета'], GEM_RARITY.map((g) => [g.name, `×${g.mult}`, g.secondary, g.socketCap == null ? 'нет' : g.socketCap])),
    el('div', { class: 'infobox' }, [
      el('b', { text: 'Порядок действий с гемами' }),
      el('ol', {}, [
        el('li', { text: 'Заполните все доступные сокеты — пустой сокет хуже слабого гема.' }),
        el('li', { text: 'Фьюзьте излишки: 3 гема одной редкости → 1 следующей (кроме Flawless, он только дроп с ML 160).' }),
        el('li', { text: 'Реролл вторичек — только на Brilliant и Flawless. Rough/Cut/Polished не реролльте (Gem Dust дорогой).' }),
        el('li', { text: 'Уровни сокетов дают +0.04 к множителю слота: выгоднее поднять несколько сокетов, чем один в потолок.' }),
      ]),
    ]),
  ]);
}

function slotRarity(plan) {
  return plan.level >= 160 ? 'Flawless' : plan.level >= 115 ? 'Brilliant' : plan.level >= 65 ? 'Polished' : 'Cut';
}

/* ---------------------------------- Остальные ---------------------------------- */

function statsSection(plan) {
  return card('Приоритет характеристик и заметки по билду', [
    el('ol', {}, plan.statPriority.map((id) => {
      const s = STATS.find((x) => x.id === id);
      return el('li', {}, [el('b', { text: s ? `${s.ru} · ${s.name}` : id }), s?.desc ? el('div', { class: 'muted', text: s.desc }) : null]);
    })),
    el('h3', { text: 'Талисманы (2 слота)' }),
    chips(plan.profile.talismans),
    el('h3', { text: 'Петы (4 слота)' }),
    el('p', { text: plan.profile.pets }),
  ]);
}

function shareSection(root, plan) {
  return card('Обмен сборкой', [
    el('div', { class: 'actions' }, [
      el('button', { class: 'btn primary', text: 'Создать код', onclick: () => { state.shareCode = encodePlan(plan, state.plusAll); render(root); } }),
      copyButton(planToText(plan), 'Скопировать текст плана'),
      el('button', {
        class: 'btn', text: 'Загрузить код',
        onclick: () => {
          const code = prompt('Вставьте код сборки:');
          const decoded = code ? decodePlan(code.trim()) : null;
          if (decoded) {
            state.classId = decoded.classId; state.level = decoded.level; state.goal = decoded.goal;
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

export function render(root) {
  root.innerHTML = '';
  const classPicker = el('div', { class: 'classes' }, CLASSES.map((c) =>
    el('button', {
      class: `class-btn ${c.id === state.classId ? 'active' : ''}`,
      onclick: () => { state.classId = c.id; state.manual = null; state.mode = 'auto'; state.shareCode = ''; render(root); },
    }, [document.createTextNode(c.ru), el('span', { text: `${c.name} · ${c.role}` })])));

  const controls = el('div', { class: 'controls' }, [
    el('div', {}, [el('label', { text: 'Уровень персонажа' }),
      el('input', { type: 'number', min: '1', max: '999', value: String(state.level), oninput: (e) => { state.level = Math.max(1, Number(e.target.value) || 1); render(root); } })]),
    el('div', {}, [el('label', { text: 'Цель билда' }),
      el('select', { onchange: (e) => { state.goal = e.target.value; state.manual = null; state.mode = 'auto'; render(root); } },
        GOALS.map((g) => el('option', { value: g.id, selected: g.id === state.goal ? 'selected' : null }, [`${g.ru} — ${g.desc}`])))]),
    el('div', {}, [el('label', { text: 'Monster Level (для диапазона имплиситов)' }),
      el('input', { type: 'number', min: '1', max: '999', value: String(state.level), oninput: (e) => { state.level = Math.max(1, Number(e.target.value) || 1); render(root); } })]),
  ]);

  const plan = planBuild({
    classId: state.classId, level: state.level, goal: state.goal,
    plusAll: state.plusAll, extraPoints: state.extraPoints,
    manual: state.mode === 'manual' ? (state.manual || {}) : null,
  });
  if (state.mode === 'auto') state.manual = { ...plan.allocations };

  const stance = STANCES.find((s) => s.id === plan.profile.stance);

  root.appendChild(card('Класс', [classPicker]));
  root.appendChild(card('Параметры', [controls]));
  root.appendChild(card(`План: ${plan.classRu} (${plan.className}) · ${plan.goalDef.ru}`, [
    el('div', { class: 'grid cols-3' }, [
      el('div', {}, [el('label', { text: 'Стойка' }), el('b', { text: `${stance?.ru} (${stance?.name})` }), el('div', { class: 'muted', text: stance?.focus })]),
      el('div', {}, [el('label', { text: 'Очков навыков' }), el('b', { text: `${plan.points.spent} / ${plan.points.available}` })]),
      el('div', {}, [el('label', { text: '+All Class Skills' }), el('b', { text: `+${state.plusAll}` })]),
    ]),
    ...plan.warnings.map((w) => el('div', { class: 'warnbox', text: '⚠ ' + w })),
    ...(plan.tips || []).map((t) => el('div', { class: 'infobox', text: '💡 ' + t })),
  ]));
  root.appendChild(plusAllSection(plan));
  root.appendChild(skillsSection(root, plan));
  root.appendChild(totalsSection(plan));
  root.appendChild(gearSection(root, plan));
  root.appendChild(gemsSection(plan));
  root.appendChild(statsSection(plan));
  root.appendChild(shareSection(root, plan));
}

export { state as plannerState };
