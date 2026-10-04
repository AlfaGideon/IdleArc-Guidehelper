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
import {
  GEM_FAMILIES, GEM_RARITY, GEM_SECONDARY, RARITY, ITEM_TIERS, SLOT_EN, SLOT_RU,
  GEAR_CELLS, CLASS_GEAR_RULES, SLOT_GEM_COUNT, FAMILY_AWAKEN, familyById, GEAR_FAMILIES, gearCellById,
  familyUnlockMl, HAND2_LABELS,
} from '../data/items.js';
import {
  FORGE_TIERS, FORGE_MAX_RANK, forgeTierInfo, forgeStep, forgeRank, forgeCumulative, AWAKEN_MAX, AWAKEN_NOTE,
} from '../data/forge.js';
import { planBuild, planToText, encodePlan, decodePlan, nextPointLevel } from '../core/planner.js';
import { el, card, table, kpi, copyButton } from './dom.js';
import { itemArt, lockArt, tierColors, talismanArt, bodySilhouette, coinIcon, shardIcon } from './itemArt.js';
import { artState, loadArt, artNode, lockedArtNode, artDownload, downloadArtViaBrowser } from './art.js';
import {
  saveState, loadState, savedAt, clearState, listLoadouts, saveLoadout, getLoadout, deleteLoadout,
} from './store.js';

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
  gear: {},           // экипировка по классам: { warrior: { mainhand: { family, tier, level, awaken }, … }, … }
  page: 'class',      // текущая страница планировщика (вместо одной длинной ленты)
  restored: false,    // состояние поднято из localStorage при загрузке страницы
};

/** Снимок для сохранения в браузере (всё, что ввёл пользователь). */
function snapshot() {
  return {
    classId: state.classId,
    level: state.level,
    ml: state.ml,
    goal: state.goal,
    plusAll: state.plusAll,
    extraPoints: state.extraPoints,
    mode: state.mode,
    manual: state.manual,
    gear: state.gear,
    page: state.page,
    shareCode: state.shareCode,
  };
}

/** Применить снимок (загрузка из браузера или из набора). */
function applySnapshot(snap) {
  if (!snap) return false;
  if (snap.classId && CLASSES.some((c) => c.id === snap.classId)) state.classId = snap.classId;
  if (Number.isFinite(snap.level)) state.level = Math.max(1, Math.round(snap.level));
  if (Number.isFinite(snap.ml)) state.ml = Math.max(1, Math.round(snap.ml));
  if (snap.goal && GOALS.some((g) => g.id === snap.goal)) state.goal = snap.goal;
  if (Number.isFinite(snap.plusAll)) state.plusAll = Math.max(0, Math.round(snap.plusAll));
  if (Number.isFinite(snap.extraPoints)) state.extraPoints = Math.max(0, Math.round(snap.extraPoints));
  if (snap.gear && typeof snap.gear === 'object') state.gear = snap.gear;
  if (snap.page && PAGES.some((p) => p.id === snap.page)) state.page = snap.page;
  if (snap.manual && typeof snap.manual === 'object') { state.manual = snap.manual; state.mode = 'manual'; }
  else if (snap.mode === 'auto') { state.manual = null; state.mode = 'auto'; }
  if (typeof snap.shareCode === 'string') state.shareCode = snap.shareCode;
  return true;
}

// Поднимаем прошлую сессию из браузера: заполнять заново не нужно.
if (applySnapshot(loadState())) state.restored = true;

// Карта игровых иконок: ищем локальные (assets/items) или тянем Item Codex.
// Когда карта придёт, один раз перерисовываем экран — карточки подменятся на игровые картинки.
let artApplied = false;
loadArt().then(() => {
  if (artApplied || !artState.index) return;
  artApplied = true;
  const view = document.getElementById('view');
  if (view && view.children && view.children.length) render(view);
}).catch(() => {});

/** Человеческое время последнего сохранения. */
function savedAtText() {
  const iso = savedAt();
  if (!iso) return 'ещё не сохранялось';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'сохранено';
  const two = (n) => String(n).padStart(2, '0');
  return `сохранено ${two(d.getHours())}:${two(d.getMinutes())}`;
}

const TALISMAN_TYPES = TALISMANS.types;
const talismanById = (id) => TALISMAN_TYPES.find((t) => t.id === id) || TALISMAN_TYPES[0];

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

/* --------------------------- Страницы планировщика --------------------------- */
/*
 * Раньше это была одна длинная лента: экран снаряжения, Кузница, камни и чек-лист шли
 * подряд, и на каждое нажатие перерисовывалось всё сразу — долго и неудобно.
 * Теперь планировщик разбит на отдельные страницы: на экране всегда только одна,
 * поэтому переключение мгновенное, а Кузница получила собственную страницу с дизайном.
 */
const PAGES = [
  { id: 'class', n: 1, title: 'Класс и цель', short: 'Класс', hint: 'кто играет и под какую задачу' },
  { id: 'levels', n: 2, title: 'Уровни: персонаж и Monster Level', short: 'Уровни', hint: 'уровень даёт очки, Monster Level — дроп' },
  { id: 'skills', n: 3, title: 'Куда вложить очки навыков', short: 'Навыки', hint: 'ветки, тиры, +All Class Skills' },
  { id: 'gear', n: 4, title: 'Снаряжение', short: 'Снаряжение', hint: 'экран персонажа и что искать в каждом слоте' },
  { id: 'forge', n: 5, title: 'Кузница: тир, «+N» и цена шагов', short: 'Кузница', hint: 'прогресс по слотам и что качать первым' },
  { id: 'gems', n: 6, title: 'Какие камни вставить', short: 'Камни', hint: 'камень на каждый слот и редкость по ML' },
  { id: 'next', n: 7, title: 'Что делать дальше', short: 'Что дальше', hint: 'чек-лист под ваш уровень и ML' },
  { id: 'build', n: 8, title: 'Сборка и сохранение', short: 'Сборка', hint: 'код сборки, наборы, автосохранение' },
];

