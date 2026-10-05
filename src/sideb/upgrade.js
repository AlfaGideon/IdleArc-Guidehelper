/**
 * Upgrade — точные цены Кузницы (как страница «Upgrade · Exact costs» компаньона).
 * Шаг за шагом: золото, фрагменты, шанс успеха; суммарный расчёт с учётом провалов;
 * гейт биомов по ML и цена промоушена тира.
 *
 * Формулы — официальные (Item Codex → Forge):
 *   gold = round(base × (1 + 0.45 × target)), fragments = ceil(target × mult),
 *   провал = база + 2.5 п.п. за уровень выше порога + 1.5 п.п. выше +19 (кап 85%).
 */
import { el } from '../ui/dom.js';
import { bi, chip, fmt, panel, bTable, rarityChip } from './ui.js';
import { GEAR_CELLS } from '../data/items.js';
import { FORGE_TIERS, forgeTierInfo, forgeStep, forgeCumulative } from '../data/forge.js';
import { FORGE_GATE, forgeGateForTier, promotionFromTier } from '../data/biomes.js';
import { sidebState, pageHead } from './sideb.js';

const ST = () => sidebState.upgrade;

function stepRows(tier, from, to) {
  const rows = [];
  let gold = 0; let frags = 0; let expGold = 0; let expTries = 0;
  for (let lvl = from; lvl < to; lvl += 1) {
    const s = forgeStep(tier, lvl);
    const p = s.success;
    const tries = p > 0 ? 1 / p : Infinity;
    const eg = p > 0 ? s.gold / p : Infinity;
    gold += s.gold; frags += s.fragments; expGold += eg; expTries += tries;
    rows.push([
      `+${lvl} → +${s.target}`,
      fmt(s.gold),
      `${s.fragments} ×`,
      el('span', { class: p >= 0.99 ? 'b-ok' : p >= 0.8 ? 'b-warn' : 'b-bad', text: `${Math.round(p * 1000) / 10}%` }),
      p >= 0.999 ? '1' : fmt(Math.round(tries * 10) / 10),
      fmt(Math.round(eg)),
    ]);
  }
  return { rows, gold, frags, expGold: Math.round(expGold), expTries };
}

function gatePanel(tier, ml) {
  const gate = forgeGateForTier(tier);
  const rows = FORGE_GATE.map((g) => {
    const info = forgeGateForTier(g.tier);
    const open = g.ml <= ml;
    return [
      rarityChip(g.tier),
      bi(info.biomeRu, info.biome ? info.biome.name : ''),
      `ML ${g.ml}`,
      g.fragmentRu,
      open ? el('span', { class: 'b-ok', text: 'открыт' }) : el('span', { class: 'b-bad', text: `нужен ML ${g.ml}` }),
    ];
  });
  const promo = promotionFromTier(tier);
  return [
    panel('Гейт биомов: тир слота упирается в материалы монстров', [
      el('p', { class: 'b-note', text: `Кузница качает СЛОТ: чтобы поднять слот в тир N, нужны материалы монстров биома (ML), а не просто выпавший предмет. Ваш ML: ${ml} — выбранный тир ${tier} ${gate && gate.ml <= ml ? 'доступен' : 'ПОКА НЕДОСТУПЕН'}.` }),
      bTable(['Тир', 'Биом', 'Открывается', 'Фрагмент', 'У вас'], rows),
    ]),
    promo ? panel(`Промоушен T${promo.from} → T${promo.to}`, [
      el('div', { class: 'b-chip-row' }, [
        chip(`${fmt(promo.gold)} золота`, 'gold'),
        chip(`${promo.essenceRu} ×1`),
        chip(`успех ${100 - promo.fail}%`, promo.fail >= 35 ? 'red' : 'green'),
        ...promo.materials.map(([m, n]) => chip(`${m} ×${n}`)),
      ]),
      el('p', { class: 'b-note', text: 'Промоушен нужен после полной прокачки тира («+максимум»): переводит слот в следующий тир и открывает новую позицию аффикса.' }),
    ]) : panel('Промоушен', [el('p', { class: 'b-note', text: 'T6 — максимальный тир, дальше только Awaken просыпаний (до 5 рангов, цена ×2.5 за ранг).' })]),
  ];
}

