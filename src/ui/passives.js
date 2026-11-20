/**
 * Вкладка «Пассивное дерево»: рекомендации по прокачке Passive Skill Tree
 * под класс, цель и уровень персонажа.
 *
 * Дерево общее для всех классов, но ПРИОРИТЕТЫ разные: в каждом ряду 2–3 узла
 * на выбор (например, «урон атаки или урон пета»), и правильный выбор зависит
 * от класса (главный атрибут) и цели (урон / фарм / боссы / петы / Retaliation).
 */

import { t as tr, bi } from '../i18n.js';
import { el, card, table, chips, kpi } from './dom.js';
import { CLASSES } from '../data/classes.js';
import { GOALS } from '../data/builds.js';
import { PASSIVE_RULES, PASSIVE_STATS, nodeValueLabel } from '../data/passives.js';
import { planPassives, levelForTier } from '../core/passiveTree.js';
import { loadStateRecord } from './store.js';

const KEY = 'iac:helper:passives:v1';

const state = {
  classId: 'warrior',
  goal: 'progress',
  level: 30,
  showAll: false, // показывать и закрытые тиры
  restored: false,
};

function save() {
  try { globalThis.localStorage && globalThis.localStorage.setItem(KEY, JSON.stringify({ classId: state.classId, goal: state.goal, level: state.level, showAll: state.showAll })); } catch { /* приватный режим */ }
}

function restoreOnce() {
  if (state.restored) return;
  state.restored = true;
  // 1) своё сохранение; 2) иначе — класс/цель/уровень из планировщика, чтобы вкладки совпадали.
  try {
    const raw = globalThis.localStorage && globalThis.localStorage.getItem(KEY);
    if (raw) {
      const snap = JSON.parse(raw);
      if (snap.classId && CLASSES.some((c) => c.id === snap.classId)) state.classId = snap.classId;
      if (snap.goal && GOALS.some((g) => g.id === snap.goal)) state.goal = snap.goal;
      if (Number.isFinite(snap.level)) state.level = Math.max(1, Math.round(snap.level));
      if (typeof snap.showAll === 'boolean') state.showAll = snap.showAll;
      return;
    }
  } catch { /* читаем планировщик */ }
  try {
    const rec = loadStateRecord();
    const snap = rec && rec.snapshot;
    if (snap) {
      if (snap.classId && CLASSES.some((c) => c.id === snap.classId)) state.classId = snap.classId;
      if (snap.goal && GOALS.some((g) => g.id === snap.goal)) state.goal = snap.goal;
      if (Number.isFinite(snap.level)) state.level = Math.max(1, Math.round(snap.level));
    }
  } catch { /* остаются значения по умолчанию */ }
}

/* ------------------------------ советы под цель ------------------------------ */

const GOAL_TIPS = {
  progress: [
    tr('В ряду урона берите Урон атаки (Attack Damage) — флэт и %: это база, которую умножают криты и двойные удары.', 'In damage rows, take flat and percentage Attack Damage. Both increase the base that critical hits and extra hits multiply.'),
    tr('Ряд защиты не пропускайте: Max HP и Defense — то, что позволяет не упираться в стену на новых Monster Level.', 'Take Max HP and Defense in defensive rows to survive higher Monster Levels.'),
    tr('Крит-ряд (Crit Chance) и ряд Crit Damage / Double Hit добивают до 20 очков тира.', 'Use Crit Chance and the Crit Damage / Double Hit row to reach 20 points for the tier.'),
  ],
  farm: [
    tr('Главные ряды — Золото/Опыт (Gold/Exp Gain) и Дроп (Item/Material Drop): на глубине они дают по 5% и 2% за очко.', 'Prioritize Gold Gain, EXP Gain, Item Drop, and Material Drop. Deep tiers grant 5% per point for gold or experience and 2% for drops.'),
    tr('Майлстоуны с Gold Gain (+13.5…+24.8%) и Exp Gain — обязательные.', 'Take the Gold Gain (+13.5% to +24.8%) and EXP Gain milestones.'),
    tr('Урон берите по остаточному принципу, но не нулевой: скорость убийства — тоже скорость фарма.', 'Spend spare points on damage. Faster kills also improve farming speed.'),
  ],
  boss: [
    tr('Приоритет: Attack Damage → Crit Chance → Crit Damage → Double Damage/Double Hit. Фарм-ряды (золото/дроп) пропускаем.', 'Prioritize Attack Damage, Crit Chance, Crit Damage, then Double Damage or Double Hit. Skip gold and drop rows.'),
    tr('Майлстоуны урона (Crit Damage +36.4% в тире 18, Double Damage, Attack Damage +12%) — главная причина копать вглубь.', 'Push into deeper tiers for damage milestones such as +36.4% Crit Damage at tier 18, Double Damage, and +12% Attack Damage.'),
    tr('Защитные ряды добирайте ровно настолько, чтобы переживать босса: мёртвый DPS = 0.', 'Invest enough in defensive rows to survive the boss fight.'),
  ],
  pets: [
    tr('Во всех рядах урона выбирайте Урон пета (Pet Damage) — флэт и %: у пет-билда масштабируется именно он.', 'Choose flat and percentage Pet Damage in every damage row. Both scale your pet’s attacks.'),
    tr('Майлстоуны Pet Damage (+10.3%/+11%/+12.8% и +170 флэта в тире 11) — ключевые точки дерева.', 'Look for Pet Damage milestones of +10.3%, +11%, and +12.8%, and +170 flat Pet Damage in tier 11.'),
    tr('Второй приоритет — выживаемость (Max HP/Defense): пет дерётся, но бьют по вам.', 'Max HP and Defense come second. Your pet attacks, but enemies still hit you.'),
  ],
  retaliation: [
    tr('Главные узлы — Defense (флэт и %) и Max HP: Retaliation считается от защиты, HP даёт пережить размен.', 'Prioritize flat and percentage Defense and Max HP. Defense scales Retaliation, and HP helps you survive incoming hits.'),
    tr('Майлстоуны Defense (+200/+530/+790 и Defense% +9/+19/+23) — то, ради чего идём вглубь.', 'Push deeper for Defense milestones: +200, +530, and +790 flat Defense, and +9%, +19%, and +23% Defense.'),
    tr('Life on Hit / Life on Kill — третий приоритет: лечение держит цикл размена бесконечным.', 'Take Life on Hit and Life on Kill next to sustain your health over repeated attacks.'),
  ],
};

