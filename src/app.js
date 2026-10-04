import { DATA_META } from './data/systems.js';
import * as planner from './ui/planner.js';
import * as calculators from './ui/calculators.js';
import * as codex from './ui/codex.js';
import * as nuances from './ui/nuances.js';

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

document.getElementById('meta-version').textContent = DATA_META.gameVersion;
document.getElementById('foot-date').textContent = DATA_META.verified;

activate((location.hash || '#planner').slice(1));
window.addEventListener('hashchange', () => activate((location.hash || '#planner').slice(1)));
