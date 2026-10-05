/**
 * Домашняя страница стороны B — структура повторяет IdleArc Companion 1:1:
 * поиск (в шапке) → хиро «Your IdleArc toolkit, offline.» → «Quick access»
 * → карточки со значком-глифом, заголовком, подписью и стрелкой «›»:
 *   ⇧ Upgrade / Exact costs
 *   ⇄ Compare / Equipment side by side
 *   ✦ Skill Trees / Class and Passive
 *   ▤ Codex / Browse reference data
 * Ниже таким же стилем — вторая группа «From Guide Helper» с функциональностью
 * нашего проекта (планировщик, гайды пассивки, калькуляторы), как и договаривались:
 * интерфейс компаньона — основа, наши инструменты докручены в него.
 */
import { el } from '../ui/dom.js';

const COMPANION_CARDS = [
  { route: 'b/upgrade', icon: '⇧', title: 'Upgrade', desc: 'Exact costs' },
  { route: 'b/compare', icon: '⇄', title: 'Compare', desc: 'Equipment side by side' },
  { route: 'b/trees', icon: '✦', title: 'Skill Trees', desc: 'Class and Passive' },
  { route: 'b/codex', icon: '▤', title: 'Codex', desc: 'Browse reference data' },
];

// Наша функциональность — в том же карточном стиле компаньона.
const HELPER_CARDS = [
  { route: 'planner@a', icon: '▦', title: 'Build Planner', desc: 'Подбор сборки под класс, цель и уровень — шаг за шагом (сторона A)' },
  { route: 'passives@a', icon: '★', title: 'Passive Guides', desc: 'Как качать пассивное дерево за каждый класс — с майлстоунами и маршрутом' },
  { route: 'calc@a', icon: 'Σ', title: 'Calculators', desc: 'Криты >100%, капы DR 95/99, Retaliation, гемы, компоунд петов' },
  { route: 'nuances@a', icon: '⚠', title: 'Pitfalls & Sources', desc: 'Нюансы билдостроения и источники данных со статусом проверки' },
];

function cardRow(c) {
  return el('a', { class: 'b-quick-card', href: c.route.startsWith('b/') ? `#${c.route}` : `#${c.route.replace('@a', '')}` }, [
    el('span', { class: 'b-quick-ic', text: c.icon }),
    el('span', { class: 'b-quick-main' }, [
      el('b', { text: c.title }),
      el('span', { class: 'b-quick-desc', text: c.desc }),
    ]),
    el('span', { class: 'b-quick-arrow', text: '›' }),
  ]);
}

export function render(view) {
  view.appendChild(el('section', { class: 'b-hero' }, [
    el('h2', { class: 'b-hero-title', text: 'Your IdleArc toolkit, offline.' }),
    el('p', { class: 'b-hero-sub', text: 'Plan builds, compare gear, calculate upgrades, and map skill trees.' }),
  ]));

  view.appendChild(el('h3', { class: 'b-quick-title', text: 'Quick access' }));
  view.appendChild(el('div', { class: 'b-quick' }, COMPANION_CARDS.map(cardRow)));

  view.appendChild(el('h3', { class: 'b-quick-title', text: 'From Guide Helper · наши инструменты' }));
  view.appendChild(el('div', { class: 'b-quick' }, HELPER_CARDS.map(cardRow)));
}