/* --------------------------------- рендер --------------------------------- */

export function render(root) {
  restoreOnce();
  root.innerHTML = '';

  const cls = CLASSES.find((c) => c.id === state.classId) || CLASSES[0];
  const goal = GOALS.find((g) => g.id === state.goal) || GOALS[0];
  const plan = planPassives(state.classId, state.goal, state.level);

  /* --- как это работает --- */
  root.appendChild(card(tr('Пассивное дерево (Passive Skill Tree)', 'Passive Skill Tree'), [
    el('p', { text: tr('Дерево ОБЩЕЕ для всех классов и качается отдельными пассивными очками: 1 очко за каждый уровень персонажа (классовые очки — отдельная система). Дерево — 20 тиров по 10 рядов; в каждом ряду 2–3 узла на выбор.', 'All classes share this tree. Each character level grants one passive point, separate from class skill points. The tree has 20 tiers of 10 rows, each with two or three nodes to choose from.') }),
    el('ul', { class: 'tight' }, [
      el('li', { text: tr(
        `Следующий тир открывается после ${PASSIVE_RULES.unlockThreshold} вложенных очков в предыдущем — поэтому базовая стратегия: «вложил 20 → иди глубже».`,
        `Spend ${PASSIVE_RULES.unlockThreshold} points in a tier to unlock the next one. Move deeper as each new tier opens.`,
      ) }),
      el('li', { text: tr('Глубокие тиры в разы сильнее: Attack Damage растёт с +4/очко (тир 1) до +1120/очко (тир 20) — очки на глубине окупаются многократно.', 'Attack Damage rises from +4 per point in tier 1 to +1120 per point in tier 20, so deeper nodes give much larger bonuses.') }),
      el('li', { text: tr('Каждый 10-й ряд — майлстоун: мощные узлы по 1 очку (например, Crit Damage +36.4% или Defense +790).', 'Every tenth row is a milestone with powerful one-point nodes such as +36.4% Crit Damage or +790 Defense.') }),
      el('li', { text: tr('Сброс пассивных очков бесплатный, и можно держать несколько пресетов — смело перекидывайте дерево под фарм/боссов.', 'Passive resets are free, and you can keep multiple presets for farming and bosses.') }),
    ]),
  ]));

  /* --- управление --- */
  const classBtns = el('div', { class: 'chips' }, CLASSES.map((c) => el('button', {
    class: `btn ${c.id === state.classId ? 'primary' : ''}`,
    text: bi(c.ru, c.name),
    onclick: () => { state.classId = c.id; save(); render(root); },
  })));
  const goalBtns = el('div', { class: 'chips' }, GOALS.map((g) => el('button', {
    class: `btn ${g.id === state.goal ? 'primary' : ''}`,
    text: g.ru,
    title: g.desc,
    onclick: () => { state.goal = g.id; save(); render(root); },
  })));
  const levelInput = el('input', {
    type: 'number', min: '1', max: '2000', value: String(state.level), inputmode: 'numeric',
    oninput: (e) => {
      const v = Math.max(1, Math.min(2000, Math.round(Number(e.target.value) || 1)));
      state.level = v; save();
      // перерисовываем всё, кроме самого поля, чтобы не терять фокус
      const scroll = root.ownerDocument && root.ownerDocument.defaultView ? root.ownerDocument.defaultView.scrollY : null;
      render(root);
      if (scroll != null && root.ownerDocument.defaultView) root.ownerDocument.defaultView.scrollTo(0, scroll);
      const again = root.querySelector('#passive-level');
      if (again) { again.focus(); try { again.setSelectionRange(String(v).length, String(v).length); } catch { /* number input */ } }
    },
    id: 'passive-level',
  });

  root.appendChild(card(tr('Класс, цель и уровень', 'Class, goal, and level'), [
    el('p', { class: 'muted', text: tr('Дерево одно, но правильный ВЫБОР в рядах зависит от класса (главный атрибут) и цели. Значения по умолчанию подхватываются из планировщика.', 'Your main class attribute and goal determine which nodes to take. The starting values come from your planner.') }),
    el('div', { class: 'grid cols-2' }, [
      el('div', {}, [el('b', { text: tr('Класс', 'Class') }), classBtns]),
      el('div', {}, [el('b', { text: tr('Цель', 'Goal') }), goalBtns]),
    ]),
    el('div', { class: 'actions', style: 'margin-top:10px; align-items:center; gap:8px' }, [
      el('b', { text: tr('Уровень персонажа:', 'Character level') }), levelInput,
      el('span', { class: 'muted', text: tr(`→ пассивных очков: ${plan.points} (1 за уровень)`, `→ Passive points: ${plan.points} (1 per level)`) }),
    ]),
  ]));

  /* --- сводка плана --- */
  const mainAttrMeta = PASSIVE_STATS[plan.mainAttr];
  root.appendChild(card(tr(`План для: ${cls.ru} (${cls.name}) · ${goal.ru}`, `Plan for ${cls.name} · ${goal.ru}`), [
    kpi([
      { value: String(plan.points), label: tr('пассивных очков', 'Passive points') },
      { value: String(plan.spent), label: tr('распределено планом', 'Points allocated') },
      { value: tr(`тир ${plan.deepestTier}`, `Tier ${plan.deepestTier}`), label: tr('глубина прокачки', 'Deepest tier') },
      { value: plan.leftover ? String(plan.leftover) : '0', label: tr('осталось нераспределёнными', 'Unspent points') },
    ]),
    plan.leftover > 0
      ? el('p', { class: 'muted', text: tr('Нераспределённый остаток означает, что открытая часть дерева уже забита полезными узлами — остаток можно положить в любые свободные узлы (включая чужие атрибуты).', 'The useful nodes in the unlocked tiers are full. You can spend the remaining points on any open nodes, including other attributes.') })
      : null,
    el('div', { class: 'infobox', style: 'margin-top:10px' }, [
      el('b', { text: tr('Стратегия под вашу цель', 'Strategy for your goal') }),
      el('ul', { class: 'tight' }, [
        el('li', { text: tr(
          `Атрибутный ряд: всегда ${mainAttrMeta.ru} (${mainAttrMeta.en}) — главный атрибут класса даёт и урон, и защиту; чужие атрибуты берём только когда больше некуда класть.`,
          `In attribute rows, choose ${mainAttrMeta.en}. Your main class attribute gives both damage and defense. Take other attributes only once the useful nodes are full.`,
        ) }),
        ...(GOAL_TIPS[state.goal] || []).map((t) => el('li', { text: t })),
        el('li', { text: tr(
          `До тира N нужно примерно 20×(N−1) очков: тир 5 — с ~${levelForTier(5)} уровня, тир 10 — с ~${levelForTier(10)}, тир 20 — с ~${levelForTier(20)}.`,
          `Reaching tier N takes about 20 × (N − 1) points. Aim for level ${levelForTier(5)} for tier 5, ${levelForTier(10)} for tier 10, and ${levelForTier(20)} for tier 20.`,
        ) }),
      ]),
    ]),
  ]));

  /* --- итоговые бонусы --- */
  const totalRows = Object.entries(plan.totals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, val]) => [name.replace(' %', ''), name.endsWith('%') || name.includes(' %') ? `+${round1(val)}%` : `+${round1(val)}`]);
  root.appendChild(card(tr('Что даст дерево суммарно', 'Total bonuses from the tree'), [
    totalRows.length
      ? table([tr('Стат', 'Stat'), tr('Итог по плану', 'Plan total')], totalRows, { numeric: [tr('Итог по плану', 'Plan total')] })
      : el('p', { class: 'muted', text: tr('Введите уровень персонажа — появится расчёт.', 'Enter a character level to see the totals.') }),
  ]));

  /* --- план по тирам --- */
  const tierBlocks = [];
  for (const t of plan.tiers) {
    const visible = state.showAll || t.spent > 0 || t.unlocked;
    if (!visible) continue;
    if (!state.showAll && !t.spent && t.tier > plan.deepestTier + 1) continue;

    const rows = t.rows.map((row) => {
      const items = row.nodes.map((n) => {
        const meta = PASSIVE_STATS[n.code];
        const picked = n.points > 0;
        return {
          text: `${bi(meta.ru, meta.en)} ${nodeValueLabel([n.code, n.per, n.max])}${picked ? tr(` ← ${n.points} очк.`, ` ← ${n.points} pts`) : ''}`,
          kind: picked ? 'good' : '',
        };
      });
      return el('div', { class: 'passive-row' }, [
        el('span', { class: `passive-row-no ${row.milestone ? 'milestone' : ''}`, text: row.milestone ? '★' : String((row.index % PASSIVE_RULES.rowsPerTier) + 1) }),
        chips(items),
      ]);
    });

    tierBlocks.push(el('div', { class: `infobox passive-tier ${t.spent ? '' : 'dim'}` }, [
      el('b', { text: tr(`Тир ${t.tier} — вложить ${t.spent} очк.`, `Tier ${t.tier} · Points to spend: ${t.spent}`) }),
      el('span', {
        class: `chip ${t.spent >= PASSIVE_RULES.unlockThreshold ? 'good' : t.unlocked ? 'warn' : ''}`,
        style: 'margin-left:8px',
        text: t.spent >= PASSIVE_RULES.unlockThreshold
          ? tr(`тир ${t.tier + 1} открыт (20/20)`, `Tier ${t.tier + 1} unlocked (20/20)`)
          : t.unlocked
            ? (t.spent ? tr(`до открытия тира ${t.tier + 1}: ещё ${PASSIVE_RULES.unlockThreshold - t.spent}`, `Points to unlock tier ${t.tier + 1}: ${PASSIVE_RULES.unlockThreshold - t.spent}`) : tr('очков пока не хватает', 'More points needed'))
            : tr('закрыт', 'Locked'),
      }),
      ...rows,
    ]));
  }
  root.appendChild(card(tr('Куда класть очки: тир за тиром', 'Where to spend points by tier'), [
    el('p', { class: 'muted', text: tr('Зелёные узлы — рекомендованные (с количеством очков). ★ — майлстоун-ряд: сильные узлы по 1 очку. Внутри тира кладите очки сверху вниз, как в игре.', 'Green nodes show the recommended number of points. A star (★) marks a row of powerful one-point milestones. Within each tier, spend points from top to bottom.') }),
    ...tierBlocks,
    el('div', { class: 'actions', style: 'margin-top:8px' }, [
      el('button', {
        class: 'btn',
        text: state.showAll ? tr('Скрыть недостижимые тиры', 'Hide unreachable tiers') : tr('Показать всё дерево (20 тиров)', 'Show all 20 tiers'),
        onclick: () => { state.showAll = !state.showAll; save(); render(root); },
      }),
    ]),
  ]));

  /* --- примечания --- */
  root.appendChild(card(tr('Примечания и источники', 'Notes and sources'), [
    el('ul', { class: 'tight' }, [
      el('li', { text: tr('Значения узлов — снапшот данных текущего билда игры (IdleArc Companion, config 2026-09-29); сверены с независимым Skill Calculator сообщества. Игра патчится часто — при расхождении верьте игре.', 'Node values come from the IdleArc Companion game snapshot (configuration dated September 29, 2026) and were checked against the community Skill Calculator. If the values differ after a patch, use the in-game values.') }),
      el('li', { text: tr('Правила «1 очко за уровень», «общее дерево», «бесплатный сброс», «пресеты» — IdleArc Wiki (New Player Guide, Skills (Tab)).', 'The IdleArc Wiki’s New Player Guide and Skills (Tab) document one point per level, the shared tree, free resets, and presets.') }),
      el('li', { text: tr('Майлстоун-ряд в плане считается выбором ОДНОГО узла из трёх (узлы по 1 очку). Если в вашей версии игры можно взять несколько — берите в порядке приоритета цели (требует проверки).', 'The plan assumes you choose one of three one-point nodes in each milestone row. If your version allows multiple picks, take them in order of your goal’s priorities.') }),
      el('li', { text: tr('Точное правило открытия рядов ВНУТРИ тира игра не публикует; план раскладывает очки сверху вниз — это безопасно при любом правиле.', 'The game does not publish the exact row unlock rules within a tier. The plan allocates points from top to bottom.') }),
    ]),
  ]));
}

const round1 = (v) => Math.round(v * 10) / 10;

/** Для тестов. */
export const passivesState = state;
