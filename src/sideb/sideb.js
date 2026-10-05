/**
 * Сторона B — структура и элементы интерфейса повторяют
 * https://idlearc-companion-web-production.up.railway.app/ :
 *
 *  • шапка: логотип + «IdleArc Companion» + большая поисковая строка
 *    «⌕ Search the Companion — Items, materials, currencies & more…»;
 *  • навигация — карточками, как на сайте: домашняя = хиро + «Quick access»,
 *    внутренние страницы имеют обратную ссылку «‹ Home» (строка-навбара нет);
 *  • инструменты те же, что у компаньона: Upgrade / Compare / Skill Trees / Codex,
 *    плюс докрученная функциональность Guide Helper в том же карточном стиле.
 *
 * Маршруты хэша: #b/home · #b/upgrade · #b/compare · #b/trees · #b/codex.
 * Переключение A↔B — кликом по логотипу (здесь — с бейджем «B»).
 */
import { el } from '../ui/dom.js';
import * as pages from './pages.js';
import { buildSearchIndex } from './searchable.js';

export const NAV = [
  { id: 'upgrade', title: 'Upgrade', icon: '⇧', desc: 'Exact costs' },
  { id: 'compare', title: 'Compare', icon: '⇄', desc: 'Equipment side by side' },
  { id: 'trees', title: 'Skill Trees', icon: '✦', desc: 'Class and Passive' },
  { id: 'codex', title: 'Codex', icon: '▤', desc: 'Browse reference data' },
];

let shellBuilt = false;
let viewEl = null;
let searchInput = null;
let resultsEl = null;
let currentPage = 'home';
let rootRef = null;
let searchIndex = null;

export const sidebState = {
  // разделяемые состояния страниц (живут, пока открыта сторона B)
  searchQuery: '',
  codex: { query: '', cat: null },
  trees: { mode: 'class', classId: 'warrior', goal: 'progress', level: 60, tierOpen: 0 },
  compare: { slot: 'mainhand', a: null, b: null, tierA: 3, tierB: 3, plusA: 0, plusB: 0, goal: 'progress' },
  upgrade: { slot: 'mainhand', tier: 2, from: 0, to: 9, ml: 30 },
  pendingJump: null, // куда прыгнуть после открытия страницы из поиска
};

export function lastPage() {
  return currentPage === 'home' ? 'b/home' : `b/${currentPage}`;
}

/** Обратная ссылка «‹ Home», как на страницах компаньона. */
export function backHome(label = 'Home') {
  return el('a', { class: 'b-back', href: '#b/home' }, [el('span', { class: 'b-back-ic', text: '‹' }), el('span', { text: label })]);
}

/** Шапка страницы: назад + заголовок + подпись. */
export function pageHead(title, sub) {
  return el('div', { class: 'b-page-head' }, [
    backHome(),
    el('h2', { text: title }),
    sub ? el('p', { class: 'b-page-sub', text: sub }) : null,
  ]);
}

/* --------------------------------- поиск --------------------------------- */

function runSearch(q) {
  if (!searchIndex) searchIndex = buildSearchIndex();
  const query = q.trim().toLowerCase();
  if (query.length < 2) return [];
  const scored = [];
  for (const item of searchIndex) {
    const hay = item.hay;
    let score = -1;
    if (hay.title.startsWith(query)) score = 0;
    else if (hay.title.includes(query)) score = 1;
    else if (hay.all.includes(query)) score = 2;
    if (score >= 0) scored.push({ item, score });
  }
  scored.sort((a, b) => a.score - b.score || (a.item.title.length - b.item.title.length));
  return scored.slice(0, 14).map((s) => s.item);
}

function openResult(res) {
  sidebState.pendingJump = res.jump;
  const route = res.jump && res.jump.page ? res.jump.page : 'codex';
  hideResults();
  if (searchInput) { searchInput.value = res.title; sidebState.searchQuery = res.title; }
  if (currentPage === route) render(rootRef, route); // уже на странице — перерендерить с прыжком
  location.hash = `b/${route}`;
}

function showResults(list, q) {
  if (!resultsEl) return;
  resultsEl.innerHTML = '';
  if (!q || q.trim().length < 2) { resultsEl.hidden = true; return; }
  if (!list.length) {
    resultsEl.appendChild(el('div', { class: 'b-search-empty', text: 'Ничего не найдено — попробуйте другое название (англ. или рус.)' }));
    resultsEl.hidden = false;
    return;
  }
  for (const res of list) {
    resultsEl.appendChild(el('button', {
      class: 'b-search-item',
      type: 'button',
      onclick: () => openResult(res),
    }, [
      el('span', { class: 'b-search-ic', text: res.icon }),
      el('span', { class: 'b-search-main' }, [
        el('b', { text: res.title }),
        el('span', { class: 'b-search-sub', text: res.sub }),
      ]),
      el('span', { class: 'b-search-tag', text: res.tag }),
    ]));
  }
  resultsEl.hidden = false;
}

function hideResults() {
  if (resultsEl) resultsEl.hidden = true;
}

/* --------------------------------- шапка --------------------------------- */

