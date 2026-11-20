/**
 * Рекомендации сборки: система САМА выбирает предмет в каждый слот, камень, талисманы
 * и цель по Кузнице под выбранную цель (goal) — и объясняет, почему именно так.
 *
 * Логика:
 *   1) у каждой цели есть приоритет статов (statPriorityFor) — «что важнее всего»;
 *   2) у каждого семейства предметов есть имплисит (гарантированный стат) и список
 *      аффиксов, которые на нём могут выпасть;
 *   3) семейство оценивается по цели: имплисит весит больше (это гарантия), потенциальный
 *      аффикс — меньше. Побеждает семейство с наибольшим вкладом в приоритетные статы;
 *   4) по такому же весу строится порядок прокачки Кузницы: сначала слоты, которые дают
 *      самые важные для цели статы (факел с +All Class Skills — всегда первый в уроне).
 *
 * Всё считается из данных Item Codex (src/data/items.js) и правил целей (src/data/builds.js),
 * поэтому рекомендация меняется вместе с классом, целью и Monster Level.
 */
import { t as tr, isEnglish, bi } from '../i18n.js';
import {
  GEAR_CELLS, CLASS_GEAR_RULES, SLOT_GEM_REGION, SLOT_RU, SLOT_EN,
  GEAR_FAMILIES, AFFIXES, DROP_BONUSES, DROP_BONUS_SLOT_CATEGORIES,
  GEM_FAMILIES, GEM_SECONDARY, familyById, familyUnlockMl,
} from '../data/items.js';
import { profileFor, statPriorityFor, goalGearRules, STAT_TO_AFFIX, GOALS } from '../data/builds.js';
import { TALISMANS } from '../data/systems.js';
import { forgeTierInfo, forgeCumulative, forgeStep } from '../data/forge.js';
import { dropTierAtMl, gemRarityAtMl, socketsAtMl } from './planner.js';
import { forgeGateAtMl, promotionFromTier } from '../data/biomes.js';

/* ------------------------- словарь статов: что это и зачем ------------------------- */

export const STAT_TEXT = {
  ad: [tr('урон атаки (Attack Damage)', 'Attack Damage'), tr('база любого урона — умножается критами и доп. ударами', 'critical hits and extra hits multiply this base damage')],
  crit: [tr('шанс крита (Crit Chance)', 'Crit Chance'), tr('чем чаще криты, тем сильнее работают Crit Damage и DD', 'more critical hits increase the benefit of Crit Damage and Double Damage')],
  critDmg: [tr('урон крита (Crit Damage)', 'Crit Damage'), tr('множитель крита; всё, что выше 100% крита, уходит сюда 1:1', 'multiplies critical hits and gains 1 point for every point of Crit Chance above 100%')],
  dd: [tr('Double Damage (шанс двойного урона)', 'Double Damage'), tr('целые сотни дают гарантированные ×N удары', 'each full 100% guarantees another step in the damage multiplier')],
  dh: [tr('Double Hit (доп. удары)', 'Double Hit'), tr('целые сотни = гарантированные дополнительные удары', 'each full 100% guarantees an extra hit')],
  maxHp: [tr('максимум здоровья (Max Health)', 'Max Health'), tr('выживаемость и урон Retaliation', 'improves survivability and supports Retaliation builds')],
  defense: [tr('защита (Defense)', 'Defense'), tr('снижает входящий урон и напрямую усиливает Retaliation', 'reduces incoming damage and directly scales Retaliation')],
  dr: [tr('плоское снижение урона (DR)', 'Flat Damage Reduction'), tr('режет каждый входящий удар', 'reduces damage from every incoming hit')],
  dodge: [tr('уклонение (Dodge)', 'Dodge'), tr('полностью избегает удара (в стойке Bulwark — 0)', 'avoids the whole hit, but drops to zero in Bulwark stance')],
  block: [tr('блок (Block)', 'Block'), tr('щит: шанс блокировать удар и усилить Retaliation', 'a shield can block a hit and increase Retaliation')],
  retal: [tr('возмездие (Retaliation)', 'Retaliation'), tr('урон, который считается от вашей защиты', 'deals damage based on Defense')],
  petDamage: [tr('урон пета (Pet Damage)', 'Pet Damage'), tr('основной урон пет-билда', 'the primary source of damage in pet builds')],
  loh: [tr('лечение за удар (Life on Hit)', 'Life on Hit'), tr('выживаемость в затяжном бою', 'restores health during long fights')],
  lok: [tr('лечение за убийство (Life on Kill)', 'Life on Kill'), tr('восстановление между монстрами', 'restores health between monsters')],
  gold: [tr('золото (Gold Gain)', 'Gold Gain'), tr('фарм золота', 'increases gold gained while farming')],
  exp: [tr('опыт (EXP Gain)', 'EXP Gain'), tr('скорость прокачки персонажа', 'speeds up character leveling')],
  itemDrop: [tr('шанс дропа предметов (Item Drop)', 'Item Drop'), tr('фарм предметов', 'increases item drops')],
  mat: [tr('материалы (Material Drop)', 'Material Drop'), tr('фарм материалов для Кузницы', 'helps you farm materials for the Forge')],
  eggDrop: [tr('шанс яиц (Egg Drop)', 'Egg Drop'), tr('фарм петов', 'helps you farm pets')],
  lucky: [tr('удача (Lucky)', 'Lucky'), tr('редкие находки', 'improves your chance of rare finds')],
  boss: [tr('урон по боссам (Boss Damage)', 'Boss Damage'), tr('работает в босс-контенте: Daily/Guild Boss, Tower, Rifts', 'applies to Daily and Guild Bosses, the Tower, and Rifts')],
  allSkills: ['+All Class Skills', tr('поднимает ВСЕ классовые навыки — самый универсальный бонус в игре', 'raises all class skills at once')],
  mainstat: [tr('основной атрибут (Strength / Dexterity / Intelligence)', 'Main attribute (Strength / Dexterity / Intelligence)'), tr('даёт и урон, и защиту по формуле класса', 'grants damage and defense according to the class formula')],
};

