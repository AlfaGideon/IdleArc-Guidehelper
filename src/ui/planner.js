import { CLASSES, classPointsForLevel, CLASS_SKILL_RULES } from '../data/classes.js';
import { GOALS } from '../data/builds.js';
import { STATS, STANCES } from '../data/systems.js';
import { planBuild, planToText, encodePlan, decodePlan } from '../core/planner.js';
import { el, card, table, chips, kpi, copyButton } from './dom.js';

const state = {
  classId: 'warrior',
  level: 30,
  goal: 'progress',
  plusAll: 0,
  extraPoints: 0,
  plan: null,
  shareCode: '',
};

function statLabel(id) {
  const s = STATS.find((x) => x.id === id);
  return s ? `${s.ru} (${s.name})` : id;
}

function bonusesKpi(plan) {
  const b = plan.bonuses;
  const items = [
    { label: 'Attack Damage', value: `+${b.ad.toFixed(0)}%` },
    { label: 'Crit Chance', value: `+${b.crit.toFixed(0)}%` },
    { label: 'Crit Damage', value: `+${b.critDmg.toFixed(0)}%` },
    { label: 'Double Hit', value: `+${b.dh.toFixed(0)}%` },
    { label: 'Double Damage', value: `+${b.dd.toFixed(0)}%` },
    { label: 'Boss Damage', value: `+${b.boss.toFixed(0)}%` },
    { label: 'Pet Damage', value: `+${b.petDmg.toFixed(0)}%` },
    { label: 'Max HP (плоско)', value: `+${b.maxHp.toFixed(0)}` },
    { label: 'HP за удар', value: `+${b.loh.toFixed(0)}` },
    { label: 'HP за убийство', value: `+${b.lok.toFixed(0)}` },
    { label: 'Золото', value: `+${b.gold.toFixed(0)}%` },
    { label: 'Материалы', value: `+${b.mat.toFixed(0)}%` },
    { label: 'Дроп предметов', value: `+${b.itemDrop.toFixed(0)}%` },
    { label: 'Дроп яиц', value: `+${b.eggDrop.toFixed(0)}%` },
    { label: 'Block', value: `+${b.block.toFixed(0)}%` },
    { label: 'Extra Kill', value: `+${b.extraKill.toFixed(0)}%` },
  ];
  return kpi(items.filter((i) => !/\+0(\.0)?%?$/.test(i.value)));
}

function renderSkillAllocation(plan) {
  const cls = CLASSES.find((c) => c.id === plan.classId);
  const blocks = cls.branches.map((branch) => {
    const skills = cls.skills.filter((s) => s.branch === branch || (s.branch == null && branch === cls.branches[0]));
    const spent = plan.branches[branch].spent;
    const rows = skills.map((s) => {
      const pts = plan.allocations[s.id] || 0;
      const rank = pts + plan.plusAll;
      return [
        el('span', { class: `tag T${s.tier || 1}`, text: s.tier ? `T${s.tier}` : 'T?' }),
        el('div', {}, [
          el('b', { text: s.name }),
          el('div', { class: 'muted', text: s.ru && s.ru !== '—' ? s.ru : '' }),
          s.s2 ? el('div', { class: 'muted', text: '⚠ ' + s.s2 }) : null,
        ]),
        el('div', {}, [el('div', { class: 'bar' }, [el('div', { style: `width:${(pts / s.max) * 100}%` })]), el('div', { class: 'muted', text: `${pts}/${s.max}${plan.plusAll ? ` (+${plan.plusAll} → ранг ${rank})` : ''}` })]),
        el('div', { class: 'muted', text: (s.text || '').replace(/\{(\w+)\}/g, (_, k) => {
          const per = s.perPoint?.[k];
          if (per == null) return '?';
          const cap = s.cap?.[k];
          let v = per * (rank || 1);
          if (cap != null) v = Math.min(v, cap);
          return Number(v.toFixed(2)).toString();
        }) }),
      ];
    });
    return el('div', { class: 'branch' }, [
      el('header', {}, [
        el('strong', { text: `${cls.branchRu[branch] || branch} · ${branch}` }),
        el('div', { class: 'chips' }, [
          el('span', { class: 'chip', text: `${spent} очк.` }),
          el('span', { class: `chip ${plan.branches[branch].tier3 ? 'good' : ''}`, text: plan.branches[branch].tier3 ? 'T3 открыт' : plan.branches[branch].tier2 ? 'T2 открыт' : 'нужно 5 очк. до T2' }),
        ]),
      ]),
      table(['Тир', 'Навык', 'Вложено', 'Что даёт'], rows),
      spent < CLASS_SKILL_RULES.tierUnlock[2]
        ? el('p', { class: 'muted', text: `До открытия Tier 2 в этой ветке нужно ${CLASS_SKILL_RULES.tierUnlock[2]} очка (сейчас ${spent}).` })
        : null,
      spent >= CLASS_SKILL_RULES.tierUnlock[2] && spent < CLASS_SKILL_RULES.tierUnlock[3]
        ? el('p', { class: 'muted', text: `До открытия Tier 3 нужно ${CLASS_SKILL_RULES.tierUnlock[3]} очков (сейчас ${spent}).` })
        : null,
    ]);
  });
  return blocks;
}

