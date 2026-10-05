/**
 * Вкладка «Пассивное дерево»: рекомендации по прокачке Passive Skill Tree
 * под класс, цель и уровень персонажа.
 *
 * Дерево общее для всех классов, но ПРИОРИТЕТЫ разные: в каждом ряду 2–3 узла
 * на выбор (например, «урон атаки или урон пета»), и правильный выбор зависит
 * от класса (главный атрибут) и цели (урон / фарм / боссы / петы / Retaliation).
 */

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
    'В ряду урона берите Урон атаки (Attack Damage) — флэт и %: это база, которую умножают криты и двойные удары.',
    'Ряд защиты не пропускайте: Max HP и Defense — то, что позволяет не упираться в стену на новых Monster Level.',
    'Крит-ряд (Crit Chance) и ряд Crit Damage / Double Hit добивают до 20 очков тира.',
  ],
  farm: [
    'Главные ряды — Золото/Опыт (Gold/Exp Gain) и Дроп (Item/Material Drop): на глубине они дают по 5% и 2% за очко.',
    'Майлстоуны с Gold Gain (+13.5…+24.8%) и Exp Gain — обязательные.',
    'Урон берите по остаточному принципу, но не нулевой: скорость убийства — тоже скорость фарма.',
  ],
  boss: [
    'Приоритет: Attack Damage → Crit Chance → Crit Damage → Double Damage/Double Hit. Фарм-ряды (золото/дроп) пропускаем.',
    'Майлстоуны урона (Crit Damage +36.4% в тире 18, Double Damage, Attack Damage +12%) — главная причина копать вглубь.',
    'Защитные ряды добирайте ровно настолько, чтобы переживать босса: мёртвый DPS = 0.',
  ],
  pets: [
    'Во всех рядах урона выбирайте Урон пета (Pet Damage) — флэт и %: у пет-билда масштабируется именно он.',
    'Майлстоуны Pet Damage (+10.3%/+11%/+12.8% и +170 флэта в тире 11) — ключевые точки дерева.',
    'Второй приоритет — выживаемость (Max HP/Defense): пет дерётся, но бьют по вам.',
  ],
  retaliation: [
    'Главные узлы — Defense (флэт и %) и Max HP: Retaliation считается от защиты, HP даёт пережить размен.',
    'Майлстоуны Defense (+200/+530/+790 и Defense% +9/+19/+23) — то, ради чего идём вглубь.',
    'Life on Hit / Life on Kill — третий приоритет: лечение держит цикл размена бесконечным.',
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
  root.appendChild(card('Пассивное дерево (Passive Skill Tree)', [
    el('p', { text: 'Дерево ОБЩЕЕ для всех классов и качается отдельными пассивными очками: 1 очко за каждый уровень персонажа (классовые очки — отдельная система). Дерево — 20 тиров по 10 рядов; в каждом ряду 2–3 узла на выбор.' }),
    el('ul', { class: 'tight' }, [
      el('li', { text: `Следующий тир открывается после ${PASSIVE_RULES.unlockThreshold} вложенных очков в предыдущем — поэтому базовая стратегия: «вложил 20 → иди глубже».` }),
      el('li', { text: 'Глубокие тиры в разы сильнее: Attack Damage растёт с +4/очко (тир 1) до +1120/очко (тир 20) — очки на глубине окупаются многократно.' }),
      el('li', { text: 'Каждый 10-й ряд — майлстоун: мощные узлы по 1 очку (например, Crit Damage +36.4% или Defense +790).' }),
      el('li', { text: 'Сброс пассивных очков бесплатный, и можно держать несколько пресетов — смело перекидывайте дерево под фарм/боссов.' }),
    ]),
  ]));

  /* --- управление --- */
  const classBtns = el('div', { class: 'chips' }, CLASSES.map((c) => el('button', {
    class: `btn ${c.id === state.classId ? 'primary' : ''}`,
    text: `${c.ru} (${c.name})`,
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

  root.appendChild(card('Класс, цель и уровень', [
    el('p', { class: 'muted', text: 'Дерево одно, но правильный ВЫБОР в рядах зависит от класса (главный атрибут) и цели. Значения по умолчанию подхватываются из планировщика.' }),
    el('div', { class: 'grid cols-2' }, [
      el('div', {}, [el('b', { text: 'Класс' }), classBtns]),
      el('div', {}, [el('b', { text: 'Цель' }), goalBtns]),
    ]),
    el('div', { class: 'actions', style: 'margin-top:10px; align-items:center; gap:8px' }, [
      el('b', { text: 'Уровень персонажа:' }), levelInput,
      el('span', { class: 'muted', text: `→ пассивных очков: ${plan.points} (1 за уровень)` }),
    ]),
  ]));

  /* --- сводка плана --- */
  const mainAttrMeta = PASSIVE_STATS[plan.mainAttr];
  root.appendChild(card(`План для: ${cls.ru} (${cls.name}) · ${goal.ru}`, [
    kpi([
      { value: String(plan.points), label: 'пассивных очков' },
      { value: String(plan.spent), label: 'распределено планом' },
      { value: `тир ${plan.deepestTier}`, label: 'глубина прокачки' },
      { value: plan.leftover ? String(plan.leftover) : '0', label: 'осталось нераспределёнными' },
    ]),
    plan.leftover > 0
      ? el('p', { class: 'muted', text: 'Нераспределённый остаток означает, что открытая часть дерева уже забита полезными узлами — остаток можно положить в любые свободные узлы (включая чужие атрибуты).' })
      : null,
    el('div', { class: 'infobox', style: 'margin-top:10px' }, [
      el('b', { text: 'Стратегия под вашу цель' }),
      el('ul', { class: 'tight' }, [
        el('li', { text: `Атрибутный ряд: всегда ${mainAttrMeta.ru} (${mainAttrMeta.en}) — главный атрибут класса даёт и урон, и защиту; чужие атрибуты берём только когда больше некуда класть.` }),
        ...(GOAL_TIPS[state.goal] || []).map((t) => el('li', { text: t })),
        el('li', { text: `До тира N нужно примерно 20×(N−1) очков: тир 5 — с ~${levelForTier(5)} уровня, тир 10 — с ~${levelForTier(10)}, тир 20 — с ~${levelForTier(20)}.` }),
      ]),
    ]),
  ]));

  /* --- итоговые бонусы --- */
  const totalRows = Object.entries(plan.totals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, val]) => [name.replace(' %', ''), name.endsWith('%') || name.includes(' %') ? `+${round1(val)}%` : `+${round1(val)}`]);
  root.appendChild(card('Что даст дерево суммарно', [
    totalRows.length
      ? table(['Стат', 'Итог по плану'], totalRows, { numeric: ['Итог по плану'] })
      : el('p', { class: 'muted', text: 'Введите уровень персонажа — появится расчёт.' }),
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
          text: `${meta.ru} (${meta.en}) ${nodeValueLabel([n.code, n.per, n.max])}${picked ? ` ← ${n.points} очк.` : ''}`,
          kind: picked ? 'good' : '',
        };
      });
      return el('div', { class: 'passive-row' }, [
        el('span', { class: `passive-row-no ${row.milestone ? 'milestone' : ''}`, text: row.milestone ? '★' : String((row.index % PASSIVE_RULES.rowsPerTier) + 1) }),
        chips(items),
      ]);
    });

    tierBlocks.push(el('div', { class: `infobox passive-tier ${t.spent ? '' : 'dim'}` }, [
      el('b', { text: `Тир ${t.tier} — вложить ${t.spent} очк.` }),
      el('span', {
        class: `chip ${t.spent >= PASSIVE_RULES.unlockThreshold ? 'good' : t.unlocked ? 'warn' : ''}`,
        style: 'margin-left:8px',
        text: t.spent >= PASSIVE_RULES.unlockThreshold
          ? `тир ${t.tier + 1} открыт (20/20)`
          : t.unlocked
            ? (t.spent ? `до открытия тира ${t.tier + 1}: ещё ${PASSIVE_RULES.unlockThreshold - t.spent}` : 'очков пока не хватает')
            : 'закрыт',
      }),
      ...rows,
    ]));
  }
  root.appendChild(card('Куда класть очки: тир за тиром', [
    el('p', { class: 'muted', text: 'Зелёные узлы — рекомендованные (с количеством очков). ★ — майлстоун-ряд: сильные узлы по 1 очку. Внутри тира кладите очки сверху вниз, как в игре.' }),
    ...tierBlocks,
    el('div', { class: 'actions', style: 'margin-top:8px' }, [
      el('button', {
        class: 'btn',
        text: state.showAll ? 'Скрыть недостижимые тиры' : 'Показать всё дерево (20 тиров)',
        onclick: () => { state.showAll = !state.showAll; save(); render(root); },
      }),
    ]),
  ]));

  /* --- примечания --- */
  root.appendChild(card('Примечания и источники', [
    el('ul', { class: 'tight' }, [
      el('li', { text: 'Значения узлов — снапшот данных текущего билда игры (IdleArc Companion, config 2026-09-29); сверены с независимым Skill Calculator сообщества. Игра патчится часто — при расхождении верьте игре.' }),
      el('li', { text: 'Правила «1 очко за уровень», «общее дерево», «бесплатный сброс», «пресеты» — IdleArc Wiki (New Player Guide, Skills (Tab)).' }),
      el('li', { text: 'Майлстоун-ряд в плане считается выбором ОДНОГО узла из трёх (узлы по 1 очку). Если в вашей версии игры можно взять несколько — берите в порядке приоритета цели (требует проверки).' }),
      el('li', { text: 'Точное правило открытия рядов ВНУТРИ тира игра не публикует; план раскладывает очки сверху вниз — это безопасно при любом правиле.' }),
    ]),
  ]));
}

const round1 = (v) => Math.round(v * 10) / 10;

/** Для тестов. */
export const passivesState = state;