export const statText = (key) => (STAT_TEXT[key] ? STAT_TEXT[key][0] : key);

/* --------------------- что даёт имплисит предмета: разбор строк --------------------- */

/** Правила разбора имплисита. Порядок важен: «damage reduction» раньше «damage». */
const IMPLICIT_RULES = [
  [/damage reduction|flat damage/i, 'dr'],
  [/pet mastery/i, 'petDamage'],
  [/pet damage/i, 'petDamage'],
  [/retaliation/i, 'retal'],
  [/all class skills/i, 'allSkills'],
  [/critical strike chance/i, 'crit'],
  [/critical damage/i, 'critDmg'],
  [/double hit/i, 'dh'],
  [/life on hit/i, 'loh'],
  [/life on kill/i, 'lok'],
  [/block/i, 'block'],
  [/dodge/i, 'dodge'],
  [/gold/i, 'gold'],
  [/exp\b/i, 'exp'],
  [/defense/i, 'defense'],
  [/physical damage|magic damage|attack damage|damage$/i, 'ad'],
  [/strength|dexterity|intelligence|all attributes/i, 'mainstat'],
];

/**
 * «Вес» слота: оружие даёт большой урон, украшения — небольшой атрибут.
 * Без этого коэффициента кольцо «All Attributes» выглядело бы важнее меча.
 */
const SLOT_IMPLICIT_MULT = {
  mainhand: 2.2, hand2: 2.0, torch: 1.6,
  chest: 1.8, head: 1.6, hands: 1.5, feet: 1.4,
  amulet: 0.9, ring: 0.9, belt: 0.9,
};

/** Статы, которые предмет даёт ГАРАНТИРОВАННО (имплисит), — по строке из Item Codex. */
export function implicitStats(implicit) {
  const out = new Set();
  for (const part of String(implicit || '').split('+')) {
    const text = part.trim();
    if (!text) continue;
    for (const [re, key] of IMPLICIT_RULES) {
      if (re.test(text)) { out.add(key); break; }
    }
  }
  return [...out];
}

/** Обратная карта: id аффикса → ключ стата из приоритета цели. */
const AFFIX_STAT = (() => {
  const map = {};
  for (const [stat, ids] of Object.entries(STAT_TO_AFFIX)) for (const id of ids) map[id] = stat;
  return map;
})();

/** Статы, которые на этом семействе МОГУТ выпасть аффиксами (не гарантия, но шанс). */
export function affixStats(family) {
  const out = new Set();
  for (const name of [...(family.prefixes || []), ...(family.suffixes || [])]) {
    const affix = AFFIXES.find((a) => a.name === name);
    const key = affix && AFFIX_STAT[affix.id];
    if (key) out.add(key);
  }
  return [...out];
}

/* --------------------------------- вспомогательное --------------------------------- */

/** Семейства, доступные в ячейке (та же логика, что в экране снаряжения). */
function familiesForCell(classId, cell) {
  if (cell.slot === 'talisman') return [];
  const kind = (CLASS_GEAR_RULES[classId] || {}).hand2 || 'offhand';
  if (cell.id === 'hand2' && kind === 'weapon2') {
    return GEAR_FAMILIES.filter((f) => f.slot === 'mainhand' && f.hand !== '2H' && (f.cls === 'all' || f.cls === classId));
  }
  return GEAR_FAMILIES.filter((f) => f.slot === cell.slot && (f.cls === 'all' || f.cls === classId));
}

