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
import { t as tr, isEnglish, bi as biText } from '../i18n.js';
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
import { BIOMES, FORGE_GATE, forgeGateAtMl, forgeGateForTier, promotionFromTier, biomeAtMl } from '../data/biomes.js';
import { planBuild, planToText, encodePlan, decodePlan, nextPointLevel } from '../core/planner.js';
import { recommendBuild, ATTRIBUTE_EFFECTS, ATTRIBUTE_LABELS, JEWELRY_LINES, statText } from '../core/recommend.js';
import { el, card, table, kpi, copyButton } from './dom.js';
import { itemArt, lockArt, tierColors, talismanArt, bodySilhouette, coinIcon, shardIcon } from './itemArt.js';
import { artState, loadArt, artNode, lockedArtNode, artDownload, downloadArtViaBrowser } from './art.js';
import {
  saveState, loadStateRecord, savedAt, clearState, listLoadouts, saveLoadout, getLoadout, deleteLoadout,
  bindAutosave, saveInfo, markTouched, hasStoredState, loadBackupRecord, isTouched,
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
  jewelryLine: 'auto', // линия украшений: auto = расчёт под цель, иначе warriors/rangers/scholars/adventurers
  restored: false,    // состояние поднято из хранилища браузера при загрузке страницы
  restoredAt: null,   // когда это состояние сохранили
  restoredFrom: null, // из какого канала оно поднялось (localStorage, sessionStorage, окно)
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
    jewelryLine: state.jewelryLine,
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
  if (snap.jewelryLine && (snap.jewelryLine === 'auto' || JEWELRY_LINES[snap.jewelryLine])) state.jewelryLine = snap.jewelryLine;
  if (snap.manual && typeof snap.manual === 'object') { state.manual = snap.manual; state.mode = 'manual'; }
  else if (snap.mode === 'auto') { state.manual = null; state.mode = 'auto'; }
  if (typeof snap.shareCode === 'string') state.shareCode = snap.shareCode;
  return true;
}

let protectStored = false;

// Карта игровых иконок: ищем локальные (assets/items) или тянем Item Codex.
// Когда карта придёт, один раз перерисовываем экран — карточки подменятся на игровые картинки.
let artApplied = false;
loadArt().then(() => {
  if (artApplied || !artState.index) return;
  artApplied = true;
  const view = document.getElementById('view');
  if (view?.querySelector('#pagenav')) render(view);
}).catch(() => {});

/** Человеческое время последнего сохранения (с секундами — видно, что пишется сразу). */
function savedAtText() {
  const iso = savedAt();
  if (!iso) return tr('ещё не сохранялось', 'No save yet');
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return tr('сохранено', 'Saved');
  const two = (n) => String(n).padStart(2, '0');
  return (isEnglish ? `Saved ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}` : `сохранено ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`);
}

/** Короткая правда о том, где лежат данные: переживут ли они перезагрузку. */
const storageWord = () => (saveInfo.durable ? tr('в браузере', 'in this browser') : tr('только до перезагрузки', 'until reload'));

/** Плашка «сохранено»: видна на каждой странице, по клику сохраняет ещё раз. */
function saveChip() {
  return el('button', {
    class: `chip save-chip${saveInfo.durable ? ' good' : ' warn'}`,
    id: 'save-chip',
    title: tr('Любое действие сохраняется сразу. Нажмите, чтобы сохранить ещё раз.', 'Changes save automatically. Click to save again.'),
    text: `${savedAtText()} · ${storageWord()}`,
    onclick: () => {
      markTouched();
      saveState(snapshot(), { allowOverwrite: true });
      const chip = globalThis.document ? globalThis.document.getElementById('save-chip') : null;
      if (chip) chip.textContent = `${savedAtText()} · ${storageWord()}`;
    },
  });
}

/** Обновляем плашку сразу после автосохранения, не дожидаясь перерисовки. */
function refreshSaveChip() {
  const chip = globalThis.document ? globalThis.document.getElementById('save-chip') : null;
  if (!chip) return;
  chip.textContent = `${savedAtText()} · ${storageWord()}`;
  chip.className = `chip save-chip flash${saveInfo.durable ? ' good' : ' warn'}`;
}

// Любое действие (клик, ввод, переключение) сохраняется немедленно — ещё до отрисовки.
try {
  bindAutosave(() => snapshot(), {
    onSave: () => refreshSaveChip(),
    allowOverwrite: () => !protectStored,
  });
} catch { /* автосохранение не должно мешать работе приложения */ }

const TALISMAN_TYPES = TALISMANS.types;
const talismanById = (id) => TALISMAN_TYPES.find((t) => t.id === id) || TALISMAN_TYPES[0];

/* ------------------------------ Рекомендация сборки ------------------------------ */

/**
 * Готовая сборка под класс и цель — считается один раз на комбинацию
 * класс + цель + уровень + ML. Приложение показывает ЕЁ, а не просит собирать вручную.
 */
let recCache = { key: '', value: null };
function recommendationFor(plan) {
  const key = `${plan.classId}|${plan.goal}|${plan.level}|${plan.ml}|${state.jewelryLine}`;
  if (recCache.key !== key) {
    recCache = { key, value: recommendBuild(plan.classId, plan.goal, { level: plan.level, ml: plan.ml, jewelryLine: state.jewelryLine }) };
  }
  return recCache.value;
}

/* ------------------------------ Двуязычные подписи ------------------------------ */

/** Узел «Русское (English)»: русское жирным, английское приглушённым. */
const bi = (ru, en) => el('span', {}, [
  el('b', { text: (isEnglish ? en : ru) || ru || en || '' }),
  !isEnglish && en && ru && ru !== en ? el('span', { class: 'en', text: ` (${en})` }) : null,
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
  { id: 'class', n: 1, title: tr('Класс и цель', 'Class and goal'), short: tr('Класс', 'Class'), hint: tr('кто играет и под какую задачу', 'Choose a class and build goal') },
  { id: 'levels', n: 2, title: tr('Уровни: персонаж и Monster Level', 'Character level and Monster Level'), short: tr('Уровни', 'Levels'), hint: tr('уровень даёт очки, Monster Level — дроп', 'Character level grants points. Monster Level determines drops.') },
  { id: 'skills', n: 3, title: tr('Куда вложить очки навыков', 'Where to spend skill points'), short: tr('Навыки', 'Skills'), hint: tr('ветки, тиры, +All Class Skills', 'Branches, tiers and +All Class Skills') },
  { id: 'gear', n: 4, title: tr('Снаряжение: что надеть', 'Gear to equip'), short: tr('Снаряжение', 'Gear'), hint: tr('готовая сборка предметов с картинками и объяснением почему', 'Recommended items with pictures and explanations') },
  { id: 'forge', n: 5, title: tr('Кузница: тир, «+N» и цена шагов', 'Forge tiers, upgrades and costs'), short: tr('Кузница', 'Forge'), hint: tr('порядок прокачки под цель и цена шагов', 'Upgrade order for your goal and cost per step') },
  { id: 'gems', n: 6, title: tr('Какие камни вставить', 'Which gems to socket'), short: tr('Камни', 'Gems'), hint: tr('готовый набор камней на каждый слот с объяснением', 'Recommended gems for each slot and why they fit') },
  { id: 'next', n: 7, title: tr('Что делать дальше', 'What to do next'), short: tr('Что дальше', 'Next steps'), hint: tr('чек-лист под ваш уровень и ML', 'Checklist for your level and ML') },
  { id: 'build', n: 8, title: tr('Сборка и сохранение', 'Build and saves'), short: tr('Сборка', 'Build'), hint: tr('готовый список сборки, код, наборы, автосохранение', 'Build list, share code, loadouts and autosave') },
];

// Поднимаем прошлую сессию из браузера: заполнять заново не нужно.
// Если снимок есть, но прочитать его не удалось — ничего не перезаписываем,
// пользователь сможет вернуть предыдущую версию кнопкой на странице «Сборка».
try {
  const bootRecord = loadStateRecord();
  if (bootRecord && applySnapshot(bootRecord.state)) {
    state.restored = true;
    state.restoredAt = bootRecord.savedAt;
    state.restoredFrom = bootRecord.channel;
  } else if (!bootRecord && hasStoredState()) {
    protectStored = true;
  }
} catch { /* хранилище недоступно — работаем как в первый раз, приложение не падает */ }

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
    el('h2', { text: tr('Гайд: как собрать персонажа в IdleArc', 'How to build your IdleArc character') }),
    el('p', { class: 'muted', text: tr('План разбит на страницы — идите по номерам слева направо: класс и цель → уровни → навыки → снаряжение → Кузница → камни → что делать дальше. Предметы, камни и порядок прокачки система подбирает сама под выбранную цель и объясняет почему — вам остаётся искать такой же дроп в игре. Состояние сохраняется в браузере.', 'Follow the numbered pages from class and goal through levels, skills, gear, Forge upgrades and gems. Each page explains what to look for in game and why it fits your goal. Your browser saves your progress.') }),
    statusLine(plan),
  ]);
}

/** Верхняя полоса: где вы сейчас (класс, цель, уровни, +All) — видна на любой странице. */
function statusLine(plan) {
  return el('div', { class: 'statusline' }, [
    el('span', { class: 'chip', text: biText(plan.classRu, plan.className) }),
    el('span', { class: 'chip', text: plan.goalDef.ru }),
    el('span', { class: 'chip', text: (isEnglish ? `Lv. ${plan.level}` : `ур. ${plan.level}`) }),
    el('span', { class: 'chip', text: `ML ${plan.ml}` }),
    el('span', { class: 'chip', text: `+All ${state.plusAll}` }),
    saveChip(),
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
    el('h2', {}, [el('span', { class: 'step-num', text: (isEnglish ? `Page ${page.n}` : `Страница ${page.n}`) }), el('span', { text: page.title })]),
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
      : el('span', { class: 'muted small', text: tr('Это первая страница', 'First page') }),
    el('span', { class: 'muted small', text: (isEnglish ? `Page ${i + 1} of ${PAGES.length}` : `Страница ${i + 1} из ${PAGES.length}`) }),
    next
      ? el('button', { class: 'btn primary', text: `${next.n}. ${next.short} →`, onclick: () => goTo(root, next.id) })
      : el('span', { class: 'muted small', text: tr('Это последняя страница', 'Last page') }),
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
    el('label', { text: tr('Цель билда', 'Build goal') }),
    el('select', { onchange: (e) => { state.goal = e.target.value; state.manual = null; state.mode = 'auto'; render(root); } },
      GOALS.map((g) => el('option', { value: g.id, selected: g.id === state.goal ? 'selected' : null }, [`${g.ru} — ${g.desc}`]))),
  ]);

  const stance = STANCES.find((s) => s.id === plan.profile.stance) || STANCES[0];
  const cls = classById(state.classId);
  return [
    el('h3', { text: tr('1.1. Класс', '1.1. Class') }),
    picker,
    el('p', { class: 'muted', text: (isEnglish
      ? `${biText(cls.ru, cls.name)} · Role: ${cls.role}. Recommended stance: ${biText(stance.ru, stance.name)} — ${stance.focus}`
      : `${biText(cls.ru, cls.name)} · роль: ${cls.role}. Стойка под цель: ${biText(stance.ru, stance.name)} — ${stance.focus}`) }),
    el('h3', { text: tr('1.2. Цель', '1.2. Goal') }),
    goalSelect,
    el('p', { class: 'muted', text: tr('От цели зависят: веса навыков, приоритет статов, набор Drop Bonus-ов, камни и гема вторичек.', 'Your goal determines skill weights, stat priorities, Drop Bonuses, gems and their secondary stats.') }),
  ];
}

/* -------------------------------- Шаг 2: уровни -------------------------------- */