function controls(view) {
  const st = ST();
  const info = forgeTierInfo(st.tier);

  const slotSel = el('select', { class: 'b-input', onchange: (e) => { st.slot = e.target.value; render(view); } },
    GEAR_CELLS.filter((c) => !c.id.startsWith('talisman')).map((c) => el('option', { value: c.id, selected: st.slot === c.id ? 'selected' : null }, [`${c.ru} (${c.en})`])));

  const tierSel = el('select', { class: 'b-input', onchange: (e) => { st.tier = Number(e.target.value); st.from = 0; st.to = forgeTierInfo(st.tier).maxLevel; render(view); } },
    FORGE_TIERS.map((t) => el('option', { value: String(t.tier), selected: st.tier === t.tier ? 'selected' : null }, [`T${t.tier} ${t.ru} (${t.name}) · до +${t.maxLevel}`])));

  const num = (val, min, max, cb) => el('input', {
    class: 'b-input b-num', type: 'number', min: String(min), max: String(max), value: String(val),
    onchange: (e) => { const v = Math.max(min, Math.min(max, Math.round(Number(e.target.value) || min))); cb(v); render(view); },
  });

  return el('div', { class: 'b-controls' }, [
    el('div', { class: 'b-ctl' }, [el('label', { text: 'Слот' }), slotSel]),
    el('div', { class: 'b-ctl' }, [el('label', { text: 'Тир слота' }), tierSel]),
    el('div', { class: 'b-ctl' }, [el('label', { text: `Сейчас (0…${info.maxLevel - 1})` }), num(st.from, 0, info.maxLevel - 1, (v) => { st.from = v; if (st.to <= v) st.to = v + 1; })]),
    el('div', { class: 'b-ctl' }, [el('label', { text: `Цель (…${info.maxLevel})` }), num(st.to, st.from + 1, info.maxLevel, (v) => { st.to = v; })]),
    el('div', { class: 'b-ctl' }, [el('label', { text: 'Ваш Monster Level' }), num(st.ml, 1, 999, (v) => { st.ml = v; })]),
  ]);
}

export function render(view) {
  const st = ST();
  const info = forgeTierInfo(st.tier);
  const cell = GEAR_CELLS.find((c) => c.id === st.slot);
  const { rows, gold, frags, expGold } = stepRows(st.tier, st.from, st.to);
  const cum = forgeCumulative(st.tier, st.to);

  view.appendChild(pageHead('Upgrade', `Exact costs — точные цены Кузницы шаг за шагом: ${cell ? bi(cell.ru, cell.en) : 'слот'}, тир T${st.tier} ${info.ru} (${info.name}), +${st.from} → +${st.to}.`));

  view.appendChild(panel(null, [controls(view)]));

  view.appendChild(el('div', { class: 'b-kpis' }, [
    el('div', { class: 'b-kpi' }, [el('b', { text: fmt(gold) }), el('span', { text: `золота за ${st.to - st.from} шагов` })]),
    el('div', { class: 'b-kpi' }, [el('b', { text: `${frags} ×` }), el('span', { text: info.fragmentRu })]),
    el('div', { class: 'b-kpi' }, [el('b', { text: fmt(expGold) }), el('span', { text: 'золота с учётом провалов' })]),
    el('div', { class: 'b-kpi' }, [el('b', { text: fmt(cum.gold) }), el('span', { text: `весь тир с +0 до +${st.to}` })]),
  ]));

  view.appendChild(panel('Шаги апгрейда', [
    bTable(['Шаг', 'Золото', 'Фрагменты', 'Успех', 'Ожид. попыток', 'Ожид. золото'], rows.length ? rows : [['—', '—', '—', '—', '—', '—']]),
    el('p', { class: 'b-note', text: '«Ожид.» — математическое ожидание с учётом провала (провал тратит ресурсы, но не откатывает уровень). Плюс к каждому шагу — материалы монстров текущего биома (видны в игре).' }),
  ]));

  for (const p of gatePanel(st.tier, st.ml)) view.appendChild(p);
}
