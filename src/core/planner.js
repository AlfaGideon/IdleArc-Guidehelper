/**
 * Планировщик сборки IdleArc.
 *
 * Здесь три независимых вещи:
 *  1) allocatePoints — распределение классовых очков «по-человечески»: сначала открываем
 *     все три ветки, затем выводим их на Tier 2 (5 очков) и Tier 3 (10 очков), и только
 *     потом добиваем остаток по весам навыков. Так билд не сваливается в одну ветку.
 *  2) applyPlusAll — считает эффективные ранги с учётом +All Class Skills (Torch, Sage Diadem,
 *     легендарные петы) и показывает, какой эффект дал этот бонус.
 *  3) buildGearPlan / buildGemPlan — план по предметам и гемам для каждого слота.
 */
import {
  CLASSES, classById, classPointsForLevel, isSkillUnlocked, spentInBranch, CLASS_SKILL_RULES,
} from '../data/classes.js';
import { profileFor, weightsFor, statPriorityFor, GOALS, goalGearRules, STAT_TO_AFFIX } from '../data/builds.js';
import {
  AFFIXES, DROP_BONUSES, DROP_BONUS_SLOT_CATEGORIES, GEAR_FAMILIES, SLOT_ORDER, SLOT_RU, SLOT_GEM_REGION,
  GEM_FAMILIES, GEM_RARITY, GEM_DROP_TABLE, GEM_SOCKET_UNLOCKS, DROP_TIER_TABLE, RARITY,
  familyById, familyUnlockMl,
} from '../data/items.js';

/* ----------------------------- 1. Распределение очков ----------------------------- */

function branchScores(cls, weights) {
  const info = {};
  for (const b of cls.branches) {
    const skills = cls.skills.filter((s) => s.branch === b || (s.branch == null && b === cls.branches[0]));
    const score = skills.reduce((a, s) => a + (weights[s.id] || 0), 0);
    const maxPts = skills.reduce((a, s) => a + (s.max || 0), 0);
    const bestWeight = skills.reduce((a, s) => Math.max(a, weights[s.id] || 0), 0);
    info[b] = { branch: b, score, maxPts, bestWeight };
  }
  return info;
}

/**
 * Цели по очкам для каждой ветки.
 *
 * Правила (и их можно объяснить пользователю):
 *  1. Каждая ветка получает минимум 1 очко — билд всегда задействует все три ветки.
 *  2. Остаток делится пропорционально весам ветки для выбранной цели (метод наибольших остатков).
 *  3. Затем «доводка до порогов»: ветка, у которой вес не ниже половины от главной, добирает очки
 *     до 5 (Tier 2) или до 10 (Tier 3), если эти очки можно забрать у слабых ветк (не ниже 1 очка).
 *     Так сильные ветки открывают Tier 2/3, а слабая остаётся «подпоркой» на 1–4 очка.
 */
function branchTargets(cls, weights, total) {
  const info = branchScores(cls, weights);
  const order = Object.values(info).sort((a, b) => b.score - a.score || b.bestWeight - a.bestWeight);
  const targets = {};
  for (const b of cls.branches) targets[b] = 1;
  let left = total - cls.branches.length;

  // Пропорционально весам ветки.
  if (left > 0) {
    const totalScore = order.reduce((a, b) => a + b.score, 0) || 1;
    const shares = order.map((b) => ({
      branch: b.branch,
      exact: (left * b.score) / totalScore,
      room: Math.max(0, b.maxPts - targets[b.branch]),
    }));
    let assigned = 0;
    for (const s of shares) {
      const give = Math.min(Math.floor(s.exact), s.room);
      targets[s.branch] += give;
      s.given = give;
      assigned += give;
    }
    let rest = left - assigned;
    for (const s of [...shares].sort((a, b) => (b.exact % 1) - (a.exact % 1))) {
      if (rest <= 0) break;
      const roomLeft = s.room - s.given;
      if (roomLeft > 0) { targets[s.branch] += 1; s.given += 1; rest -= 1; }
    }
    left = rest;
  }

  // Доводка до порогов Tier 2 / Tier 3 за счёт слабых ветвей.
  const maxScore = order[0].score || 1;
  const strong = order.filter((b) => b.score >= 0.5 * maxScore);
  const weak = order.filter((b) => b.score < 0.5 * maxScore).sort((a, b) => a.score - b.score);
  for (const b of strong) {
    const t = targets[b.branch];
    const gates = [CLASS_SKILL_RULES.tierUnlock[2], CLASS_SKILL_RULES.tierUnlock[3]];
    const gate = gates.find((g) => t > 1 && t < g && gateReachable(cls, b.branch, g, targets, weak, info));
    if (!gate) continue;
    let need = gate - t;
    for (const w of weak) {
      if (need <= 0) break;
      const give = Math.min(need, Math.max(0, targets[w.branch] - 1));
      targets[w.branch] -= give;
      targets[b.branch] += give;
      need -= give;
    }
  }

  const used = Object.values(targets).reduce((a, b) => a + b, 0);
  return { targets, leftover: Math.max(0, total - used), info, order: order.map((o) => o.branch) };
}