function levelsStep(root, plan) {
  const numberInput = (value, min, max, onchange) => el('input', {
    type: 'number', min: String(min), max: String(max), value: String(value),
    oninput: (e) => { const v = Math.max(min, Math.min(max, Number(e.target.value) || min)); onchange(v); },
  });

  const character = el('div', { class: 'level-box' }, [
    el('label', { text: tr('Уровень персонажа', 'Character level') }),
    numberInput(state.level, 1, 999, (v) => { state.level = v; render(root); }),
    el('p', { class: 'muted small', text: tr('Даёт классовые очки: 1 на 1-м уровне и +1 каждые 3 уровня. Больше ни на что в этом плане не влияет.', 'You get one class point at level 1 and one more every three levels. Character level only affects class points in this plan.') }),
    kpi([
      { label: tr('Классовых очков', 'Class points'), value: String(plan.points.available) },
      { label: tr('Вложено', 'Spent'), value: `${plan.points.spent}` },
      { label: tr('Следующий очок', 'Next point'), value: (isEnglish ? `Lv. ${nextPointLevel(state.level)}` : `ур. ${nextPointLevel(state.level)}`) },
    ]),
  ]);

  const monster = el('div', { class: 'level-box' }, [
    el('label', { text: 'Monster Level (ML)' }),
    numberInput(state.ml, 1, 999, (v) => { state.ml = v; render(root); }),
    el('p', { class: 'muted small', text: tr('Определяет, что падает и что вообще доступно: тир предметов, диапазон имплиситов, редкость гемов, открытие сокетов и слотов. Очки навыков от ML не зависят.', 'Monster Level determines item tiers, implicit stat ranges, gem rarity and which sockets and slots unlock. Character level determines skill points.') }),
    kpi([
      { label: tr('Основной дроп', 'Main drop'), value: `${plan.itemTier.tierLabel} ${plan.itemTier.ru}` },
      { label: tr('Шанс дропа', 'Drop chance'), value: `${plan.itemTier.chance}%` },
      { label: tr('Сокетов доступно', 'Available sockets'), value: plan.sockets.next ? (isEnglish ? `${plan.sockets.count} (next at ML ${plan.sockets.next.ml})` : `${plan.sockets.count} (след. ML ${plan.sockets.next.ml})`) : (isEnglish ? `${plan.sockets.count} (maximum)` : `${plan.sockets.count} (макс)`) },
    ]),
  ]);

  const unlocks = [
    ['ML 20', tr('гемы и первый сокет', 'Gems and the first socket'), 20],
    ['ML 25', tr('двуручное оружие, когти Rogue, сайдгрейды брони', 'Two-handed weapons, Rogue claws and alternative armor pieces'), 25],
    ['ML 50', tr('Torch в отдельном слоте (+All Class Skills)', 'Dedicated Torch slot (+All Class Skills)'), 50],
    ['ML 65', tr('второй сокет, гемы Polished', 'Second socket and Polished gems'), 65],
    ['ML 115', tr('третий сокет, гемы Brilliant (2 вторички)', 'Third socket and Brilliant gems (2 secondary stats)'), 115],
    ['ML 160', tr('четвёртый сокет, гемы Flawless (3 вторички)', 'Fourth socket and Flawless gems (3 secondary stats)'), 160],
    ['ML 260', tr('предметы T6 Infernal, Drop Bonus-ы T7–T9', 'T6 Infernal items and T7–T9 Drop Bonuses'), 260],
    ['ML 350', 'The Convergence', 350],
  ];

  return [
    el('p', { text: tr('Это два разных параметра: уровень персонажа и Monster Level не связаны между собой. Меняйте их отдельно — план пересчитается.', 'Character level and Monster Level are independent. Change either value to update the plan.') }),
    el('div', { class: 'grid cols-2' }, [character, monster]),
    el('h3', { text: tr('Что открывается по Monster Level', 'Monster Level unlocks') }),
    table(['ML', tr('Что открывается', 'Unlock'), tr('Статус', 'Status')], unlocks.map(([label, what, ml]) => [
      label, what, ml <= state.ml ? el('span', { class: 'chip good', text: tr('уже открыто', 'Unlocked') }) : el('span', { class: 'chip warn', text: (isEnglish ? `${ml - state.ml} ML to go` : `осталось ${ml - state.ml} ML`) }),
    ])),
    el('h3', { text: tr('Что падает на вашем ML', 'Drops at your ML') }),
    el('div', { class: 'scroll' }, [table([tr('Тир', 'Tier'), tr('Редкость', 'Rarity'), tr('Аффиксов', 'Affixes'), tr('Шанс дропа', 'Drop chance')], plan.itemTier.probabilities.map((p) => {
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
  const capNote = detail && detail.capped.length ? (isEnglish ? ` · cap: ${detail.capped.join(', ')}` : ` · кап: ${detail.capped.join(', ')}`) : '';
  const req = s.requires ? plan.class.skills.find((x) => x.id === s.requires) : null;
  return el('tr', {}, [
    el('td', {}, [el('span', { class: `tag T${s.tier || 1}`, text: `T${s.tier || 1}` })]),
    el('td', {}, [el('div', {}, [
      bi(s.ru, s.name),
      s.estimated ? el('span', { class: 'tag est', title: s.estimateNote || '', text: tr('оценка', 'estimate') }) : null,
      el('div', { class: 'muted', text: s.text ? s.text.replace(/\{(\w+)\}/g, (_, k) => {
        const per = s.perPoint?.[k];
        if (per == null) return '?';
        const cap = s.cap?.[k];
        const v = cap != null ? Math.min(per * (eff || 1), cap) : per * (eff || 1);
        return Number(v.toFixed(2)).toString();
      }) : '' }),
      req ? el('div', { class: 'muted small', text: (isEnglish ? `Requires a point in ${req.name}` : `Требует вложенного очка: ${req.ru || req.name} (${req.name})`) }) : null,
      s.s2 ? el('div', { class: 'muted small', text: `Season 2: ${s.s2}` }) : null,
    ])]),
    el('td', {}, [el('div', { class: 'stepper' }, [
      el('button', { class: 'btn tiny', text: '−', disabled: pts <= 0 ? 'disabled' : null, onclick: () => bumpSkill(root, plan, s, -1) }),
      el('b', { class: 'pts', text: String(pts) }),
      el('button', { class: 'btn tiny', text: '+', disabled: pts >= s.max ? 'disabled' : null, onclick: () => bumpSkill(root, plan, s, 1) }),
    ])]),
    el('td', {}, [el('div', { class: 'muted' }, [
      el('div', { text: (isEnglish ? `Max rank: ${s.max} points · goal weight: ${plan.weights[s.id] || 0}` : `макс. ранг ${s.max} очк. · вес цели ${plan.weights[s.id] || 0}`) }),
      el('div', {
        class: state.plusAll > 0 ? 'plusline' : 'muted',
        text: (isEnglish ? `Effective rank: ${eff}${state.plusAll > 0 ? ` (${pts} + ${state.plusAll})` : ''}${capNote}` : `эффективный ранг ${eff}${state.plusAll > 0 ? ` (${pts} + ${state.plusAll})` : ''}${capNote}`),
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
            ? tr(' · доступно сразу', ' · available immediately')
            : (isEnglish ? ` · requires ${need} points in this branch (${b.spent} spent)` : ` · открывается после ${need} очков в этой же ветке (сейчас ${b.spent})`) }),
          el('span', { class: 'muted', text: (isEnglish ? ` · tier maximum: ${inTier.reduce((a, s) => a + s.max, 0)} points` : ` · максимум в тире: ${inTier.reduce((a, s) => a + s.max, 0)} очк.`) }),
        ]),
      ]));
      for (const s of inTier) rows.push(skillRow(root, plan, s));
    }
    return el('div', { class: 'branch' }, [
      el('header', {}, [
        el('strong', { text: isEnglish ? branch : `${cls.branchRu[branch] || branch} · ${branch}` }),
        el('div', { class: 'chips' }, [
          el('span', { class: 'chip', text: (isEnglish ? `${b.spent} points spent` : `${b.spent} очк. вложено`) }),
          el('span', { class: 'chip', text: (isEnglish ? `Branch maximum: ${branchMax}` : `максимум в ветке: ${branchMax}`) }),
          el('span', { class: b.tier2 ? 'chip good' : 'chip warn', text: b.tier2 ? tr('Tier 2 открыт', 'Tier 2 unlocked') : (isEnglish ? `Points to Tier 2: ${b.needTier2}` : `до Tier 2: ${b.needTier2}`) }),
          el('span', { class: b.tier3 ? 'chip good' : 'chip warn', text: b.tier3 ? tr('Tier 3 открыт', 'Tier 3 unlocked') : (isEnglish ? `Points to Tier 3: ${b.needTier3}` : `до Tier 3: ${b.needTier3}`) }),
        ]),
      ]),
      el('table', {}, [
        el('thead', {}, [el('tr', {}, [tr('Тир', 'Tier'), tr('Навык', 'Skill'), tr('Очки', 'Points'), tr('Ранг и доступность', 'Rank and availability')].map((h) => el('th', { text: h })))]),
        el('tbody', {}, rows),
      ]),
    ]);
  });

  const bar = el('div', { class: 'bar' }, [el('div', { style: `width:${Math.min(100, (plan.points.spent / Math.max(1, plan.points.available)) * 100)}%` })]);

  const why = el('div', { class: 'infobox' }, [
    el('b', { text: tr('Почему очки распределены именно так', 'Why the planner spent points here') }),
    el('ol', { class: 'tight' }, plan.explanation.map((e) => el('li', {}, [
      el('b', { text: biText(e.ru, e.branch) }),
      el('span', { text: (isEnglish ? ` — ${e.share}% of the total goal weight, ${e.spent} points spent` : ` — вес ${e.share}% от всех весов цели, вложено ${e.spent} очк.`) }),
      el('div', { class: 'muted', text: (isEnglish
        ? `Key skills for this goal: ${e.top.join(', ')}${e.target ? ` · target allocation: ${e.target} points` : ''}`
        : `Ключевые навыки для этой цели: ${e.top.join(', ')}${e.target ? ` · цель авто-плана: ${e.target} очк.` : ''}`) }),
    ]))),
    el('p', { class: 'muted', text: tr('Правило: минимум 1 очко в каждую ветку, дальше — пропорционально весам цели, затем «доводка» сильных ветвей до Tier 2 (5 очков) и Tier 3 (10 очков) за счёт слабых. Ничего не свалено в одну ветку, но вес цели виден по цифрам.', 'The planner starts with at least one point per branch and distributes the rest by goal weight. It then moves points from lower-weight branches to help stronger branches reach Tier 2 (5 points) and Tier 3 (10 points).') }),
  ]);

  const plusAll = el('div', { class: 'panel' }, [
    el('h3', { text: tr('+All Class Skills (Torch, Sage Diadem, легендарные петы)', '+All Class Skills (Torch, Sage Diadem and legendary pets)') }),
    el('div', { class: 'controls' }, [
      el('div', { class: 'slider' }, [
        el('label', { text: (isEnglish ? `Bonus: +${state.plusAll}` : `Бонус: +${state.plusAll}`) }),
        el('input', {
          type: 'range', min: '0', max: '25', step: '1', value: String(state.plusAll),
          oninput: (e) => { state.plusAll = Number(e.target.value); render(root); },
        }),
      ]),
      el('div', {}, [el('label', { text: tr('Ввести числом', 'Enter a number') }),
        el('input', { type: 'number', min: '0', max: '25', value: String(state.plusAll), oninput: (e) => { state.plusAll = Math.max(0, Math.min(25, Number(e.target.value) || 0)); render(root); } })]),
      el('div', {}, [el('label', { text: tr('Свободных классовых очков', 'Additional class points') }),
        el('input', { type: 'number', min: '0', max: '200', value: String(state.extraPoints), oninput: (e) => { state.extraPoints = Math.max(0, Number(e.target.value) || 0); render(root); } })]),
    ]),
    el('p', { class: 'muted', text: tr('Бонус повышает эффективный ранг каждого изученного навыка (см. колонку «эффективный ранг» ниже). Новые навыки он не учит, Tier 2/3 не открывает: гейты ветвей считаются по вложенным очкам.', 'The bonus raises the effective rank of each learned skill. To learn a new skill or unlock Tier 2 or 3, you must spend points in the branch.') }),
    (plan.gained || []).length
      ? el('div', { class: 'scroll' }, [table([tr('Показатель', 'Stat'), tr('Без +All', 'Without +All'), (isEnglish ? `With +${state.plusAll}` : `С +${state.plusAll}`), tr('Прирост', 'Gain')], plan.gained.map((g) => [
        effectLabel(g.key), fmtVal(g.key, g.from), fmtVal(g.key, g.to), `+${fmtVal(g.key, g.delta)}`,
      ]))])
      : el('p', { class: 'muted', text: tr('Поставьте бонус выше нуля — здесь появится таблица прироста.', 'Set the bonus above zero to see the gains.') }),
    (plan.cappedByPlus || []).length
      ? el('div', { class: 'warnbox' }, [
        el('b', { text: tr('Уже в капе — +All по этим навыкам не помогает', 'Capped skills gain nothing more from +All') }),
        el('ul', { class: 'tight' }, plan.cappedByPlus.map((c) => el('li', { text: (isEnglish ? `${c.skill}: cap ${c.cap}` : `${c.skill}: кап ${c.cap}`) }))),
      ])
      : null,
  ]);

  const totalKeys = Object.keys(plan.bonuses).filter((k) => (plan.bonuses[k] || 0) > 0);
  const totals = el('div', {}, [
    el('h3', { text: tr('Итоговые бонусы от навыков', 'Total skill bonuses') }),
    el('div', { class: 'scroll' }, [table([tr('Показатель', 'Stat'), tr('Без +All', 'Without +All'), (isEnglish ? `Gain from +All (${state.plusAll})` : `+от +All (${state.plusAll})`), tr('Итого', 'Total'), tr('Тип', 'Type')], totalKeys.map((k) => {
      const base = plan.bonusesWithoutPlus[k] || 0;
      const delta = plan.bonuses[k] - base;
      return [effectLabel(k), fmtVal(k, base), state.plusAll > 0 && delta > 1e-9 ? `+${fmtVal(k, delta)}` : '—', fmtVal(k, plan.bonuses[k]), SITUATIONAL.has(k) ? tr('ситуативно', 'Situational') : tr('постоянно', 'Always active')];
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
    el('p', { text: tr('Это ядро билда: очки навыков нельзя сбросить бесплатно, поэтому сначала посмотрите план, потом вкладывайте в игре.', 'Skill resets cost resources in game. Review your allocation here before spending your points.') }),
    el('div', { class: 'grid cols-3' }, [
      el('div', {}, [el('label', { text: tr('Очков вложено', 'Points spent') }), el('b', { text: `${plan.points.spent} / ${plan.points.available}` }), bar]),
      el('div', {}, [el('label', { text: tr('Режим', 'Mode') }), el('b', { text: plan.usingManual ? tr('Ручной', 'Manual') : tr('Авто по цели', 'Auto by goal') }),
        el('div', { class: 'actions' }, [
          el('button', { class: 'btn tiny', text: tr('Авто', 'Auto'), onclick: () => { state.mode = 'auto'; state.manual = null; render(root); } }),
          el('button', { class: 'btn tiny', text: tr('Сбросить', 'Reset'), onclick: () => { state.mode = 'manual'; state.manual = {}; render(root); } }),
        ])]),
      el('div', {}, [el('label', { text: tr('Свободно очков', 'Unspent points') }), el('b', { class: plan.points.left < 0 ? 'neg' : '', text: String(plan.points.left) })]),
    ]),
    ...(plan.points.over ? [el('div', { class: 'warnbox', text: (isEnglish ? `Remove ${plan.points.spent - plan.points.available} points to stay within your budget.` : `Вложено больше доступного на ${plan.points.spent - plan.points.available} — уберите очки.`) })] : []),
    ...plan.validation.problems.map((p) => el('div', { class: 'warnbox', text: `⚠ ${p.skill}: ${p.reason}` })),
    why,
    plusAll,
    el('h3', { text: tr('Классовые навыки — распределение', 'Class skill allocation') }),
    el('p', { class: 'muted', text: (isEnglish
      ? `Tier 2 requires ${CLASS_SKILL_RULES.tierUnlock[2]} points in the same branch. Tier 3 requires ${CLASS_SKILL_RULES.tierUnlock[3]}. Use + or − to switch to manual allocation. Each tier lists the in-game maximum rank for its skills. +All Class Skills can raise effective rank beyond this maximum, up to each effect’s cap.`
      : `Правила: Tier 2 — после ${CLASS_SKILL_RULES.tierUnlock[2]} очков в этой же ветке, Tier 3 — после ${CLASS_SKILL_RULES.tierUnlock[3]}. Кнопки «+»/«−» включают ручной режим. В таблице навыки сгруппированы по своим тирам, у каждого указан настоящий максимальный ранг из игры; +All Class Skills поднимает эффективный ранг сверх него, но не пробивает капы.`) }),
    ...blocks,
    totals,
  ];
}

/* ----------------------------- Шаг 4: экипировка ----------------------------- */

/** Формат больших чисел: 4 180 000. */
const fmtNum = (n) => Number(n).toLocaleString(isEnglish ? 'en-US' : 'ru-RU').replace(/\u00a0/g, ' ');

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
  const rec = recommendationFor(plan);
  for (const cell of GEAR_CELLS) {
    const st = cls[cell.id];
    const recCell = rec.cells[cell.id] || {};

    // Ячейки с ручной правкой не трогаем — но всё остальное система подставляет сама.
    if (st && typeof st === 'object' && st.manual) {
      if (cell.slot === 'talisman') {
        st.level = Math.min(9, Math.max(0, Math.round(Number(st.level) || 0)));
        if (!TALISMAN_TYPES.some((t) => t.id === st.talisman)) st.talisman = TALISMAN_TYPES[0].id;
      } else {
        st.tier = Math.min(6, Math.max(1, Math.round(Number(st.tier) || plan.itemTier.tier)));
        st.level = Math.min(forgeTierInfo(st.tier).maxLevel, Math.max(0, Math.round(Number(st.level) || 0)));
        st.awaken = Math.min(AWAKEN_MAX, Math.max(0, Math.round(Number(st.awaken) || 0)));
        if (st.family && !familyById(st.family)) st.family = null;
      }
      continue;
    }

    // Объект слота меняем на месте: ссылки, которые держат обработчики, остаются живыми.
    const target = (st && typeof st === 'object') ? st : (cls[cell.id] = {});

    if (cell.slot === 'talisman') {
      target.talisman = recCell.talismanId || TALISMAN_TYPES[0].id;
      target.level = Math.min(9, Math.max(0, Math.round(Number(target.level) || 0)));
      target.manual = false;
      continue;
    }

    // Тир СЛОТА — по гейту биома (Кузница качает слот и не зависит от выпавшего предмета).
    const tier = Math.min(6, Math.max(1, (recCell.forge && recCell.forge.tier) || plan.itemTier.tier));
    target.family = recCell.familyId != null ? recCell.familyId : ((cellFamilies(plan, cell)[0] || {}).id || null);
    target.tier = tier;
    target.level = Math.min(forgeTierInfo(tier).maxLevel, Math.max(0, Math.round(Number(target.level) || 0)));
    target.awaken = Math.min(AWAKEN_MAX, Math.max(0, Math.round(Number(target.awaken) || 0)));
    target.manual = false;
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
        usable ? el('span', { class: 'tag plus', text: `+${st.level}` }) : el('span', { class: 'tag', text: tr('закрыто', 'Locked') }),
      ]),
    el('div', { class: 'cellname', text: biText(label.ru, label.en) }),
    el('div', { class: 'muted small', text: cell.slot === 'talisman'
      ? biText(talismanById(st.talisman).ru, talismanById(st.talisman).name)
      : (usable ? (family ? (st.awaken > 0 ? `${family.name} → Awaken` : (family.tierNames[plan.itemTier.tier - 1] || family.name)) : tr('предмет не выбран', 'No item selected')) : tr('занято двуручным', 'Occupied by two-handed weapon')) }),
    usable && family
      ? el('div', { class: 'muted small', text: (isEnglish ? `Item drops at T${plan.itemTier.tier} · slot can reach T${st.tier}` : `предмет падает T${plan.itemTier.tier} · слот качается до T${st.tier}`) })
      : null,
    notYet ? el('div', { class: 'chip warn', text: (isEnglish ? `Drops from ML ${familyUnlockMl(family)}` : `дроп с ML ${familyUnlockMl(family)}`) }) : null,
    !st.manual && usable ? el('div', { class: 'chip gold', text: tr('рекомендовано', 'Recommended') }) : null,
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
      el('div', { class: 'cellname', text: biText(label.ru, label.en) }),
      el('b', { text: biText(t.ru, t.name) }),
      el('div', { class: 'muted small', text: t.stats }),
      el('div', { class: 'muted small', text: (isEnglish ? `Infusion +${st.level}: ${row[1]} · ${row[2]}` : `Уровень инфузии +${st.level}: ${row[1]} · ${row[2]}`) }),
      st.level < 9
        ? el('div', { class: 'muted small', text: (isEnglish ? `Next level +${st.level + 1}: ${next[1]} · ${next[2]}` : `Следующий уровень +${st.level + 1}: ${next[1]} · ${next[2]}`) })
        : el('div', { class: 'muted small', text: tr('Максимальный уровень инфузии.', 'Maximum infusion level.') }),
      el('div', { class: 'muted small', text: tr('Второй талисман берут под вторую задачу: например, Iron под выживание, Spirit под пета.', 'Choose the second talisman for a secondary goal, such as Iron for survival or Spirit for pets.') }),
    ]);
  }

  const rank = forgeRank(st.tier, st.level);
  const step = st.level < info.maxLevel ? forgeStep(st.tier, st.level) : null;
  const dropIdx = Math.min(5, Math.max(0, plan.itemTier.tier - 1));
  const tierName = family ? (family.tierNames[dropIdx] || family.name) : null;
  const implicit = family ? (family.implicitTiers[dropIdx] || family.implicit) : null;
  const gate = forgeGateAtMl(plan.ml);
  const promotion = promotionFromTier(st.tier);
  const awakenName = family && st.awaken > 0 ? FAMILY_AWAKEN[family.id] : null;
  const dropMl = family ? familyUnlockMl(family) : 1;
  const notYet = usable && family && dropMl > plan.ml;

  return el('div', { class: 'face back' }, [
    el('div', { class: 'cellname', text: biText(label.ru, label.en) }),
    family
      ? el('div', {}, [
        el('b', { text: biText(family.ru, family.name) }),
        el('div', { class: 'muted small', text: (isEnglish ? `Item: T${plan.itemTier.tier} ${plan.itemTier.name} · ${tierName}` : `Предмет: T${plan.itemTier.tier} ${plan.itemTier.ru} (${plan.itemTier.name}) · ${tierName}`) }),
      ])
      : el('div', { class: 'muted', text: usable ? tr('предмет не выбран', 'No item selected') : tr('занято двуручным оружием', 'Occupied by two-handed weapon') }),
    family ? el('div', { class: 'muted small', text: (isEnglish ? `Implicit: ${family.implicit} — ${implicit}` : `Имплисит: ${family.implicit} — ${implicit}`) }) : null,
    family ? el('div', { class: 'muted small', text: (isEnglish ? `Affixes from tier: ${info.affixSlots} · gems: ${gems}` : `Аффиксов от тира: ${info.affixSlots} · камней: ${gems}`) }) : null,
    usable ? el('div', { class: 'muted small', text: (isEnglish
      ? `Forge slot: T${st.tier} +${st.level} of +${info.maxLevel} → rank ${rank.rank}/100 (${info.affixSlots} affix slots)`
      : `Кузница качает СЛОТ: T${st.tier} +${st.level} из +${info.maxLevel} → ранг ${rank.rank}/100 (аффикс-позиций: ${info.affixSlots})`) }) : null,
    usable ? el('div', { class: 'muted small', text: (isEnglish
      ? `Biomes unlock slot tiers. Materials from monsters in ${gate.biome ? gate.biome.name : '—'} (ML ${gate.ml}) unlock T${gate.tier}${gate.next ? `. Next: T${gate.next.tier} in ${gate.next.biome ? gate.next.biome.name : ''} (ML ${gate.next.ml}, ${gate.next.mlLeft} ML to go)` : ', the maximum tier'}.`
      : `Тир слота открывается биомами, а не предметом: до T${gate.tier} — материалы с монстров ${gate.biome ? gate.biome.name : '—'} (ML ${gate.ml})${gate.next ? `; следующий T${gate.next.tier} — ${gate.next.biome ? gate.next.biome.name : ''} (ML ${gate.next.ml}, осталось ${gate.next.mlLeft} ML)` : ' — это максимум'}.`) }) : null,
    usable && promotion ? el('div', { class: 'muted small', text: (isEnglish
      ? `Promote T${promotion.from} → T${promotion.to}: ${fmtNum(promotion.gold)} gold, ${promotion.essenceRu} ×1 and materials: ${promotion.materials.map((m) => `${m[0]} ×${m[1]}`).join(', ')}.`
      : `Промоушен T${promotion.from} → T${promotion.to}: ${fmtNum(promotion.gold)} золота, ${promotion.essenceRu} ×1, материалы: ${promotion.materials.map((m) => `${m[0]} ×${m[1]}`).join(', ')}.`) }) : null,
    usable && step ? el('div', { class: 'muted small', text: (isEnglish
      ? `Forge upgrade: ${fmtNum(step.gold)} gold · ${step.fragments} × ${info.fragmentRu} · ${Math.round(step.success * 100)}% success`
      : `Шаг Кузницы: ${fmtNum(step.gold)} золота · ${step.fragments} × ${info.fragmentRu} · успех ${Math.round(step.success * 100)}%`) }) : null,
    usable && !step ? el('div', { class: 'muted small', text: tr('Тир прокачан полностью — открывается следующий.', 'Tier complete. The next tier unlocks.') }) : null,
    family && st.awaken > 0 && awakenName ? el('div', { class: 'muted small', text: `Awaken ${st.awaken}/${AWAKEN_MAX}: ${awakenName}` }) : null,
    family ? el('div', { class: 'muted small', text: (isEnglish ? `Unlock: ${family.unlock}` : `Появляется: ${family.unlock}`) }) : null,
    notYet ? el('div', { class: 'muted small', text: (isEnglish ? `This item starts dropping at ML ${dropMl}. Your current ML is ${plan.ml}.` : `На вашем ML ${plan.ml} этот предмет ещё не падает — начнёт с ML ${dropMl}.`) }) : null,
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
    title: tr('Нажмите — карточка перевернётся и покажет параметры', 'Click to flip the card and see item details'),
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
    ? el('span', { class: 'chip good', text: (isEnglish ? `Local game icons: ${st.files}` : `игровые иконки в проекте: ${st.files}`) })
    : st.mode === 'cdn'
      ? el('span', { class: 'chip good', text: tr('игровые иконки берутся с CDN игры', 'Game icons from the game CDN') })
      : el('span', { class: 'chip warn', text: tr('пока нарисованные иконки', 'Using illustrated icons') });

  return el('div', { class: 'infobox' }, [
    el('b', { text: tr('Картинки предметов', 'Item images') }),
    el('div', { class: 'chips' }, [chip, el('span', { class: 'chip', text: (isEnglish ? `Files: ${st.files}` : `файлов: ${st.files}`) })]),
    el('p', { class: 'muted', text: st.mode === 'local'
      ? tr('Иконки скачаны в папку assets/items и раздаются вместе с приложением — работают даже без интернета.', 'Icons are saved in assets/items and served with the app, including offline.')
      : tr('Показаны нарисованные иконки: игровые не загружены. Нажмите кнопку — сервер скачает официальные иконки предметов из Item Codex и положит их в проект. Если у сервера нет интернета, картинки автоматически скачает ваш браузер и передаст серверу.', 'The planner is showing illustrated icons. Download the official Item Codex icons to use them here. If the server is offline, your browser will try to download the icons and send them to the server.') }),
    el('div', { class: 'actions' }, [
      el('button', {
        class: 'btn primary',
        text: st.loading ? tr('Загрузка…', 'Downloading…') : tr('Скачать игровые картинки', 'Download game images'),
        disabled: st.loading ? 'disabled' : null,
        onclick: async (e) => {
          e.target.textContent = tr('Скачиваю…', 'Downloading…');
          let serverOk = false;
          try {
            const res = await fetch('api/art/fetch', { method: 'POST' });
            const data = await res.json();
            serverOk = Boolean(data.ok);
          } catch { serverOk = false; }
          if (!serverOk) {
            // У сервера нет интернета (или источник заблокирован) — автоматически скачиваем
            // через браузер пользователя: у него доступ обычно есть, сервер только сохраняет файлы.
            e.target.textContent = tr('Сервер без интернета → качаю через браузер…', 'Server offline. Downloading through your browser…');
            const out = await downloadArtViaBrowser((done, total) => {
              const t = document.querySelector ? document.querySelector('#art-progress') : null;
              if (t) t.textContent = (isEnglish ? `Downloaded ${done} of ${total}` : `Скачано ${done} из ${total}`);
            });
            if (!out.ok) alert((isEnglish
              ? `The server and browser could not download the game images.\n${out.error || artDownload.note || ''}\nCheck your connection and try again.`
              : `Не получилось скачать игровые картинки ни сервером, ни браузером.\n${out.error || artDownload.note || ''}\nПроверьте интернет и попробуйте ещё раз.`));
          }
          await loadArt(true);
          render(root);
        },
      }),
      el('button', {
        class: 'btn',
        text: tr('Проверить ещё раз', 'Check again'),
        onclick: async () => { await loadArt(true); render(root); },
      }),
    ]),
    el('p', { class: 'muted small', text: tr('Если у сервера нет интернета, нажмите эту кнопку — картинки скачает ваш браузер и передаст их серверу: после этого иконки будут храниться в проекте и работать без сети.', 'If the server has no internet access, download the images through your browser. The browser sends them to the server so the icons are available offline.') }),
    el('div', { class: 'actions' }, [
      el('button', {
        class: 'btn primary',
        text: artDownload.active ? tr('Скачиваю…', 'Downloading…') : tr('Скачать игровые картинки через браузер', 'Download game images through browser'),
        disabled: artDownload.active ? 'disabled' : null,
        onclick: async (e) => {
          e.target.textContent = tr('Скачиваю через браузер…', 'Downloading through browser…');
          const out = await downloadArtViaBrowser((done, total) => {
            const t = document.querySelector ? document.querySelector('#art-progress') : null;
            if (t) t.textContent = (isEnglish ? `Downloaded ${done} of ${total}` : `Скачано ${done} из ${total}`);
          });
          if (!out.ok) alert((isEnglish ? `Image download failed: ${out.error || artDownload.note}` : `Не получилось скачать картинки: ${out.error || artDownload.note}`));
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
/**
 * Панель биомов: Кузница качает СЛОТ, и потолок прокачки задают биомы (материалы монстров),
 * а не выпавший предмет. Здесь видно, до какого тира можно качать слот прямо сейчас.
 */
function biomePanel(plan, rec) {
  const gate = rec.forgeGate;
  const current = forgeGateAtMl(plan.ml);
  const biome = biomeAtMl(plan.ml);

  const rows = FORGE_GATE.map((g) => {
    const info = forgeGateForTier(g.tier);
    const unlocked = g.ml <= plan.ml;
    return [
      el('div', {}, [
        el('b', { text: `T${g.tier} ${biText(forgeTierInfo(g.tier).ru, forgeTierInfo(g.tier).name)}` }),
        el('div', { class: 'muted small', text: biText(g.fragmentRu, g.fragment) }),
      ]),
      el('div', {}, [
        el('b', { text: info.biome ? biText(info.biome.ru, info.biome.name) : '—' }),
        el('div', { class: 'muted small', text: (isEnglish ? `Unlocks at Monster Level ${g.ml}` : `открывается на Monster Level ${g.ml}`) }),
      ]),
      el('div', { class: 'chips' }, info.materials.map((m) => el('span', { class: 'chip', text: (isEnglish ? `${m.material} from ${m.monster}` : `${m.material} — с ${m.monster}`) }))),
      unlocked
        ? el('span', { class: 'chip good', text: tr('слот можно качать', 'Slot upgrades available') })
        : el('span', { class: 'chip warn', text: (isEnglish ? `${g.ml - plan.ml} ML to go` : `ещё ${g.ml - plan.ml} ML`) }),
    ];
  });

  return el('div', { class: 'branch' }, [
    el('header', {}, [
      el('strong', { text: tr('Кузница и биомы: до какого тира можно качать слот', 'Forge tiers unlocked by biome') }),
      el('div', { class: 'chips' }, [
        el('span', { class: 'chip gold', text: (isEnglish ? `Available up to T${current.tier}` : `сейчас доступно до T${current.tier}`) }),
        el('span', { class: 'chip', text: (isEnglish ? `Biome: ${biText(biome.ru, biome.name)} (ML ${biome.ml})` : `биом: ${biText(biome.ru, biome.name)} (ML ${biome.ml})`) }),
        current.next ? el('span', { class: 'chip warn', text: (isEnglish ? `T${current.next.tier} unlocks at ML ${current.next.ml}` : `T${current.next.tier} откроется на ML ${current.next.ml}`) }) : el('span', { class: 'chip good', text: tr('все тиры открыты', 'All tiers unlocked') }),
      ]),
    ]),
    el('p', { class: 'muted small', text: (isEnglish
      ? `In Season 2, the Forge upgrades each equipment slot. To raise a slot to the next tier, spend gold and monster materials from the corresponding biome. Your current item drops at ${plan.itemTier.tierLabel} ${plan.itemTier.ru} (${plan.itemTier.chance}%), while your slot can reach T${current.tier}.`
      : `Главное правило Season 2: Кузница поднимает тир СЛОТА, а не предмета. Тир слота зависит не от того, что вам выпало, а от биомов: чтобы качать слот на тир N, нужны материалы монстров этого биома и золото. Предмет вы носите тот, что падает на вашем ML (сейчас — ${plan.itemTier.tierLabel} ${plan.itemTier.ru}, ${plan.itemTier.chance}%), а слот при этом можно вести до T${current.tier}.`) }),
    el('div', { class: 'scroll' }, [table(
      [tr('Тир слота', 'Slot tier'), tr('Биом-гейт', 'Required biome'), tr('Материалы монстров этого биома', 'Materials from this biome’s monsters'), tr('Статус на ML ', 'Status at ML ') + plan.ml],
      rows,
    )]),
    el('p', { class: 'muted small', text: tr('Фрагменты (Iron / Steel / Mithril / Adamantine / Celestial / Infernal) и материалы монстров — из официальных таблиц Item Codex → Upgrade Costs; список биомов и монстров — с официальной вики (страницы биомов).', 'Fragment types (Iron, Steel, Mithril, Adamantine, Celestial and Infernal) and material costs come from Upgrade Costs in the official Item Codex. Biomes and monsters come from the official wiki’s biome pages.') }),
  ]);
}

/**
 * Линия украшений: по умолчанию система считает лучший вариант под цель,
 * но игрок может зафиксировать свою линию (Воина / Охотника / Учёного / Авантюриста).
 * Здесь же — официальные эффекты атрибутов за пункт, чтобы выбор был понятным.
 */
function jewelryPanel(plan, root, rec) {
  const lineOf = (id) => {
    const attrs = JEWELRY_LINES[id] || [];
    if (id === 'adventurers') return tr('Сила + Ловкость (Strength & Dexterity)', 'Strength & Dexterity');
    return attrs.map((a) => biText(ATTRIBUTE_LABELS[a][0], ATTRIBUTE_LABELS[a][1])).join(' + ');
  };
  const effectText = (id) => {
    const attrs = JEWELRY_LINES[id] || [];
    return attrs.map((a) => a).flatMap((a) => ATTRIBUTE_EFFECTS[a].map(([stat, per]) => `+${per}% ${statText(stat)}`)).join(', ');
  };
  const options = [['auto', tr('Подбирать расчётом под цель', 'Pick automatically for my goal')]]
    .concat(Object.keys(JEWELRY_LINES).map((id) => [id, (isEnglish
      ? `${id === 'warriors' ? 'Warrior\'s' : id === 'rangers' ? 'Ranger\'s' : id === 'scholars' ? 'Scholar\'s' : 'Adventurer\'s'} line`
      : `Линия ${id === 'warriors' ? 'воина (Warrior\'s)' : id === 'rangers' ? 'охотника (Ranger\'s)' : id === 'scholars' ? 'учёного (Scholar\'s)' : 'авантюриста (Adventurer\'s)'}`)]));

  const current = rec.cells.amulet && rec.cells.amulet.family ? rec.cells.amulet.family.ru : '—';
  return el('div', { class: 'branch' }, [
    el('header', {}, [
      el('strong', { text: tr('Линия украшений: амулет, кольца, пояс', 'Jewelry line for amulet, rings and belt') }),
      el('div', { class: 'chips' }, [
        el('span', { class: 'chip', text: state.jewelryLine === 'auto' ? tr('сейчас: расчёт под цель', 'Current: automatic for goal') : (isEnglish ? `Current: ${state.jewelryLine}` : `сейчас: ${state.jewelryLine}`) }),
        el('span', { class: 'chip gold', text: (isEnglish ? `Amulet: ${current}` : `амулет: ${current}`) }),
      ]),
    ]),
    el('p', { class: 'muted small', text: tr('Украшения в Item Codex — не «классовые»: Воинский, Охотника, Учёного и Авантюриста — это линии атрибутов, их может носить любой класс. Ниже — официальные эффекты атрибутов за пункт и выбор линии.', 'Any class can wear jewelry from the Warrior’s, Ranger’s, Scholar’s and Adventurer’s lines. Each line boosts different attributes. Compare the official effects per point below to choose a line.') }),
    el('div', { class: 'chips' }, [
      el('label', { class: 'muted small', text: tr('Ваша линия:', 'Your line:') }),
      el('select', {
        onchange: (e) => { state.jewelryLine = e.target.value; render(root); },
      }, options.map(([id, title]) => el('option', { value: id, selected: id === state.jewelryLine ? 'selected' : null }, [title]))),
    ]),
    el('div', { class: 'scroll' }, [table(
      [tr('Линия украшений', 'Jewelry line'), tr('Атрибуты', 'Attributes'), tr('Что даёт за пункт', 'Effect per point')],
      Object.keys(JEWELRY_LINES).map((id) => [
        el('div', {}, [
          el('b', { text: id === 'warriors' ? tr('Воина (Warrior\'s)', 'Warrior\'s') : id === 'rangers' ? tr('Охотника (Ranger\'s)', 'Ranger\'s') : id === 'scholars' ? tr('Учёного (Scholar\'s)', 'Scholar\'s') : tr('Авантюриста (Adventurer\'s)', 'Adventurer\'s') }),
          state.jewelryLine === id ? el('div', { class: 'chip gold', text: tr('выбрана', 'Selected') }) : null,
        ]),
        lineOf(id),
        effectText(id),
      ]),
    )]),
    el('h4', { text: tr('Что даёт каждый атрибут за пункт (официальные значения)', 'Attribute effects per point (official values)') }),
    el('div', { class: 'scroll' }, [table(
      [tr('Атрибут', 'Attribute'), tr('Эффект за пункт', 'Effect per point'), tr('Линия украшений', 'Jewelry line')],
      Object.entries(ATTRIBUTE_LABELS).map(([id, [ru, en]]) => [
        biText(ru, en),
        ATTRIBUTE_EFFECTS[id].map(([stat, per]) => `+${per}% ${statText(stat)}`).join(', '),
        id === 'strength' ? tr('Воина, Авантюриста, Пояс учёного', 'Warrior’s, Adventurer’s, Scholar’s Belt') : id === 'dexterity' ? tr('Охотника, Авантюриста, Пояс учёного', 'Ranger’s, Adventurer’s, Scholar’s Belt') : tr('Учёного, Пояс учёного', 'Scholar’s, Scholar’s Belt'),
      ]),
    )]),
  ]);
}

/**
 * Таблица «что надеть» прямо по рекомендации: система уже выбрала предмет и камень,
 * здесь видно ЧТО и ПОЧЕМУ — в порядке игрового экрана снаряжения, включая талисманы.
 */
function recommendRows(plan, rec) {
  return GEAR_CELLS.map((cell) => {
    const r = rec.cells[cell.id];
    if (!r) return null;
    const usable = cellUsable(plan, cell);

    // Ячейка: русское имя + игровое английское.
    const head = el('div', {}, [
      el('b', { text: biText(cell.ru, cell.en) }),
      SLOT_RU[cell.slot] && SLOT_RU[cell.slot] !== cell.ru
        ? el('div', { class: 'muted small', text: (isEnglish ? `Character screen: ${biText(SLOT_RU[cell.slot], SLOT_EN[cell.slot])}` : `в окне персонажа: ${biText(SLOT_RU[cell.slot], SLOT_EN[cell.slot])}`) })
        : null,
      usable ? null : el('div', { class: 'muted small', text: tr('закрыта для этого класса', 'Locked for this class') }),
    ]);

    if (cell.slot === 'talisman') {
      const t = talismanById(r.talismanId);
      return [
        head,
        el('div', { class: 'with-art' }, [
          el('span', { class: 'art-svg small', html: talismanArt(r.talismanId) }),
          el('span', { text: biText(t.ru, t.name) }),
        ]),
        el('span', { class: 'muted small', text: '—' }),
        el('div', { class: 'muted small', text: r.why.join(' ') }),
        el('span', { class: 'muted small', text: t.stats }),
        el('span', { class: 'muted small', text: '—' }),
        el('span', { class: 'muted small', text: '—' }),
      ];
    }

    const family = r.family;
    const gem = r.gem;
    return [
      head,
      family
        ? el('div', { class: 'with-art' }, [
          el('span', { class: 'art-svg small' }, [artNode(family, r.tier, 0)]),
          bi(family.ru, family.name),
        ])
        : el('span', { class: 'muted', text: tr('предмет не найден', 'Item unavailable') }),
      family
        ? el('div', {}, [
          el('b', { text: r.tierName || family.name }),
          el('div', { class: 'muted small', text: (isEnglish ? `${plan.itemTier.tierLabel} (${plan.itemTier.name}) · implicit: ${r.implicitNow || family.implicit}` : `${plan.itemTier.tierLabel} (${plan.itemTier.name}) · имплисит: ${r.implicitNow || family.implicit}`) }),
        ])
        : el('span', { class: 'muted', text: '—' }),
      el('div', { class: 'whycol' }, r.why.map((w) => el('div', { class: 'muted small', text: w }))),
      el('div', { class: 'chips' }, [
        ...r.affixes.prefixes.map((a) => el('span', { class: 'chip', text: biText(a.ru, a.name) })),
        ...r.affixes.suffixes.map((a) => el('span', { class: 'chip', text: biText(a.ru, a.name) })),
      ].length ? [
        ...r.affixes.prefixes.map((a) => el('span', { class: 'chip', text: biText(a.ru, a.name) })),
        ...r.affixes.suffixes.map((a) => el('span', { class: 'chip', text: biText(a.ru, a.name) })),
      ] : [el('span', { class: 'muted', text: '—' })]),
      el('div', { class: 'chips' }, r.dropBonuses.length
        ? r.dropBonuses.map((d) => el('span', { class: 'chip gold', text: biText(d.ru, d.name) }))
        : [el('span', { class: 'muted', text: '—' })]),
      gem
        ? el('div', {}, [
          el('b', { class: 'want', text: biText(gem.family.ru, gem.family.name) }),
          el('div', { class: 'muted small', text: gem.value }),
        ])
        : el('span', { class: 'muted', text: '—' }),
    ];
  }).filter(Boolean);
}

/** Сводка готовой сборки: цель, стойка, приоритет статов и главные решения системы. */
function buildSummary(plan, rec) {
  const key = rec.forgeOrder.slice(0, 3);
  return el('div', { class: 'infobox rec-summary' }, [
    el('b', { text: (isEnglish ? `Recommended build for ${rec.goalRu} — ${biText(plan.classRu, plan.className)}` : `Готовая сборка под цель «${rec.goalRu}» — ${biText(plan.classRu, plan.className)}`) }),
    el('p', { text: tr('Ниже система уже выбрала предмет в каждый слот, камень и цель по Кузнице. Собирать вручную не нужно: эти же предметы подставлены в карточки наверху — берите их и ищите такой же дроп в игре.', 'The planner has selected an item, gem and Forge target for each slot. The gear cards above show the same items so you can identify them in game.') }),
    el('div', { class: 'chips' }, [
      el('span', { class: 'chip', text: (isEnglish ? `Stance: ${plan.profile.stance}` : `стойка: ${plan.profile.stance}`) }),
      el('span', { class: 'chip', text: (isEnglish ? `ML ${rec.ml} → ${rec.tierInfo.tierLabel} ${rec.tierInfo.ru} drops (${rec.tierInfo.chance}%)` : `ML ${rec.ml} → дроп ${rec.tierInfo.tierLabel} ${rec.tierInfo.ru} (${rec.tierInfo.chance}%)`) }),
      el('span', { class: 'chip', text: (isEnglish ? `Gems up to ${rec.gemRarity.name}` : `гемы до ${rec.gemRarity.ru} (${rec.gemRarity.name})`) }),
      el('span', { class: 'chip', text: (isEnglish ? `Available sockets: ${rec.sockets.count}` : `сокетов доступно: ${rec.sockets.count}`) }),
    ]),
    el('div', { class: 'muted small', text: (isEnglish ? `Stat priority: ${rec.priority.join(' → ')}.` : `Приоритет статов: ${rec.priority.join(' → ')}.`) }),
    el('div', { class: 'actions' }, [
      el('button', {
        class: 'btn tiny',
        text: tr('Показать страницу Кузницы: куда качать в первую очередь →', 'See which Forge slots to upgrade first →'),
        onclick: () => goTo(document.getElementById('view') ? document.getElementById('view') : null, 'forge'),
      }),
    ]),
    el('p', { class: 'muted small', text: (isEnglish
      ? `Upgrade first: ${key.map((x) => `${x.place}) ${x.slotRu}`).join(' · ')}. The Forge page explains the full upgrade order.`
      : `Сначала качаем: ${key.map((x) => `${x.place}) ${x.slotRu}`).join(' · ')}. Подробный порядок с причинами — на странице Кузницы.`) }),
  ]);
}

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
    .map((cell) => el('li', { text: `${biText(cell.ru, cell.en)} — ${CLASS_GEAR_RULES[plan.classId].locked[cell.id]}` }));

  const rankTotal = usableCells.reduce((a, c) => a + forgeRank(gear[c.id].tier, gear[c.id].level).rank, 0);
  const awakenCount = usableCells.filter((c) => gear[c.id].awaken > 0).length;

  const rec = recommendationFor(plan);

  return [
    buildSummary(plan, rec),
    el('h3', { text: (isEnglish ? `Gear layout — ${biText(plan.classRu, plan.className)}, ML ${plan.ml}` : `Экран снаряжения — ${biText(plan.classRu, plan.className)}, ML ${plan.ml}`) }),
    el('p', { class: 'muted', text: tr('Ячейки стоят как в игровом окне снаряжения: сверху факел, шлем и амулет, ниже оружие, нагрудник и вторая рука, затем кольца и пояс, в последней строке — талисманы, перчатки и обувь. На карточке видно то же, что в игре: тир и «+N» Кузницы. Нажмите на карточку — она перевернётся и покажет параметры предмета.', 'Slots follow the in-game layout: Torch, helm and amulet on top, then weapons and chest, rings and belt, and finally talismans, gloves and boots. Each card shows its Forge tier and upgrade level (+N). Click a card to see item details.') }),
    grid,
    el('div', { class: 'gear-legend' }, [
      el('span', { class: 'chip', text: tr('T1…T6 — тир Кузницы', 'T1…T6 — Forge tier') }),
      el('span', { class: 'chip', text: tr('+N — шаги Кузницы внутри тира', '+N — upgrades within the tier') }),
      el('span', { class: 'chip gold', text: (isEnglish ? `Total Forge rank: ${rankTotal} / ${usableCells.length * 100}` : `суммарный ранг Кузницы: ${rankTotal} / ${usableCells.length * 100}`) }),
      awakenCount ? el('span', { class: 'chip', text: (isEnglish ? `Awakened slots: ${awakenCount}` : `просыпание: ${awakenCount} слот(ов)`) }) : null,
    ]),
    artPanel(root),
    lockedNotes.length ? el('div', { class: 'infobox' }, [
      el('b', { text: tr('Почему часть ячеек закрыта', 'Why some slots are locked') }),
      el('ul', { class: 'tight' }, lockedNotes),
    ]) : null,
    el('div', { class: 'infobox' }, [
      el('b', { text: tr('Что важно про тир и «+N»', 'Understanding tier and +N') }),
      el('p', { text: (isEnglish
        ? `The tier and +N on a card show the slot’s Forge progress. For upgrade costs and priorities, open “${PAGES[4].n}. ${PAGES[4].short}”.`
        : `В карточке слота стоит тир Кузницы и шаги «+N» — это прогресс СЛОТА, а не выпавшего предмета. Кузница качает слот отдельно: подробности, цены шагов и что качать первым — на странице «${PAGES[4].n}. ${PAGES[4].short}».`) }),
    ]),
    biomePanel(plan, rec),
    jewelryPanel(plan, root, rec),
    el('h3', { text: tr('Что надеть: рекомендация системы по каждому слоту', 'Recommended gear by slot') }),
    el('div', { class: 'scroll' }, [table(
      [tr('Ячейка', 'Slot'), tr('Предмет (рекомендация)', 'Recommended item'), tr('Тир и имя на вашем ML', 'Tier and name at your ML'), tr('Почему именно он', 'Why this fits'), tr('Аффиксы (ищите эти)', 'Affixes to look for'), 'Drop Bonus', tr('Камень', 'Gem')],
      recommendRows(plan, rec),
    )]),
    el('p', { class: 'muted', text: (isEnglish
      ? `These tiers and implicit stats match drops at ML ${plan.ml} (${plan.itemTier.tierLabel} ${plan.itemTier.ru}, ${plan.itemTier.chance}%). Armor such as Wardplate, Seer Hood and Sage Diadem can be worn by any class. The pieces differ in their implicit stats. Cards labeled “Recommended” already match the plan. Change them to try a different build.`
      : `Тир и имплиситы — для того, что реально падает на ML ${plan.ml} (${plan.itemTier.tierLabel} ${plan.itemTier.ru}, ${plan.itemTier.chance}%). Броня (Вардплейт, Капюшон провидца, Диадема мудреца и др.) в Item Codex общая для всех классов — «вардплейт» не значит «только для воина», различается только имплисит. Предметы с пометкой «рекомендовано» на карточках подставлены системой: правьте их только если хотите свой вариант.`) }),
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
    el('span', { class: 'muted small', text: tr('Следующий шаг:', 'Next upgrade:') }),
    el('b', { text: tr('тир прокачан полностью', 'Tier complete') }),
    el('span', { text: tr('— дальше открывается следующий тир', '— next tier unlocked') }),
  ]);
  const fragColor = tierColors(tier)[0];
  return el('div', { class: 'cost' }, [
    el('span', { class: 'muted small', text: tr('Следующий шаг:', 'Next upgrade:') }),
    el('span', { class: 'ico', html: coinIcon() }), el('b', { text: fmtNum(step.gold) }),
    el('span', { class: 'ico', html: shardIcon(fragColor) }), el('b', { text: String(step.fragments) }),
    el('span', { text: forgeTierInfo(tier).fragmentRu }),
    el('span', { class: step.fail > 0 ? 'chip warn' : 'chip good', text: (isEnglish ? `${Math.round(step.success * 100)}% success` : `успех ${Math.round(step.success * 100)}%`) }),
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

  // Любая правка руками = «свой вариант слота»: рекомендация больше не перезаписывает его,
  // но её всегда можно вернуть кнопкой «как рекомендовано».
  const touch = () => { st.manual = true; };
  const setLevel = (v) => {
    touch();
    st.level = Math.max(0, Math.min(info.maxLevel, v));
    render(root);
  };
  const setTier = (t) => {
    touch();
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
        el('b', { text: biText(label.ru, label.en) }),
        el('div', { class: 'muted small', text: family ? biText(family.ru, family.name) : tr('предмет не выбран', 'No item selected') }),
      ]),
      el('span', { class: 'tag tiertag', style: `border-color:${color};color:${color};margin-left:auto`, text: `T${st.tier}` }),
      el('span', { class: 'tag plus', text: `+${st.level}` }),
    ]),
    el('div', { class: 'fcontrols' }, [
      el('select', { onchange: (e) => { touch(); st.family = e.target.value || null; render(root); } }, [
        el('option', { value: '', selected: st.family ? null : 'selected' }, [tr('— предмет —', '— item —')]),
        ...families.map((f) => el('option', { value: f.id, selected: f.id === st.family ? 'selected' : null }, [f.name])),
      ]),
      el('select', { onchange: (e) => setTier(Number(e.target.value)) },
        FORGE_TIERS.map((t) => {
          const gateInfo = FORGE_GATE.find((g) => g.tier === t.tier);
          const locked = gateInfo && gateInfo.ml > plan.ml;
          return el('option', { value: String(t.tier), selected: t.tier === st.tier ? 'selected' : null },
            [`T${t.tier} ${t.ru}${locked ? (isEnglish ? ` — materials from ML ${gateInfo.ml}` : ` — материалы с ML ${gateInfo.ml}`) : ''}`]);
        })),
      el('select', { onchange: (e) => setLevel(Number(e.target.value)) }, levelOptions),
      el('select', { onchange: (e) => { touch(); st.awaken = Number(e.target.value); render(root); } },
        [0, 1, 2, 3, 4, 5].map((r) => el('option', { value: String(r), selected: r === st.awaken ? 'selected' : null }, [r === 0 ? 'Awaken 0' : `Awaken ${r}`]))),
    ]),
    progressBar(st.level, info.maxLevel, (isEnglish ? `Tier level: +${st.level} of +${info.maxLevel}` : `уровень тира: +${st.level} из +${info.maxLevel}`), color),
    progressBar(rank.rank, FORGE_MAX_RANK, (isEnglish ? `Slot rank: ${rank.rank} / ${FORGE_MAX_RANK}` : `ранг слота: ${rank.rank} / ${FORGE_MAX_RANK}`), 'linear-gradient(90deg,#5ba7ff,#ffc857)'),
    stepCost(step, st.tier),
    el('div', { class: 'factions' }, [
      el('button', { class: 'btn tiny', text: '−1', disabled: st.level <= 0 ? 'disabled' : null, onclick: () => setLevel(st.level - 1) }),
      el('button', { class: 'btn tiny', text: '+1', disabled: maxed ? 'disabled' : null, onclick: () => setLevel(st.level + 1) }),
      el('button', { class: 'btn tiny', text: tr('макс', 'Max'), disabled: maxed ? 'disabled' : null, onclick: () => setLevel(info.maxLevel) }),
      maxed && st.tier < 6
        ? el('button', { class: 'btn tiny primary', text: (isEnglish ? `Promote → T${st.tier + 1}` : `Поднять тир → T${st.tier + 1}`), onclick: () => setTier(st.tier + 1) })
        : null,
      el('span', { class: 'muted small', text: (isEnglish ? `Affix slots: ${info.affixSlots} · gems: ${SLOT_GEM_COUNT[cell.slot] || 0}` : `${info.affixSlots} аффикс-позиций · камней: ${SLOT_GEM_COUNT[cell.slot] || 0}`) }),
    ]),
    promoteStep
      ? el('div', { class: 'muted small', text: (isEnglish
        ? `Promote to T${st.tier + 1}: the first step costs ${fmtNum(promoteStep.gold)} gold and ${promoteStep.fragments} × ${forgeTierInfo(st.tier + 1).fragmentRu}.`
        : `Промоушен в T${st.tier + 1}: первый шаг — ${fmtNum(promoteStep.gold)} золота и ${promoteStep.fragments} × ${forgeTierInfo(st.tier + 1).fragmentRu}.`) })
      : null,
    (() => {
      const gate = forgeGateAtMl(plan.ml);
      const tierGate = FORGE_GATE.find((g) => g.tier === st.tier);
      return el('div', { class: 'muted small', text: tierGate
        ? (isEnglish
          ? `This slot tier unlocks in ${forgeGateForTier(st.tier).biome ? forgeGateForTier(st.tier).biome.name : '—'} (ML ${tierGate.ml}). You can currently reach T${gate.tier}${gate.next ? `, then T${gate.next.tier} at ML ${gate.next.ml}` : ''}.`
          : `Тир слота открыт биомом ${forgeGateForTier(st.tier).biome ? forgeGateForTier(st.tier).biome.name : '—'} (ML ${tierGate.ml}); сейчас доступно до T${gate.tier}${gate.next ? `, дальше T${gate.next.tier} на ML ${gate.next.ml}` : ''}.`)
        : (isEnglish ? `Currently available up to T${gate.tier}.` : `Сейчас доступно до T${gate.tier}.`) });
    })(),
    (() => {
      const rec = recommendationFor(plan).cells[cell.id];
      if (!rec || !rec.family) return null;
      const sameFamily = st.family === rec.familyId;
      const isRec = sameFamily && st.tier === rec.tier && st.level >= 0;
      return el('div', { class: 'recnote' }, [
        el('span', { class: 'chip gold', text: (isEnglish ? `Recommended: ${rec.family.name} · ${rec.forge.text}` : `рекомендация: ${rec.family.ru} (${rec.family.name}) · ${rec.forge.text}`) }),
        st.manual
          ? el('button', {
            class: 'btn tiny',
            text: tr('↺ как рекомендовано', '↺ Restore recommendation'),
            onclick: () => { st.manual = false; render(root); },
          })
          : el('span', { class: 'muted small', text: isRec ? tr('это и есть рекомендованный вариант', 'Matches recommendation') : tr('подставлено системой', 'Selected by planner') }),
      ]);
    })(),
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
      el('b', { text: tr('Дешевле всего прокачать', 'Cheapest upgrades') }),
      el('span', { text: cheapest.map((r) => (isEnglish ? `${cellLabels(plan, r.cell).ru} → ${fmtNum(r.step.gold)} gold (T${r.st.tier} +${r.st.level + 1})` : `${cellLabels(plan, r.cell).ru} → ${fmtNum(r.step.gold)} золота (T${r.st.tier} +${r.st.level + 1})`)).join(' · ') }),
    ]));
  }
  if (promotions.length) {
    items.push(el('div', { class: 'row' }, [
      el('b', { text: tr('Тир уже максимум — пора на промоушен', 'Tier complete: ready for promotion') }),
      el('span', { text: promotions.map((r) => (isEnglish ? `${cellLabels(plan, r.cell).ru} → T${r.st.tier + 1} (${fmtNum(r.promote.gold)} gold)` : `${cellLabels(plan, r.cell).ru} → T${r.st.tier + 1} (${fmtNum(r.promote.gold)} золота)`)).join(' · ') }),
    ]));
  }
  if (lowest.length) {
    items.push(el('div', { class: 'row' }, [
      el('b', { text: tr('Самые слабые слоты', 'Lowest-ranked slots') }),
      el('span', { text: lowest.map((r) => (isEnglish ? `${cellLabels(plan, r.cell).ru} — rank ${r.rank}/100` : `${cellLabels(plan, r.cell).ru} — ранг ${r.rank}/100`)).join(' · ') }),
    ]));
  }
  items.push(el('div', { class: 'row' }, [
    el('b', { text: tr('Как это работает', 'How it works') }),
    el('span', { text: tr('Кузница качает слот целиком: сначала закрывайте дешёвые шаги в текущем тире, потом поднимайте тир. Каждый шаг усиливает имплисит слота, а каждый новый тир добавляет аффикс-позицию (Free Pick).', 'The Forge upgrades the entire slot. Buy the cheap upgrades in the current tier, then promote to the next tier. Each upgrade strengthens the slot’s implicit stat. Each new tier adds an affix slot (Free Pick).') }),
  ]));
  return el('div', { class: 'advice' }, items);
}

/** Порядок прокачки Кузницы под цель: что даёт больше всего и почему. */
function forgeOrderBlock(plan, rec) {
  if (!rec.forgeOrder.length) return null;
  return el('div', { class: 'forgeorder' }, rec.forgeOrder.map((x) => el('div', { class: 'row' }, [
    el('span', { class: 'num', text: String(x.place) }),
    el('b', { text: biText(x.slotRu, x.slotEn) }),
    el('span', { text: `${biText(x.family.ru, x.family.name)} → ${x.forge.text}` }),
    el('span', { class: 'muted small', text: x.reasons.join(' ') }),
    el('span', { class: 'chip', text: (isEnglish ? `Full tier: ${fmtNum(x.forge.cost.gold)} gold · ${fmtNum(x.forge.cost.fragments)} fragments` : `полная прокачка тира: ${fmtNum(x.forge.cost.gold)} золота · ${fmtNum(x.forge.cost.fragments)} фрагм.`) }),
    x.forge.promotion
      ? el('span', { class: 'chip warn', text: (isEnglish
        ? `Promote → T${x.forge.promotion.to}: ${fmtNum(x.forge.promotion.gold)} gold, ${x.forge.promotion.essenceRu} ×1, ${x.forge.promotion.materials.map((m) => `${m[0]} ×${m[1]}`).join(', ')}`
        : `промоушен → T${x.forge.promotion.to}: ${fmtNum(x.forge.promotion.gold)} золота, ${x.forge.promotion.essenceRu} ×1, ${x.forge.promotion.materials.map((m) => `${m[0]} ×${m[1]}`).join(', ')}`) })
      : null,
  ])));
}

/** Страница Кузницы: сводка, советник, карточки слотов и таблица тиров. */
function forgePage(plan, root) {
  const gear = gearStateFor(plan);
  const rec = recommendationFor(plan);
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
    [tr('Тир', 'Tier'), tr('Шагов «+N»', 'Upgrade steps (+N)'), tr('Золото до максимума', 'Gold to max'), tr('Фрагменты', 'Fragments'), tr('Аффикс-позиций', 'Affix slots'), tr('Ранг слота', 'Slot rank')],
    FORGE_TIERS.map((t) => {
      const cum = forgeCumulative(t.tier, t.maxLevel);
      return [
        `T${t.tier} ${biText(t.ru, t.name)}`,
        `+${t.maxLevel}`,
        fmtNum(cum.gold),
        `${fmtNum(cum.fragments)} × ${t.fragmentRu}`,
        String(t.affixSlots),
        `${forgeRank(t.tier, t.maxLevel).rank}/100`,
      ];
    }),
  )]);

  return [
    el('h3', { text: tr('Кузница: прогресс по слотам', 'Forge progress by slot') }),
    el('div', { class: 'infobox' }, [
      el('b', { text: tr(`Кузница качает слот, и её потолок задают биомы — не предметы`, `Biomes determine the highest Forge tier for each slot`) }),
      el('p', { text: (isEnglish
        ? `At ML ${plan.ml}, you can raise a slot to T${rec.forgeGate.tier} using materials from monsters in ${rec.forgeGate.biome ? biText(rec.forgeGate.biome.ru, rec.forgeGate.biome.name) : '—'} (ML ${rec.forgeGate.ml}). The item you wear drops at your own ML (${plan.itemTier.tierLabel} ${plan.itemTier.ru}, ${plan.itemTier.chance}%). Slot tier and item tier progress independently.${rec.forgeGate.next ? ` Next slot tier: T${rec.forgeGate.next.tier}, using materials from ${rec.forgeGate.next.biome ? rec.forgeGate.next.biome.name : ''} (ML ${rec.forgeGate.next.ml}, ${rec.forgeGate.next.mlLeft} ML to go).` : ''}`
        : `На ML ${plan.ml} слот можно вести до T${rec.forgeGate.tier}: материалы берутся с монстров ${rec.forgeGate.biome ? biText(rec.forgeGate.biome.ru, rec.forgeGate.biome.name) : '—'} (ML ${rec.forgeGate.ml}). Предмет при этом вы носите тот, который падает на вашем ML (${plan.itemTier.tierLabel} ${plan.itemTier.ru}, ${plan.itemTier.chance}%) — тир слота и тир предмета независимы.${rec.forgeGate.next ? ` Следующий тир слота — T${rec.forgeGate.next.tier}: материалы ${rec.forgeGate.next.biome ? rec.forgeGate.next.biome.name : ''} (ML ${rec.forgeGate.next.ml}, осталось ${rec.forgeGate.next.mlLeft} ML).` : ''}`) }),
      el('div', { class: 'chips' }, rec.forgeGate.materials.map((m) => el('span', { class: 'chip', text: (isEnglish ? `${m.material} from ${m.monster}` : `${m.material} — с ${m.monster}`) }))),
    ]),
    el('div', { class: 'kpi' }, [
      el('div', { class: 'k' }, [el('b', { text: String(cells.length) }), el('span', { text: tr('слотов в Кузнице', 'Forge slots') })]),
      el('div', { class: 'k' }, [el('b', { text: `${rankTotal} / ${rankMax}` }), el('span', { text: tr('суммарный ранг', 'Total rank') })]),
      el('div', { class: 'k' }, [el('b', { text: String(maxedSlots) }), el('span', { text: tr('слотов на максимуме тира', 'Slots at tier maximum') })]),
      el('div', { class: 'k' }, [el('b', { text: byTier.map((x) => `${x.t.tier}×${x.count}`).join(' ') || '—' }), el('span', { text: tr('слоты по тирам', 'Slots by tier') })]),
    ]),
    nextUp
      ? el('p', { class: 'muted', text: (isEnglish
        ? `Next cost-effective upgrade: ${cellLabels(plan, nextUp.cell).ru} — ${nextUp.maxed ? `Promote to T${nextUp.st.tier + 1}` : `T${nextUp.st.tier} +${nextUp.st.level + 1}`} for ${fmtNum(nextUp.step.gold)} gold and ${nextUp.step.fragments} × ${forgeTierInfo(nextUp.maxed ? nextUp.st.tier + 1 : nextUp.st.tier).fragmentRu} (${Math.round(nextUp.step.success * 100)}% success).`
        : `Ближайший выгодный шаг: ${cellLabels(plan, nextUp.cell).ru} — ${nextUp.maxed ? `промоушен в T${nextUp.st.tier + 1}` : `+${nextUp.st.level + 1} к T${nextUp.st.tier}`} за ${fmtNum(nextUp.step.gold)} золота, ${nextUp.step.fragments} × ${forgeTierInfo(nextUp.maxed ? nextUp.st.tier + 1 : nextUp.st.tier).fragmentRu} (успех ${Math.round(nextUp.step.success * 100)}%).`) })
      : null,
    el('h3', { text: tr('Порядок прокачки под цель: что даёт больше всего', 'Upgrade order for your goal') }),
    el('p', { class: 'muted', text: (isEnglish
      ? `For ${rec.goalRu}, the planner ranks slots by how well their implicit stats support your goal. The Torch ranks highly for damage because +All Class Skills raises every learned skill.`
      : `Порядок считается по приоритету статов цели «${rec.goalRu}»: сначала слоты, чей имплисит усиливает самое важное. Факел всегда вверху урона — его +All Class Skills поднимает все навыки сразу.`) }),
    forgeOrderBlock(plan, rec),
    el('div', { class: 'actions' }, [
      el('button', {
        class: 'btn primary',
        text: tr('Применить рекомендацию ко всем слотам', 'Apply recommendation to all slots'),
        onclick: () => {
          // Снимаем ручные правки: система снова подставит рекомендованные предметы и тиры.
          const cls = state.gear[plan.classId] || {};
          for (const c of GEAR_CELLS) if (cls[c.id]) cls[c.id].manual = false;
          render(root);
        },
      }),
      el('span', { class: 'muted small', text: tr('сбросит ручные правки во всех ячейках и вернёт вариант системы', 'Replaces all manual slot edits with the recommended settings') }),
    ]),
    el('h3', { text: tr('Что качать первым по текущему состоянию', 'What to upgrade first with your current gear') }),
    forgeAdvice(plan, gear, cells),
    el('h3', { text: tr('Слоты: тир, «+N» и цена следующего шага', 'Slot tiers, upgrades and next-step costs') }),
    el('div', { class: 'forgegrid' }, cells.map((cell) => forgeCard(plan, root, gear, cell))),
    el('div', { class: 'infobox' }, [
      el('b', { text: tr('Кузница поднимает слот выше тира предмета', 'Slots can reach a higher Forge tier than their items') }),
      el('p', { text: tr('Кузница (Forge) качает СЛОТ, а не отдельный предмет: у слота свой тир и свои шаги «+N». Поэтому в игре на карточке стоит, например, «T4 +19», даже если сам предмет выпал T2 — слот уже поднят Кузницей. Ранг слота (0…100) складывает шаги всех тиров: T1 +4, T2 +9, T3 +14, T4 +19, T5 +24, T6 +30.', 'Each equipment slot has its own Forge tier and +N upgrades. A T2 item can show T4 +19 if its slot has already reached that rank. Slot rank (0–100) adds upgrades across all tiers: T1 +4, T2 +9, T3 +14, T4 +19, T5 +24 and T6 +30.') }),
      el('p', { class: 'muted', text: tr('Цифры стоимости — из официальных данных Item Codex (Кузница → Forge). К каждому шагу в игре ещё нужны материалы монстров: их список каждый уровень разный, его видно в Кузнице.', 'Costs come from the official Item Codex Forge tables. Each upgrade also requires monster materials. The in-game Forge lists the materials for each level.') }),
    ]),
    el('h3', { text: tr('Сколько стоит прокачать тир целиком', 'Cost to fully upgrade each tier') }),
    scale,
    el('p', { class: 'muted', text: AWAKEN_NOTE }),
  ];
}

/* ------------------------------- Шаг 6: камни ------------------------------- */

/**
 * Страница камней — по рекомендации системы: камень на каждый слот, что он даёт
 * и почему именно он под эту цель.
 */
function gemsStep(plan) {
  const rec = recommendationFor(plan);
  const regionRu = {
    weapon: tr('Оружие — основная и вторая рука', 'Weapons — main hand and off hand'),
    torch: tr('Факел — отдельный слот', 'Torch — dedicated slot'),
    armor: tr('Броня — нагрудник, шлем, перчатки, обувь', 'Armor — chest, helm, gloves and boots'),
    jewelry: tr('Украшения — амулет, кольца, пояс', 'Jewelry — amulet, rings and belt'),
  };
  const regionEn = { weapon: 'Weapon', torch: 'Torch', armor: 'Armor', jewelry: 'Jewelry' };
  const regions = ['weapon', 'torch', 'armor', 'jewelry'];

  const summary = regions.map((r) => {
    const g = rec.gemPlan[r];
    if (!g) return null;
    return el('li', {}, [
      el('b', { text: isEnglish ? regionRu[r] : `${regionRu[r]} (${regionEn[r]})` }),
      el('span', { text: ` → ${biText(g.family.ru, g.family.name)} — ${g.value}. ${g.why[1] || ''}` }),
    ]);
  }).filter(Boolean);

  const blocks = regions.map((r) => {
    const cells = GEAR_CELLS.filter((c) => rec.cells[c.id] && rec.cells[c.id].gem && rec.cells[c.id].gem.region === r && cellUsable(plan, c));
    if (!cells.length) return null;
    const g = rec.gemPlan[r];
    const rows = cells.map((cell) => {
      const e = rec.cells[cell.id];
      const alts = GEM_FAMILIES.filter((f) => f.id !== e.gem.family.id)
        .map((f) => `${biText(f.ru, f.name)} — ${f.slots[r]}`)
        .join(' · ');
      return [
        el('div', {}, [
          el('b', { text: biText(cell.ru, cell.en) }),
          SLOT_RU[cell.slot] && SLOT_RU[cell.slot] !== cell.ru
            ? el('div', { class: 'muted small', text: (isEnglish ? `Character screen: ${biText(SLOT_RU[cell.slot], SLOT_EN[cell.slot])}` : `в окне персонажа: ${biText(SLOT_RU[cell.slot], SLOT_EN[cell.slot])}`) })
            : null,
          el('div', { class: 'muted small', text: e.family ? biText(e.family.ru, e.family.name) : tr('предмет по цели', 'Item for this goal') }),
        ]),
        el('div', {}, [el('b', { class: 'want', text: biText(e.gem.family.ru, e.gem.family.name) }), el('div', { class: 'muted small', text: tr('ставить сюда', 'Socket here') })]),
        el('div', {}, [el('b', { text: e.gem.value }), el('div', { class: 'muted small', text: (isEnglish ? `Rough, quality 100 · rarity up to ${plan.gemRarity.name}` : `Черновой (Rough), качество 100 · редкость до ${plan.gemRarity.ru} (${plan.gemRarity.name})`) })]),
        el('div', { class: 'whycol' }, e.gem.why.map((w) => el('div', { class: 'muted small', text: w }))),
        el('div', { class: 'muted small', text: (isEnglish ? `Other gems for this slot: ${alts}` : `Другие камни сюда: ${alts}`) }),
      ];
    });
    return el('div', { class: 'branch' }, [
      el('header', {}, [
        el('strong', { text: isEnglish ? regionRu[r] : `${regionRu[r]} (${regionEn[r]})` }),
        el('div', { class: 'chips' }, [
          el('span', { class: 'chip gold', text: (isEnglish ? `Recommended: ${g.family.name}` : `система советует: ${g.family.ru} (${g.family.name})`) }),
          el('span', { class: 'chip', text: g.value }),
          el('span', { class: 'chip', text: (isEnglish ? `Slots in group: ${cells.length}` : `слотов в блоке: ${cells.length}`) }),
        ]),
      ]),
      el('div', { class: 'scroll' }, [table([tr('Ячейка', 'Slot'), tr('Камень', 'Gem'), tr('Что даёт в этом слоте', 'Effect in this slot'), tr('Почему именно он', 'Why this fits'), tr('Альтернативы', 'Alternatives')], rows)]),
    ]);
  }).filter(Boolean);

  const secondaries = (rec.gemPlan.weapon || rec.gemPlan.armor || {}).secondary || [];

  return [
    el('h3', { text: tr('Гемы: какой камень куда ставить (рекомендация системы)', 'Recommended gems by slot') }),
    el('div', { class: 'infobox' }, [
      el('b', { text: (isEnglish ? `Gems for ${rec.goalRu}` : `Камни под цель «${rec.goalRu}»`) }),
      el('ul', { class: 'tight' }, summary),
      el('p', { class: 'muted', text: (isEnglish
        ? `A gem’s effect depends on its slot. Garnet grants damage in weapons, Defense in armor and the primary attribute in jewelry. At ML ${plan.ml}, gems can drop up to ${plan.gemRarity.name} with ${plan.gemRarity.secondary} secondary stats.`
        : `Один и тот же камень даёт разный эффект в разных слотах: Garnet в оружии — урон, в броне — Defense, в украшениях — основной атрибут. На вашем ML ${plan.ml} падают гемы до ${plan.gemRarity.ru} (${plan.gemRarity.name}) — вторичных статов: ${plan.gemRarity.secondary}.`) }),
      secondaries.length
        ? el('p', { class: 'muted', text: (isEnglish
          ? `Secondary stats for this goal: ${secondaries.map((s) => biText(s.ru, s.stat)).join(', ')}. Only Brilliant and Flawless gems allow rerolls.`
          : `Вторичные статы для этой цели: ${secondaries.map((s) => biText(s.ru, s.stat)).join(', ')} — рероллить их можно только на Brilliant и Flawless.`) })
        : null,
    ]),
    ...blocks,
    el('h3', { text: tr('Когда менять основной камень', 'When to switch your main gem') }),
    el('ul', { class: 'tight' }, [
      el('li', { text: tr('Мало выживаемости на высоком ML — поставьте Lapis (Лазурит) в броню: там он даёт опыт, но Garnet/Jade меняйте на него вместе с аффиксами Max Health и Defense.', 'If you struggle to survive at high ML, try Lapis in armor. Lapis gives experience there, so add Max Health and Defense affixes when replacing Garnet or Jade.') }),
      el('li', { text: tr('Фармите золото и материалы — Amber (Янтарь) во все слоты: он даёт фарм-статы в каждой группе.', 'For gold and materials, use Amber in every slot. It grants farming stats in each group.') }),
      el('li', { text: tr('Пет-билд — Jade (Жад) в оружие и броню, Lapis в факел (уровень Pet Mastery).', 'For a pet build, use Jade in weapons and armor and Lapis in the Torch for Pet Mastery levels.') }),
      el('li', { text: tr('Retaliation — Garnet (Гранат) везде: Defense и Max Health напрямую усиливают урон возмездия.', 'For Retaliation, use Garnet in all slots. Defense and Max Health directly increase Retaliation damage.') }),
    ]),
    el('h3', { text: tr('Вторичные статы камней', 'Gem secondary stats') }),
    el('div', { class: 'scroll' }, [table([tr('Вторичный стат', 'Secondary stat'), tr('Cut (Огранённый)', 'Cut'), tr('Polished (Полированный)', 'Polished'), tr('Brilliant (Блестящий)', 'Brilliant'), tr('Flawless (Безупречный)', 'Flawless'), tr('Для этой цели', 'For this goal')],
      GEM_SECONDARY.map((s) => {
        const wanted = secondaries.includes(s);
        return [biText(s.ru, s.stat), `+${s.cut}`, `+${s.polished}`, `+${s.brilliant}`, `+${s.flawless}`, wanted ? tr('★ приоритет', '★ Priority') : '—'];
      }))]),
    el('h3', { text: tr('Редкости камней', 'Gem rarities') }),
    table([tr('Редкость', 'Rarity'), tr('Множитель', 'Multiplier'), tr('Вторичек', 'Secondary stats'), tr('Кап сокета', 'Socket cap')], GEM_RARITY.map((g) => [biText(g.ru, g.name), `×${g.mult}`, String(g.secondary), g.socketCap == null ? tr('нет', 'None') : String(g.socketCap)])),
    el('h3', { text: tr('Сокеты и порядок действий', 'Socket unlocks and upgrades') }),
    el('ul', { class: 'tight' }, [
      el('li', { text: (isEnglish
        ? `Buy sockets with gold: first at ML 20 (25K), second at ML 65 (50M), third at ML 115 (20B) and fourth at ML 160 (2T). Available at your ML: ${plan.sockets.count}${plan.sockets.next ? `, next at ML ${plan.sockets.next.ml} (${plan.sockets.next.gold})` : ' (maximum)'}.`
        : `Сокеты открываются покупкой за золото: 1-й — ML 20 (25K), 2-й — ML 65 (50M), 3-й — ML 115 (20B), 4-й — ML 160 (2T). На вашем ML доступно: ${plan.sockets.count}${plan.sockets.next ? `, следующий — на ML ${plan.sockets.next.ml} (${plan.sockets.next.gold})` : ' (максимум)'}.`) }),
      el('li', { text: tr('Заполните все открытые сокеты: пустой сокет хуже слабого камня.', 'Fill every available socket. Even a weak gem is better than an empty socket.') }),
      el('li', { text: tr('Фьюз: 3 камня одной редкости → 1 следующей. Flawless так не получить — только дроп с ML 160.', 'Fuse three gems of the same rarity into one of the next rarity. Flawless gems only drop at ML 160 and above.') }),
      el('li', { text: tr('Реролл вторичек — только на Brilliant и Flawless (там 2–3 вторички).', 'Only Brilliant and Flawless gems allow secondary stat rerolls. They have two and three secondary stats respectively.') }),
      el('li', { text: tr('Уровни сокета дают +0.04 к множителю каждый: выгоднее поднять несколько сокетов, чем один в потолок.', 'Each socket level adds 0.04 to its multiplier. Upgrade several sockets before maxing one out.') }),
    ]),
  ];
}

/** Итоговый список «что надеть»: по одной строке на слот, чтобы просто следовать в игре. */
function readyBuildCard(plan) {
  const rec = recommendationFor(plan);
  const lines = GEAR_CELLS.map((cell) => {
    const e = rec.cells[cell.id];
    if (!e) return null;
    if (cell.slot === 'talisman') {
      const t = talismanById(e.talismanId);
      return `${biText(cell.ru, cell.en)}: ${biText(t.ru, t.name)} — ${t.stats}`;
    }
    if (!e.family) return (isEnglish ? `${cell.en}: empty (two-handed weapon occupies both hands)` : `${cell.ru} (${cell.en}): пусто (двуручное оружие занимает обе руки)`);
    const aff = [...e.affixes.prefixes, ...e.affixes.suffixes].map((a) => biText(a.ru, a.name)).join(', ');
    const db = e.dropBonuses.map((d) => biText(d.ru, d.name)).join(', ');
    return (isEnglish
      ? `${cell.en}: ${e.family.name} — ${e.tierName}. Forge target: ${e.forge.text}. Gem: ${e.gem.family.name}. Affixes: ${aff || '—'}. Drop Bonuses: ${db || '—'}.`
      : `${cell.ru} (${cell.en}): ${e.family.ru} (${e.family.name}) — ${e.tierName}, цель Кузницы ${e.forge.text}; камень ${e.gem.family.ru} (${e.gem.family.name}); аффиксы: ${aff || '—'}; Drop Bonus: ${db || '—'}`);
  }).filter(Boolean);

  const text = [
    (isEnglish
      ? `IdleArc build — ${biText(plan.classRu, plan.className)}, goal: ${rec.goalRu}, level ${rec.level}, ML ${rec.ml}`
      : `Готовая сборка IdleArc — ${biText(plan.classRu, plan.className)}, цель «${rec.goalRu}», уровень ${rec.level}, ML ${rec.ml}`),
    (isEnglish ? `Stance: ${rec.stance}. Stat priority: ${rec.priority.join(' → ')}.` : `Стойка: ${rec.stance}. Приоритет статов: ${rec.priority.join(' → ')}.`),
    ...lines,
    (isEnglish
      ? `Forge order: ${rec.forgeOrder.map((x) => `${x.place}) ${x.slotRu} → ${x.forge.text}`).join('; ')}`
      : `Порядок Кузницы: ${rec.forgeOrder.map((x) => `${x.place}) ${x.slotRu} → ${x.forge.text}`).join('; ')}`),
    (isEnglish ? `Pets: ${rec.pets}` : `Петы: ${rec.pets}`),
  ].join('\n');

  return card(tr('Готовая сборка: что надеть и какие камни (можно копировать)', 'Gear and gems to equip'), [
    el('p', { class: 'muted', text: tr('Список собран системой под вашу цель — просто повторяйте его в игре. Откройте предметы на странице «Снаряжение», там у каждой карточки есть картинка и объяснение.', 'This list contains the items the planner recommends for your goal. Open the Gear page for pictures and an explanation of each choice.') }),
    el('div', { class: 'buylist' }, lines.map((line) => el('div', { class: 'row', text: line }))),
    el('div', { class: 'actions' }, [
      copyButton(text, tr('Скопировать сборку целиком', 'Copy entire build')),
      el('button', { class: 'btn', text: tr('Показать снаряжение с картинками →', 'Show gear with pictures →'), onclick: () => goTo(globalThis.document ? globalThis.document.getElementById('view') : null, 'gear') }),
    ]),
  ]);
}

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
    el('h3', { text: tr('План действий прямо сейчас', 'What to do now') }),
    el('ol', { class: 'todo' }, plan.todo.map((t) => el('li', {}, [
      el('b', { text: t.title }), el('span', { text: ` — ${t.text}` }),
    ]))),
    el('h3', { text: tr('Приоритет характеристик', 'Stat priority') }),
    el('div', { class: 'scroll' }, [table(['№', tr('Характеристика', 'Stat'), tr('Что делает', 'Effect')], statRows)]),
    el('div', { class: 'grid cols-2' }, [
      el('div', { class: 'infobox' }, [
        el('b', { text: tr('Талисманы (2 слота)', 'Talismans (2 slots)') }),
        el('p', { text: talText || '—' }),
        tal.length ? el('ul', { class: 'tight' }, tal.map((t) => el('li', { text: `${biText(t.ru, t.name)}: ${t.stats}` }))) : null,
      ]),
      el('div', { class: 'infobox' }, [
        el('b', { text: tr('Петы (4 слота)', 'Pets (4 slots)') }),
        el('p', { text: plan.profile.pets }),
      ]),
    ]),
    ...plan.tips.map((t) => el('div', { class: 'infobox', text: '💡 ' + t })),
  ];
}

