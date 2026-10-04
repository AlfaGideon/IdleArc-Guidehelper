import { DATA_META } from './data/systems.js';
import * as planner from './ui/planner.js';
import * as calculators from './ui/calculators.js';
import * as codex from './ui/codex.js';
import * as nuances from './ui/nuances.js';

const views = { planner, calc: calculators, codex, nuances };
const root = document.getElementById('view');
const tabs = document.getElementById('tabs');

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
    banner.innerHTML = '<b>Открыта старая сборка</b> (' + DATA_META.build + ') → на сервере уже <b>' + info.build + '</b>. '
      + 'Нажмите «Перезагрузить», чтобы загрузить свежие данные: '
      + '<button class="btn primary" id="stale-reload">Перезагрузить</button>';
    root.insertBefore(banner, root.firstChild);
    const btn = banner.querySelector('#stale-reload');
    if (btn) btn.addEventListener('click', () => location.reload(true));
  })
  .catch(() => {});

activate((location.hash || '#planner').slice(1));
window.addEventListener('hashchange', () => activate((location.hash || '#planner').slice(1)));

// Сообщаем страховочному скрипту в index.html: модули загрузились и интерфейс отрисован.
if (window.__boot) window.__boot.ready = true;