/** Хватит ли слабых ветвей, чтобы довести ветку до порога (без учёта собственных очков). */
function gateReachable(cls, branch, gate, targets, weak, info) {
  const need = gate - targets[branch];
  const spare = weak.reduce((a, w) => a + Math.max(0, targets[w.branch] - 1), 0);
  return spare >= need && info[branch].maxPts >= gate;
}

function bestSkillInBranch(cls, branch, weights, alloc) {
  const skills = cls.skills.filter((s) =>
    (s.branch === branch || (s.branch == null && branch === cls.branches[0])) &&
    (weights[s.id] || 0) > 0 &&
    (alloc[s.id] || 0) < s.max &&
    isSkillUnlocked(s, alloc));
  if (!skills.length) return null;
  skills.sort((a, b) => {
    const w = (weights[b.id] || 0) - (weights[a.id] || 0);
    if (w !== 0) return w;
    return (a.tier || 0) - (b.tier || 0);
  });
  return skills[0];
}

export function allocatePoints(classId, level, goal, extraPoints = 0) {
  const cls = classById(classId);
  const weights = weightsFor(classId, goal);
  const total = classPointsForLevel(level) + Math.max(0, extraPoints);
  const { targets, leftover: plannedLeftover, info, order: branchOrder } = branchTargets(cls, weights, total);
  const alloc = {};
  const order = [];
  const spentPerBranch = {};
  for (const b of cls.branches) spentPerBranch[b] = 0;

  const spentTotal = () => Object.values(alloc).reduce((a, b) => a + b, 0);

  let guard = 0;
  while (spentTotal() < total && guard++ < 5000) {
    // выбираем ветку с наибольшим «недобором» до цели
    const candidates = cls.branches
      .map((b) => ({ b, deficit: targets[b] - spentPerBranch[b] }))
      .filter((c) => c.deficit > 0)
      .sort((a, b) => b.deficit - a.deficit);
    let placed = false;
    for (const c of candidates) {
      const skill = bestSkillInBranch(cls, c.b, weights, alloc);
      if (!skill) continue;
      alloc[skill.id] = (alloc[skill.id] || 0) + 1;
      order.push(skill.id);
      spentPerBranch[c.b] += 1;
      placed = true;
      break;
    }
    if (!placed) break; // цели по ветвям выбраны — остаток раскидываем без учёта весов
  }

  // Фолбэк: добираем оставшиеся очки в любые доступные навыки (по приоритету ветвей и тиров),
  // чтобы автоматический план не оставлял очки «в кармане».
  guard = 0;
  while (spentTotal() < total && guard++ < 5000) {
    const candidate = cls.branches
      .map((b) => ({
        b,
        deficit: targets[b] - spentPerBranch[b],
        skills: cls.skills.filter((s) =>
          (s.branch === b || (s.branch == null && b === cls.branches[0])) &&
          (alloc[s.id] || 0) < s.max && isSkillUnlocked(s, alloc)),
      }))
      .sort((a, b) => b.deficit - a.deficit);
    const pick = candidate.find((c) => c.skills.length);
    if (!pick) break;
    pick.skills.sort((a, b) => (a.tier || 1) - (b.tier || 1) || (weights[b.id] || 0) - (weights[a.id] || 0) || (b.max - (alloc[b.id] || 0)) - (a.max - (alloc[a.id] || 0)));
    const skill = pick.skills[0];
    alloc[skill.id] = (alloc[skill.id] || 0) + 1;
    order.push(skill.id);
    spentPerBranch[pick.b] += 1;
  }

  const spent = spentTotal();
  return {
    allocations: alloc, spent, total, leftover: Math.max(0, total - spent),
    order, targets, info, branchOrder, leftoverPlan: plannedLeftover,
  };
}

