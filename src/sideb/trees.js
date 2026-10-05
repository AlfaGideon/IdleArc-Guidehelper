/**
 * Skill Trees — как у компаньона: «Class and Passive».
 * Вкладка Class: три ветки выбранного класса, навыки по тирам (макс. ранг, эффект за очко,
 * тир-гейты 5/10 очков). Вкладка Passive: интерактивное пассивное дерево на 20 тиров
 * с планом под класс/цель/уровень (тот же движок, что и на стороне A).
 */
import { el } from '../ui/dom.js';
import { bi, chip, panel, bTable } from './ui.js';
import { CLASSES, CLASS_SKILL_RULES, classPointsForLevel } from '../data/classes.js';
import { GOALS } from '../data/builds.js';
import { PASSIVE_ROWS, PASSIVE_STATS, PASSIVE_RULES, isMilestoneRow, nodeValueLabel } from '../data/passives.js';
import { planPassives, levelForTier } from '../core/passiveTree.js';
import { sidebState } from './sideb.js';

const ST = () => sidebState.trees;
const MAIN_ATTR_RU = { strength: 'Сила', dexterity: 'Ловкость', intelligence: 'Интеллект' };

/* -------------------------------- Классовые ------------------------------- */

function skillCard(s) {
  return el('div', { class: 'b-skill' }, [
    el('div', { class: 'b-skill-top' }, [
      el('b', { text: bi(s.ru, s.name) }),
      chip(`T${s.tier} · макс ${s.max}`, s.tier === 3 ? 'gold' : ''),
    ]),
    el('p', { class: 'b-skill-txt', text: s.text }),
    s.s2 ? el('p', { class: 'b-note', text: 'Season 2: ' + s.s2 }) : null,
    s.requires ? el('p', { class: 'b-note', text: 'Нужно очко в навыке-предусловии.' }) : null,
  ]);
}

function classTrees(view) {
  const st = ST();
  const cls = CLASSES.find((c) => c.id === st.classId) || CLASSES[0];

  view.appendChild(panel(null, [
    el('div', { class: 'b-chip-row' }, CLASSES.map((c) => el('button', {
      class: `b-pick ${st.classId === c.id ? 'active' : ''}`,
      text: `${c.ru} (${c.name})`,
      onclick: () => { st.classId = c.id; rerender(view); },
    }))),
    el('p', { class: 'b-note', text: `${CLASS_SKILL_RULES.note} Tier 2 — после ${CLASS_SKILL_RULES.tierUnlock[2]} очков в той же ветке, Tier 3 — после ${CLASS_SKILL_RULES.tierUnlock[3]}. Главный атрибут класса: ${MAIN_ATTR_RU[cls.mainStat] || cls.mainStat}.` }),
  ]));

  view.appendChild(el('div', { class: 'b-branch-grid' }, cls.branches.map((branch) => {
    const skills = cls.skills.filter((s) => s.branch === branch);
    return el('div', { class: 'b-branch' }, [
      el('div', { class: 'b-branch-head' }, [
        el('b', { text: branch }),
        chip(`${cls.branchRu[branch] || branch}`, 'gold'),
      ]),
      ...[1, 2, 3].map((tier) => {
        const rows = skills.filter((s) => s.tier === tier);
        if (!rows.length) return null;
        return el('div', { class: 'b-tier' }, [
          el('div', { class: 'b-tier-title', text: `Тир ${tier}${tier === 2 ? ' · открывается после 5 очков в ветке' : tier === 3 ? ' · после 10 очков' : ''}` }),
          ...rows.map(skillCard),
        ]);
      }),
    ]);
  })));
}

/* -------------------------------- Пассивка -------------------------------- */

function passiveNodeChip(code, per, max, points) {
  const meta = PASSIVE_STATS[code];
  const picked = points > 0;
  return el('span', {
    class: `b-pnode ${picked ? 'picked' : ''} ${isAttr(code) ? 'attr' : ''}`,
    title: `${meta.ru} (${meta.en})`,
  }, [
    el('b', { text: `${meta.ru}` }),
    el('span', { text: ` ${nodeValueLabel([code, per, max])}` }),
    picked ? el('em', { text: ` ×${points}` }) : null,
  ]);
}
const isAttr = (code) => code === 'str' || code === 'dex' || code === 'int';

