/**
 * Compare — сравнение двух предметов рядом (как «Compare · Equipment side by side»).
 * Один слот, два кандидата: иконка, имя по тиру, имплисит с лестницей T1→T6,
 * совместимые аффиксы, условия выпадения и вердикт под выбранную цель.
 */
import { el } from '../ui/dom.js';
import { bi, chip, fmt, panel, bTable, rarityChip } from './ui.js';
import {
  SLOT_ORDER, SLOT_RU, SLOT_EN, RARITY, familiesForSlot, GEAR_FAMILIES,
} from '../data/items.js';
import { GOALS, statPriorityFor } from '../data/builds.js';
import { CLASSES } from '../data/classes.js';
import { artNode, loadArt } from '../ui/art.js';
import { forgeTierInfo } from '../data/forge.js';
import { sidebState, pageHead } from './sideb.js';

const ST = () => sidebState.compare;

/* Привязка текста имплисита к ключу приоритета цели (для вердикта). */
const IMPLICIT_STAT = [
  ['attack damage', 'ad'], ['pet damage', 'petDamage'], ['crit damage', 'critDmg'],
  ['critical strike chance', 'crit'], ['crit', 'crit'], ['double damage', 'dd'], ['double hit', 'dh'],
  ['max health', 'maxHp'], ['max hp', 'maxHp'], ['health', 'maxHp'], ['defense', 'defense'],
  ['damage reduction', 'dr'], ['dodge', 'dodge'], ['block', 'block'], ['retaliation', 'retal'],
  ['reflecting', 'retal'], ['gold', 'gold'], ['experience', 'exp'], ['exp', 'exp'],
  ['item drop', 'itemDrop'], ['material', 'mat'], ['all attributes', 'mainstat'],
  ['strength', 'mainstat'], ['dexterity', 'mainstat'], ['intelligence', 'mainstat'],
  ['life on hit', 'loh'], ['life on kill', 'lok'], ['class skills', 'allSkills'], ['+all', 'allSkills'],
  ['boss damage', 'boss'],
];

function implicitStat(implicit) {
  const t = String(implicit || '').toLowerCase();
  for (const [needle, key] of IMPLICIT_STAT) if (t.includes(needle)) return { needle, key };
  return { needle: null, key: null };
}

/** Оценка предмета под цель: имплисит — главный критерий, совместимые аффиксы — бонус. */
function scoreFamily(family, prioKeys) {
  const { key } = implicitStat(family.implicit);
  let score = 0;
  const idx = key ? prioKeys.indexOf(key) : -1;
  if (idx >= 0) score += 2 * (prioKeys.length - idx); // имплисит весит вдвое
  const affixes = [...(family.prefixes || []), ...(family.suffixes || [])].join(' ').toLowerCase();
  for (const [needle, k] of IMPLICIT_STAT) {
    const i = prioKeys.indexOf(k);
    if (i >= 0 && affixes.includes(needle)) score += (prioKeys.length - i) * 0.5;
  }
  return { score, key };
}

function familySelect(slot, value, which) {
  const fams = familiesForSlot(slot);
  return el('select', {
    class: 'b-input',
    onchange: (e) => { ST()[which] = e.target.value; rerender(); },
  }, fams.map((f) => el('option', { value: f.id, selected: value === f.id ? 'selected' : null }, [bi(f.ru, f.name)])));
}

let rootEl = null;
function rerender() { if (rootEl) render(rootEl); }

function candidateCard(family, tier, plus, goal, other) {
  const rIdx = Math.min(6, Math.max(1, tier)) - 1;
  const rarity = RARITY[rIdx];
  const cls = CLASSES.find((c) => c.id === family.cls);
  const affMult = rarity.mult * (1 + 0.03 * plus);
  void goal;

  const header = el('div', { class: 'b-cmp-head' }, [
    el('div', { class: 'b-cmp-art' }, [artNode(family, tier, 0, { size: 88 })]),
    el('div', {}, [
      el('b', { class: 'b-cmp-name', text: family.tierNames && family.tierNames[rIdx] ? family.tierNames[rIdx] : bi(family.ru, family.name) }),
      el('div', { class: 'b-cmp-sub', text: `${bi(family.ru, family.name)} · ${cls ? bi(cls.ru, cls.name) : 'все классы'}` }),
      el('div', { class: 'b-chip-row' }, [rarityChip(tier), chip(`${SLOT_RU[family.slot]}`, ''), chip(`+${plus} усиление`)]),
    ]),
  ]);

  const implicitRows = RARITY.map((rr, i) => [
    i === rIdx ? el('b', { class: 'b-accent', text: `${rr.tier}` }) : rr.tier,
    i === rIdx ? el('b', { class: 'b-accent', text: family.implicitTiers[i] }) : (family.implicitTiers[i] || '—'),
  ]);

  return el('div', { class: `b-cmp-card ${other && other.winner === family.id ? 'winner' : ''}` }, [
    header,
    panel(null, [
      el('h3', { class: 'b-h3', text: `Имплисит: ${family.implicit}` }),
      el('p', { class: 'b-note', text: `На выбранном тире: ${family.implicitTiers[rIdx] || '—'} · сила аффиксов ×${rarity.mult} (+3% за +уровень → итого ×${fmt(Math.round(affMult * 100) / 100)})` }),
      bTable(['Тир', 'Значение'], implicitRows),
    ]),
    panel(null, [
      el('h3', { class: 'b-h3', text: 'Совместимые аффиксы' }),
      el('div', { class: 'b-chip-row' }, [
        ...(family.prefixes || []).map((p) => chip(p, 'gold')),
        ...(family.suffixes || []).map((s) => chip(s)),
      ]),
      el('p', { class: 'b-note', text: `${family.hand === '2H' ? 'Двуручное' : family.hand === '1H' ? 'Одноручное' : family.hand === 'Off' ? 'Оффхенд' : 'Броня/украшение'} · ${family.unlock} · ${family.note || ''}` }),
    ]),
  ]);
}

