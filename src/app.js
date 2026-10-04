import { DATA_META as META } from './data/systems.js';
// ?v= — метка сборки: заставляет браузер и любые промежуточные кэши взять свежие файлы.
const V = `?v=${META.build}`;
const planner = await import('./ui/planner.js' + V);
const calculators = await import('./ui/calculators.js' + V);
const codex = await import('./ui/codex.js' + V);
const nuances = await import('./ui/nuances.js' + V);

const views = { planner, calc: calculators, codex, nuances };
const root = document.getElementById('view');
const tabs = document.getElementById('tabs');

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

document.getElementById('meta-version').textContent = META.gameVersion;
document.getElementById('foot-date').textContent = META.verified;
document.getElementById('meta-build').textContent = META.build;
document.getElementById('foot-build').textContent = META.build;

/** Жёсткое обновление: новый адрес заставляет браузер взять свежие файлы, минуя кэш. */
function hardReload() {
  const url = new URL(location.href);
  url.searchParams.set('b', Date.now().toString(36));
  location.replace(url.toString());
}

document.getElementById('reload-btn').addEventListener('click', hardReload);

// Сверяем метку сборки клиента с сервером: если сервер новее — предлагаем обновиться.
fetch('api/build?t=' + Date.now(), { cache: 'no-store' })
  .then((r) => (r.ok ? r.json() : null))
  .then((info) => {
    if (!info || !info.build || info.build === META.build) return;
    const banner = document.createElement('div');
    banner.className = 'warnbox stale';
    banner.innerHTML = `<b>Открыта старая сборка</b> (${META.build}) → на сервере уже <b>${info.build}</b>. `
      + 'Нажмите «Обновить», чтобы загрузить свежие данные и интерфейс: '
      + '<button class="btn primary" id="stale-reload">Обновить сейчас</button>';
    document.getElementById('view').prepend(banner);
    banner.querySelector('#stale-reload').addEventListener('click', hardReload);
  })
  .catch(() => {});

activate((location.hash || '#planner').slice(1));
window.addEventListener('hashchange', () => activate((location.hash || '#planner').slice(1)));
