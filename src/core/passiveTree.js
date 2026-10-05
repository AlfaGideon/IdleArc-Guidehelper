/**
 * Рекомендация прокачки пассивного дерева под класс, цель и уровень персонажа.
 *
 * Стратегия (из правил игры):
 *  • пассивных очков ровно столько, сколько уровней (1 очко за уровень);
 *  • следующий тир открывается после 20 очков в предыдущем, а узлы глубоких тиров
 *    в разы сильнее (Attack Damage: +4/очко в тире 1 → +1120/очко в тире 20),
 *    поэтому базовое правило — «идти вглубь»: вкладывать в каждый тир ровно 20 очков
 *    в самые полезные для цели узлы и сразу открывать следующий;
 *  • когда дальше идти некуда (кончились очки или дерево), остаток раскладывается
 *    по уже открытым тирам — опять по приоритету цели;
 *  • майлстоун-ряд (каждый 10-й) — узлы по 1 очку с большими значениями: берём
 *    самый полезный для цели.
 *
 * Приоритет статов берётся из тех же правил целей, что и остальной планировщик
 * (src/data/builds.js → statPriorityFor), поэтому пассивка согласована с экипировкой,
 * гемами и классовыми очками.
 */

import { PASSIVE_ROWS, PASSIVE_RULES, PASSIVE_STATS, isMilestoneRow } from '../data/passives.js';
import { statPriorityFor } from '../data/builds.js';
import { CLASSES } from '../data/classes.js';

const MAIN_ATTR = { strength: 'str', dexterity: 'dex', intelligence: 'int' };

/** Вес пассивного стата для класса и цели: чем выше, тем раньше берём. */
export function passiveWeights(classId, goalId) {
  const prio = statPriorityFor(classId, goalId); // массив ключей статов в порядке важности
  const cls = CLASSES.find((c) => c.id === classId);
  const mainAttr = MAIN_ATTR[cls ? cls.mainStat : 'strength'] || 'str';

  const w = {};
  for (const [code, meta] of Object.entries(PASSIVE_STATS)) {
    const idx = prio.indexOf(meta.rec);
    // вес по позиции в приоритете цели: первый ≈ 10, дальше по убыванию; нет в списке — 0.8
    w[code] = idx >= 0 ? Math.max(1.5, 10 - idx * 1.1) : 0.8;
  }
  // Атрибуты: главный атрибут класса полезен всегда (урон + защита по формуле класса),
  // чужие атрибуты почти бесполезны.
  const attrBase = Math.max(2.2, w[mainAttr] || 0);
  w.str = 0.3; w.dex = 0.3; w.int = 0.3;
  w[mainAttr] = attrBase;
  return { weights: w, mainAttr };
}

/**
 * Построить план: куда класть пассивные очки.
 * Возвращает { tiers: [...], totals: {...}, points, spent, deepestTier, weights }.
 */
export function planPassives(classId, goalId, level) {
  const points = Math.max(0, Math.round(level || 0)) * PASSIVE_RULES.pointsPerLevel;
  const { weights, mainAttr } = passiveWeights(classId, goalId);
  const R = PASSIVE_RULES;

  // alloc[rowIndex][nodeIndex] = вложенные очки
  const alloc = PASSIVE_ROWS.map((row) => row.map(() => 0));
  const tierSpent = new Array(R.tiers).fill(0);
  let remaining = points;

  // Кандидат на следующий вложенный пункт внутри тира t (учитывая майлстоун = максимум 1 очко на весь ряд).
  const nextInTier = (t) => {
    const start = t * R.rowsPerTier;
    let best = null;
    for (let r = start; r < start + R.rowsPerTier; r += 1) {
      const row = PASSIVE_ROWS[r];
      const milestone = isMilestoneRow(r);
      const rowSpent = alloc[r].reduce((s, v) => s + v, 0);
      if (milestone && rowSpent >= 1) continue; // майлстоун — выбор одного узла
      for (let n = 0; n < row.length; n += 1) {
        if (alloc[r][n] >= row[n][2]) continue;
        const code = row[n][0];
        const score = (weights[code] || 0.5) * (milestone ? 1.6 : 1); // майлстоун даёт много за 1 очко
        if (score <= 0.31 && !milestone) continue; // чужие атрибуты не берём без нужды
        if (!best || score > best.score + 1e-9) best = { r, n, score };
      }
    }
    return best;
  };

  // Фаза 1: «идти вглубь» — по 20 очков в тир, пока есть очки.
  let deepestTier = 0; // индекс последнего тира, куда вообще вложились
  for (let t = 0; t < R.tiers && remaining > 0; t += 1) {
    if (t > 0 && tierSpent[t - 1] < R.unlockThreshold) break; // предыдущий не добит — дальше закрыто
    while (tierSpent[t] < R.unlockThreshold && remaining > 0) {
      const pick = nextInTier(t);
      if (!pick) break; // в тире кончились полезные узлы (бывает только теоретически)
      alloc[pick.r][pick.n] += 1;
      tierSpent[t] += 1;
      remaining -= 1;
    }
    if (tierSpent[t] > 0) deepestTier = t;
  }

  // Фаза 2: остаток очков — в лучшие свободные узлы любых ОТКРЫТЫХ тиров.
  const unlockedTiers = [];
  for (let t = 0; t < R.tiers; t += 1) {
    if (t === 0 || tierSpent[t - 1] >= R.unlockThreshold) unlockedTiers.push(t);
    else break;
  }
  while (remaining > 0) {
    let best = null;
    for (const t of unlockedTiers) {
      const cand = nextInTier(t);
      if (cand && (!best || cand.score > best.score + 1e-9)) best = { ...cand, t };
    }
    if (!best) break; // дерево (в открытой части) заполнено
    alloc[best.r][best.n] += 1;
    tierSpent[best.t] += 1;
    remaining -= 1;
    if (best.t > deepestTier) deepestTier = best.t;
  }

  // Итоговые бонусы.
  const totals = {};
  alloc.forEach((row, r) => row.forEach((pts, n) => {
    if (!pts) return;
    const [code, per] = PASSIVE_ROWS[r][n];
    const meta = PASSIVE_STATS[code];
    const key = `${meta.ru} (${meta.en})${meta.pct ? ' %' : ''}`;
    totals[key] = (totals[key] || 0) + per * pts;
  }));

  // Структура по тирам для интерфейса.
  const tiers = [];
  for (let t = 0; t < R.tiers; t += 1) {
    const start = t * R.rowsPerTier;
    const rows = [];
    for (let r = start; r < start + R.rowsPerTier; r += 1) {
      rows.push({
        index: r,
        milestone: isMilestoneRow(r),
        nodes: PASSIVE_ROWS[r].map((node, n) => ({
          code: node[0], per: node[1], max: node[2], points: alloc[r][n],
        })),
      });
    }
    const unlocked = t === 0 || tierSpent[t - 1] >= R.unlockThreshold;
    tiers.push({ tier: t + 1, spent: tierSpent[t], unlocked, rows });
  }

  const spent = points - remaining;
  return { points, spent, leftover: remaining, tiers, totals, deepestTier: deepestTier + 1, weights, mainAttr };
}

/** Сколько уровней нужно, чтобы докопаться до тира N (по 20 очков на тир). */
export const levelForTier = (tier) => Math.max(1, (tier - 1) * PASSIVE_RULES.unlockThreshold);