function bLogo() {
  return el('svg', {
    viewBox: '0 0 48 48', width: '38', height: '38', 'aria-hidden': 'true', focusable: 'false',
    html: `
      <defs>
        <linearGradient id="ibGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffe08a"/><stop offset=".55" stop-color="#f0b64b"/><stop offset="1" stop-color="#b5761f"/>
        </linearGradient>
        <linearGradient id="ibGem" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#c3b6ff"/><stop offset=".45" stop-color="#8f85f0"/><stop offset="1" stop-color="#3d3490"/>
        </linearGradient>
        <radialGradient id="ibBg" cx=".5" cy=".3" r=".95">
          <stop offset="0" stop-color="#2c3145"/><stop offset="1" stop-color="#141721"/>
        </radialGradient>
      </defs>
      <rect x="1.7" y="1.7" width="44.6" height="44.6" rx="11" fill="url(#ibBg)" stroke="url(#ibGold)" stroke-width="2.2"/>
      <path d="M9 34 A17 17 0 0 1 39 34" fill="none" stroke="url(#ibGold)" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M13.6 34 A12.6 12.6 0 0 1 34.4 34" fill="none" stroke="url(#ibGold)" stroke-width="1.8" opacity=".5" stroke-linecap="round"/>
      <path d="M24 13.5 L30.6 21.8 L24 34.5 L17.4 21.8 Z" fill="url(#ibGem)" stroke="#ffde9e" stroke-width="1.1" stroke-linejoin="round"/>
      <path d="M17.4 21.8 H30.6 M24 13.5 L21.2 21.8 L24 34.5 M24 13.5 L26.8 21.8 L24 34.5" stroke="#10131c" stroke-opacity=".3" fill="none" stroke-width=".8"/>
      <circle cx="12" cy="21" r="1.4" fill="url(#ibGold)"/>
      <circle cx="36" cy="21" r="1.4" fill="url(#ibGold)"/>
      <circle cx="24" cy="9.4" r="1.2" fill="url(#ibGold)"/>`,
  });
}

function buildShell(root) {
  const logoBtn = el('button', {
    class: 'b-logo', type: 'button',
    title: 'Клик — вернуться на сторону A (Guide Helper)',
    onclick: () => {
      let last = 'planner';
      try { last = sessionStorage.getItem('iac:side:last-a') || 'planner'; } catch { /* ok */ }
      location.hash = last;
    },
  }, [bLogo(), el('span', { class: 'b-side-badge', text: 'B', 'aria-hidden': 'true' })]);

  searchInput = el('input', {
    class: 'b-search-input',
    type: 'search',
    placeholder: 'Search the Companion — Items, materials, currencies & more…',
    'aria-label': 'Поиск по компаньону',
    oninput: (e) => {
      sidebState.searchQuery = e.target.value;
      showResults(runSearch(e.target.value), e.target.value);
    },
    onkeydown: (e) => {
      if (e.key === 'Escape') { hideResults(); e.target.blur(); }
      if (e.key === 'Enter') {
        const list = runSearch(e.target.value);
        if (list.length) openResult(list[0]);
      }
    },
  });
  resultsEl = el('div', { class: 'b-search-results', hidden: 'hidden' });

  const rootNode = el('div', { class: 'b-shell' }, [
    el('header', { class: 'b-top' }, [
      el('div', { class: 'b-brand' }, [
        logoBtn,
        el('div', { class: 'b-word' }, [
          el('a', { href: '#b/home', class: 'b-title', text: 'IdleArc Companion' }),
          el('span', { class: 'b-sub', text: 'Unofficial · offline · side B of Guide Helper (логотип — сторона A)' }),
        ]),
      ]),
      el('div', { class: 'b-search' }, [
        el('span', { class: 'b-search-glyph', text: '⌕' }),
        searchInput,
        resultsEl,
      ]),
    ]),
    viewEl = el('main', { class: 'b-view' }),
    el('footer', { class: 'b-foot' }, [
      el('span', { text: 'Unofficial fan-made companion · данные — снапшот IdleArc 1.3.1 (Season 2) · интерфейс повторяет IdleArc Companion (community).' }),
      el('a', { href: '#planner', class: 'b-foot-link', text: '→ сторона A: планировщик сборок' }),
    ]),
  ]);
  root.appendChild(rootNode);
  shellBuilt = true;

  // Клик вне поиска — спрятать выпадашку.
  document.addEventListener('click', (e) => {
    if (!resultsEl || resultsEl.hidden) return;
    if (!e.target.closest('.b-search')) hideResults();
  });
}

/* -------------------------------- рендер --------------------------------- */

export function render(root, page = 'home') {
  rootRef = root;
  if (!shellBuilt) buildShell(root);
  const key = pages.PAGES[page] ? page : 'home';
  currentPage = key;
  viewEl.innerHTML = '';
  pages.PAGES[key].render(viewEl);
  try { document.title = `IdleArc Companion — ${key === 'home' ? 'Home' : (NAV.find((n) => n.id === key) || {}).title || 'Home'}`; } catch { /* неважно */ }
}

/** TEST-ONLY. */
export const __internal = { runSearch };