/** Проверка ручного распределения: что нарушено и сколько очков осталось. */
export function validateAllocation(classId, allocations, totalPoints) {
  const cls = classById(classId);
  const problems = [];
  let spent = 0;
  for (const s of cls.skills) {
    const pts = allocations[s.id] || 0;
    spent += pts;
    if (pts < 0) problems.push({ skill: s.name, reason: 'Отрицательное значение' });
    if (pts > s.max) problems.push({ skill: s.name, reason: `Больше максимума (${s.max})` });
  }
  // порядок проверки: сначала фиксируем очки, потом проверяем гейты
  const tmp = { ...allocations };
  for (const s of cls.skills) {
    if (!(tmp[s.id] > 0)) continue;
    if (s.branch && s.tier > 1) {
      const spentHere = spentInBranch(s.branch, tmp);
      const need = CLASS_SKILL_RULES.tierUnlock[s.tier];
      if (spentHere < need) problems.push({ skill: s.name, reason: `Нужно ${need} очков в ветке «${s.branch}» (сейчас ${spentHere})` });
    }
    if (s.requires && !(tmp[s.requires] > 0)) {
      const req = cls.skills.find((x) => x.id === s.requires);
      problems.push({ skill: s.name, reason: `Требуется навык «${req ? req.name : s.requires}»` });
    }
  }
  return { spent, available: totalPoints, left: totalPoints - spent, over: spent > totalPoints, problems };
}

/* ------------------------------ 2. +All Class Skills ------------------------------ */

const capKeys = (skill) => Object.keys(skill.cap || {});

/** Значение эффекта навыка при данном ранге: {key: value} с учётом капов. */
export function effectAtRank(skill, rank) {
  const out = {};
  for (const [k, per] of Object.entries(skill.perPoint || {})) {
    let v = per * rank;
    const cap = skill.cap?.[k];
    if (cap != null) v = Math.min(v, cap);
    out[k] = v;
  }
  return out;
}

/** Собирает итоговые бонусы и по каждому навыку показывает вклад +All Class Skills. */
export function skillBonuses(classId, allocations = {}, plusAll = 0) {
  const cls = classById(classId);
  const empty = {
    totals: {}, details: [], cappedByPlus: [], gained: [],
  };
  if (!cls) return empty;
  const sum = (usePlus) => {
    const totals = {};
    for (const skill of cls.skills) {
      const spent = allocations[skill.id] || 0;
      if (!spent) continue; // невыученные навыки +All не поднимает (официальное правило)
      const rank = spent + (usePlus ? plusAll : 0);
      for (const [k, v] of Object.entries(effectAtRank(skill, rank))) totals[k] = (totals[k] || 0) + v;
      if (skill.base) for (const [k, v] of Object.entries(skill.base)) totals[k] = (totals[k] || 0) + v;
    }
    if (totals.extraKill > 10) totals.extraKill = 10;
    return totals;
  };
  const totals = sum(true);
  const withoutPlus = sum(false);

  const details = [];
  const cappedByPlus = [];
  const gained = [];
  for (const skill of cls.skills) {
    const spent = allocations[skill.id] || 0;
    if (!spent) continue;
    const baseRank = spent;
    const effRank = spent + plusAll;
    const baseEff = effectAtRank(skill, baseRank);
    const effEff = effectAtRank(skill, effRank);
    const cappedKeys = capKeys(skill).filter((k) => baseEff[k] !== effEff[k] || effEff[k] >= (skill.cap[k] ?? Infinity));
    const capped = capKeys(skill).filter((k) => (skill.cap[k] != null) && effEff[k] >= skill.cap[k] - 1e-9);
    if (plusAll > 0 && capped.length) {
      const cap = Math.max(...capped.map((k) => skill.cap[k]));
      cappedByPlus.push({ skill: skill.name, cap, key: capped[0] });
    }
    details.push({
      ...skill, points: spent, baseRank, effRank, plusAll,
      baseEffect: baseEff, effect: effEff, capped,
      delta: Object.keys(effEff).filter((k) => (effEff[k] - (baseEff[k] || 0)) > 1e-9),
    });
  }
  if (plusAll > 0) {
    for (const [k, v] of Object.entries(totals)) {
      const before = withoutPlus[k] || 0;
      if (v - before > 1e-9) gained.push({ key: k, from: before, to: v, delta: v - before });
    }
  }
  return { totals, withoutPlus, plusAll, details, cappedByPlus, gained };
}

/* -------------------- 0. Monster Level: что падает и что открыто -------------------- */

const RARITY_KEYS = ['normal', 'uncommon', 'rare', 'epic', 'legendary', 'infernal'];

/**
 * Что реально падает на этом Monster Level: строка таблицы дропа + самый вероятный тир предмета.
 * ML — отдельная величина: она НЕ влияет на классовые очки (их даёт уровень персонажа).
 */