/* ------------------------------- Обмен сборкой ------------------------------- */

function shareCard(root, plan) {
  return card(tr('Обмен сборкой', 'Share build'), [
    el('p', { class: 'muted', text: tr('Текстовый план удобно кинуть в Discord, код — вставить другому игроку: класс, уровень персонажа, ML, цель, +All и распределение очков сохраняются.', 'Copy the plan text for Discord, or give another player a code to import your class, character level, ML, goal, +All bonus and skill allocation.') }),
    el('div', { class: 'actions' }, [
      el('button', { class: 'btn primary', text: tr('Создать код', 'Create code'), onclick: () => { state.shareCode = encodePlan(plan, state.plusAll); render(root); } }),
      copyButton(planToText(plan), tr('Скопировать текст плана', 'Copy plan text')),
      el('button', {
        class: 'btn', text: tr('Загрузить код', 'Load code'),
        onclick: () => {
          const code = prompt(tr('Вставьте код сборки:', 'Paste your build code:'));
          const decoded = code ? decodePlan(code.trim()) : null;
          if (decoded) {
            state.classId = decoded.classId; state.level = decoded.level;
            state.ml = decoded.ml || decoded.level;
            state.goal = decoded.goal;
            state.plusAll = decoded.plusAll || 0;
            state.manual = Object.keys(decoded.allocations || {}).length ? decoded.allocations : null;
            state.mode = state.manual ? 'manual' : 'auto';
            render(root);
          } else if (code) alert(tr('Не удалось прочитать код.', 'Could not read this build code.'));
        },
      }),
    ]),
    state.shareCode ? el('pre', { class: 'code', text: state.shareCode }) : null,
  ]);
}