function passiveTree(view) {
  const st = ST();
  const plan = planPassives(st.classId, st.goal, st.level);
  const cls = CLASSES.find((c) => c.id === st.classId) || CLASSES[0];

  const levelInput = el('input', {
    class: 'b-input b-num', type: 'number', min: '1', max: '2000', value: String(st.level),
    onchange: (e) => { st.level = Math.max(1, Math.min(2000, Math.round(Number(e.target.value) || 1))); rerender(view); },
  });

  view.appendChild(panel(null, [
    el('div', { class: 'b-controls' }, [
      el('div', { class: 'b-ctl' }, [el('label', { text: 'Класс' }), el('select', { class: 'b-input', onchange: (e) => { st.classId = e.target.value; rerender(view); } },
        CLASSES.map((c) => el('option', { value: c.id, selected: st.classId === c.id ? 'selected' : null }, [`${c.ru} (${c.name})`])))]),
      el('div', { class: 'b-ctl' }, [el('label', { text: 'Цель' }), el('select', { class: 'b-input', onchange: (e) => { st.goal = e.target.value; rerender(view); } },
        GOALS.map((g) => el('option', { value: g.id, selected: st.goal === g.id ? 'selected' : null }, [g.ru])))]),
      el('div', { class: 'b-ctl' }, [el('label', { text: 'Уровень персонажа' }), levelInput]),
    ]),
    el('div', { class: 'b-chip-row' }, [
      chip(`${plan.points} очков (1 за уровень)`, 'gold'),
      chip(`глубина: тир ${plan.deepestTier}`),
      chip(`распределено ${plan.spent}${plan.leftover ? ` · остаток ${plan.leftover}` : ''}`),
      chip(`атрибут: ${MAIN_ATTR_RU[cls.mainStat]}`),
    ]),
    el('p', { class: 'b-note', text: 'Подсвеченные узлы — рекомендованный план: 20 очков в тир, затем глубже. ★ — майлстоун (1 очко, мощный узел). ' + `Ориентир: тир 5 ≈ ${levelForTier(5)} ур., тир 10 ≈ ${levelForTier(10)} ур., тир 20 ≈ ${levelForTier(20)} ур.` }),
  ]));

  // Тиры: открытые планом — развёрнуто, дальше — спойлер.
  plan.tiers.forEach((t) => {
    const interesting = t.unlocked && (t.spent > 0 || t.tier <= plan.deepestTier + 1);
    if (!interesting && t.tier > plan.deepestTier + 1) return;
    const rows = t.rows.map((row, ri) => {
      const globalRow = (t.tier - 1) * PASSIVE_RULES.rowsPerTier + ri;
      const ms = isMilestoneRow(globalRow);
      return el('div', { class: `b-prow ${ms ? 'ms' : ''}` }, [
        el('span', { class: 'b-prow-no', text: ms ? '★' : String(ri + 1) }),
        el('div', { class: 'b-pnodes' }, row.nodes.map((n) => passiveNodeChip(n.code, n.per, n.max, n.points))),
      ]);
    });
    const body = el('div', { class: 'b-ptier' }, [
      el('div', { class: 'b-ptier-head', onclick: () => { st.tierOpen = st.tierOpen === t.tier ? 0 : t.tier; rerender(view); } }, [
        el('b', { text: `Тир ${t.tier}` }),
        el('span', { class: 'b-note', text: `${t.spent}/${PASSIVE_RULES.unlockThreshold} очков` }),
        chip(t.spent >= PASSIVE_RULES.unlockThreshold ? 'гейт пройден' : t.spent ? `до гейта ещё ${PASSIVE_RULES.unlockThreshold - t.spent}` : t.tier <= plan.deepestTier + 1 ? 'дальше по плану' : 'закрыт', t.spent >= PASSIVE_RULES.unlockThreshold ? 'green' : ''),
        el('span', { class: 'b-caret', text: st.tierOpen === t.tier ? '▾' : '▸' }),
      ]),
      st.tierOpen === t.tier || t.spent > 0 ? el('div', { class: 'b-ptier-body' }, rows) : null,
    ]);
    view.appendChild(body);
  });
}

let rootEl = null;
function rerender(view) { render(view || rootEl); }

export function render(view) {
  rootEl = view;
  const st = ST();
  view.appendChild(el('div', { class: 'b-page-head' }, [
    el('h1', { text: 'Skill Trees' }),
    el('p', { class: 'b-page-sub', text: 'Class and Passive — классовые ветки (90 навыков, 5 классов) и общее пассивное дерево (200 рядов, 20 тиров).' }),
  ]));

  view.appendChild(panel(null, [
    el('div', { class: 'b-chip-row' }, [
      el('button', { class: `b-pick ${st.mode === 'class' ? 'active' : ''}`, text: '✦ Class — ветки класса', onclick: () => { st.mode = 'class'; rerender(view); } }),
      el('button', { class: `b-pick ${st.mode === 'passive' ? 'active' : ''}`, text: '✶ Passive — общее дерево', onclick: () => { st.mode = 'passive'; rerender(view); } }),
    ]),
  ]));

  if (st.mode === 'class') classTrees(view);
  else passiveTree(view);

  // применить «прыжок» из поиска
  if (sidebState.pendingJump && sidebState.pendingJump.page === 'trees' && sidebState.pendingJump.query) {
    const q = sidebState.pendingJump.query.toLowerCase();
    sidebState.pendingJump = null;
    setTimeout(() => {
      const nodes = view.querySelectorAll('.b-skill b, .b-pnode b');
      for (const n of nodes) {
        if ((n.textContent || '').toLowerCase().includes(q)) {
          const card = n.closest('.b-skill') || n.closest('.b-pnode');
          if (card && card.scrollIntoView) { card.scrollIntoView({ block: 'center' }); card.classList.add('b-flash'); setTimeout(() => card.classList.remove('b-flash'), 1800); }
          break;
        }
      }
    }, 0);
  } else if (sidebState.pendingJump && sidebState.pendingJump.page === 'trees') {
    sidebState.pendingJump = null;
  }
}

/** classPointsForLevel используется в подсказках страниц — оставляем реэкспорт для домохозяйств. */
export { classPointsForLevel };