export function dropTierAtMl(ml) {
  const level = Math.max(1, Math.floor(ml || 1));
  const row = DROP_TIER_TABLE.find((r) => level <= r.upTo) || DROP_TIER_TABLE[DROP_TIER_TABLE.length - 1];
  const probs = RARITY_KEYS.map((key, i) => ({ key, tier: i + 1, chance: row[key] || 0 }));
  const best = probs.reduce((a, b) => (b.chance > a.chance ? b : a));
  const meta = RARITY[best.tier - 1];
  return {
    row, tier: best.tier, key: best.key, chance: best.chance,
    tierLabel: meta.tier, ru: meta.ru, name: meta.name, color: meta.color,
    affixes: meta.affixes, mult: meta.mult,
    probabilities: probs.filter((p) => p.chance > 0),
  };
}

/** Лучшая редкость гема, которая реально падает на этом ML. */
export function gemRarityAtMl(ml) {
  const level = Math.max(1, Math.floor(ml || 1));
  const rows = GEM_DROP_TABLE.filter((r) => level >= (parseInt(String(r.ml), 10) || 0));
  const row = rows[rows.length - 1] || GEM_DROP_TABLE[0];
  const order = ['brilliant', 'polished', 'cut', 'rough'];
  const key = order.find((k) => (row[k] || 0) > 0) || 'rough';
  const meta = GEM_RARITY.find((g) => g.id === key) || GEM_RARITY[0];
  return { row, id: meta.id, name: meta.name, ru: meta.ru, mult: meta.mult, secondary: meta.secondary, chance: row[key] };
}

/** Сколько сокетов уже можно открыть на этом ML и когда откроется следующий. */
export function socketsAtMl(ml) {
  const level = Math.max(1, Math.floor(ml || 1));
  const unlocked = GEM_SOCKET_UNLOCKS.filter((s) => level >= s.ml);
  const next = GEM_SOCKET_UNLOCKS.find((s) => level < s.ml) || null;
  return { count: unlocked.length, unlocked, next };
}

/** Уровень персонажа, на котором дадут следующий классовый очок (1 очко за уровень + 1 каждые 3). */
export function nextPointLevel(level) {
  const lvl = Math.max(1, Math.floor(level || 1));
  return lvl + (3 - ((lvl - 1) % 3));
}

/* --------------------------------- 3. Предметы --------------------------------- */

function gemFamilyFor(region, classId, gemsCfg) {
  let id = gemsCfg[region] || 'garnet';
  if (id === 'mainStat') {
    const main = classById(classId)?.mainStat || 'strength';
    id = main === 'strength' ? 'garnet' : main === 'dexterity' ? 'jade' : 'lapis';
  }
  return GEM_FAMILIES.find((f) => f.id === id) || GEM_FAMILIES[0];
}

function affixesForSlot(slot, classId) {
  const families = GEAR_FAMILIES.filter((f) => f.slot === slot && (f.cls === 'all' || f.cls === classId));
  const prefixes = new Set();
  const suffixes = new Set();
  for (const f of families) {
    (f.prefixes || []).forEach((p) => prefixes.add(p));
    (f.suffixes || []).forEach((s) => suffixes.add(s));
  }
  return { prefixes: [...prefixes], suffixes: [...suffixes] };
}

function recommendAffixes(slot, classId, priority) {
  const { prefixes, suffixes } = affixesForSlot(slot, classId);
  const wantIds = new Set();
  for (const stat of priority) for (const a of (STAT_TO_AFFIX[stat] || [])) wantIds.add(a);
  const pick = (list, type) => list
    .map((name) => AFFIXES.find((a) => a.name === name && a.type === type))
    .filter(Boolean)
    .sort((a, b) => {
      const ai = wantIds.has(a.id) ? 0 : 1;
      const bi = wantIds.has(b.id) ? 0 : 1;
      return ai - bi;
    })
    .slice(0, 4);
  return { prefixes: pick(prefixes, 'prefix'), suffixes: pick(suffixes, 'suffix') };
}

