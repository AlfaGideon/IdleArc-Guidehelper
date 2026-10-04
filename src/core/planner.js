/**
 * Планировщик сборки: распределение классовых очков под цель + сформированные рекомендации.
 */
import { CLASSES, classById, classPointsForLevel, isSkillUnlocked, spentInBranch, CLASS_SKILL_RULES } from '../data/classes.js';
import { profileFor, weightsFor, statPriorityFor, GOALS } from '../data/builds.js';
import { skillBonuses } from './calc.js';

/** Жадное распределение очков по весам с учётом тиров и требований. */
export function allocatePoints(classId, level, goal, extraPoints = 0) {
  const cls = classById(classId);
  const weights = weightsFor(classId, goal);
  const total = classPointsForLevel(level) + Math.max(0, extraPoints);
  const alloc = {};
  const order = [];
  let guard = 0;
  while (Object.values(alloc).reduce((a, b) => a + b, 0) < total && guard++ < 500) {
    const candidates = cls.skills.filter((s) =>
      (weights[s.id] || 0) > 0 &&
      (alloc[s.id] || 0) < s.max &&
      isSkillUnlocked(s, alloc)
    );
    if (!candidates.length) break;
    candidates.sort((a, b) => {
      const w = (weights[b.id] || 0) - (weights[a.id] || 0);
      if (w !== 0) return w;
      const t = (a.tier || 0) - (b.tier || 0);
      if (t !== 0) return t;
      return (b.max || 0) - (a.max || 0);
    });
    const pick = candidates[0];
    alloc[pick.id] = (alloc[pick.id] || 0) + 1;
    order.push(pick.id);
  }
  const spent = Object.values(alloc).reduce((a, b) => a + b, 0);
  return { allocations: alloc, spent, total, leftover: total - spent, order };
}

/** Полный план сборки. */
export function planBuild({ classId = 'warrior', level = 1, goal = 'progress', plusAll = 0, extraPoints = 0 }) {
  const cls = classById(classId);
  const goalDef = GOALS.find((g) => g.id === goal) || GOALS[0];
  const profile = profileFor(classId, goal);
  const { allocations, spent, total, leftover, order } = allocatePoints(classId, level, goal, extraPoints);
  const { totals, caps, details } = skillBonuses(classId, allocations, plusAll);

  const branches = {};
  for (const b of cls.branches) {
    branches[b] = {
      spent: spentInBranch(b, allocations),
      tier2: spentInBranch(b, allocations) >= CLASS_SKILL_RULES.tierUnlock[2],
      tier3: spentInBranch(b, allocations) >= CLASS_SKILL_RULES.tierUnlock[3],
    };
  }

  const skillList = cls.skills
    .filter((s) => allocations[s.id])
    .map((s) => ({ ...s, points: allocations[s.id], effectiveRank: allocations[s.id] + plusAll }))
    .sort((a, b) => (a.tier || 0) - (b.tier || 0) || b.points - a.points);

  const warnings = [];
  if (leftover > 0) warnings.push(`Осталось нераспределённых очков: ${leftover}. Увеличьте уровень или добавьте очки вручную.`);
  if (cls.skills.some((s) => s.unverified)) {
    warnings.push('Для Druid официальные описания навыков не опубликованы — распределение и проценты ориентировочные, проверяйте в игре.');
  }
  if (goal === 'retaliation' && classId !== 'warrior') {
    warnings.push('Retaliation-билд вне Warrior слабее: нет щита (Block) и классовых защитных навыков.');
  }
  if (level < 25) warnings.push('На ML 25+ откроются двуручное оружие и Claws (Rogue) — билд может заметно измениться.');
  if (level < 50) warnings.push('Torch (отдельный слот с +All Class Skills) начинает падать с ML 50 — это важный шаг силы.');
  if (goal === 'pets' && !['archer', 'druid'].includes(classId)) {
    warnings.push('Пет-билд вне Archer/Druid опирается только на экипировку, руны и талисманы — ждите меньшего эффекта от класса.');
  }

  return {
    classId, className: cls.name, classRu: cls.ru, level, goal, goalDef, profile,
    points: { spent, total, leftover, available: classPointsForLevel(level) },
    allocations, order, skillList, branches, bonuses: totals, caps, details,
    statPriority: statPriorityFor(classId, goal),
    warnings,
  };
}

/** Текстовая сводка плана (для экспорта/копирования в Discord). */
export function planToText(plan) {
  const lines = [];
  lines.push(`IdleArc — план сборки: ${plan.className} (${plan.classRu}) · уровень ${plan.level}`);
  lines.push(`Цель: ${plan.goalDef.ru} · Стойка: ${plan.profile.stance}`);
  lines.push(`Очки навыков: ${plan.points.spent}/${plan.points.total}`);
  lines.push('');
  lines.push('Классовые навыки:');
  for (const s of plan.skillList) {
    lines.push(`  ${s.branch || '—'} · T${s.tier ?? '?'} · ${s.name} — ${s.points}/${s.max}`);
  }
  lines.push('');
  lines.push(`Приоритет статов: ${plan.statPriority.join(' → ')}`);
  lines.push(`Гемы: оружие ${plan.profile.gems.weapon}, факел ${plan.profile.gems.torch}, броня ${plan.profile.gems.armor}, украшения ${plan.profile.gems.jewelry}`);
  lines.push(`Drop Bonuses: ${plan.profile.dropBonuses.join(', ')}`);
  lines.push(`Талисманы: ${plan.profile.talismans.join(' + ')}`);
  lines.push(`Петы: ${plan.profile.pets}`);
  lines.push('');
  lines.push('Заметки:');
  for (const n of plan.profile.notes) lines.push(`  • ${n}`);
  for (const w of plan.warnings) lines.push(`  ! ${w}`);
  lines.push('');
  lines.push('Источники данных: idlearc.com/patch-notes/1-3-1, idlearc.com/classes, idlearc.fandom.com (снапшот 04.10.2026)');
  return lines.join('\n');
}

/** Компактный код сборки для обмена. */
export function encodePlan(plan, plusAll = 0) {
  const payload = {
    v: 1, c: plan.classId, l: plan.level, g: plan.goal,
    a: Object.fromEntries(Object.entries(plan.allocations).filter(([, v]) => v > 0)),
    p: plusAll || 0,
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replace(/=+$/, '');
}

export function decodePlan(code) {
  try {
    const json = decodeURIComponent(escape(atob(code)));
    const p = JSON.parse(json);
    if (!p || !p.c) return null;
    return { classId: p.c, level: p.l || 1, goal: p.g || 'progress', allocations: p.a || {}, plusAll: p.p || 0 };
  } catch (e) {
    return null;
  }
}