/* --------------------------- Сохранение в браузере --------------------------- */

function loadoutRow(root, number) {
  const name = `Набор ${number}`; // Stable storage key in both languages.
  const data = getLoadout(name);
  return el('div', { class: 'loadout' }, [
    el('b', { text: tr(name, `Loadout ${number}`) }),
    el('span', { class: 'muted small', text: data ? tr('сохранён', 'Saved') : tr('пусто', 'Empty') }),
    el('button', { class: 'btn tiny', text: tr('Сохранить', 'Save'), onclick: () => { saveLoadout(name, snapshot()); render(root); } }),
    el('button', { class: 'btn tiny', text: tr('Загрузить', 'Load'), disabled: data ? null : 'disabled', onclick: () => { if (applySnapshot(getLoadout(name))) render(root); } }),
    el('button', { class: 'btn tiny', text: tr('Удалить', 'Delete'), disabled: data ? null : 'disabled', onclick: () => { deleteLoadout(name); render(root); } }),
  ]);
}

/** Карточка «данные не теряются»: автосохранение + три набора, как в игре. */
function saveCard(root, plan) {
  const names = listLoadouts();
  const count = Object.keys(names).length;
  const backup = loadBackupRecord();
  const backupText = backup
    ? new Date(backup.savedAt).toLocaleString(isEnglish ? 'en-US' : 'ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;
  return card(tr('Сохранение: данные не теряются при перезагрузке', 'Saves and loadouts'), [
    el('p', { class: 'muted', text: tr('Ничего нажимать не нужно: любое действие — выбор класса, ввод уровня, распределение очков, правка Кузницы — сохраняется сразу. Эта страница нужна только для наборов и заметок. После Ctrl+R, перезапуска сервера или закрытия вкладки планировщик откроется на том же состоянии.', 'The planner saves each change, including class, level, skill points and Forge upgrades. Reload the page, restart the server or reopen this tab to resume your build. Use the loadouts below to keep different builds.') }),
    el('div', { class: 'chips' }, [
      el('span', { class: `chip ${saveInfo.durable ? 'good' : 'warn'}`, text: saveInfo.durable ? tr('любое действие сохраняется в браузере', 'Changes save in this browser') : tr('внимание: хранилище браузера недоступно, данные живут до перезагрузки', 'Browser storage unavailable. Changes only last until reload.') }),
      el('span', { class: 'chip', text: savedAtText() }),
      el('span', { class: 'chip', text: saveInfo.note || tr('канал записи неизвестен', 'Save location unknown') }),
      el('span', { class: 'chip', text: (isEnglish ? `Class: ${plan.classRu}` : `класс: ${plan.classRu}`) }),
      el('span', { class: 'chip', text: (isEnglish ? `Saved loadouts: ${count}` : `наборов сохранено: ${count}`) }),
    ]),
    state.restored
      ? el('div', { class: 'infobox' }, [
        el('b', { text: tr('Прошлая сессия восстановлена', 'Previous session restored') }),
        el('p', { text: (isEnglish
          ? `Loaded the ${state.restoredFrom || 'browser'} save from ${state.restoredAt ? new Date(state.restoredAt).toLocaleString(isEnglish ? 'en-US' : 'ru-RU') : '—'}. Continue where you left off.`
          : `Данные подняты из канала «${state.restoredFrom || 'браузер'}», снимок от ${state.restoredAt ? new Date(state.restoredAt).toLocaleString(isEnglish ? 'en-US' : 'ru-RU') : '—'}. Продолжайте с того же места.`) }),
      ])
      : null,
    protectStored
      ? el('div', { class: 'infobox' }, [
        el('b', { text: tr('В браузере есть снимок, который не удалось прочитать', 'Could not read a saved build in this browser') }),
        el('p', { text: tr('Чтобы ничего не потерять, новый снимок не записывается поверх. Нажмите «Вернуть предыдущую версию», чтобы поднять его, либо «Сохранить сейчас», если хотите начать заново.', 'The planner has kept your existing save. Select “Restore previous version” to recover it or “Save now” to start fresh.') }),
      ])
      : null,
    el('div', { class: 'loadoutbar' }, [1, 2, 3].map((n) => loadoutRow(root, n))),
    el('div', { class: 'actions' }, [
      el('button', { class: 'btn primary', text: tr('Сохранить сейчас', 'Save now'), onclick: () => { markTouched(); protectStored = false; saveState(snapshot(), { allowOverwrite: true }); render(root); } }),
      backup
        ? el('button', {
          class: 'btn',
          text: (isEnglish ? `Restore previous version (${backupText})` : `Вернуть предыдущую версию (${backupText})`),
          onclick: () => {
            const rec = loadBackupRecord();
            if (rec && applySnapshot(rec.state)) { markTouched(); render(root); }
          },
        })
        : null,
      el('button', { class: 'btn', text: tr('Сбросить всё', 'Reset everything'), onclick: () => { clearState(); protectStored = false; state.restored = false; location.reload(); } }),
    ]),
    el('p', { class: 'muted small', text: tr('Данные лежат только в вашем браузере, никуда не отправляются. Пишем сразу в несколько мест (localStorage, sessionStorage, значение окна) и читаем самый свежий снимок — поэтому данные переживают перезагрузку страницы и перезапуск сервера.', 'Builds stay in this browser. The planner saves to localStorage, sessionStorage and the window name and loads the newest copy when you return.') }),
  ]);
}

/* ---------------------------------- Рендер ---------------------------------- */

export function render(root) {
  // Сначала фиксируем состояние: даже если отрисовка сорвётся, введённое уже сохранено.
  try {
    saveState(snapshot(), { allowOverwrite: protectStored ? false : (isTouched() ? true : undefined) });
  } catch { /* сохранение не должно ломать интерфейс */ }
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
  else if (page.id === 'build') root.appendChild(pageCard(page, [readyBuildCard(plan), shareCard(root, plan), saveCard(root, plan)]));
  else root.appendChild(pageCard(page, classStep(root, plan)));

  root.appendChild(pageFooter(root));

  // И ещё раз в конце отрисовки: снимок всегда актуален.
  try {
    saveState(snapshot(), { allowOverwrite: protectStored ? false : true });
  } catch { /* ignore */ }
}

export { state as plannerState };