function recommendDropBonuses(slot, goalList) {
  const cats = DROP_BONUS_SLOT_CATEGORIES[slot] || ['Offensive'];
  const list = DROP_BONUSES.filter((d) => goalList.includes(d.name));
  const ranked = list.sort((a, b) => {
    const ai = cats.indexOf(a.cat); const bi = cats.indexOf(b.cat);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  return ranked.slice(0, 3);
}

function familyReason(family, goal, slot) {
  if (family.note) return family.note;
  if (slot === 'mainhand') return `${family.hand === '2H' ? 'Двуручное' : 'Одноручное'} оружие класса.`;
  return '';
}

export function buildGearPlan(classId, goal, opts = {}) {
  const cls = classById(classId);
  const profile = profileFor(classId, goal);
  const priority = statPriorityFor(classId, goal);
  const rules = goalGearRules(classId, goal);

  // Уровень персонажа и Monster Level — независимые параметры:
  // персонаж даёт очки навыков, ML определяет, что падает и что вообще доступно.
  const ml = Math.max(1, Math.floor(opts.ml ?? opts.level ?? 1));
  const charLevel = Math.max(1, Math.floor(opts.level ?? ml));
  const tierInfo = dropTierAtMl(ml);
  const gemInfo = gemRarityAtMl(ml);
  const sockets = socketsAtMl(ml);

  const slots = SLOT_ORDER.map((slot) => {
    const ids = (rules[slot] || []).filter((id) => {
      const f = familyById(id);
      if (!f) return false;
      // Rogue носит второе оружие в слоте оффхенда — там допустимы его одноручные семейства.
      if (slot === 'offhand') {
        return f.slot === 'offhand' || (classId === 'rogue' && f.slot === 'mainhand' && f.hand === '1H');
      }
      return f.slot === slot;
    });
    const families = ids.map((id) => familyById(id)).filter(Boolean);
    const available = families.filter((f) => familyUnlockMl(f) <= ml);
    const primary = available[0] || families[0] || null;
    const region = SLOT_GEM_REGION[slot];
    const gemFamily = gemFamilyFor(region, classId, profile.gems);
    const tierIdx = Math.min(5, Math.max(0, tierInfo.tier - 1));

    return {
      slot, slotRu: SLOT_RU[slot], primary,
      alternatives: available.slice(1),
      locked: families.filter((f) => familyUnlockMl(f) > ml),
      reason: primary ? familyReason(primary, goal, slot) : '',
      affixes: recommendAffixes(slot, classId, priority),
      dropBonuses: recommendDropBonuses(slot, profile.dropBonuses),
      ml, charLevel,
      tierInfo,
      implicitNow: primary ? primary.implicitTiers[tierIdx] : null,
      tierNameNow: primary ? (primary.tierNames[tierIdx] || primary.name) : null,
      lockedAtMl: primary ? familyUnlockMl(primary) > ml : false,
      unlockMl: primary ? familyUnlockMl(primary) : 1,
      gem: {
        family: gemFamily,
        region,
        baseValue: gemFamily.slots[region],
        secondary: profile.gems.secondary,
        rarity: gemInfo.name,
        rarityRu: gemInfo.ru,
        rarityMult: gemInfo.mult,
        secondaryCount: gemInfo.secondary,
        sockets,
      },
    };
  });

  // Torch — отдельный слот: падает только с ML 50.
  const torch = slots.find((s) => s.slot === 'torch');
  if (torch && ml < 50) {
    torch.primary = null;
    torch.alternatives = [];
    torch.implicitNow = null;
    torch.tierNameNow = null;
    torch.note = 'Torch появляется в дропе с ML 50 — до этого слот пустой. Как только выпадет, обязательно ставьте его: это главный источник +All Class Skills.';
  }

  // Двуручное оружие занимает обе руки: слот оффхенда остаётся пустым.
  const main = slots.find((s) => s.slot === 'mainhand');
  const off = slots.find((s) => s.slot === 'offhand');
  if (off) {
    if (classId === 'druid') {
      off.primary = null; off.alternatives = []; off.locked = [];
      off.implicitNow = null; off.tierNameNow = null;
      off.note = 'Оффхенд пуст: Gnarled Stick — двуручное оружие друида.';
    } else if (main?.primary?.hand === '2H') {
      const alt = off.alternatives.map((a) => `${a.ru} (${a.name}) — ${a.implicit}`).join(', ');
      off.primary = null;
      off.implicitNow = null; off.tierNameNow = null;
      off.note = `Оффхенд пуст: ${main.primary.ru} (${main.primary.name}) — двуручное оружие, оно занимает обе руки. Альтернатива — одноручное оружие + оффхенд: ${alt}.`;
      off.alternatives = [];
    } else if (off.primary) {
      off.note = classId === 'rogue'
        ? 'Второе оружие: его имплисит (Double Hit или крит) работает так же, как в основной руке.'
        : '';
    }
  }

  return { slots, class: cls, profile, priority, ml, charLevel, tierInfo, gemInfo, sockets };
}

export function buildGemPlan(classId, goal, opts = {}) {
  const gear = buildGearPlan(classId, goal, opts);
  const byRegion = {};
  for (const s of gear.slots) {
    const r = s.gem.region;
    byRegion[r] = byRegion[r] || [];
    byRegion[r].push({ slot: s.slot, slotRu: s.slotRu, family: s.gem.family });
  }
  return { byRegion, secondary: gear.profile.gems.secondary, slots: gear.slots };
}

/* --------------------------- 6. Что делать дальше (гайд) --------------------------- */

/**
 * Пошаговый список действий под текущие уровень персонажа, Monster Level и цель.
 * Это шаг 6 интерфейса-гайда: конкретные следующие шаги, а не абстрактные советы.
 */
function buildTodo({ cls, classId, goal, level, ml, pointsAvailable, itemTier, sockets, profile }) {
  const out = [];
  out.push({
    title: 'Персонаж',
    text: `Уровень ${level}: доступно ${pointsAvailable} классовых очков. Следующий очок дадут на уровне ${nextPointLevel(level)}.`,
  });
  out.push({
    title: 'Monster Level',
    text: ml < 20
      ? `ML ${ml}: гемы и первый сокет открываются на ML 20 — поднимите ML, потом вставляйте камни.`
      : `ML ${ml}: чаще всего падает ${itemTier.ru} (${itemTier.name}, ${itemTier.tierLabel}) — около ${itemTier.chance}% дропа, аффиксов: ${itemTier.affixes}. Сокетов можно открыть: ${sockets.count}${sockets.next ? `, следующий — на ML ${sockets.next.ml}` : ' (максимум)'}.`,
  });
  if (ml < 25) out.push({ title: 'ML 25', text: 'Откроются двуручное оружие, когти Rogue и сайдгрейды брони — план экипировки обновится сам.' });
  if (ml < 50) out.push({ title: 'ML 50', text: 'Появится Torch — отдельный слот с +All Class Skills, который поднимает эффективные ранги всех навыков.' });
  if (ml < 65) out.push({ title: 'ML 65', text: 'Второй сокет и гемы Polished — держите камни во всех открытых сокетах.' });
  if (ml < 115) out.push({ title: 'ML 115', text: 'Третий сокет и гемы Brilliant (2 вторичных стата) — с этого ML реролл вторичек уже имеет смысл.' });
  if (ml < 160) out.push({ title: 'ML 160', text: 'Четвёртый сокет и гемы Flawless (3 вторички) — дроп-only, фьюзом не получить.' });
  if (ml < 260) out.push({ title: 'ML 260', text: 'Появятся предметы T6 Infernal и бонусы дропа T7–T9 (Gilded/Radiant/Mythic).' });

  const goalTodo = {
    progress: 'Прогресс: держите баланс урона и выживаемости; когда снижение урона близко к капу 95%, перекладывайте статы в урон.',
    farm: "Фарм: на броню и украшения ищите Drop Bonus-ы Prosperous / Scavenger's / Scholarly, в камни — Amber.",
    boss: "Боссы: Slayer's (Boss Damage) падает только с T4 — до этого берите Brutal (урон крита), Precise (крит) и Devastating (Double Damage).",
    pets: 'Пет-билд: бонус Companion\u2019s на украшениях, Jade в оружие и броню, Lapis в факел. Петов не разгоняйте выше самого слабого в команде — компоунд обрежется по нему.',
    retaliation: 'Retaliation: каждая единица Defense — это и защита, и урон (Retaliation = Reflecting% × Defense). В стойке Bulwark уклонение обнуляется — Dodge не собирайте.',
  };
  out.push({ title: 'Под цель', text: goalTodo[goal] || goalTodo.progress });
  out.push({ title: 'Снаряжение и мелочи', text: `Талисманы: ${(profile.talismans || []).join(' + ') || '—'}. Петы: ${profile.pets || '—'}` });
  out.push({ title: '+All Class Skills', text: 'В шаге 3 укажите реальный бонус (Torch + легендарные петы + Sage Diadem) — эффективные ранги навыков и итоговые бонусы пересчитаются.' });
  if (classId === 'druid') out.push({ title: 'Druid', text: 'Ветки Lodge / Tunnels / Symbiosis: по два навыка на тир, у Gnaw, Digger и Kinship — по 10 очков. Пет-урон идёт из Gnaw / Dam Builder / One Soul, а Kinship и Feral Bond конвертируют ваш плоский урон в урон пета (общий кап 75%).' });
  return out;
}

/* ---------------------------------- Общий план ---------------------------------- */

export function planBuild({
  classId = 'warrior', level = 1, goal = 'progress', plusAll = 0, extraPoints = 0, manual = null, ml = null,
}) {
  const cls = classById(classId);
  const goalDef = GOALS.find((g) => g.id === goal) || GOALS[0];
  const profile = profileFor(classId, goal);
  // Два независимых параметра: level (персонаж → очки навыков) и ml (что падает и что доступно).
  const charLevel = Math.max(1, Math.floor(level || 1));
  const monsterLevel = Math.max(1, Math.floor(ml == null ? charLevel : ml));
  const pointsAvailable = classPointsForLevel(charLevel) + Math.max(0, extraPoints);

  const auto = allocatePoints(classId, level, goal, extraPoints);
  const weights = weightsFor(classId, goal);
  const usingManual = !!(manual && Object.keys(manual).length);
  const allocations = usingManual ? { ...manual } : auto.allocations;
  const validation = validateAllocation(classId, allocations, pointsAvailable);
  const { totals, withoutPlus, details, cappedByPlus, gained, plusAll: plus } = skillBonuses(classId, allocations, plusAll);

  const branches = {};
  for (const b of cls.branches) {
    const spent = spentInBranch(b, allocations);
    const effSpent = spent; // +All не открывает тиры — гейты считаются по вложенным очкам
    branches[b] = {
      spent: effSpent,
      target: auto.targets?.[b] ?? 0,
      tier2: spent >= CLASS_SKILL_RULES.tierUnlock[2],
      tier3: spent >= CLASS_SKILL_RULES.tierUnlock[3],
      needTier2: Math.max(0, CLASS_SKILL_RULES.tierUnlock[2] - spent),
      needTier3: Math.max(0, CLASS_SKILL_RULES.tierUnlock[3] - spent),
    };
  }

  const warnings = [];
  const tips = [];
  if (validation.over) warnings.push(`Вложено ${validation.spent} очков, а доступно ${validation.available}. Уберите лишние очки.`);
  if (validation.left > 0) warnings.push(`Нераспределённых очков: ${validation.left}.`);
  for (const p of validation.problems) warnings.push(`${p.skill}: ${p.reason}.`);
  if (!usingManual && auto.leftover > 0) warnings.push(`Осталось ${auto.leftover} очков, которые некуда вложить в рамках весов цели.`);
  if (goal === 'retaliation' && classId !== 'warrior') warnings.push('Retaliation вне Warrior слабее: нет щита (Block) и защитных классовых навыков.');
  if (level < 25) tips.push('С ML 25 в пул дропа добавляются двуручное оружие, Claws (Rogue) и сайдгрейды брони.');
  if (level < 50) tips.push('Torch (отдельный слот, +All Class Skills) начинает падать с ML 50 — это главный источник бонуса.');
  if (level < 65) tips.push('До ML 65 доступны только гемы Cut: не тратьте Gem Dust на реролл вторичек так рано.');
  if (goal === 'pets' && !['archer', 'druid'].includes(classId)) tips.push('Пет-билд вне Archer/Druid опирается на экипировку, руны и талисманы — у класса нет пет-навыков.');
  if (plusAll > 30) warnings.push('Очень большой +All Class Skills — проверьте значение: реальный максимум ниже.');

  // Объяснение авто-распределения: почему очки пошли именно так.
  const explanation = auto.branchOrder.map((branch) => {
    const info = auto.info[branch];
    const share = Math.round((info.score / Math.max(1, Object.values(auto.info).reduce((a, b) => a + b.score, 0))) * 100);
    const def = cls.skills
      .filter((s) => (s.branch === branch || (s.branch == null && branch === cls.branches[0])) && (weights[s.id] || 0) > 0)
      .sort((a, b) => (weights[b.id] || 0) - (weights[a.id] || 0) || (a.tier || 1) - (b.tier || 1))
      .slice(0, 3)
      .map((s) => s.name);
    return { branch, ru: cls.branchRu?.[branch] || branch, share, target: auto.targets[branch], spent: branches[branch].spent, top: def };
  });

  const itemTier = dropTierAtMl(monsterLevel);
  const gemRarity = gemRarityAtMl(monsterLevel);
  const sockets = socketsAtMl(monsterLevel);
  const todo = buildTodo({
    cls, classId, goal, level: charLevel, ml: monsterLevel,
    pointsAvailable, itemTier, sockets, profile,
  });

  return {
    classId, className: cls.name, classRu: cls.ru, class: cls,
    level: charLevel, ml: monsterLevel, goal, goalDef, profile,
    itemTier, gemRarity, sockets, todo,
    points: { available: pointsAvailable, spent: validation.spent, total: pointsAvailable, left: validation.left, over: validation.over },
    auto, allocations, usingManual, validation, skillList: details, branches, caps: {},
    bonuses: totals, bonusesWithoutPlus: withoutPlus, gained, cappedByPlus,
    statPriority: statPriorityFor(classId, goal),
    gear: buildGearPlan(classId, goal, { level: charLevel, ml: monsterLevel }),
    weights, explanation, warnings, tips,
  };
}

/* ------------------------------- Экспорт и обмен ------------------------------- */

export function planToText(plan) {
  const bi = (ru, en) => (ru && en && ru !== en ? `${ru} (${en})` : (ru || en || ''));
  const L = [];
  L.push(`IdleArc — план сборки: ${bi(plan.classRu, plan.className)}`);
  L.push(`Уровень персонажа: ${plan.level} (даёт ${plan.points.available} классовых очков) · Monster Level: ${plan.ml}`);
  L.push(`Цель: ${plan.goalDef.ru} · Стойка: ${plan.profile.stance} · +All Class Skills: ${plan.bonuses.plusAll ?? 0}`);
  L.push(`Очки: ${plan.points.spent}/${plan.points.available} · основной дроп: ${plan.itemTier.tierLabel} ${bi(plan.itemTier.ru, plan.itemTier.name)} (${plan.itemTier.chance}%) · гемы до ${bi(plan.gemRarity.ru, plan.gemRarity.name)}`);
  L.push('');
  L.push('КЛАССОВЫЕ НАВЫКИ');
  for (const s of plan.skillList) {
    const capNote = s.capped.length ? ` [кап: ${s.capped.join(', ')}]` : '';
    L.push(`  ${s.branch || '—'} · T${s.tier ?? '?'} · ${bi(s.ru, s.name)}: вложено ${s.points}/${s.max}, эффективный ранг ${s.effRank}${capNote}`);
  }
  L.push('');
  L.push(`ЭКИПИРОВКА (имплиситы для ${plan.itemTier.tierLabel})`);
  for (const s of plan.gear.slots) {
    const fam = s.primary ? bi(s.primary.ru, s.primary.name) : '—';
    const alts = s.alternatives.length ? ` | альтернативы: ${s.alternatives.map((a) => bi(a.ru, a.name)).join(', ')}` : '';
    L.push(`  ${s.slotRu}: ${fam}${alts}`);
    L.push(`      ${s.tierNameNow ? `${s.tierNameNow}: ` : ''}имплисит: ${s.implicitNow || '—'}${s.primary ? ` (полная лестница: ${s.primary.implicitTiers.map((v, i) => `T${i + 1} ${v}`).join(' / ')})` : ''}`);
    L.push(`      аффиксы: ${[...s.affixes.prefixes.map((a) => bi(a.ru, a.name)), ...s.affixes.suffixes.map((a) => bi(a.ru, a.name))].join(', ') || '—'}`);
    L.push(`      Drop Bonus: ${s.dropBonuses.map((d) => bi(d.ru, d.name)).join(', ') || '—'} · камень: ${bi(s.gem.family.ru, s.gem.family.name)} (${s.gem.baseValue || '—'}), редкость ${bi(s.gem.rarityRu, s.gem.rarity)}`);
  }
  L.push('');
  L.push('ЧТО ДЕЛАТЬ ДАЛЬШЕ');
  for (const t of plan.todo) L.push(`  • ${t.title}: ${t.text}`);
  L.push('');
  L.push(`Приоритет статов: ${plan.statPriority.join(' → ')}`);
  L.push(`Талисманы: ${plan.profile.talismans.join(' + ')}`);
  L.push(`Петы: ${plan.profile.pets}`);
  L.push('');
  L.push('ЗАМЕТКИ');
  for (const n of plan.profile.notes) L.push(`  • ${n}`);
  for (const w of plan.warnings) L.push(`  ! ${w}`);
  L.push('');
  L.push('Источники: idlearc.com/patch-notes/1-3-1, idlearc.com/classes, idlearc.fandom.com/wiki/Item_Codex (снапшот 04.10.2026)');
  return L.join('\n');
}

export function encodePlan(plan, plusAll = 0) {
  const payload = {
    v: 2, c: plan.classId, l: plan.level, m: plan.ml, g: plan.goal, p: plusAll || 0,
    a: Object.fromEntries(Object.entries(plan.allocations).filter(([, v]) => v > 0)),
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replace(/=+$/, '');
}

export function decodePlan(code) {
  try {
    const p = JSON.parse(decodeURIComponent(escape(atob(code))));
    if (!p || !p.c) return null;
    return {
      classId: p.c, level: p.l || 1, ml: p.m || p.l || 1,
      goal: p.g || 'progress', plusAll: p.p || 0, allocations: p.a || {},
    };
  } catch {
    return null;
  }
}
