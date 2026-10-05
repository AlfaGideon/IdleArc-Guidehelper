/**
 * Домашняя страница стороны B — как у IdleArc Companion:
 * хиро «Your IdleArc toolkit, offline.» + четыре карточки быстрого доступа
 * (Upgrade / Compare / Skill Trees / Codex) со стрелками «›».
 */
import { el } from '../ui/dom.js';
import { bi, chip, panel } from './ui.js';
import { GEAR_FAMILIES, AFFIXES, DROP_BONUSES, GEM_FAMILIES, DROP_BONUS_TIER_LABELS } from '../data/items.js';
import { CLASSES } from '../data/classes.js';
import { PASSIVE_ROWS } from '../data/passives.js';
import { DATA_META } from '../data/systems.js';

const CARDS = [
  { route: 'b/upgrade', icon: '⇧', title: 'Upgrade', desc: 'Exact costs', ru: 'точные цены Кузницы: золото, фрагменты, шансы, промоушен тиров' },
  { route: 'b/compare', icon: '⇄', title: 'Compare', desc: 'Equipment side by side', ru: 'два предмета рядом: имплиситы, аффиксы, тиры, вердикт под цель' },
  { route: 'b/trees', icon: '✦', title: 'Skill Trees', desc: 'Class and Passive', ru: 'классовые ветки всех 5 классов и пассивное дерево на 200 рядов' },
  { route: 'b/codex', icon: '▤', title: 'Codex', desc: 'Browse reference data', ru: 'справочник: предметы, аффиксы, гемы, петы, талисманы, прогрессия' },
];

function statStrip() {
  const skills = CLASSES.reduce((s, c) => s + c.skills.length, 0);
  const items = [
    [String(GEAR_FAMILIES.length), 'семейств предметов'],
    [String(skills), 'классовых навыков'],
    [String(PASSIVE_ROWS.length), 'рядов пассивного дерева'],
    [String(AFFIXES.length), 'аффиксов'],
    [`${DROP_BONUSES.length} · T2–T9`, 'Drop Bonuses'],
    [`${GEM_FAMILIES.length} × 5`, 'семей гемов'],
  ];
  return el('div', { class: 'b-stats' }, items.map(([v, l]) => el('div', { class: 'b-stat' }, [el('b', { text: v }), el('span', { text: l })])));
}

export function render(view) {
  view.appendChild(el('section', { class: 'b-hero' }, [
    el('div', { class: 'b-hero-glow' }),
    el('h1', { class: 'b-hero-title', text: 'Your IdleArc toolkit, offline.' }),
    el('p', { class: 'b-hero-sub', text: 'Plan builds, compare gear, calculate upgrades, and map skill trees.' }),
    el('p', { class: 'b-hero-ru', text: 'Планируйте сборки, сравнивайте снаряжение, считайте точные цены апгрейда и разбирайте деревья навыков — всё работает без интернета, на снапшоте данных патча 1.3.1 (Season 2).' }),
    el('div', { class: 'b-chip-row' }, [
      chip('Season 2 · 1.3.1', 'gold'),
      chip('offline', 'green'),
      chip(`snapshot ${DATA_META.verified.replace('Данные сверены с официальными источниками и текущим билдом игры на ', '')}`),
    ]),
  ]));

  view.appendChild(el('h3', { class: 'b-quick-title', text: 'Quick access' }));
  view.appendChild(el('div', { class: 'b-quick' }, CARDS.map((c) => el('a', { class: 'b-quick-card', href: `#${c.route}` }, [
    el('span', { class: 'b-quick-ic', text: c.icon }),
    el('span', { class: 'b-quick-main' }, [
      el('b', { text: c.title }),
      el('span', { class: 'b-quick-desc', text: c.desc }),
      el('span', { class: 'b-quick-ru', text: c.ru }),
    ]),
    el('span', { class: 'b-quick-arrow', text: '›' }),
  ]))));

  view.appendChild(panel('Inside the toolkit · что внутри', [
    statStrip(),
    el('p', { class: 'b-note', text: `Сторона B повторяет интерфейс IdleArc Companion (community). Данные — снапшот Guide Helper: ${bi('официальные патч-ноты', 'patch notes')}, Item Codex и вики, сверены ${DATA_META.verified.replace('Данные сверены с официальными источниками и текущим билдом игры на ', '')}. Сторона A (клик по логотипу) — пошаговый планировщик сборок.` }),
  ]));
}