const PAGE_IDS = PAGES.map((p) => p.id);
const pageIndex = (id) => Math.max(0, PAGES.findIndex((p) => p.id === id));
const currentPage = () => PAGES[pageIndex(state.page)] || PAGES[0];

/** Перейти на страницу: перерисовываем только её — это и быстро, и без «простыни» текста. */
function goTo(root, id) {
  state.page = PAGE_IDS.includes(id) ? id : PAGES[0].id;
  render(root);
  if (typeof document !== 'undefined' && document.getElementById) {
    const nav = document.getElementById('pagenav');
    if (nav && nav.scrollIntoView) nav.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/** Короткая шапка-гайд: объясняет, что это пошаговый план, а не одна длинная форма. */
function guideHead(plan) {
  return el('section', { class: 'card guide-head' }, [
    el('h2', { text: 'Гайд: как собрать персонажа в IdleArc' }),
    el('p', { class: 'muted', text: 'План разбит на страницы — идите по номерам слева направо: класс и цель → уровни → навыки → снаряжение → Кузница → камни → что делать дальше. Состояние сохраняется в браузере, можно вернуться на любую страницу.' }),
    statusLine(plan),
  ]);
}

/** Верхняя полоса: где вы сейчас (класс, цель, уровни, +All) — видна на любой странице. */
function statusLine(plan) {
  return el('div', { class: 'statusline' }, [
    el('span', { class: 'chip', text: `${plan.classRu} (${plan.className})` }),
    el('span', { class: 'chip', text: plan.goalDef.ru }),
    el('span', { class: 'chip', text: `ур. ${plan.level}` }),
    el('span', { class: 'chip', text: `ML ${plan.ml}` }),
    el('span', { class: 'chip', text: `+All ${state.plusAll}` }),
  ]);
}

/** Навигация по страницам: вместо одной длинной ленты — 8 отдельных экранов. */
function pageNav(root) {
  return el('nav', { class: 'pagenav', id: 'pagenav' }, PAGES.map((p) => el('button', {
    class: `pnav${p.id === state.page ? ' active' : ''}`,
    'data-page': p.id,
    title: p.hint,
    onclick: () => goTo(root, p.id),
  }, [
    el('span', { class: 'pnum', text: String(p.n) }),
    el('span', { class: 'ptitle', text: p.short }),
  ])));
}

function pageCard(page, children) {
  return el('section', { class: 'card step', id: `page-${page.id}`, 'data-page': page.id }, [
    el('h2', {}, [el('span', { class: 'step-num', text: `Страница ${page.n}` }), el('span', { text: page.title })]),
    el('p', { class: 'muted small', text: page.hint }),
    ...[].concat(children),
  ]);
}

/** Низ страницы: переходы «назад/далее», чтобы листать по порядку. */
function pageFooter(root) {
  const i = pageIndex(state.page);
  const prev = PAGES[i - 1];
  const next = PAGES[i + 1];
  return el('div', { class: 'pagefoot' }, [
    prev
      ? el('button', { class: 'btn', text: `← ${prev.n}. ${prev.short}`, onclick: () => goTo(root, prev.id) })
      : el('span', { class: 'muted small', text: 'Это первая страница' }),
    el('span', { class: 'muted small', text: `Страница ${i + 1} из ${PAGES.length}` }),
    next
      ? el('button', { class: 'btn primary', text: `${next.n}. ${next.short} →`, onclick: () => goTo(root, next.id) })
      : el('span', { class: 'muted small', text: 'Это последняя страница' }),
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

/** Формат больших чисел: 4 180 000. */
const fmtNum = (n) => Number(n).toLocaleString('ru-RU').replace(/\u00a0/g, ' ');

/** Подписи ячейки второй руки: у каждого класса она своя (щит / второе оружие / двуручное). */
function hand2Label(plan, cell) {
  const kind = (CLASS_GEAR_RULES[plan.classId] || {}).hand2 || 'offhand';
  const label = HAND2_LABELS[kind] || HAND2_LABELS.offhand;
  return { ru: label.ru, en: label.en, cellRu: label.ru, cellEn: label.en, kind };
}

/** Подпись ячейки с учётом класса (у разбойника «Вторая рука» становится «Оружием 2»). */
function cellLabels(plan, cell) {
  if (cell.id === 'hand2') {
    const h = hand2Label(plan, cell);
    return { ru: h.ru, en: h.en };
  }
  return { ru: cell.ru, en: cell.en };
}

/** Семейства предметов, которые класс реально может носить в этой ячейке. */
function cellFamilies(plan, cell) {
  if (cell.slot === 'talisman') return [];
  const kind = (CLASS_GEAR_RULES[plan.classId] || {}).hand2 || 'offhand';
  if (cell.id === 'hand2' && kind === 'weapon2') {
    // Второе оружие: одноручные семейства самого класса.
    return GEAR_FAMILIES.filter((f) => f.slot === 'mainhand' && f.hand !== '2H' && (f.cls === 'all' || f.cls === plan.classId));
  }
  return GEAR_FAMILIES.filter((f) => f.slot === cell.slot && (f.cls === 'all' || f.cls === plan.classId));
}

/** Ячейка доступна классу? (у друида вторая рука занята двуручным посохом) */
function cellUsable(plan, cell) {
  const rules = CLASS_GEAR_RULES[plan.classId] || { locked: {} };
  return !(rules.locked && rules.locked[cell.id]);
}

/**
 * Экипировка текущего класса (хранится в состоянии и в localStorage, поэтому не теряется
 * при перезагрузке). Для каждой ячейки: семейство предмета, тир и шаги Кузницы «+N»,
 * для ячеек талисманов — вид талисмана и уровень инфузии.
 */
function gearStateFor(plan) {
  if (!state.gear || typeof state.gear !== 'object') state.gear = {};
  const cls = (state.gear[plan.classId] = state.gear[plan.classId] || {});
  for (const cell of GEAR_CELLS) {
    const st = cls[cell.id];
    if (cell.slot === 'talisman') {
      if (st && typeof st === 'object') {
        st.level = Math.min(9, Math.max(0, Math.round(Number(st.level) || 0)));
        if (!TALISMAN_TYPES.some((t) => t.id === st.talisman)) st.talisman = TALISMAN_TYPES[0].id;
      } else {
        cls[cell.id] = { talisman: TALISMAN_TYPES[0].id, level: 0 };
      }
      continue;
    }
    if (st && typeof st === 'object') {
      st.tier = Math.min(6, Math.max(1, Math.round(Number(st.tier) || plan.itemTier.tier)));
      st.level = Math.min(forgeTierInfo(st.tier).maxLevel, Math.max(0, Math.round(Number(st.level) || 0)));
      st.awaken = Math.min(AWAKEN_MAX, Math.max(0, Math.round(Number(st.awaken) || 0)));
      if (st.family && !familyById(st.family)) st.family = null;
      continue;
    }
    const list = cellFamilies(plan, cell);
    cls[cell.id] = {
      family: list.length ? list[0].id : null,
      tier: plan.itemTier.tier,
      level: 0,
      awaken: 0,
    };
  }
  return cls;
}

/** Лицевая сторона ячейки: картинка и то же, что видно в игре — тир и «+N» Кузницы. */
function cellFront(plan, cell, st, usable) {
  const info = forgeTierInfo(st.tier);
  const family = st.family ? familyById(st.family) : null;
  const label = cellLabels(plan, cell);
  const color = tierColors(st.tier)[0];
  const notYet = usable && family && familyUnlockMl(family) > plan.ml;
  const art = cell.slot === 'talisman'
    ? el('span', { class: 'art-svg', html: talismanArt(st.talisman) })
    : (usable ? artNode(family, st.tier, st.awaken) : lockedArtNode(st.tier));
  return el('div', { class: 'face front' }, [
    el('div', { class: 'art' }, [art]),
    el('div', { class: 'badges' }, cell.slot === 'talisman'
      ? [el('span', { class: 'tag plus', text: `+${st.level}` })]
      : [
        el('span', { class: 'tag tiertag', style: `border-color:${color};color:${color}`, text: `T${st.tier}` }),
        usable ? el('span', { class: 'tag plus', text: `+${st.level}` }) : el('span', { class: 'tag', text: 'закрыто' }),
      ]),
    el('div', { class: 'cellname', text: `${label.ru} (${label.en})` }),
    el('div', { class: 'muted small', text: cell.slot === 'talisman'
      ? talismanById(st.talisman).ru + ' (' + talismanById(st.talisman).name + ')'
      : (usable ? (family ? (st.awaken > 0 ? `${family.name} → Awaken` : (family.tierNames[st.tier - 1] || family.name)) : 'предмет не выбран') : 'занято двуручным') }),
    notYet ? el('div', { class: 'chip warn', text: `дроп с ML ${familyUnlockMl(family)}` }) : null,
  ]);
}

/** Обратная сторона: параметры предмета (имплисит, аффиксы, камни, Кузница). */
function cellBack(plan, cell, st, usable) {
  const info = forgeTierInfo(st.tier);
  const family = st.family ? familyById(st.family) : null;
  const label = cellLabels(plan, cell);
  const gems = SLOT_GEM_COUNT[cell.slot] == null ? 0 : SLOT_GEM_COUNT[cell.slot];

  if (cell.slot === 'talisman') {
    const t = talismanById(st.talisman);
    const row = t.levels[st.level] || t.levels[0];
    const next = t.levels[Math.min(9, st.level + 1)];
    return el('div', { class: 'face back' }, [
      el('div', { class: 'cellname', text: `${label.ru} (${label.en})` }),
      el('b', { text: biText(t.ru, t.name) }),
      el('div', { class: 'muted small', text: t.stats }),
      el('div', { class: 'muted small', text: `Уровень инфузии +${st.level}: ${row[1]} · ${row[2]}` }),
      st.level < 9
        ? el('div', { class: 'muted small', text: `Следующий уровень +${st.level + 1}: ${next[1]} · ${next[2]}` })
        : el('div', { class: 'muted small', text: 'Максимальный уровень инфузии.' }),
      el('div', { class: 'muted small', text: 'Второй талисман берут под вторую задачу: например, Iron под выживание, Spirit под пета.' }),
    ]);
  }

  const rank = forgeRank(st.tier, st.level);
  const step = st.level < info.maxLevel ? forgeStep(st.tier, st.level) : null;
  const tierName = family ? (family.tierNames[st.tier - 1] || family.name) : null;
  const implicit = family ? (family.implicitTiers[st.tier - 1] || family.implicit) : null;
  const awakenName = family && st.awaken > 0 ? FAMILY_AWAKEN[family.id] : null;
  const dropMl = family ? familyUnlockMl(family) : 1;
  const notYet = usable && family && dropMl > plan.ml;

  return el('div', { class: 'face back' }, [
    el('div', { class: 'cellname', text: `${label.ru} (${label.en})` }),
    family
      ? el('div', {}, [
        el('b', { text: biText(family.ru, family.name) }),
        el('div', { class: 'muted small', text: `Тир ${st.tier} ${info.ru} (${info.name}) · ${tierName}` }),
      ])
      : el('div', { class: 'muted', text: usable ? 'предмет не выбран' : 'занято двуручным оружием' }),
    family ? el('div', { class: 'muted small', text: `Имплисит: ${family.implicit} — ${implicit}` }) : null,
    family ? el('div', { class: 'muted small', text: `Аффиксов от тира: ${info.affixSlots} · камней: ${gems}` }) : null,
    usable ? el('div', { class: 'muted small', text: `Кузница слота: T${st.tier} +${st.level} из +${info.maxLevel} → ранг ${rank.rank}/100` }) : null,
    usable && step ? el('div', { class: 'muted small', text: `Шаг Кузницы: ${fmtNum(step.gold)} золота · ${step.fragments} × ${info.fragmentRu} · успех ${Math.round(step.success * 100)}%` }) : null,
    usable && !step ? el('div', { class: 'muted small', text: 'Тир прокачан полностью — открывается следующий.' }) : null,
    family && st.awaken > 0 && awakenName ? el('div', { class: 'muted small', text: `Awaken ${st.awaken}/${AWAKEN_MAX}: ${awakenName}` }) : null,
    family ? el('div', { class: 'muted small', text: `Появляется: ${family.unlock}` }) : null,
    notYet ? el('div', { class: 'muted small', text: `На вашем ML ${plan.ml} этот предмет ещё не падает — начнёт с ML ${dropMl}.` }) : null,
  ]);
}

/** Карточка-перевёртыш: снаружи картинка и тир, внутри — параметры предмета. */
function gearCellCard(plan, root, gear, cell) {
  const st = gear[cell.id];
  const usable = cellUsable(plan, cell);
  let cardEl;
  const toggle = () => cardEl.classList.toggle('flipped');
  cardEl = el('div', {
    class: `flipcard${usable ? '' : ' locked'}${cell.row === 4 ? ' small' : ''}`,
    role: 'button',
    tabindex: '0',
    title: 'Нажмите — карточка перевернётся и покажет параметры',
    onclick: toggle,
    onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } },
  }, [el('div', { class: 'inner' }, [cellFront(plan, cell, st, usable), cellBack(plan, cell, st, usable)])]);
  return cardEl;
}

/** Строка Кузницы: выбор предмета, тира, шагов «+N» и цена следующего шага. */
/** Панель «картинки предметов»: настоящие игровые иконки или нарисованные. */
function artPanel(root) {
  const st = artState;
  const chip = st.mode === 'local'
    ? el('span', { class: 'chip good', text: `игровые иконки в проекте: ${st.files}` })
    : st.mode === 'cdn'
      ? el('span', { class: 'chip good', text: 'игровые иконки берутся с CDN игры' })
      : el('span', { class: 'chip warn', text: 'пока нарисованные иконки' });

  return el('div', { class: 'infobox' }, [
    el('b', { text: 'Картинки предметов' }),
    el('div', { class: 'chips' }, [chip, el('span', { class: 'chip', text: `файлов: ${st.files}` })]),
    el('p', { class: 'muted', text: st.mode === 'local'
      ? 'Иконки скачаны в папку assets/items и раздаются вместе с приложением — работают даже без интернета.'
      : 'Показаны нарисованные иконки: игровые не загружены. Нажмите кнопку — сервер скачает официальные иконки предметов из Item Codex и положит их в проект.' }),
    el('div', { class: 'actions' }, [
      el('button', {
        class: 'btn primary',
        text: st.loading ? 'Загрузка…' : 'Скачать игровые картинки',
        disabled: st.loading ? 'disabled' : null,
        onclick: async (e) => {
          e.target.textContent = 'Скачиваю…';
          try {
            const res = await fetch('api/art/fetch', { method: 'POST' });
            const data = await res.json();
            if (!data.ok) alert(`Не получилось скачать игровые картинки.\n${data.error || ''}\n${data.hint || ''}`);
          } catch (err) {
            alert(`Не получилось скачать игровые картинки: ${err.message}`);
          }
          await loadArt(true);
          render(root);
        },
      }),
      el('button', {
        class: 'btn',
        text: 'Проверить ещё раз',
        onclick: async () => { await loadArt(true); render(root); },
      }),
    ]),
    el('p', { class: 'muted small', text: 'Если у сервера нет интернета, нажмите эту кнопку — картинки скачает ваш браузер и передаст их серверу: после этого иконки будут храниться в проекте и работать без сети.' }),
    el('div', { class: 'actions' }, [
      el('button', {
        class: 'btn primary',
        text: artDownload.active ? 'Скачиваю…' : 'Скачать игровые картинки через браузер',
        disabled: artDownload.active ? 'disabled' : null,
        onclick: async (e) => {
          e.target.textContent = 'Скачиваю через браузер…';
          const out = await downloadArtViaBrowser((done, total) => {
            const t = document.querySelector ? document.querySelector('#art-progress') : null;
            if (t) t.textContent = `Скачано ${done} из ${total}`;
          });
          if (!out.ok) alert(`Не получилось скачать картинки: ${out.error || artDownload.note}`);
          await loadArt(true);
          render(root);
        },
      }),
    ]),
    artDownload.note || artDownload.active
      ? el('p', { class: 'muted small', id: 'art-progress', text: artDownload.note + (artDownload.total ? ` (${artDownload.done}/${artDownload.total})` : '') })
      : null,
  ]);
}

/** Шаг 4 целиком: экран снаряжения как в игре (силуэт персонажа) + панель Кузницы. */
/** Шаг 4: экран снаряжения как в игре (без Кузницы — она на своей странице). */
function gearStep(plan, root) {
  const gear = gearStateFor(plan);
  const usableCells = GEAR_CELLS.filter((c) => cellUsable(plan, c) && c.slot !== 'talisman');

  const grid = el('div', { class: 'gear-doll' }, [
    el('div', { class: 'doll-figure', html: bodySilhouette() }),
    ...GEAR_CELLS.map((cell) => gearCellCard(plan, root, gear, cell)),
  ]);

  const lockedNotes = GEAR_CELLS
    .filter((cell) => !cellUsable(plan, cell))
    .map((cell) => el('li', { text: `${cell.ru} (${cell.en}) — ${CLASS_GEAR_RULES[plan.classId].locked[cell.id]}` }));

  const rankTotal = usableCells.reduce((a, c) => a + forgeRank(gear[c.id].tier, gear[c.id].level).rank, 0);
  const awakenCount = usableCells.filter((c) => gear[c.id].awaken > 0).length;

  const slotRows = plan.gear.slots.map((s) => {
    const p = s.primary;
    const affixList = [...s.affixes.prefixes, ...s.affixes.suffixes].map((a) => el('span', { class: 'chip', text: biText(a.ru, a.name) }));
    const db = s.dropBonuses.length ? s.dropBonuses.map((d) => el('span', { class: 'chip gold', text: biText(d.ru, d.name) })) : [el('span', { class: 'muted', text: '—' })];
    return [
      el('div', {}, [el('b', { text: s.slotRu }), el('div', { class: 'muted small', text: SLOT_EN[s.slot] || s.slot })]),
      p ? el('div', {}, [
        el('b', { text: p.ru }), el('span', { class: 'en', text: ` (${p.name})` }),
        el('div', { class: 'muted small', text: `${p.hand === '2H' ? 'двуручное' : p.hand === '1H' ? 'одноручное' : 'оффхенд'} · ${p.unlock}` }),
      ]) : el('span', { class: 'muted', text: '—' }),
      p ? el('div', {}, [
        el('b', { text: s.tierNameNow }),
        el('div', { class: 'muted small', text: `имплисит ${plan.itemTier.tierLabel}: ${s.implicitNow}` }),
      ]) : el('span', { class: 'muted', text: '—' }),
      el('div', { class: 'chips' }, affixList.length ? affixList : '—'),
      el('div', { class: 'chips' }, db),
    ];
  });

  return [
    el('h3', { text: `Экран снаряжения — ${biText(plan.classRu, plan.className)}, ML ${plan.ml}` }),
    el('p', { class: 'muted', text: 'Ячейки стоят как в игровом окне снаряжения: сверху факел, шлем и амулет, ниже оружие, нагрудник и вторая рука, затем кольца и пояс, в последней строке — талисманы, перчатки и обувь. На карточке видно то же, что в игре: тир и «+N» Кузницы. Нажмите на карточку — она перевернётся и покажет параметры предмета.' }),
    grid,
    el('div', { class: 'gear-legend' }, [
      el('span', { class: 'chip', text: 'T1…T6 — тир Кузницы' }),
      el('span', { class: 'chip', text: '+N — шаги Кузницы внутри тира' }),
      el('span', { class: 'chip gold', text: `суммарный ранг Кузницы: ${rankTotal} / ${usableCells.length * 100}` }),
      awakenCount ? el('span', { class: 'chip', text: `просыпание: ${awakenCount} слот(ов)` }) : null,
    ]),
    artPanel(root),
    lockedNotes.length ? el('div', { class: 'infobox' }, [
      el('b', { text: 'Почему часть ячеек закрыта' }),
      el('ul', { class: 'tight' }, lockedNotes),
    ]) : null,
    el('div', { class: 'infobox' }, [
      el('b', { text: 'Что важно про тир и «+N»' }),
      el('p', { text: `В карточке слота стоит тир Кузницы и шаги «+N» — это прогресс СЛОТА, а не выпавшего предмета. Кузница качает слот отдельно: подробности, цены шагов и что качать первым — на странице «${PAGES[4].n}. ${PAGES[4].short}».` }),
    ]),
    el('h3', { text: 'Что искать в каждом слоте' }),
    el('div', { class: 'scroll' }, [table(
      ['Слот', 'Семейство предметов', 'Имя на вашем ML', 'Аффиксы (ищите эти)', 'Drop Bonus'],
      slotRows,
    )]),
    el('p', { class: 'muted', text: `Имплиситы и дроп — для тира, который чаще всего падает на ML ${plan.ml} (${plan.itemTier.tierLabel} ${plan.itemTier.ru} — ${plan.itemTier.chance}%).` }),
    ...plan.profile.notes.map((n) => el('div', { class: 'infobox', text: n })),
  ];
}

/* ------------------------------- Шаг 5: Кузница ------------------------------- */

/** Полоса прогресса с подписью внутри (уровень в тире, ранг слота). */
function progressBar(value, max, label, color) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return el('div', { class: 'pbar' }, [
    el('i', { style: `width:${pct}%;background:${color}` }),
    el('span', { text: label }),
  ]);
}

/** Стоимость шага: золото, фрагменты и шанс успеха одной строкой. */
function stepCost(step, tier) {
  if (!step) return el('div', { class: 'cost' }, [
    el('span', { class: 'muted small', text: 'Следующий шаг:' }),
    el('b', { text: 'тир прокачан полностью' }),
    el('span', { text: '— дальше открывается следующий тир' }),
  ]);
  const fragColor = tierColors(tier)[0];
  return el('div', { class: 'cost' }, [
    el('span', { class: 'muted small', text: 'Следующий шаг:' }),
    el('span', { class: 'ico', html: coinIcon() }), el('b', { text: fmtNum(step.gold) }),
    el('span', { class: 'ico', html: shardIcon(fragColor) }), el('b', { text: String(step.fragments) }),
    el('span', { text: forgeTierInfo(tier).fragmentRu }),
    el('span', { class: step.fail > 0 ? 'chip warn' : 'chip good', text: `успех ${Math.round(step.success * 100)}%` }),
  ]);
}

/**
 * Карточка слота в Кузнице: тир, шаги «+N», полосы прогресса, цена следующего шага
 * и быстрые кнопки. Именно так удобно вести прокачку: видно, что сейчас и сколько стоит.
 */
function forgeCard(plan, root, gear, cell) {
  const st = gear[cell.id];
  const info = forgeTierInfo(st.tier);
  const rank = forgeRank(st.tier, st.level);
  const maxed = st.level >= info.maxLevel;
  const step = maxed ? null : forgeStep(st.tier, st.level);
  const families = cellFamilies(plan, cell);
  const label = cellLabels(plan, cell);
  const family = st.family ? familyById(st.family) : null;
  const color = tierColors(st.tier)[0];
  const promoteStep = maxed && st.tier < 6 ? forgeStep(st.tier + 1, 0) : null;

  const setLevel = (v) => {
    st.level = Math.max(0, Math.min(info.maxLevel, v));
    render(root);
  };
  const setTier = (t) => {
    st.tier = Math.max(1, Math.min(6, t));
    st.level = Math.min(st.level, forgeTierInfo(st.tier).maxLevel);
    render(root);
  };

  const levelOptions = [];
  for (let i = 0; i <= info.maxLevel; i += 1) levelOptions.push(el('option', { value: String(i), selected: i === st.level ? 'selected' : null }, [`+${i}`]));

  return el('div', { class: `forgecard${maxed ? ' maxed' : ''}` }, [
    el('header', {}, [
      el('span', { class: 'fart' }, [usableArt(family, st)]),
      el('div', {}, [
        el('b', { text: `${label.ru} (${label.en})` }),
        el('div', { class: 'muted small', text: family ? biText(family.ru, family.name) : 'предмет не выбран' }),
      ]),
      el('span', { class: 'tag tiertag', style: `border-color:${color};color:${color};margin-left:auto`, text: `T${st.tier}` }),
      el('span', { class: 'tag plus', text: `+${st.level}` }),
    ]),
    el('div', { class: 'fcontrols' }, [
      el('select', { onchange: (e) => { st.family = e.target.value || null; render(root); } }, [
        el('option', { value: '', selected: st.family ? null : 'selected' }, ['— предмет —']),
        ...families.map((f) => el('option', { value: f.id, selected: f.id === st.family ? 'selected' : null }, [f.name])),
      ]),
      el('select', { onchange: (e) => setTier(Number(e.target.value)) },
        FORGE_TIERS.map((t) => el('option', { value: String(t.tier), selected: t.tier === st.tier ? 'selected' : null }, [`T${t.tier} ${t.ru}`]))),
      el('select', { onchange: (e) => setLevel(Number(e.target.value)) }, levelOptions),
      el('select', { onchange: (e) => { st.awaken = Number(e.target.value); render(root); } },
        [0, 1, 2, 3, 4, 5].map((r) => el('option', { value: String(r), selected: r === st.awaken ? 'selected' : null }, [r === 0 ? 'Awaken 0' : `Awaken ${r}`]))),
    ]),
    progressBar(st.level, info.maxLevel, `уровень тира: +${st.level} из +${info.maxLevel}`, color),
    progressBar(rank.rank, FORGE_MAX_RANK, `ранг слота: ${rank.rank} / ${FORGE_MAX_RANK}`, 'linear-gradient(90deg,#5ba7ff,#ffc857)'),
    stepCost(step, st.tier),
    el('div', { class: 'factions' }, [
      el('button', { class: 'btn tiny', text: '−1', disabled: st.level <= 0 ? 'disabled' : null, onclick: () => setLevel(st.level - 1) }),
      el('button', { class: 'btn tiny', text: '+1', disabled: maxed ? 'disabled' : null, onclick: () => setLevel(st.level + 1) }),
      el('button', { class: 'btn tiny', text: 'макс', disabled: maxed ? 'disabled' : null, onclick: () => setLevel(info.maxLevel) }),
      maxed && st.tier < 6
        ? el('button', { class: 'btn tiny primary', text: `Поднять тир → T${st.tier + 1}`, onclick: () => setTier(st.tier + 1) })
        : null,
      el('span', { class: 'muted small', text: `${info.affixSlots} аффикс-позиций · камней: ${SLOT_GEM_COUNT[cell.slot] || 0}` }),
    ]),
    promoteStep
      ? el('div', { class: 'muted small', text: `Промоушен в T${st.tier + 1}: первый шаг — ${fmtNum(promoteStep.gold)} золота и ${promoteStep.fragments} × ${forgeTierInfo(st.tier + 1).fragmentRu}.` })
      : null,
    st.awaken > 0 && family && FAMILY_AWAKEN[family.id]
      ? el('div', { class: 'muted small', text: `Awaken ${st.awaken}/${AWAKEN_MAX}: ${FAMILY_AWAKEN[family.id]}` })
      : null,
  ]);
}

/** Картинка предмета для карточки Кузницы (игровая или нарисованная). */
function usableArt(family, st) {
  if (!family) return el('span', { class: 'art-svg', html: itemArt(null, st.tier) });
  return artNode(family, st.tier, st.awaken, { size: 40 });
}

/** Что качать первым: самые дешёвые шаги и слоты, где тир упирается в максимум. */
function forgeAdvice(plan, gear, cells) {
  const rows = cells.map((cell) => {
    const st = gear[cell.id];
    const info = forgeTierInfo(st.tier);
    const maxed = st.level >= info.maxLevel;
    return {
      cell,
      st,
      info,
      maxed,
      step: maxed ? null : forgeStep(st.tier, st.level),
      promote: maxed && st.tier < 6 ? forgeStep(st.tier + 1, 0) : null,
      rank: forgeRank(st.tier, st.level).rank,
    };
  });

  const cheapest = rows.filter((r) => r.step).sort((a, b) => a.step.gold - b.step.gold).slice(0, 3);
  const promotions = rows.filter((r) => r.promote).sort((a, b) => a.promote.gold - b.promote.gold).slice(0, 3);
  const lowest = rows.slice().sort((a, b) => a.rank - b.rank).slice(0, 3);

  const items = [];
  if (cheapest.length) {
    items.push(el('div', { class: 'row' }, [
      el('b', { text: 'Дешевле всего прокачать' }),
      el('span', { text: cheapest.map((r) => `${cellLabels(plan, r.cell).ru} → ${fmtNum(r.step.gold)} золота (T${r.st.tier} +${r.st.level + 1})`).join(' · ') }),
    ]));
  }
  if (promotions.length) {
    items.push(el('div', { class: 'row' }, [
      el('b', { text: 'Тир уже максимум — пора на промоушен' }),
      el('span', { text: promotions.map((r) => `${cellLabels(plan, r.cell).ru} → T${r.st.tier + 1} (${fmtNum(r.promote.gold)} золота)`).join(' · ') }),
    ]));
  }
  if (lowest.length) {
    items.push(el('div', { class: 'row' }, [
      el('b', { text: 'Самые слабые слоты' }),
      el('span', { text: lowest.map((r) => `${cellLabels(plan, r.cell).ru} — ранг ${r.rank}/100`).join(' · ') }),
    ]));
  }
  items.push(el('div', { class: 'row' }, [
    el('b', { text: 'Как это работает' }),
    el('span', { text: 'Кузница качает слот целиком: сначала закрывайте дешёвые шаги в текущем тире, потом поднимайте тир. Каждый шаг усиливает имплисит слота, а каждый новый тир добавляет аффикс-позицию (Free Pick).' }),
  ]));
  return el('div', { class: 'advice' }, items);
}

/** Страница Кузницы: сводка, советник, карточки слотов и таблица тиров. */
function forgePage(plan, root) {
  const gear = gearStateFor(plan);
  const cells = GEAR_CELLS.filter((c) => cellUsable(plan, c) && c.slot !== 'talisman');
  const rows = cells.map((cell) => {
    const st = gear[cell.id];
    const info = forgeTierInfo(st.tier);
    return { st, info, rank: forgeRank(st.tier, st.level).rank, maxed: st.level >= info.maxLevel };
  });
  const rankTotal = rows.reduce((a, r) => a + r.rank, 0);
  const rankMax = cells.length * FORGE_MAX_RANK;
  const maxedSlots = rows.filter((r) => r.maxed).length;
  const byTier = FORGE_TIERS.map((t) => ({
    t,
    count: rows.filter((r) => r.st.tier === t.tier).length,
  })).filter((x) => x.count);

  const nextUp = cells
    .map((cell) => {
      const st = gear[cell.id];
      const info = forgeTierInfo(st.tier);
      const maxed = st.level >= info.maxLevel;
      const step = maxed ? (st.tier < 6 ? forgeStep(st.tier + 1, 0) : null) : forgeStep(st.tier, st.level);
      return step ? { cell, st, step, maxed } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.step.gold - b.step.gold)[0];

  const scale = el('div', { class: 'scroll' }, [table(
    ['Тир', 'Шагов «+N»', 'Золото до максимума', 'Фрагменты', 'Аффикс-позиций', 'Ранг слота'],
    FORGE_TIERS.map((t) => {
      const cum = forgeCumulative(t.tier, t.maxLevel);
      return [
        `T${t.tier} ${t.ru} (${t.name})`,
        `+${t.maxLevel}`,
        fmtNum(cum.gold),
        `${fmtNum(cum.fragments)} × ${t.fragmentRu}`,
        String(t.affixSlots),
        `${forgeRank(t.tier, t.maxLevel).rank}/100`,
      ];
    }),
  )]);

  return [
    el('h3', { text: 'Кузница: прогресс по слотам' }),
    el('div', { class: 'kpi' }, [
      el('div', { class: 'k' }, [el('b', { text: String(cells.length) }), el('span', { text: 'слотов в Кузнице' })]),
      el('div', { class: 'k' }, [el('b', { text: `${rankTotal} / ${rankMax}` }), el('span', { text: 'суммарный ранг' })]),
      el('div', { class: 'k' }, [el('b', { text: String(maxedSlots) }), el('span', { text: 'слотов на максимуме тира' })]),
      el('div', { class: 'k' }, [el('b', { text: byTier.map((x) => `${x.t.tier}×${x.count}`).join(' ') || '—' }), el('span', { text: 'слоты по тирам' })]),
    ]),
    nextUp
      ? el('p', { class: 'muted', text: `Ближайший выгодный шаг: ${cellLabels(plan, nextUp.cell).ru} — ${nextUp.maxed ? `промоушен в T${nextUp.st.tier + 1}` : `+${nextUp.st.level + 1} к T${nextUp.st.tier}`} за ${fmtNum(nextUp.step.gold)} золота, ${nextUp.step.fragments} × ${forgeTierInfo(nextUp.maxed ? nextUp.st.tier + 1 : nextUp.st.tier).fragmentRu} (успех ${Math.round(nextUp.step.success * 100)}%).` })
      : null,
    el('h3', { text: 'Что качать первым' }),
    forgeAdvice(plan, gear, cells),
    el('h3', { text: 'Слоты: тир, «+N» и цена следующего шага' }),
    el('div', { class: 'forgegrid' }, cells.map((cell) => forgeCard(plan, root, gear, cell))),
    el('div', { class: 'infobox' }, [
      el('b', { text: 'Кузница поднимает слот выше тира предмета' }),
      el('p', { text: 'Кузница (Forge) качает СЛОТ, а не отдельный предмет: у слота свой тир и свои шаги «+N». Поэтому в игре на карточке стоит, например, «T4 +19», даже если сам предмет выпал T2 — слот уже поднят Кузницей. Ранг слота (0…100) складывает шаги всех тиров: T1 +4, T2 +9, T3 +14, T4 +19, T5 +24, T6 +30.' }),
      el('p', { class: 'muted', text: 'Цифры стоимости — из официальных данных Item Codex (Кузница → Forge). К каждому шагу в игре ещё нужны материалы монстров: их список каждый уровень разный, его видно в Кузнице.' }),
    ]),
    el('h3', { text: 'Сколько стоит прокачать тир целиком' }),
    scale,
    el('p', { class: 'muted', text: AWAKEN_NOTE }),
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

/* --------------------------- Сохранение в браузере --------------------------- */

function loadoutRow(root, name) {
  const data = getLoadout(name);
  return el('div', { class: 'loadout' }, [
    el('b', { text: name }),
    el('span', { class: 'muted small', text: data ? 'сохранён' : 'пусто' }),
    el('button', { class: 'btn tiny', text: 'Сохранить', onclick: () => { saveLoadout(name, snapshot()); render(root); } }),
    el('button', { class: 'btn tiny', text: 'Загрузить', disabled: data ? null : 'disabled', onclick: () => { if (applySnapshot(getLoadout(name))) render(root); } }),
    el('button', { class: 'btn tiny', text: 'Удалить', disabled: data ? null : 'disabled', onclick: () => { deleteLoadout(name); render(root); } }),
  ]);
}

/** Карточка «данные не теряются»: автосохранение + три набора, как в игре. */
function saveCard(root, plan) {
  const names = listLoadouts();
  const count = Object.keys(names).length;
  return card('Сохранение: данные не теряются при перезагрузке', [
    el('p', { class: 'muted', text: 'Всё, что вы ввели — класс, цель, уровни персонажа и Monster Level, очки навыков, экипировка и Кузница, — автоматически сохраняется в браузере. После Ctrl+R, перезапуска сервера или закрытия вкладки планировщик откроется на том же состоянии.' }),
    el('div', { class: 'chips' }, [
      el('span', { class: 'chip good', text: state.restored ? 'прошлая сессия восстановлена из браузера' : 'автосохранение включено' }),
      el('span', { class: 'chip', text: savedAtText() }),
      el('span', { class: 'chip', text: `класс: ${plan.classRu}` }),
      el('span', { class: 'chip', text: `наборов сохранено: ${count}` }),
    ]),
    el('div', { class: 'loadoutbar' }, ['Набор 1', 'Набор 2', 'Набор 3'].map((n) => loadoutRow(root, n))),
    el('div', { class: 'actions' }, [
      el('button', { class: 'btn primary', text: 'Сохранить сейчас', onclick: () => { saveState(snapshot()); render(root); } }),
      el('button', { class: 'btn', text: 'Сбросить всё', onclick: () => { clearState(); state.restored = false; location.reload(); } }),
    ]),
    el('p', { class: 'muted small', text: 'Данные лежат только в вашем браузере (localStorage), никуда не отправляются. Кнопка «Сбросить всё» очищает их полностью.' }),
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

  const page = currentPage();
  root.appendChild(guideHead(plan));
  root.appendChild(pageNav(root));

  // Рисуем ТОЛЬКО активную страницу: меньше работы на каждое нажатие — интерфейс не тормозит.
  if (page.id === 'class') root.appendChild(pageCard(page, classStep(root, plan)));
  else if (page.id === 'levels') root.appendChild(pageCard(page, levelsStep(root, plan)));
  else if (page.id === 'skills') root.appendChild(pageCard(page, skillsStep(root, plan)));
  else if (page.id === 'gear') root.appendChild(pageCard(page, gearStep(plan, root)));
  else if (page.id === 'forge') root.appendChild(pageCard(page, forgePage(plan, root)));
  else if (page.id === 'gems') root.appendChild(pageCard(page, gemsStep(plan)));
  else if (page.id === 'next') root.appendChild(pageCard(page, nextStep(plan)));
  else if (page.id === 'build') root.appendChild(pageCard(page, [shareCard(root, plan), saveCard(root, plan)]));
  else root.appendChild(pageCard(page, classStep(root, plan)));

  root.appendChild(pageFooter(root));

  // Каждый рендер = свежий снимок в localStorage: ничего не теряется при перезагрузке.
  saveState(snapshot());
}

export { state as plannerState };
