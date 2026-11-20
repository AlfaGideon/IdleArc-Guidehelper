// Отметка для страховочного экрана в index.html: модули скачались и начали выполняться.
if (typeof window !== 'undefined' && window.__boot) window.__boot.graph = true;

import { DATA_META } from './data/systems.js';
import { t } from './i18n.js';
import * as planner from './ui/planner.js';
import * as passives from './ui/passives.js';
import * as calculators from './ui/calculators.js';
import * as codex from './ui/codex.js';
import * as nuances from './ui/nuances.js';

const views = { planner, passives, calc: calculators, codex, nuances };
const root = document.getElementById('view');
const tabs = document.getElementById('tabs');

// Data labels are chosen when modules load. Keep transient inputs across a language reload.
const viewState = globalThis.history?.state?.idleArcViews;
if (viewState) {
  calculators.restoreViewState(viewState.calculators);
  codex.restoreViewState(viewState.codex);
  const { idleArcViews, ...rest } = history.state;
  history.replaceState(rest, '');
}
window.addEventListener('ia-language', () => {
  history.replaceState({ ...history.state, idleArcViews: {
    calculators: calculators.getViewState(),
    codex: codex.getViewState(),
  } }, '');
  location.reload();
});

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function activate(tab) {
  const key = views[tab] ? tab : 'planner';
  for (const btn of tabs.querySelectorAll('button')) btn.classList.toggle('active', btn.dataset.tab === key);
  views[key].render(root);
  location.hash = key;
}

tabs.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-tab]');
  if (btn) activate(btn.dataset.tab);
});

setText('meta-version', DATA_META.gameVersion);
setText('foot-date', DATA_META.verified);
setText('meta-build', DATA_META.build);
setText('foot-build', DATA_META.build);

const reloadBtn = document.getElementById('reload-btn');
if (reloadBtn) reloadBtn.addEventListener('click', () => location.reload(true));

// Сверяем метку сборки клиента с сервером: если сервер новее — показываем баннер с кнопкой перезагрузки.
fetch('api/build', { cache: 'no-store' })
  .then((r) => (r.ok ? r.json() : null))
  .then((info) => {
    if (!info || !info.build || info.build === DATA_META.build) return;
    const banner = document.createElement('div');
    banner.className = 'warnbox stale';
    banner.textContent = t(`Открыта старая сборка (${DATA_META.build}). На сервере уже ${info.build}. `, `You are using build ${DATA_META.build}. Build ${info.build} is available. `);
    const btn = document.createElement('button');
    btn.className = 'btn primary';
    btn.textContent = t('Перезагрузить', 'Reload');
    banner.appendChild(btn);
    root.insertBefore(banner, root.firstChild);
    btn.addEventListener('click', () => location.reload(true));
  })
  .catch(() => {});

activate((location.hash || '#planner').slice(1));
window.addEventListener('hashchange', () => activate((location.hash || '#planner').slice(1)));

// Сообщаем страховочному скрипту в index.html: модули загрузились и интерфейс отрисован.
if (window.__boot) window.__boot.ready = true;