function verdict(fa, fb, goal, classId) {
  const prio = statPriorityFor(classId, goal);
  const sa = scoreFamily(fa, prio);
  const sb = scoreFamily(fb, prio);
  let winner = null;
  if (sa.score > sb.score) winner = fa.id;
  else if (sb.score > sa.score) winner = fb.id;
  return { winner, sa, sb, prio };
}

export function render(view) {
  rootEl = view;
  const st = ST();
  loadArt(); // иконки появятся при следующем рендере, если скачаны

  const fams = familiesForSlot(st.slot);
  if (!st.a || !fams.some((f) => f.id === st.a)) st.a = fams[0] ? fams[0].id : null;
  if (!st.b || !fams.some((f) => f.id === st.b)) st.b = fams[1] ? fams[1].id : (fams[0] ? fams[0].id : null);
  const fa = GEAR_FAMILIES.find((f) => f.id === st.a);
  const fb = GEAR_FAMILIES.find((f) => f.id === st.b);

  view.appendChild(pageHead('Compare', 'Equipment side by side — два предмета рядом: тиры, имплиситы, аффиксы и вердикт под вашу цель.'));

  // Выбор слота — сеткой, как окно персонажа.
  view.appendChild(panel('Слот', [
    el('div', { class: 'b-chip-row' }, SLOT_ORDER.map((s) => el('button', {
      class: `b-pick ${st.slot === s ? 'active' : ''}`,
      text: `${SLOT_RU[s]} (${SLOT_EN[s] || s})`,
      onclick: () => { st.slot = s; st.a = null; st.b = null; rerender(); },
    }))),
  ]));

  if (!fa || !fb) {
    view.appendChild(panel('Compare', [el('p', { class: 'b-note', text: 'Для этого слота нужно минимум два семейства предметов.' })]));
    return;
  }

  const infoA = forgeTierInfo(st.tierA);
  const infoB = forgeTierInfo(st.tierB);
  // Класс для приоритетов цели: классовая пушка/оффхенд диктует класс, «все классы» — нейтральный воин.
  const effClass = fa.cls !== 'all' ? fa.cls : (fb.cls !== 'all' ? fb.cls : 'warrior');
  const vrd = verdict(fa, fb, st.goal, effClass);

  const sel = (fam, which, tierKey, plusKey, info) => el('div', { class: 'b-cmp-controls' }, [
    familySelect(st.slot, fam.id, which),
    el('div', { class: 'b-ctl-mini' }, [
      el('label', { text: 'Тир' }),
      el('select', {
        class: 'b-input',
        onchange: (e) => { st[tierKey] = Number(e.target.value); st[plusKey] = 0; rerender(); },
      }, RARITY.map((r, i) => el('option', { value: String(i + 1), selected: st[tierKey] === i + 1 ? 'selected' : null }, [`${r.tier} ${r.ru} (${r.name})`]))),
      el('label', { text: `+уровень 0…${info.maxLevel}` }),
      el('input', {
        class: 'b-input b-num', type: 'number', min: '0', max: String(info.maxLevel), value: String(st[plusKey]),
        onchange: (e) => { st[plusKey] = Math.max(0, Math.min(info.maxLevel, Math.round(Number(e.target.value) || 0))); rerender(); },
      }),
    ]),
  ]);

  // Вердикт под цель.
  const goalSel = el('select', { class: 'b-input', onchange: (e) => { st.goal = e.target.value; rerender(); } },
    GOALS.map((g) => el('option', { value: g.id, selected: st.goal === g.id ? 'selected' : null }, [g.ru])));

  view.appendChild(panel(null, [
    el('div', { class: 'b-cmp-grid' }, [
      el('div', {}, [sel(fa, 'a', 'tierA', 'plusA', infoA)]),
      el('div', {}, [sel(fb, 'b', 'tierB', 'plusB', infoB)]),
    ]),
    el('div', { class: 'b-ctl', style: 'max-width:340px;margin-top:10px' }, [el('label', { text: 'Цель вердикта' }), goalSel]),
  ]));

  if (vrd.winner) {
    const w = vrd.winner === fa.id ? fa : fb;
    view.appendChild(el('div', { class: 'b-verdict' }, [
      el('b', { text: `Для цели «${(GOALS.find((g) => g.id === st.goal) || {}).ru || st.goal}» лучше: ${bi(w.ru, w.name)}` }),
      el('span', { class: 'b-note', text: `Имплисит «${w.implicit}» ближе к приоритетам цели (${vrd.prio.slice(0, 3).join(' → ')}), имплисит считается вдвое важнее аффиксов.` }),
    ]));
  } else {
    view.appendChild(el('div', { class: 'b-verdict tie' }, [
      el('b', { text: 'Одинаково хороши под эту цель' }),
      el('span', { class: 'b-note', text: 'Имплиситы обоих не попадают в первые приоритеты цели — выбирайте по аффиксам и цене прокачки.' }),
    ]));
  }

  view.appendChild(el('div', { class: 'b-cmp-grid' }, [
    candidateCard(fa, st.tierA, st.plusA, st.goal, { winner: vrd.winner }),
    candidateCard(fb, st.tierB, st.plusB, st.goal, { winner: vrd.winner }),
  ]));
}