export function render(root) {
  root.innerHTML = '';
  const classPicker = el('div', { class: 'classes' }, CLASSES.map((c) =>
    el('button', {
      class: `class-btn ${c.id === state.classId ? 'active' : ''}`,
      onclick: () => { state.classId = c.id; render(root); },
    }, [document.createTextNode(c.ru), el('span', { text: `${c.name} · ${c.role}` })])));

  const controls = el('div', { class: 'controls' }, [
    el('div', {}, [el('label', { text: 'Уровень персонажа' }),
      el('input', { type: 'number', min: '1', max: '999', value: String(state.level), oninput: (e) => { state.level = Number(e.target.value) || 1; render(root); } })]),
    el('div', {}, [el('label', { text: 'Цель билда' }),
      el('select', { onchange: (e) => { state.goal = e.target.value; render(root); } },
        GOALS.map((g) => el('option', { value: g.id, selected: g.id === state.goal ? 'selected' : null }, [`${g.ru} — ${g.desc}`])))]),
    el('div', {}, [el('label', { text: '+All Class Skills (Torch, Sage Diadem, петы)' }),
      el('input', { type: 'number', min: '0', max: '50', value: String(state.plusAll), oninput: (e) => { state.plusAll = Math.max(0, Number(e.target.value) || 0); render(root); } })]),
    el('div', {}, [el('label', { text: 'Доп. очки навыков (бонусы/ивенты)' }),
      el('input', { type: 'number', min: '0', max: '200', value: String(state.extraPoints), oninput: (e) => { state.extraPoints = Math.max(0, Number(e.target.value) || 0); render(root); } })]),
  ]);

  const plan = planBuild({ classId: state.classId, level: state.level, goal: state.goal, plusAll: state.plusAll, extraPoints: state.extraPoints });
  state.plan = plan;

  const stance = STANCES.find((s) => s.id === plan.profile.stance);

  const summary = card(`План: ${plan.classRu} (${plan.className})`, [
    el('div', { class: 'infobox' }, [
      el('p', { text: `Цель: ${plan.goalDef.ru}. Стойка: ${stance?.ru} (${stance?.name}) — ${stance?.focus}.` }),
      el('p', { class: 'muted', text: stance?.note || '' }),
    ]),
    el('h3', { text: 'Очки классовых навыков' }),
    el('p', { text: `Доступно на ${state.level} ур.: ${plan.points.available} (1 на 1 ур. + 1 каждые 3 ур.), вложено ${plan.points.spent}, осталось ${plan.points.leftover}.` }),
    el('div', { class: 'bar' }, [el('div', { style: `width:${Math.min(100, (plan.points.spent / Math.max(1, plan.points.total)) * 100)}%` })]),
    plan.warnings.length ? el('div', { class: 'warnbox' }, [el('b', { text: 'На что обратить внимание' }), el('ul', { class: 'tight' }, plan.warnings.map((w) => el('li', { text: w })))]) : el('div', { class: 'okbox', text: 'Конфликтов не найдено.' }),
    el('h3', { text: 'Итоговые бонусы от навыков (с учётом +All Class Skills)' }),
    bonusesKpi(plan),
  ]);

  const stats = card('Приоритет характеристик под цель', [
    el('ol', {}, plan.statPriority.map((id) => {
      const s = STATS.find((x) => x.id === id);
      return el('li', {}, [el('b', { text: s ? `${s.ru} · ${s.name}` : id }), s?.desc ? el('div', { class: 'muted', text: s.desc }) : null]);
    })),
    el('p', { class: 'muted', text: 'Порядок — что искать в первую очередь в аффиксах, Drop Bonuses, гемах и талисманах. Это рекомендация, а не жёсткое правило.' }),
  ]);

  const gear = card('Экипировка, гемы, талисманы, петы', [
    el('h3', { text: 'Гемы по слотам' }),
    table(['Слот', 'Семья', 'Что даёт'], [
      ['Оружие', plan.profile.gems.weapon, gemDesc(plan.profile.gems.weapon, 'weapon')],
      ['Torch', plan.profile.gems.torch, gemDesc(plan.profile.gems.torch, 'torch')],
      ['Броня', plan.profile.gems.armor, gemDesc(plan.profile.gems.armor, 'armor')],
      ['Украшения', plan.profile.gems.jewelry === 'mainStat' ? `по главному стату (${plan.classRu})` : plan.profile.gems.jewelry, gemDesc(plan.profile.gems.jewelry === 'mainStat' ? 'garnet' : plan.profile.gems.jewelry, 'jewelry')],
    ]),
    el('p', { class: 'muted', text: `Приоритетные вторичные статы гемов: ${plan.profile.gems.secondary.join(', ')}.` }),
    el('h3', { text: 'Drop Bonuses (ретайп по семействам Fierce / Companion\'s / Reflecting)' }),
    chips(plan.profile.dropBonuses.map((d) => ({ text: d, kind: 'gold' }))),
    el('h3', { text: 'Талисманы (2 слота)' }),
    chips(plan.profile.talismans),
    el('h3', { text: 'Петы (4 слота)' }),
    el('p', { text: plan.profile.pets }),
    el('h3', { text: 'Заметки по сборке' }),
    el('ul', { class: 'tight' }, plan.profile.notes.map((n) => el('li', { text: n }))),
  ]);

  const skills = card('Распределение классовых навыков', renderSkillAllocation(plan));

  const share = card('Обмен сборкой', [
    el('p', { class: 'muted', text: 'Код содержит класс, уровень, цель и распределение навыков. Отправьте его другому игроку — он вставит код ниже и получит тот же план.' }),
    el('div', { class: 'actions' }, [
      el('button', { class: 'btn primary', text: 'Создать код', onclick: () => { state.shareCode = encodePlan(plan, state.plusAll); render(root); } }),
      copyButton(planToText(plan), 'Скопировать текст плана'),
    ]),
    state.shareCode ? el('pre', { class: 'code', text: state.shareCode }) : null,
    el('div', { class: 'actions' }, [
      el('button', {
        class: 'btn', text: 'Загрузить код',
        onclick: () => {
          const code = prompt('Вставьте код сборки:');
          const decoded = code ? decodePlan(code.trim()) : null;
          if (decoded) {
            state.classId = decoded.classId; state.level = decoded.level; state.goal = decoded.goal; state.plusAll = decoded.plusAll || 0;
            render(root);
          } else if (code) alert('Не удалось прочитать код.');
        },
      }),
    ]),
  ]);

  root.appendChild(card('Класс', [classPicker, el('p', { class: 'muted', text: 'Выберите класс — распределение очков, статы и рекомендации пересчитаются.' })]));
  root.appendChild(card('Параметры', [controls]));
  root.appendChild(el('div', { class: 'grid cols-1' }, [summary]));
  root.appendChild(el('div', { class: 'grid cols-2' }, [skills, el('div', { class: 'grid' }, [stats, gear])]));
  root.appendChild(share);
}

function gemDesc(familyId, slot) {
  const map = {
    garnet: { weapon: '+0.5% Attack Damage', torch: '+0.6% Max Health', armor: '+0.6% Defense', jewelry: '+5 Strength' },
    jade: { weapon: '+0.5% Pet Damage', torch: '+0.3% Attack Damage', armor: '+0.6% Max Health', jewelry: '+5 Dexterity' },
    lapis: { weapon: '+0.25% AD / +0.25% Pet / +0.25% Retaliation', torch: '+0.3% Pet Damage', armor: '+2% EXP Gain', jewelry: '+5 Intelligence' },
    amber: { weapon: '+2% Gold Gain', torch: '+1% Item Drop', armor: '+2% Material Drop', jewelry: '+0.8% Gold / +0.8% EXP / +0.4% Item Drop' },
  };
  return map[familyId]?.[slot] || '—';
}

export { state as plannerState };
