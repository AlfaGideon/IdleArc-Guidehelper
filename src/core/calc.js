/**
 * Математика IdleArc по официально подтверждённым правилам.
 * Везде, где порядок слоёв в игре официально не раскрыт, расчёт помечается как «оценка».
 */
import { CLASSES } from '../data/classes.js';

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Собрать суммарные бонусы от распределения классовых навыков. */
export function skillBonuses(classId, allocations = {}, plusAllClassSkills = 0) {
  const cls = CLASSES.find((c) => c.id === classId);
  const totals = {
    ad: 0, crit: 0, critDmg: 0, dh: 0, dd: 0, boss: 0, petDmg: 0, petMastery: 0,
    maxHp: 0, loh: 0, lok: 0, block: 0, dodge: 0, dr: 0, gold: 0, mat: 0, itemDrop: 0,
    eggDrop: 0, exp: 0, matDupe: 0, luckyTier: 0, ruby: 0, rune: 0, extraKill: 0,
    cull: 0, trap: 0, vsHigh: 0, vsLow: 0, ddTriple: 0, critDouble: 0, echoTrigger: 0,
    echoDamage: 0, echoTwice: 0, dhBonusDmg: 0, petDoubleStrike: 0, magicBlastChance: 0,
    magicBlastDmg: 0, critExplode: 0, instakillNonBoss: 0,
  };
  const caps = {};
  const details = [];
  if (!cls) return { totals, caps, details };
  for (const skill of cls.skills) {
    const spent = allocations[skill.id] || 0;
    if (!spent) continue;
    const rank = spent + (plusAllClassSkills || 0); // +All Class Skills поднимает эффективный ранг
    if (skill.base) {
      for (const [k, v] of Object.entries(skill.base)) totals[k] = (totals[k] || 0) + v;
    }
    for (const [k, per] of Object.entries(skill.perPoint || {})) {
      let value = per * rank;
      const cap = skill.cap?.[k];
      if (cap != null) {
        caps[k] = cap;
        value = Math.min(value, cap);
      }
      totals[k] = (totals[k] || 0) + value;
    }
    details.push({ skill: skill.name, spent, rank, effect: skill.text });
  }
  // Общий кап Extra Kill из Bloodthirst — 10%
  if (totals.extraKill > 10) totals.extraKill = 10;
  return { totals, caps, details };
}

/** Крит-модель: >100% крит-шанса конвертируется в +1% Crit Damage за 1%. */
export function critModel(critChancePct, critDamagePct) {
  const chance = Math.max(0, critChancePct || 0);
  const cd = Math.max(0, critDamagePct || 0);
  const overflow = Math.max(0, chance - 100);
  const effectiveChance = Math.min(100, chance);
  const effectiveCritDamage = cd + overflow;
  const critMult = 1 + effectiveCritDamage / 100;
  const expected = (effectiveChance / 100) * critMult + (1 - effectiveChance / 100) * 1;
  return { effectiveChance, overflow, effectiveCritDamage, critMult, expected };
}

/** Double Hit: каждые 100% — гарантированный удар; остаток — шанс ещё одного. */
export function doubleHitModel(dhPct) {
  const v = Math.max(0, dhPct || 0);
  const guaranteed = Math.floor(v / 100);
  const chance = ((v % 100) / 100) * 100;
  return { guaranteed, chance, expectedHits: 1 + v / 100 };
}

/** Double Damage: каждые 100% — гарантированная ступень множителя. */
export function doubleDamageModel(ddPct) {
  const v = Math.max(0, ddPct || 0);
  const guaranteed = Math.floor(v / 100);
  const chance = ((v % 100) / 100) * 100;
  return { guaranteedSteps: guaranteed, chanceForNext: chance, expectedMult: 1 + v / 100, minMult: 1 + guaranteed };
}

/** Damage Reduction: софт-кап 95% (дальше 10% эффективности), хард-кап 99%. Минимум 1% удара проходит. */
export function drModel(drPct) {
  const raw = Math.max(0, drPct || 0);
  const capped = Math.min(99, raw);
  const aboveSoft = Math.max(0, capped - 95);
  const effective = Math.min(99, Math.min(95, capped) + aboveSoft * 0.1);
  const taken = Math.max(0.01, 1 - effective / 100);
  return { raw, effective, taken, extraWasted: raw - effective };
}

/** Defense + Reflecting → урон возмездия (по официальной формуле). */
export function retaliationModel(defense, reflectingPct, { blocked = false, strength = 0, bulwarkFlatPct = 0 } = {}) {
  const base = strength * 0.5 + defense * (1 + (bulwarkFlatPct || 0) / 100);
  const reflective = base * ((reflectingPct || 0) / 100);
  const mult = blocked ? 1.5 : 1;
  return { hit: reflective * mult, perAttack: reflective, blockedBonus: mult };
}

/** Значение гема: base × rarityMult × (quality/100) × (1 + 0.04 × socketLevel). */
export function gemValue(baseValue, rarityMult, quality, socketLevel) {
  return baseValue * rarityMult * (quality / 100) * (1 + 0.04 * (socketLevel || 0));
}

/** Стоимость Mastery: суммарные Elemental Shards до уровня N (0..10). */
export function masteryShards(level) {
  const table = [0, 10, 45, 100, 180, 290, 440, 640, 900, 1230, 1650];
  const idx = clamp(Math.floor(level || 0), 0, 10);
  return table[idx];
}

/** Сколько Pet Shards-уровней «полезны» при компоунде с учётом самого слабого надетого пета. */
export function petCompoundEffective(myLevel, weakestEquippedLevel, realm = 'seasonal') {
  const limit = realm === 'permanent' ? 25 : 10;
  return Math.min(myLevel, (weakestEquippedLevel || 0) + limit);
}

/** Оценка ожидаемого множителя удара по одной цели (не официальная формула порядка слоёв). */
export function expectedHitModel(input) {
  const { adPct = 0, critChance = 0, critDamage = 0, dh = 0, dd = 0, bossDamage = 0, isBoss = false,
    vsHigh = 0, vsLow = 0, enemyHpPct = 100, echoTrigger = 0, echoDamage = 40, echoTwice = 0 } = input;
  const crit = critModel(critChance, critDamage);
  const hits = doubleHitModel(dh);
  const ddModel = doubleDamageModel(dd);
  let situational = 1;
  if (enemyHpPct > 50) situational += vsHigh / 100;
  if (enemyHpPct < 50) situational += vsLow / 100;
  const bossMult = isBoss ? 1 + bossDamage / 100 : 1;
  const echo = 1 + (echoTrigger / 100) * (echoDamage / 100) * (1 + (echoTwice / 100));
  const adMult = 1 + adPct / 100;
  const total = adMult * crit.expected * hits.expectedHits * ddModel.expectedMult * situational * bossMult * echo;
  return { crit, hits, dd: ddModel, adMult, situational, bossMult, echo, total };
}

export const fmt = (n, digits = 2) => {
  if (n == null || Number.isNaN(n)) return '—';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Number(n).toFixed(digits).replace(/\.00$/, '');
};
