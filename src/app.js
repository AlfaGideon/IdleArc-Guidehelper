// Отметка для страховочного экрана в index.html: модули скачались и начали выполняться.
if (typeof window !== 'undefined' && window.__boot) window.__boot.graph = true;

import { DATA_META } from './data/systems.js';
import * as planner from './ui/planner.js';
import * as passives from './ui/passives.js';
import * as calculators from './ui/calculators.js';
import * as codex from './ui/codex.js';
import * as nuances from './ui/nuances.js';
import * as sideb from './sideb/sideb.js';

const views = { planner, passives, calc: calculators, codex, nuances };
const root = document.getElementById('view');
const bRoot = document.getElementById('sideb-root');
const tabs = document.getElementById('tabs');

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* --------------------------- переключение A / B --------------------------- */
/*
 * Сторона A — Guide Helper (основной планировщик), сторона B — интерфейс в стиле
 * IdleArc Companion. Переключение — кликом по логотипу; сторона записана в хэше:
 * сторона A — #planner / #passives / …, сторона B — #b/home, #b/upgrade, …
 */
function hashRoute() {
  const h = (location.hash || '').replace(/^#/, '');
  return h;
}

function isSideB(hash) {
  return hash === 'b' || hash.startsWith('b/');
}

/** Меняем класс стороны на body (в тестовом DOM-шиме body может не быть — тогда пропускаем). */
function bodySide(side) {
  const body = typeof document !== 'undefined' ? document.body : null;
  if (!body || !body.classList) return;
  body.classList.toggle('side-a', side === 'a');
  body.classList.toggle('side-b', side === 'b');
}

function activateA(tab) {
  const key = views[tab] ? tab : 'planner';
  bodySide('a');
  if (bRoot) bRoot.hidden = true;
  for (const btn of tabs.querySelectorAll('button')) btn.classList.toggle('active', btn.dataset.tab === key);
  views[key].render(root);
  try { document.title = 'IdleArc Guide Helper — планировщик сборок'; } catch { /* неважно */ }
  try { sessionStorage.setItem('iac:side:last-a', key); } catch { /* приватный режим */ }
}

function activateB(page) {
  bodySide('b');
  if (bRoot) bRoot.hidden = false;
  sideb.render(bRoot, page);
}

function route() {
  const h = hashRoute();
  if (isSideB(h)) {
    activateB(h.slice(2) || 'home');
  } else {
    activateA(h || 'planner');
  }
}

/** Переключение по клику на логотип: из A — в сохранённую страницу B, из B — обратно в свою вкладку A. */
export function toggleSide() {
  const inB = typeof document !== 'undefined' && document.body && document.body.classList
    ? document.body.classList.contains('side-b')
    : isSideB(hashRoute());
  if (inB) {
    let last = 'planner';
    try { last = sessionStorage.getItem('iac:side:last-a') || 'planner'; } catch { /* ok */ }
    location.hash = last;
  } else {
    location.hash = sideb.lastPage() || 'b/home';
  }
  if (!hashRoute()) route(); // пустой хэш не вызывает hashchange
}

setText('meta-version', DATA_META.gameVersion);
setText('foot-date', DATA_META.verified);
setText('meta-build', DATA_META.build);
setText('foot-build', DATA_META.build);

tabs.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-tab]');
  if (!btn) return;
  // getAttribute — надёжнее dataset: в лёгких DOM-шимах dataset не синхронизируется с data-tab.
  const tab = (typeof btn.getAttribute === 'function' && btn.getAttribute('data-tab'))
    || (btn.dataset && btn.dataset.tab) || '';
  if (!tab) return;
  location.hash = tab;
  if (hashRoute() === tab) route(); // тот же хэш не вызовет hashchange — рендерим сами
});

const toggleBtn = document.getElementById('side-toggle');
if (toggleBtn) toggleBtn.addEventListener('click', toggleSide);

const reloadBtn = document.getElementById('reload-btn');
if (reloadBtn) reloadBtn.addEventListener('click', () => location.reload(true));

// Сверяем метку сборки клиента с сервером: если сервер новее — показываем баннер с кнопкой перезагрузки.
fetch('api/build', { cache: 'no-store' })
  .then((r) => (r.ok ? r.json() : null))
  .then((info) => {
    if (!info || !info.build || info.build === DATA_META.build) return;
    const banner = document.createElement('div');
    banner.className = 'warnbox stale';
    banner.innerHTML = '<b>Открыта старая сборка</b> (' + DATA_META.build + ') → на сервере уже <b>' + info.build + '</b>. '
      + 'Нажмите «Перезагрузить», чтобы загрузить свежие данные: '
      + '<button class="btn primary" id="stale-reload">Перезагрузить</button>';
    root.insertBefore(banner, root.firstChild);
    const btn = banner.querySelector('#stale-reload');
    if (btn) btn.addEventListener('click', () => location.reload(true));
  })
  .catch(() => {});

route();
window.addEventListener('hashchange', route);

// Сообщаем страховочному скрипту в index.html: модули загрузились и интерфейс отрисован.
if (window.__boot) window.__boot.ready = true;