/** Талисман по названию из профиля цели («Fury», «Iron», «Ярость»…). */
function talismanByName(name) {
  const needle = String(name).toLowerCase();
  return TALISMANS.types.find((t) => t.name.toLowerCase() === needle || t.ru.toLowerCase() === needle) || null;
}

/** Талисманы цели: «Fury + Iron» → [fury, iron]. */
function goalTalismans(profile) {
  const list = (profile.talismans && profile.talismans[0]) || 'Fury + Iron';
  const names = String(list).replace(/\(.*?\)/g, '').split('+').map((s) => s.trim()).filter(Boolean);
  const out = names.map(talismanByName).filter(Boolean);
  return out.length ? out : [TALISMANS.types[0]];
}

/** Камень для региона: та же логика, что в ядре (mainStat → камень основного атрибута класса). */
function gemFamilyForRegion(region, classId, gemsCfg, mainStat) {
  let id = gemsCfg[region] || 'garnet';
  if (id === 'mainStat') {
    id = mainStat === 'strength' ? 'garnet' : mainStat === 'dexterity' ? 'jade' : 'lapis';
  }
  return GEM_FAMILIES.find((f) => f.id === id) || GEM_FAMILIES[0];
}

/** Статы, которые камень даёт именно в этом регионе (по строке эффекта). */
function gemValueStats(value) {
  const out = new Set();
  for (const part of String(value || '').split('+')) {
    const text = part.trim();
    if (!text) continue;
    if (/pet damage/i.test(text)) out.add('petDamage');
    else if (/attack damage/i.test(text)) out.add('ad');
    else if (/retaliation/i.test(text)) out.add('retal');
    else if (/max health/i.test(text)) out.add('maxHp');
    else if (/defense/i.test(text)) out.add('defense');
    else if (/gold/i.test(text)) out.add('gold');
    else if (/item drop/i.test(text)) out.add('itemDrop');
    else if (/material/i.test(text)) out.add('mat');
    else if (/exp/i.test(text)) out.add('exp');
    else if (/strength|dexterity|intelligence/i.test(text)) out.add('ad');
  }
  return [...out];
}

/**
 * Что даёт каждый атрибут за пункт (официальные данные игры, см. docs/RESEARCH.md).
 * Украшения дают именно атрибуты, поэтому их надо сравнивать по эффекту, а не по названию линии.
 */
export const ATTRIBUTE_EFFECTS = {
  strength: [['ad', 0.75], ['maxHp', 0.5], ['retal', 0.5]],
  dexterity: [['dodge', 0.05], ['petDamage', 0.1]],
  intelligence: [['ad', 0.38], ['petDamage', 0.05], ['dd', 0.2]],
};

export const ATTRIBUTE_LABELS = {
  strength: [tr('Сила', 'Strength'), 'Strength'],
  dexterity: [tr('Ловкость', 'Dexterity'), 'Dexterity'],
  intelligence: [tr('Интеллект', 'Intelligence'), 'Intelligence'],
};

/** Линии украшений: какое семейство какую линию атрибутов даёт. */
export const JEWELRY_LINES = {
  warriors: ['strength'],
  rangers: ['dexterity'],
  scholars: ['intelligence'],
  adventurers: ['strength', 'dexterity'],
};

/**
 * Семейство выбранной линии для слота. У «авантюриста» нет пояса —
 * в поясе его роль играет Пояс учёного (все атрибуты).
 */
export function lineFamilyId(line, slot) {
  if (slot === 'belt') return line === 'warriors' ? 'warriors_belt' : (line === 'rangers' ? 'rangers_belt' : 'scholars_belt');
  if (slot === 'amulet' || slot === 'ring') return `${line}_${slot}`;
  return null;
}

/** Прочитать список атрибутов из имплисита украшения. */
function jewelryAttributes(family) {
  const implicit = String(family.implicit || '');
  if (/all attributes/i.test(implicit)) return ['strength', 'dexterity', 'intelligence'];
  const out = [];
  if (/strength/i.test(implicit)) out.push('strength');
  if (/dexterity/i.test(implicit)) out.push('dexterity');
  if (/intelligence/i.test(implicit)) out.push('intelligence');
  return out;
}

/** Середина диапазона тира — грубая оценка ролла (диапазоны официальные, ролл — средний). */
function tierRoll(family, tierIdx) {
  const range = (family.implicitTiers || [])[tierIdx] || '';
  const nums = String(range).replace(/[^0-9\-–]/g, '').split(/[\-–]/).map((n) => Number(n)).filter(Number.isFinite);
  if (!nums.length) return 0;
  return nums.length > 1 ? (nums[0] + nums[1]) / 2 : nums[0];
}

const CLASS_MAIN_STAT = { warrior: 'strength', archer: 'dexterity', mage: 'intelligence', rogue: 'dexterity', druid: 'strength' };

/**
 * Классовый скейл. Точная формула конверсии чужих атрибутов в урон в игре не раскрыта,
 * поэтому здесь оценка: атрибут своего класса считается полнее (×1.25), а чужой урон
 * от атрибута — слабее (×0.4). Урон пета, двойной урон и Max Health считаются одинаково
 * для всех, потому что это самостоятельные статы, а не «свой/чужой» скейл.
 */
const OWN_ATTR_BONUS = 1.25;
const FOREIGN_DAMAGE_PENALTY = 0.4;

/* --------------------------------- основная функция --------------------------------- */

/**
 * Готовая сборка под класс и цель.
 * @param {string} classId warrior | archer | mage | rogue | druid
 * @param {string} goal progress | farm | boss | pets | retaliation
 * @param {{level?: number, ml?: number}} [opts] уровень персонажа и Monster Level
 */
export function recommendBuild(classId, goal, opts = {}) {
  const ml = Math.max(1, Math.floor(opts.ml ?? opts.level ?? 1));
  const level = Math.max(1, Math.floor(opts.level ?? ml));
  const profile = profileFor(classId, goal);
  const priority = statPriorityFor(classId, goal);
  const rules = goalGearRules(classId, goal);
  const dropTier = dropTierAtMl(ml);        // тир ПРЕДМЕТА: что реально падает на вашем ML
  const forgeGate = forgeGateAtMl(ml);      // тир СЛОТА: до какого тира качается Кузница (гейт — биомы)
  const gemRarity = gemRarityAtMl(ml);
  const sockets = socketsAtMl(ml);
  const mainStat = CLASS_MAIN_STAT[classId] || 'strength';
  const goalRu = (GOALS.find((g) => g.id === goal) || {}).ru || goal;
  const jewelryLine = opts.jewelryLine && JEWELRY_LINES[opts.jewelryLine] ? opts.jewelryLine : 'auto';

  /** Вес стата: чем выше в приоритете цели, тем больше. */
  const weightOf = (stat) => {
    // +All Class Skills усиливает все ветки сразу — считаем его «выше первого приоритета».
    if (stat === 'allSkills') return priority.length * 1.4;
    // Основной атрибут полезен любой цели, но слабее чистого урона.
    if (stat === 'mainstat') return priority.includes('ad') ? priority.length * 0.5 : priority.length * 0.3;
    const i = priority.indexOf(stat);
    return i === -1 ? 0 : priority.length - i;
  };

  const slots = {};
  const cells = {};

  for (const cell of GEAR_CELLS) {
    // --- талисманы: у них нет «предмета», только тип и уровень инфьюза ---
    if (cell.slot === 'talisman') {
      const types = goalTalismans(profile);
      const talisman = cell.id === 'talisman2' ? (types[1] || types[0]) : types[0];
      const stats = implicitStats(talisman.stats);
      cells[cell.id] = {
        cellId: cell.id, slot: cell.slot, slotRu: cell.ru, slotEn: cell.en,
        family: null, familyId: null, talismanId: talisman.id,
        why: [
          tr(`Талисман ${talisman.ru} (${talisman.name}): ${talisman.stats}.`, `${talisman.name} talisman: ${talisman.stats}.`),
          ...stats.filter((s) => weightOf(s) > 0).slice(0, 2).map((s) => `${statText(s)} — ${STAT_TEXT[s][1]}`),
        ],
        forge: null,
      };
      continue;
    }

    // --- украшения: у них нет «класса», только линия атрибутов, поэтому считаем эффект ---
    const isJewelry = ['amulet', 'ring', 'belt'].includes(cell.slot);
    const slotMultPre = SLOT_IMPLICIT_MULT[cell.slot] || 1;

    // Тир слота Кузницы НЕ зависит от предмета: он ограничен вашим биомом (материалы монстров).
    const forgeTier = forgeGate.tier;
    const forgeInfo = forgeTierInfo(forgeTier);
    const targetLevel = forgeInfo.maxLevel;
    const promotion = promotionFromTier(forgeTier);

    /** Оценка украшения: суммарный вклад его атрибутов в приоритеты цели. */
    const jewelryScore = (family) => {
      const attrs = jewelryAttributes(family);
      const roll = tierRoll(family, Math.min(5, Math.max(0, dropTier.tier - 1)));
      let score = 0;
      const parts = [];
      for (const attr of attrs) {
        for (const [stat, per] of ATTRIBUTE_EFFECTS[attr]) {
          // классовое: свой атрибут полнее, чужой урон от атрибута слабее
          const own = attr === mainStat;
          const mult = stat === 'ad'
            ? (own ? OWN_ATTR_BONUS : FOREIGN_DAMAGE_PENALTY)
            : (own ? OWN_ATTR_BONUS : 1);
          const gain = (per * mult * roll);
          const w = weightOf(stat);
          if (w > 0) score += gain * w;
          if (w > 0) {
            const note = own ? tr(' — это атрибут вашего класса', ' (your main class attribute)') : (stat === 'ad' ? tr(' — чужой атрибут, для вашего класса слабее (оценка)', ' (estimated lower damage scaling for your class)') : '');
            parts.push(tr(
              `${ATTRIBUTE_LABELS[attr][0]} (${ATTRIBUTE_LABELS[attr][1]}): +${per}% ${statText(stat)} за пункт → при прокруте ~${Math.round(roll)} это ≈ +${gain.toFixed(1)}%${note}`,
              `${ATTRIBUTE_LABELS[attr][1]}: +${per}% ${statText(stat)} per point. A roll of about ${Math.round(roll)} gives roughly +${gain.toFixed(1)}%${note}.`,
            ));
          }
        }
      }
      // Плоские эффекты (Life on Hit / Life on Kill у поясов) — в том же весе, но без процентов.
      const flat = /life on hit/i.test(family.implicit) ? 'loh' : (/life on kill/i.test(family.implicit) ? 'lok' : null);
      if (flat && weightOf(flat) > 0) {
        score += roll * weightOf(flat);
        parts.push(tr(`${statText(flat)} → +${roll} за удар/убийство`, `${statText(flat)}: +${roll} per hit or kill`));
      }
      return { score: score * slotMultPre, parts, attrs, roll };
    };

    // --- предметные ячейки ---
    const allowed = (isJewelry ? [] : (rules[cell.slot] || [])).filter((id) => familyById(id));
    const candidates = familiesForCell(classId, cell)
      .filter((f) => f.slot === cell.slot || (cell.id === 'hand2' && f.slot === 'mainhand'))
      .filter((f) => familyUnlockMl(f) <= ml || allowed.includes(f.id));
    // Порядок: сначала кураторский список цели, затем остальные, доступные по ML.
    const ordered = [
      ...allowed.map((id) => familyById(id)).filter((f) => f && candidates.includes(f)),
      ...candidates.filter((f) => !allowed.includes(f.id) && familyUnlockMl(f) <= ml),
    ];
    const lockedNotes = candidates.filter((f) => familyUnlockMl(f) > ml && !allowed.includes(f.id));

    const slotMult = SLOT_IMPLICIT_MULT[cell.slot] || 1;
    let best = null;
    ordered.forEach((family, index) => {
      const imp = implicitStats(family.implicit);
      const aff = affixStats(family);
      let score = 0;
      let info = null;
      if (isJewelry) {
        info = jewelryScore(family);
        score = info.score;
        // принудительно выбранная линия всегда впереди (точное совпадение семейства)
        if (jewelryLine !== 'auto' && family.id === lineFamilyId(jewelryLine, cell.slot)) score += 1e6;
        // иначе при равенстве выигрывает линия основного атрибута класса
        else if (jewelryLine === 'auto' && info.attrs.includes(mainStat)) score += 1;
      } else {
        for (const s of imp) score += 2 * weightOf(s) * slotMult;
        for (const s of aff) score += 1 * weightOf(s);
        if (index === 0) score += 0.5; // при равенстве выигрывает кураторский выбор цели
      }
      if (!best || score > best.score) best = { family, score, imp, aff, index, info };
    });

    // Кураторский список приоритетнее: если он даёт хоть какой-то вклад, берём его,
    // иначе — семейство с максимальным вкладом (например, «нет подходящего» — берём первое доступное).
    const curated = ordered[0] || null;
    const curatedScore = curated ? (implicitStats(curated.implicit).reduce((a, s) => a + 2 * weightOf(s) * slotMult, 0)
      + affixStats(curated).reduce((a, s) => a + weightOf(s), 0)) : 0;
    const chosenRecord = !isJewelry && curated && curatedScore > 0
      ? { family: curated, imp: implicitStats(curated.implicit), aff: affixStats(curated) }
      : best;
    const chosen = chosenRecord ? chosenRecord.family : null;

    const alternatives = ordered
      .filter((f) => f !== chosen)
      .slice(0, isJewelry ? 3 : 2)
      .map((f) => ({
        family: f,
        why: isJewelry
          ? jewelryScore(f).parts.slice(0, 3).join(', ') || f.implicit
          : (implicitStats(f.implicit).filter((s) => weightOf(s) > 0).map((s) => statText(s)).join(', ') || f.implicit),
      }));

    const why = [];
    if (chosen) {
      why.push(tr(
        `Предмет падает на вашем Monster Level: T${dropTier.tier} ${dropTier.ru} (${dropTier.name}) — около ${dropTier.chance}% дропа. Кузница слота качается до T${forgeTier} и от предмета не зависит: материалы берутся с монстров ${forgeGate.biome ? forgeGate.biome.name : '—'} (ML ${forgeGate.ml}).`,
        `At your Monster Level, T${dropTier.tier} ${dropTier.name} accounts for about ${dropTier.chance}% of drops. The slot can reach Forge tier T${forgeTier} independently of the equipped item. Farm materials from monsters in ${forgeGate.biome ? forgeGate.biome.name : '—'} (ML ${forgeGate.ml}).`,
      ));
      if (forgeGate.next) {
        why.push(tr(
          `Следующий тир слота — T${forgeGate.next.tier}: материалы ${forgeGate.next.biome ? forgeGate.next.biome.name : ''} (ML ${forgeGate.next.ml}), осталось ${forgeGate.next.mlLeft} ML.`,
          `Next slot tier: T${forgeGate.next.tier}. Find materials in ${forgeGate.next.biome ? forgeGate.next.biome.name : ''} at ML ${forgeGate.next.ml} (${forgeGate.next.mlLeft} ML to go).`,
        ));
      }
      if (promotion) {
        why.push((isEnglish ? `Promoting the slot from T${promotion.from} to T${promotion.to} costs ${promotion.gold.toLocaleString('en-US')} gold, 1 × ${promotion.essenceRu}, and ${promotion.materials.map((m) => `${m[0]} ×${m[1]}`).join(', ')}. Success chance: ${100 - promotion.fail}%.` : `Промоушен слота T${promotion.from} → T${promotion.to}: ${promotion.gold.toLocaleString('ru-RU')} золота, ${promotion.essenceRu} ×1 и материалы: ${promotion.materials.map((m) => `${m[0]} ×${m[1]}`).join(', ')} (успех ${100 - promotion.fail}%).`));
      }
    }
    if (chosen && isJewelry) {
      const info = (chosenRecord && chosenRecord.info) || jewelryScore(chosen);
      const attrsText = info.attrs.length === 3
        ? tr('все атрибуты сразу: Сила (Strength) + Ловкость (Dexterity) + Интеллект (Intelligence)', 'All attributes: Strength, Dexterity, and Intelligence')
        : info.attrs.map((a) => bi(...ATTRIBUTE_LABELS[a])).join(' + ');
      why.push(jewelryLine !== 'auto'
        ? tr(`Линия украшений выбрана вами вручную: ${chosen.ru} (${chosen.name}) — ${attrsText}.`, `Your chosen jewelry line: ${chosen.name} (${attrsText}).`)
        : tr(
          `Линия подобрана расчётом под цель «${goalRu}»: ${chosen.ru} (${chosen.name}) — ${attrsText}. На T${dropTier.tier} это прокрут ${Math.round(info.roll)} пунктов на атрибут.`,
          `Recommended jewelry for ${goalRu}: ${chosen.name} (${attrsText}). At T${dropTier.tier}, the estimated roll is ${Math.round(info.roll)} points per attribute.`,
        ));
      for (const p2 of info.parts.slice(0, 4)) why.push(tr(`${p2} (официальные значения за пункт атрибута).`, `${p2} (official values per attribute point).`));
      why.push((isEnglish ? `Compare: ${alternatives.slice(0, 2).map((a) => `${a.family.ru} — ${a.why}`).join('; ') || 'no close alternatives'}.` : `Для сравнения: ${alternatives.slice(0, 2).map((a) => `${a.family.ru} — ${a.why}`).join('; ') || 'ближайших вариантов нет'}.`));
    }
    if (chosen && !isJewelry) {
      why.push(tr(`Имплисит: ${chosen.implicit} — это гарантированный стат, он не зависит от ролла аффиксов.`, `Implicit: ${chosen.implicit}. This stat is guaranteed regardless of the affix rolls.`));
      const matched = implicitStats(chosen.implicit).filter((s) => weightOf(s) > 0).sort((a, b) => weightOf(b) - weightOf(a));
      for (const s of matched.slice(0, 2)) {
        const place = priority.indexOf(s);
        why.push(place === -1
          ? tr(`${statText(s)} — особый бонус цели «${goalRu}»: ${STAT_TEXT[s][1]}.`, `${statText(s)} is a special bonus for ${goalRu}: ${STAT_TEXT[s][1]}.`)
          : tr(`${statText(s)} — приоритет №${place + 1} цели «${goalRu}»: ${STAT_TEXT[s][1]}.`, `${statText(s)} ranks #${place + 1} for ${goalRu}: ${STAT_TEXT[s][1]}.`));
      }
      const affMatched = affixStats(chosen).filter((s) => weightOf(s) > 0).sort((a, b) => weightOf(b) - weightOf(a));
      if (affMatched.length) {
        why.push((isEnglish ? `Look for affixes that add ${affMatched.slice(0, 3).map(statText).join(', ')}.` : `Аффиксами здесь можно добрать: ${affMatched.slice(0, 3).map(statText).join(', ')} — ищите именно их.`));
      }
      if (chosen.note) why.push(chosen.note);
      if (alternatives.length) why.push((isEnglish ? `Alternatives: ${alternatives.map((a) => `${a.family.name} — ${a.why}`).join('; ')}.` : `Альтернатива: ${alternatives.map((a) => `${a.family.ru} (${a.family.name}) — ${a.why}`).join('; ')}.`));
      if (lockedNotes.length) {
        why.push((isEnglish ? `Outside the drop pool at ML ${ml}: ${lockedNotes.map((f) => `${f.name} (available at ML ${familyUnlockMl(f)})`).join(', ')}.` : `Пока не выпадает на ML ${ml}: ${lockedNotes.map((f) => `${f.ru} (${f.name}) — с ML ${familyUnlockMl(f)}`).join(', ')}.`));
      }
    }

    const tierIdx = Math.min(5, Math.max(0, dropTier.tier - 1));

    // Аффиксы «искать» — по приоритету цели (то же правило, что в ядре, но с объяснением).
    const wantIds = new Set();
    for (const stat of priority) for (const id of (STAT_TO_AFFIX[stat] || [])) wantIds.add(id);
    const pickAffix = (names, type) => names
      .map((name) => AFFIXES.find((a) => a.name === name && a.type === type))
      .filter(Boolean)
      .sort((a, b) => (wantIds.has(a.id) ? 0 : 1) - (wantIds.has(b.id) ? 0 : 1))
      .slice(0, 4);
    const affixes = chosen
      ? { prefixes: pickAffix(chosen.prefixes || [], 'prefix'), suffixes: pickAffix(chosen.suffixes || [], 'suffix') }
      : { prefixes: [], suffixes: [] };

    const cats = DROP_BONUS_SLOT_CATEGORIES[cell.slot] || ['Offensive'];
    const dropBonuses = DROP_BONUSES
      .filter((d) => (profile.dropBonuses || []).includes(d.name))
      .sort((a, b) => {
        const ai = cats.indexOf(a.cat); const bi = cats.indexOf(b.cat);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      })
      .slice(0, 3);

    const region = SLOT_GEM_REGION[cell.slot];
    const gemFamily = gemFamilyForRegion(region, classId, profile.gems, mainStat);
    const gemValue = gemFamily.slots[region];
    const gemWhy = [
      tr(`${gemFamily.ru} (${gemFamily.name}) в этом слоте: ${gemValue}.`, `${gemFamily.name} gives ${gemValue} in this slot.`),
      ...gemValueStats(gemValue).filter((s) => weightOf(s) > 0).slice(0, 2).map((s) => tr(`${statText(s)} — приоритет №${priority.indexOf(s) + 1} цели «${goalRu}».`, `${statText(s)} ranks #${priority.indexOf(s) + 1} for ${goalRu}.`)),
    ];

    const entry = {
      cellId: cell.id,
      slot: cell.slot,
      slotRu: cell.ru,
      slotEn: cell.en,
      family: chosen,
      familyId: chosen ? chosen.id : null,
      tier: dropTier.tier,
      tierName: chosen ? (chosen.tierNames[tierIdx] || chosen.name) : null,
      implicitNow: chosen ? chosen.implicitTiers[tierIdx] : null,
      locked: Boolean(chosen && familyUnlockMl(chosen) > ml),
      why,
      affixes,
      dropBonuses,
      gem: { family: gemFamily, region, value: gemValue, why: gemWhy },
      alternatives,
      jewelry: isJewelry && best ? {
        attrs: (best.info && best.info.attrs) || [],
        parts: (best.info && best.info.parts) || [],
        roll: best.info ? Math.round(best.info.roll) : 0,
      } : null,
      forge: {
        tier: forgeTier,                          // тир СЛОТА по Кузнице (гейт — биомы)
        level: targetLevel,
        text: `T${forgeTier} +${targetLevel}`,
        cost: forgeCumulative(forgeTier, targetLevel),
        firstStep: forgeStep(forgeTier, 0),
        affixSlots: forgeInfo.affixSlots,
        gate: {
          biome: forgeGate.biome,
          ml: forgeGate.ml,
          materials: forgeGate.materials,
          next: forgeGate.next,
        },
        promotion,
      },
      itemTierInfo: dropTier,                     // тир ПРЕДМЕТА (то, что падает)
      tierInfo: dropTier,
    };
    cells[cell.id] = entry;
    slots[cell.slot] = slots[cell.slot] || entry;
  }

  /* ---------------- порядок прокачки Кузницы: что даёт больше всего цели ---------------- */

  const forgeOrder = GEAR_CELLS
    .filter((c) => c.slot !== 'talisman' && cells[c.id] && cells[c.id].family)
    .map((c) => {
      const e = cells[c.id];
      const imp = implicitStats(e.family.implicit);
      const mult = SLOT_IMPLICIT_MULT[e.slot] || 1;
      let score = imp.reduce((a, s) => a + 2 * weightOf(s) * mult, 0);
      score += affixStats(e.family).reduce((a, s) => a + weightOf(s), 0);
      if (e.slot === 'mainhand' || e.slot === 'hand2') score += 4; // урон оружия множится критами и DD
      if (e.slot === 'torch' && ml < 50) score = -1; // факела ещё нет в дропе
      const reasons = [];
      if (imp.includes('allSkills')) reasons.push(tr('+All Class Skills поднимает все ваши навыки сразу — самый выгодный слот для вложений.', '+All Class Skills raises every skill at once, making this the most valuable slot to upgrade.'));
      reasons.push(tr(
        `Слот качается до T${e.forge.tier} (материалы с монстров ${e.forge.gate.biome ? e.forge.gate.biome.name : '—'}, ML ${e.forge.gate.ml}) — это не зависит от того, какой предмет вам выпал.`,
        `This slot can reach T${e.forge.tier}. Farm the materials from monsters in ${e.forge.gate.biome ? e.forge.gate.biome.name : '—'} at ML ${e.forge.gate.ml}. The tier limit is independent of the equipped item.`,
      ));
      if (e.slot === 'mainhand' || e.slot === 'hand2') reasons.push(tr('урон оружия — база, которую множат криты, DD и DH.', 'Critical hits, Double Damage, and Double Hit multiply your base weapon damage.'));
      for (const s of imp.filter((x) => weightOf(x) > 0).sort((a, b) => weightOf(b) - weightOf(a)).slice(0, 2)) {
        const place = priority.indexOf(s);
        reasons.push(`${statText(s)} — ${place === -1 ? tr('нужный цели стат', 'a stat for this goal') : tr(`приоритет №${place + 1} цели «${goalRu}»`, `priority #${place + 1} for ${goalRu}`)}.`);
      }
      if (!reasons.length) reasons.push(tr('слот под цель: предмет и аффиксы подобраны по приоритету статов.', 'The item and affixes in this slot match your stat priorities.'));
      return { cellId: c.id, slotRu: c.ru, slotEn: c.en, family: e.family, score, reasons, forge: e.forge };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((x, i) => ({ ...x, place: i + 1 }));

  const gemPlan = {};
  for (const region of ['weapon', 'torch', 'armor', 'jewelry']) {
    const entries = Object.values(cells).filter((e) => e.gem && e.gem.region === region);
    if (!entries.length) continue;
    gemPlan[region] = {
      family: entries[0].gem.family,
      value: entries[0].gem.value,
      why: entries[0].gem.why,
      secondary: (profile.gems.secondary || []).map((stat) => GEM_SECONDARY.find((s) => s.stat === stat)).filter(Boolean),
      cells: entries.map((e) => e.cellId),
    };
  }

  return {
    classId, goal, goalRu, ml, level,
    stance: profile.stance,
    forgeGate,
    priority,
    tierInfo: dropTier,
    gemRarity,
    sockets,
    cells,
    slots,
    forgeOrder,
    gemPlan,
    talismans: goalTalismans(profile),
    pets: profile.pets,
    notes: profile.notes || [],
  };
}
